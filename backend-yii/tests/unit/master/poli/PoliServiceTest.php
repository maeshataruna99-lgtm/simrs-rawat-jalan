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
    public function testKodeHurufKecilNamaGandaFilterBooleanDanAuditLog(): void
    {
        $service = new PoliService();
        $poli = $service->create(['kode' => 'poli-a', 'nama' => 'Poli A', 'prefix_antrean' => 'A', 'tarif_pendaftaran' => 0]);
        $this->assertSame('POLI-A', $poli->kode);
        $this->assertIsString($poli->toArray()['updated_at'] ?? '');

        foreach ([['kode' => 'Poli-A', 'nama' => 'Poli Lain'], ['kode' => 'POLI-B', 'nama' => 'Poli A']] as $salah) {
            try {
                $service->create($salah + ['prefix_antrean' => 'B', 'tarif_pendaftaran' => 0]);
                $this->fail('Kode beda huruf atau nama ganda seharusnya ditolak');
            } catch (ValidationException) {
            }
        }

        $this->assertSame(1, $service->list(['is_active' => 'true'])->getTotalCount());
        $this->assertSame(0, $service->list(['is_active' => 'false'])->getTotalCount());

        $service->delete($poli->id);
        $aksi = (new \yii\db\Query())->select('aksi')->from('t_audit_log')
            ->where(['tabel' => 'm_poli', 'record_id' => $poli->id])->orderBy('id')->column();
        $this->assertSame(['insert', 'delete'], $aksi);
    }

    public function testTambahPoliDanKodeGandaDitolak(): void
    {
        $service = new PoliService();
        $poli = $service->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'prefix_antrean' => 'U',
            'tarif_pendaftaran' => 25000,
        ]);

        $this->assertSame(25000.0, (float) $poli->tarif_pendaftaran);

        $this->expectException(ValidationException::class);
        $service->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum 2',
            'prefix_antrean' => 'V',
            'tarif_pendaftaran' => 30000,
        ]);
    }

    public function testPrefixAntreanDijadikanHurufBesarDanGandaDitolak(): void
    {
        $service = new PoliService();
        $poli = $service->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'prefix_antrean' => 'u',
            'tarif_pendaftaran' => 25000,
        ]);
        $this->assertSame('U', $poli->prefix_antrean);

        $this->expectException(ValidationException::class);
        $service->create([
            'kode' => 'POLI-UROLOGI',
            'nama' => 'Poli Urologi',
            'prefix_antrean' => 'U',
            'tarif_pendaftaran' => 30000,
        ]);
    }

    public function testPrefixAntreanLebihDariSatuHurufDitolak(): void
    {
        $this->expectException(ValidationException::class);
        (new PoliService())->create([
            'kode' => 'POLI-GIGI',
            'nama' => 'Poli Gigi',
            'prefix_antrean' => 'G1',
            'tarif_pendaftaran' => 35000,
        ]);
    }

    public function testTarifNegatifDitolak(): void
    {
        $this->expectException(ValidationException::class);
        (new PoliService())->create([
            'kode' => 'POLI-GIGI',
            'nama' => 'Poli Gigi',
            'prefix_antrean' => 'G',
            'tarif_pendaftaran' => -1000,
        ]);
    }
}
