<?php

namespace app\tests\unit\master\lab;

use app\common\ValidationException;
use app\modules\master\lab\PemeriksaanLabService;
use app\tests\TestCase;

/**
 * Uji master pemeriksaan laboratorium: penyimpanan tarif dan nilai rujukan serta pencegahan kode ganda.
 */
class PemeriksaanLabServiceTest extends TestCase
{
    public function testTambahPemeriksaanLabDanKodeGandaDitolak(): void
    {
        $service = new PemeriksaanLabService();
        $lab = $service->create([
            'kode' => 'LAB-HB',
            'nama' => 'Hemoglobin',
            'satuan' => 'g/dL',
            'nilai_rujukan' => '12.0 - 16.0',
            'tarif' => 45000,
        ]);

        $this->assertSame('12.0 - 16.0', $lab->nilai_rujukan);
        $this->assertSame(45000.0, (float) $lab->tarif);

        $this->expectException(ValidationException::class);
        $service->create([
            'kode' => 'LAB-HB',
            'nama' => 'Hemoglobin Duplikat',
            'tarif' => 50000,
        ]);
    }
}
