<?php

namespace app\tests\unit\transaction\resep;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\obat\Obat;
use app\modules\master\obat\ObatService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\modules\transaction\resep\FarmasiService;
use app\modules\transaction\resep\Resep;
use app\modules\transaction\resep\ResepService;
use app\tests\TestCase;
use Yii;
use yii\db\IntegrityException;
use yii\web\ConflictHttpException;
use yii\web\ForbiddenHttpException;

/**
 * Uji resep dokter dan pelayanan farmasi (poin 6.2 dan seterusnya).
 */
class ResepServiceTest extends TestCase
{
    /**
     * Kunjungan Senin depan untuk satu dokter dan dua obat berstok 10 dan 3.
     *
     * @return array{kunjungan: int, pasien: int, dokter: int, paracetamol: int, amoxicillin: int}
     */
    private function siapkan(): array
    {
        $poli = (new PoliService())->create(['kode' => 'POLI-UMUM', 'nama' => 'Poli Umum', 'prefix_antrean' => 'U', 'tarif_pendaftaran' => 25000]);
        $dokter = (new DokterService())->create(['kode' => 'DR001', 'nama' => 'dr. Uji', 'sip' => 'SIP/001', 'jenis_tenaga' => 'dokter']);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id, 'poli_id' => $poli->id, 'hari' => 1,
            'jam_mulai' => '08:00', 'jam_selesai' => '12:00', 'kuota' => 10,
        ]);
        $pasien = (new PasienService())->create(['nik' => '3201010101900001', 'nama' => 'Budi', 'tgl_lahir' => '1990-01-01', 'jenis_kelamin' => 'L']);
        $kunjungan = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => self::seninDepan(),
        ]);
        $obatService = new ObatService();
        $obat = [];
        foreach ([['OBT01', 'Paracetamol 500mg', 500, 10], ['OBT02', 'Amoxicillin 500mg', 1500, 3]] as [$kode, $nama, $harga, $stok]) {
            $o = $obatService->create(['kode' => $kode, 'nama' => $nama, 'satuan' => 'tablet', 'harga' => $harga]);
            $obatService->sesuaikanStok($o->id, ['stok_baru' => $stok]);
            $obat[] = $o->id;
        }

        return [
            'kunjungan' => $kunjungan->id, 'pasien' => $pasien->id, 'dokter' => $dokter->id,
            'paracetamol' => $obat[0], 'amoxicillin' => $obat[1],
        ];
    }

    public function testBuatResepValidasiStokDanSnapshotHarga(): void
    {
        $d = $this->siapkan();
        $service = new ResepService();
        $item = fn (int $obatId, int $jumlah) => ['obat_id' => $obatId, 'dosis' => '500mg', 'frekuensi' => '3x1', 'jumlah' => $jumlah];

        try {
            $service->buat(['kunjungan_id' => $d['kunjungan'], 'items' => [$item($d['paracetamol'], 5), $item($d['amoxicillin'], 4)]], $d['dokter']);
            $this->fail('Jumlah melebihi stok seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertStringContainsString('Amoxicillin 500mg', $e->errors['items.1'][0]);
        }
        foreach ([[], [$item($d['paracetamol'], 1), $item($d['paracetamol'], 2)], [$item($d['paracetamol'], 0)]] as $salah) {
            try {
                $service->buat(['kunjungan_id' => $d['kunjungan'], 'items' => $salah], $d['dokter']);
                $this->fail('Isian resep tidak valid seharusnya ditolak');
            } catch (ValidationException) {
            }
        }
        try {
            $service->buat(['kunjungan_id' => $d['kunjungan'], 'items' => [$item($d['paracetamol'], 1)]], $d['dokter'] + 1);
            $this->fail('Dokter lain seharusnya ditolak');
        } catch (ForbiddenHttpException) {
        }

        $resep = $service->buat([
            'kunjungan_id' => $d['kunjungan'],
            'items' => [$item($d['paracetamol'], 10), $item($d['amoxicillin'], 3)],
        ], $d['dokter']);
        $data = $resep->toArray();
        $this->assertSame('baru', $data['status']);
        $this->assertMatchesRegularExpression('/^RSP\d{8}\d{4}$/', $data['no_resep']);
        $this->assertSame(9500.0, $data['total']);

        (new ObatService())->update($d['paracetamol'], ['harga' => 900]);
        $daftar = $service->daftarPerKunjungan($d['kunjungan'], $d['dokter']);
        $this->assertSame(500.0, $daftar[0]['details'][0]['harga']);
        $this->assertSame(10, $daftar[0]['details'][0]['obat']['stok']);
    }

    public function testProsesDanSerahkanMengurangiStokAtomikDanMencatatMutasi(): void
    {
        $d = $this->siapkan();
        $item = fn (int $obatId, int $jumlah) => ['obat_id' => $obatId, 'dosis' => '1 tab', 'frekuensi' => '3x1', 'jumlah' => $jumlah];
        $resep1 = (new ResepService())->buat(['kunjungan_id' => $d['kunjungan'], 'items' => [$item($d['paracetamol'], 4), $item($d['amoxicillin'], 3)]], $d['dokter']);
        $resep2 = (new ResepService())->buat(['kunjungan_id' => $d['kunjungan'], 'items' => [$item($d['paracetamol'], 2), $item($d['amoxicillin'], 1)]], $d['dokter']);
        $farmasi = new FarmasiService();

        $this->assertSame([$resep1->id, $resep2->id], array_column($farmasi->antrean([]), 'id'));

        try {
            $farmasi->serahkan($resep1->id);
            $this->fail('Resep yang belum diproses seharusnya tidak bisa diserahkan');
        } catch (ConflictHttpException) {
        }
        $this->assertSame(10, (int) Obat::findOne($d['paracetamol'])->stok);

        $farmasi->proses($resep1->id);
        $diserahkan = $farmasi->serahkan($resep1->id)->toArray();
        $this->assertSame('diserahkan', $diserahkan['status']);
        $this->assertNotNull($diserahkan['diserahkan_at']);
        $this->assertSame(6, (int) Obat::findOne($d['paracetamol'])->stok);
        $this->assertSame(0, (int) Obat::findOne($d['amoxicillin'])->stok);
        $mutasi = (new ObatService())->listMutasi($d['paracetamol']);
        $this->assertSame('keluar', $mutasi[0]['jenis']);
        $this->assertSame(-4, (int) $mutasi[0]['qty']);

        // Stok amoxicillin habis: penyerahan resep kedua gagal seluruhnya, paracetamol tidak ikut berkurang.
        $farmasi->proses($resep2->id);
        try {
            $farmasi->serahkan($resep2->id);
            $this->fail('Stok tidak cukup seharusnya ditolak');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('Amoxicillin', $e->getMessage());
        }
        $this->assertSame(6, (int) Obat::findOne($d['paracetamol'])->stok);
        $this->assertSame('diproses', Resep::findOne($resep2->id)->status);

        $this->expectException(ConflictHttpException::class);
        $farmasi->serahkan($resep1->id);
    }

    public function testCheckConstraintStokTidakMinusSebagaiPengamanTerakhir(): void
    {
        $d = $this->siapkan();

        $this->expectException(IntegrityException::class);
        Yii::$app->db->createCommand('UPDATE m_obat SET stok = stok - 11 WHERE id = :id', [':id' => $d['paracetamol']])->execute();
    }

    public function testRiwayatObatDanRiwayatMedisMemuatResep(): void
    {
        $d = $this->siapkan();
        $service = new ResepService();
        $this->assertSame([], $service->riwayatObat($d['pasien']));

        $service->buat(['kunjungan_id' => $d['kunjungan'], 'items' => [
            ['obat_id' => $d['paracetamol'], 'dosis' => '1 tab', 'frekuensi' => '3x1', 'jumlah' => 6],
        ]], $d['dokter']);

        $riwayat = $service->riwayatObat($d['pasien']);
        $this->assertCount(1, $riwayat);
        $this->assertSame('Paracetamol 500mg', $riwayat[0]['resep'][0]['details'][0]['obat']['nama']);
        $this->assertSame(6, $riwayat[0]['resep'][0]['details'][0]['jumlah']);

        $medis = (new PemeriksaanService())->riwayatMedis($d['pasien']);
        $this->assertCount(1, $medis[0]['resep']);
    }

    public function testProsesDanSerahkanMenolakJikaKunjunganDibatalkan(): void
    {
        $d = $this->siapkan();
        $resepSvc = new ResepService();
        $farmasi = new FarmasiService();
        $antrean = new AntreanService();
        $item = fn (int $obatId, int $jumlah) => ['obat_id' => $obatId, 'dosis' => '1 tab', 'frekuensi' => '3x1', 'jumlah' => $jumlah];

        $resep1 = $resepSvc->buat(['kunjungan_id' => $d['kunjungan'], 'items' => [$item($d['paracetamol'], 3)]], $d['dokter']);
        $resep2 = $resepSvc->buat(['kunjungan_id' => $d['kunjungan'], 'items' => [$item($d['paracetamol'], 2)]], $d['dokter']);
        $farmasi->proses($resep1->id);

        // Kunjungan dibatalkan sebelum obat diserahkan.
        $antrean->ubahStatus($d['kunjungan'], 'batal');

        try {
            $farmasi->serahkan($resep1->id);
            $this->fail('Penyerahan obat pada kunjungan batal seharusnya ditolak 409');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('dibatalkan', strtolower($e->getMessage()));
        }
        $this->assertSame(10, (int) Obat::findOne($d['paracetamol'])->stok);
        $this->assertSame(Resep::STATUS_DIPROSES, Resep::findOne($resep1->id)->status);

        try {
            $farmasi->proses($resep2->id);
            $this->fail('Pemrosesan resep pada kunjungan batal seharusnya ditolak 409');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('dibatalkan', strtolower($e->getMessage()));
        }
        $this->assertSame(Resep::STATUS_BARU, Resep::findOne($resep2->id)->status);
    }

    public function testAntreanFilterTanggalMenggunakanRentangWaktu(): void
    {
        $d = $this->siapkan();
        $resep = (new ResepService())->buat([
            'kunjungan_id' => $d['kunjungan'],
            'items' => [['obat_id' => $d['paracetamol'], 'dosis' => '1 tab', 'frekuensi' => '3x1', 'jumlah' => 1]],
        ], $d['dokter']);
        $farmasi = new FarmasiService();

        $hariIni = date('Y-m-d');
        $besok = date('Y-m-d', strtotime('+1 day'));

        $this->assertSame([$resep->id], array_column($farmasi->antrean(['tanggal' => $hariIni]), 'id'));
        $this->assertSame([], $farmasi->antrean(['tanggal' => $besok]));
        $this->assertSame([], $farmasi->antrean(['tanggal' => 'bukan-tanggal']));
    }
}
