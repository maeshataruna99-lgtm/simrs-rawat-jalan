<?php

namespace app\tests\unit\master\tindakan;

use app\common\ValidationException;
use app\modules\master\poli\PoliService;
use app\modules\master\tindakan\TindakanService;
use app\tests\TestCase;

/**
 * Uji master tindakan medis: filter per poli, validasi tarif, dan duplikasi kode.
 */
class TindakanServiceTest extends TestCase
{
    public function testTambahDanFilterBerdasarkanPoli(): void
    {
        $poliService = new PoliService();
        $poliGigi = $poliService->create([
            'kode' => 'POLI-GIGI',
            'nama' => 'Poli Gigi',
            'tarif_pendaftaran' => 30000,
        ]);
        $poliUmum = $poliService->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'tarif_pendaftaran' => 25000,
        ]);

        $service = new TindakanService();
        $service->create([
            'kode' => 'TDK001',
            'nama' => 'Scaling Gigi',
            'tarif' => 150000,
            'poli_id' => $poliGigi->id,
        ]);
        $service->create([
            'kode' => 'TDK002',
            'nama' => 'Nebulizer',
            'tarif' => 75000,
            'poli_id' => $poliUmum->id,
        ]);

        $this->assertSame(1, $service->list(['poli_id' => $poliGigi->id])->getTotalCount());
        $this->assertSame(1, $service->list(['q' => 'Scaling'])->getTotalCount());
    }

    public function testKodeGandaAtauTarifNegatifDitolak(): void
    {
        $service = new TindakanService();
        $service->create(['kode' => 'TDK001', 'nama' => 'Jahit Luka', 'tarif' => 50000]);

        $this->expectException(ValidationException::class);
        $service->create(['kode' => 'TDK001', 'nama' => 'Duplikat', 'tarif' => 60000]);
    }
}
