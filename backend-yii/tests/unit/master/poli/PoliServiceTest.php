<?php

namespace app\tests\unit\master\poli;

use app\common\ValidationException;
use app\modules\master\poli\PoliService;
use app\tests\TestCase;

/**
 * Uji master poli: validasi tarif pendaftaran >= 0 dan pencegahan duplikasi kode.
 */
class PoliServiceTest extends TestCase
{
    public function testTambahPoliDanKodeGandaDitolak(): void
    {
        $service = new PoliService();
        $poli = $service->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'tarif_pendaftaran' => 25000,
        ]);

        $this->assertSame(25000.0, (float) $poli->tarif_pendaftaran);

        $this->expectException(ValidationException::class);
        $service->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum 2',
            'tarif_pendaftaran' => 30000,
        ]);
    }

    public function testTarifNegatifDitolak(): void
    {
        $this->expectException(ValidationException::class);
        (new PoliService())->create([
            'kode' => 'POLI-GIGI',
            'nama' => 'Poli Gigi',
            'tarif_pendaftaran' => -1000,
        ]);
    }
}
