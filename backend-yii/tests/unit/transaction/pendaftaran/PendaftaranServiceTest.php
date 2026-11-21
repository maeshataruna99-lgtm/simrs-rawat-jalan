<?php

namespace app\tests\unit\transaction\pendaftaran;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;
use yii\web\ConflictHttpException;

/**
 * Uji pencarian pasien dan pendaftaran kunjungan rawat jalan (poin 3.2 dan 3.3).
 */
class PendaftaranServiceTest extends TestCase
{
    public function testCariPasienBerdasarkanRmNikDanNama(): void
    {
        $pasienService = new PasienService();
        $p1 = $pasienService->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $pasienService->create([
            'nik' => '3201010101920002',
            'nama' => 'Siti Aminah',
            'tgl_lahir' => '1992-05-10',
            'jenis_kelamin' => 'P',
        ]);

        $service = new PendaftaranService();

        $byRm = $service->cariPasien($p1->no_rm);
        $this->assertCount(1, $byRm);
        $this->assertSame('Budi Santoso', $byRm[0]['nama']);

        $byNik = $service->cariPasien('3201010101920002');
        $this->assertCount(1, $byNik);
        $this->assertSame('Siti Aminah', $byNik[0]['nama']);

        $byNama = $service->cariPasien('Santoso');
        $this->assertCount(1, $byNama);
    }

    public function testPendaftaranSesuaiJadwalAntreanBerurutanDanKuotaPenuhDitolak(): void
    {
        $pasienService = new PasienService();
        $p1 = $pasienService->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $p2 = $pasienService->create([
            'nik' => '3201010101920002',
            'nama' => 'Siti Aminah',
            'tgl_lahir' => '1992-05-10',
            'jenis_kelamin' => 'P',
        ]);
        $p3 = $pasienService->create([
            'nik' => '3201010101930003',
            'nama' => 'Andi Wijaya',
            'tgl_lahir' => '1993-03-03',
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

        // 2026-11-23 adalah hari Senin (hari = 1), kuota = 2.
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 2,
        ]);

        $service = new PendaftaranService();

        $k1 = $service->daftar([
            'pasien_id' => $p1->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => '2026-11-23',
        ]);
        $k2 = $service->daftar([
            'pasien_id' => $p2->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => '2026-11-23',
        ]);

        $this->assertSame(1, $k1->no_antrean);
        $this->assertSame(2, $k2->no_antrean);

        // Pasien ke-3 pada jadwal yang kuotanya 2 harus ditolak.
        $this->expectException(ValidationException::class);
        $service->daftar([
            'pasien_id' => $p3->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => '2026-11-23',
        ]);
    }

    public function testPendaftaranDiLuarHariJadwalAtauGandaDitolak(): void
    {
        $p1 = (new PasienService())->create([
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
        $jadwalSenin = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 10,
        ]);

        $service = new PendaftaranService();

        // 2026-11-24 adalah hari Selasa (bukan Senin).
        try {
            $service->daftar([
                'pasien_id' => $p1->id,
                'jadwal_id' => $jadwalSenin->id,
                'tgl_kunjungan' => '2026-11-24',
            ]);
            $this->fail('Pendaftaran di luar hari jadwal seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('tgl_kunjungan', $e->errors);
        }

        // Daftar di hari Senin berhasil, daftar kedua kali di poli dan tanggal yang sama ditolak 409.
        $service->daftar([
            'pasien_id' => $p1->id,
            'jadwal_id' => $jadwalSenin->id,
            'tgl_kunjungan' => '2026-11-23',
        ]);

        $this->expectException(ConflictHttpException::class);
        $service->daftar([
            'pasien_id' => $p1->id,
            'jadwal_id' => $jadwalSenin->id,
            'tgl_kunjungan' => '2026-11-23',
        ]);
    }
}
