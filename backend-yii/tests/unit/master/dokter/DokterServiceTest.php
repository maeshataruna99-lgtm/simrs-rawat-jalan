<?php

namespace app\tests\unit\master\dokter;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\tests\TestCase;

/**
 * Uji master dokter dan tenaga medis: duplikasi kode/SIP dan filter per jenis tenaga serta spesialis.
 */
class DokterServiceTest extends TestCase
{
    public function testTambahDanFilterJenisTenagaSertaSpesialis(): void
    {
        $service = new DokterService();

        $service->create([
            'kode' => 'DR001',
            'nama' => 'dr. Budi Santoso, Sp.PD',
            'sip' => 'SIP/001/2026',
            'spesialis' => 'Penyakit Dalam',
            'jenis_tenaga' => 'dokter',
        ]);
        $service->create([
            'kode' => 'DR002',
            'nama' => 'dr. Rina Wijaya, Sp.A',
            'sip' => 'SIP/002/2026',
            'spesialis' => 'Anak',
            'jenis_tenaga' => 'dokter',
        ]);
        $service->create([
            'kode' => 'PR001',
            'nama' => 'Ns. Sinta',
            'sip' => 'SIPP/001/2026',
            'jenis_tenaga' => 'perawat',
        ]);

        $this->assertSame(2, $service->list(['jenis_tenaga' => 'dokter'])->getTotalCount());
        $this->assertSame(1, $service->list(['jenis_tenaga' => 'perawat'])->getTotalCount());
        $this->assertSame(1, $service->list(['spesialis' => 'Penyakit Dalam'])->getTotalCount());
    }

    public function testDokterDanPoliYangMasihPunyaJadwalTidakBisaDihapus(): void
    {
        $dokter = (new DokterService())->create(['kode' => 'DR010', 'nama' => 'dr. Jadwal', 'sip' => 'SIP/010', 'jenis_tenaga' => 'dokter']);
        $poli = (new \app\modules\master\poli\PoliService())->create(['kode' => 'POLI-J', 'nama' => 'Poli Jadwal', 'prefix_antrean' => 'J', 'tarif_pendaftaran' => 0]);
        (new \app\modules\master\jadwal\JadwalDokterService())->create([
            'dokter_id' => $dokter->id, 'poli_id' => $poli->id, 'hari' => 1,
            'jam_mulai' => '08:00', 'jam_selesai' => '12:00', 'kuota' => 5,
        ]);

        foreach ([[new DokterService(), $dokter->id], [new \app\modules\master\poli\PoliService(), $poli->id]] as [$svc, $id]) {
            try {
                $svc->delete($id);
                $this->fail('Data yang masih dipakai jadwal seharusnya tidak bisa dihapus');
            } catch (\yii\web\ConflictHttpException) {
            }
        }
        $this->assertNotNull((new DokterService())->find($dokter->id));
    }

    public function testKodeAtauSipGandaDitolak(): void
    {
        $service = new DokterService();
        $service->create([
            'kode' => 'DR001',
            'nama' => 'dr. Budi',
            'sip' => 'SIP/001/2026',
            'jenis_tenaga' => 'dokter',
        ]);

        $this->expectException(ValidationException::class);
        $service->create([
            'kode' => 'DR002',
            'nama' => 'dr. Lain',
            'sip' => 'SIP/001/2026',
            'jenis_tenaga' => 'dokter',
        ]);
    }
}
