<?php

namespace app\tests\unit\transaction\antrean;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;

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
        $list = $antreanService->list(['poli_id' => $poli->id, 'tanggal' => self::seninDepan()]);
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
        $this->assertSame('UMU-001', $group['sedang_diperiksa'][0]['kode_antrean']);
        $this->assertSame('B*** S***', $group['sedang_diperiksa'][0]['inisial_pasien']);
        $this->assertArrayNotHasKey('nik', $group['sedang_diperiksa'][0]);

        $this->assertCount(1, $group['menunggu']);
        $this->assertSame('UMU-002', $group['menunggu'][0]['kode_antrean']);
        $this->assertSame('S*** A***', $group['menunggu'][0]['inisial_pasien']);
        $this->assertSame(1, $group['total_menunggu']);
        $this->assertSame(0, $group['total_selesai']);
        $this->assertSame($k2->id, $group['menunggu'][0]['id']);
    }
}
