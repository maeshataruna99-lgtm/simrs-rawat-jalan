<?php

namespace app\tests\unit\transaction\pendaftaran;

use app\modules\master\pasien\PasienService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;

/**
 * Uji pencarian pasien untuk pendaftaran berdasarkan nomor RM, NIK, atau nama.
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
}
