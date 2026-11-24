<?php

namespace app\tests\unit\transaction\antrean;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\obat\ObatService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pembayaran\InvoiceService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\modules\transaction\resep\FarmasiService;
use app\modules\transaction\resep\ResepService;
use app\tests\TestCase;
use yii\web\ConflictHttpException;
use yii\web\ForbiddenHttpException;

/**
 * Uji daftar antrean, perubahan status antrean (beserta log), dan riwayat kunjungan pasien (poin 3.4).
 */
class AntreanServiceTest extends TestCase
{
    public function testPerubahanStatusTercatatDiLogDanTampilDiRiwayat(): void
    {
        $pasien = (new PasienService())->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $dokter = (new DokterService())->create([
            'kode' => 'DR001',
            'nama' => 'dr. Budi',
            'sip' => 'SIP/001',
            'jenis_tenaga' => 'dokter',
        ]);
        $poli = (new PoliService())->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'prefix_antrean' => 'U',
            'tarif_pendaftaran' => 25000,
        ]);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 10,
        ]);

        $kunjungan = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);

        $antreanService = new AntreanService();
        $list = $antreanService->list(['poli_id' => $poli->id, 'tanggal' => self::seninDepan()])['items'];
        $this->assertCount(1, $list);
        $this->assertSame('menunggu', $list[0]['status']);

        $updated = $antreanService->ubahStatus($kunjungan->id, 'diperiksa');
        $this->assertSame('diperiksa', $updated->status);

        $riwayat = $antreanService->riwayatPasien($pasien->id);
        $this->assertCount(1, $riwayat);
        $this->assertCount(2, $riwayat[0]['status_logs']);
        $this->assertNull($riwayat[0]['status_logs'][0]['status_lama']);
        $this->assertSame('menunggu', $riwayat[0]['status_logs'][0]['status_baru']);
        $this->assertSame('menunggu', $riwayat[0]['status_logs'][1]['status_lama']);
        $this->assertSame('diperiksa', $riwayat[0]['status_logs'][1]['status_baru']);

        // Status tidak boleh mundur, dan status akhir tidak bisa dibuka kembali.
        foreach ([['menunggu'], ['selesai', 'menunggu']] as $langkah) {
            try {
                foreach ($langkah as $status) {
                    $antreanService->ubahStatus($kunjungan->id, $status);
                }
                $this->fail('Transisi status tidak valid seharusnya ditolak');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('status', $e->errors);
            }
        }
    }

    public function testDisplayAntreanMengelompokkanPerPoliDanMenyamarkanNamaPasien(): void
    {
        $pasien1 = (new PasienService())->create([
            'nik' => '3201010101900011',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $pasien2 = (new PasienService())->create([
            'nik' => '3201010101900012',
            'nama' => 'Siti Aminah',
            'tgl_lahir' => '1992-03-04',
            'jenis_kelamin' => 'P',
        ]);
        $dokter = (new DokterService())->create([
            'kode' => 'DR-DISP',
            'nama' => 'dr. Lestari',
            'sip' => 'SIP/DISP',
            'jenis_tenaga' => 'dokter',
        ]);
        $poli = (new PoliService())->create([
            'kode' => 'UMU',
            'nama' => 'Poli Umum',
            'prefix_antrean' => 'U',
            'tarif_pendaftaran' => 25000,
        ]);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 10,
        ]);

        $tgl = self::seninDepan();
        $k1 = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien1->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => $tgl,
        ]);
        $k2 = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien2->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => $tgl,
        ]);

        $service = new AntreanService();
        $service->ubahStatus($k1->id, 'diperiksa');

        $display = $service->display(['tanggal' => $tgl, 'poli_id' => $poli->id]);
        $this->assertSame($tgl, $display['tanggal']);
        $this->assertCount(1, $display['poli']);

        $group = $display['poli'][0];
        $this->assertSame('UMU', $group['poli_kode']);
        $this->assertCount(1, $group['sedang_diperiksa']);
        $this->assertSame('U-001', $group['sedang_diperiksa'][0]['kode_antrean']);
        $this->assertSame('B*** S***', $group['sedang_diperiksa'][0]['inisial_pasien']);
        $this->assertArrayNotHasKey('nik', $group['sedang_diperiksa'][0]);

        $this->assertCount(1, $group['menunggu']);
        $this->assertSame('U-002', $group['menunggu'][0]['kode_antrean']);
        $this->assertSame('S*** A***', $group['menunggu'][0]['inisial_pasien']);
        $this->assertSame(1, $group['total_menunggu']);
        $this->assertSame(0, $group['total_selesai']);
        $this->assertSame($k2->id, $group['menunggu'][0]['id']);
    }

    public function testUbahStatusMenolakDokterLainDanMengizinkanPemilik(): void
    {
        $pasien = (new PasienService())->create([
            'nik' => '3201010101900021',
            'nama' => 'Andi Wijaya',
            'tgl_lahir' => '1991-05-06',
            'jenis_kelamin' => 'L',
        ]);
        $dokterA = (new DokterService())->create([
            'kode' => 'DR-A1',
            'nama' => 'dr. Pemilik',
            'sip' => 'SIP/A1',
            'jenis_tenaga' => 'dokter',
        ]);
        $dokterB = (new DokterService())->create([
            'kode' => 'DR-B1',
            'nama' => 'dr. Lain',
            'sip' => 'SIP/B1',
            'jenis_tenaga' => 'dokter',
        ]);
        $poli = (new PoliService())->create([
            'kode' => 'POLI-IDOR',
            'nama' => 'Poli Umum',
            'prefix_antrean' => 'U',
            'tarif_pendaftaran' => 25000,
        ]);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokterA->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 10,
        ]);
        $kunjungan = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);

        $service = new AntreanService();
        try {
            $service->ubahStatus($kunjungan->id, 'diperiksa', $dokterB->id);
            $this->fail('Dokter lain seharusnya ditolak 403');
        } catch (ForbiddenHttpException $e) {
            $this->assertSame('Kunjungan ini bukan pasien Anda.', $e->getMessage());
        }

        // Dokter pemilik dan petugas non-dokter (dokterId null) tetap diizinkan.
        $diperiksa = $service->ubahStatus($kunjungan->id, 'diperiksa', $dokterA->id);
        $this->assertSame('diperiksa', $diperiksa->status);

        $selesai = $service->ubahStatus($kunjungan->id, 'selesai', null);
        $this->assertSame('selesai', $selesai->status);
    }

    public function testBatalMenolakJikaResepDiserahkanAtauAdaInvoice(): void
    {
        $poli = (new PoliService())->create([
            'kode' => 'POLI-BTL',
            'nama' => 'Poli Batal',
            'prefix_antrean' => 'B',
            'tarif_pendaftaran' => 25000,
        ]);
        $dokter = (new DokterService())->create([
            'kode' => 'DR-BTL',
            'nama' => 'dr. Batal',
            'sip' => 'SIP/BTL',
            'jenis_tenaga' => 'dokter',
        ]);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 10,
        ]);
        $obatSvc = new ObatService();
        $obat = $obatSvc->create(['kode' => 'OBT-BTL', 'nama' => 'Paracetamol', 'satuan' => 'tablet', 'harga' => 1000]);
        $obatSvc->sesuaikanStok($obat->id, ['stok_baru' => 20]);

        $pasienSvc = new PasienService();
        $daftarSvc = new PendaftaranService();
        $antreanSvc = new AntreanService();
        $tgl = self::seninDepan();

        // Kunjungan 1: resep sudah diserahkan -> batal ditolak 409.
        $p1 = $pasienSvc->create(['nik' => '3201010101900031', 'nama' => 'Pasien Resep', 'tgl_lahir' => '1990-01-01', 'jenis_kelamin' => 'L']);
        $k1 = $daftarSvc->daftar(['pasien_id' => $p1->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => $tgl]);
        $antreanSvc->ubahStatus($k1->id, 'diperiksa');
        $resep = (new ResepService())->buat([
            'kunjungan_id' => $k1->id,
            'items' => [['obat_id' => $obat->id, 'dosis' => '500mg', 'frekuensi' => '3x1', 'jumlah' => 2]],
        ], $dokter->id);
        $farmasiSvc = new FarmasiService();
        $farmasiSvc->proses($resep->id);
        $farmasiSvc->serahkan($resep->id);
        try {
            $antreanSvc->ubahStatus($k1->id, 'batal');
            $this->fail('Kunjungan dengan resep diserahkan seharusnya tidak dapat dibatalkan');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('resep', strtolower($e->getMessage()));
        }

        // Kunjungan 2: sudah memiliki invoice -> batal ditolak 409.
        $p2 = $pasienSvc->create(['nik' => '3201010101900032', 'nama' => 'Pasien Invoice', 'tgl_lahir' => '1990-01-02', 'jenis_kelamin' => 'P']);
        $k2 = $daftarSvc->daftar(['pasien_id' => $p2->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => $tgl]);
        $antreanSvc->ubahStatus($k2->id, 'diperiksa');
        (new InvoiceService())->buat($k2->id);
        try {
            $antreanSvc->ubahStatus($k2->id, 'batal');
            $this->fail('Kunjungan ber-invoice seharusnya tidak dapat dibatalkan');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('invoice', strtolower($e->getMessage()));
        }

        // Kunjungan 3 & 4: tanpa resep diserahkan dan tanpa invoice -> menunggu/diperiksa ke batal tetap normal.
        $p3 = $pasienSvc->create(['nik' => '3201010101900033', 'nama' => 'Pasien Batal 1', 'tgl_lahir' => '1990-01-03', 'jenis_kelamin' => 'L']);
        $k3 = $daftarSvc->daftar(['pasien_id' => $p3->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => $tgl]);
        $this->assertSame('batal', $antreanSvc->ubahStatus($k3->id, 'batal')->status);

        $p4 = $pasienSvc->create(['nik' => '3201010101900034', 'nama' => 'Pasien Batal 2', 'tgl_lahir' => '1990-01-04', 'jenis_kelamin' => 'P']);
        $k4 = $daftarSvc->daftar(['pasien_id' => $p4->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => $tgl]);
        $antreanSvc->ubahStatus($k4->id, 'diperiksa');
        $this->assertSame('batal', $antreanSvc->ubahStatus($k4->id, 'batal')->status);
    }
}
