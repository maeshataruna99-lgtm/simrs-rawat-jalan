<?php

namespace app\tests\unit\master\obat;

use app\common\ValidationException;
use app\modules\master\obat\ObatService;
use app\tests\TestCase;

/**
 * Uji master obat: stok tidak bisa diubah lewat CRUD dan perubahan stok manual tercatat di t_stok_mutasi.
 */
class ObatServiceTest extends TestCase
{
    public function testStokTidakBisaDiubahLewatCrud(): void
    {
        $service = new ObatService();
        $obat = $service->create([
            'kode' => 'OBT001',
            'nama' => 'Paracetamol 500mg',
            'satuan' => 'tablet',
            'harga' => 1500,
            'stok' => 999,
        ]);

        $this->assertSame(0, (int) $obat->stok);

        $updated = $service->update($obat->id, [
            'nama' => 'Paracetamol 500 mg Tablet',
            'stok' => 500,
        ]);
        $this->assertSame(0, (int) $updated->stok);
    }

    public function testPenyesuaianStokTercatatDiMutasiDanCegahMinus(): void
    {
        $service = new ObatService();
        $obat = $service->create([
            'kode' => 'OBT001',
            'nama' => 'Amoxicillin 500mg',
            'satuan' => 'kapsul',
            'harga' => 2500,
        ]);

        $afterIn = $service->sesuaikanStok($obat->id, [
            'qty' => 100,
            'referensi' => 'Stok awal opname',
        ]);
        $this->assertSame(100, (int) $afterIn->stok);

        $afterAdjust = $service->sesuaikanStok($obat->id, [
            'stok_baru' => 85,
            'referensi' => 'Koreksi fisik',
        ]);
        $this->assertSame(85, (int) $afterAdjust->stok);

        $mutasi = $service->listMutasi($obat->id);
        $this->assertCount(2, $mutasi);
        $this->assertSame('penyesuaian', $mutasi[0]['jenis']);
        $this->assertSame(-15, $mutasi[0]['qty']);
        $this->assertSame(100, $mutasi[0]['stok_sebelum']);
        $this->assertSame(85, $mutasi[0]['stok_sesudah']);

        $this->expectException(ValidationException::class);
        $service->sesuaikanStok($obat->id, ['qty' => -100]);
    }
}
