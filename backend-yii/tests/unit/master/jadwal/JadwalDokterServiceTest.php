<?php

namespace app\tests\unit\master\jadwal;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\poli\PoliService;
use app\tests\TestCase;

/**
 * Uji master jadwal dokter: penyimpanan jadwal dan penolakan jadwal bentrok.
 */
class JadwalDokterServiceTest extends TestCase
{
    private int $dokterId;
    private int $otherDokterId;
    private int $poliUmumId;
    private int $poliAnakId;

    protected function setUp(): void
    {
        parent::setUp();
        $dokterService = new DokterService();
        $this->dokterId = $dokterService->create([
            'kode' => 'DR001',
            'nama' => 'dr. Budi',
            'sip' => 'SIP/001/2026',
            'jenis_tenaga' => 'dokter',
        ])->id;
        $this->otherDokterId = $dokterService->create([
            'kode' => 'DR002',
            'nama' => 'dr. Rina',
            'sip' => 'SIP/002/2026',
            'jenis_tenaga' => 'dokter',
        ])->id;

        $poliService = new PoliService();
        $this->poliUmumId = $poliService->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'tarif_pendaftaran' => 25000,
        ])->id;
        $this->poliAnakId = $poliService->create([
            'kode' => 'POLI-ANAK',
            'nama' => 'Poli Anak',
            'tarif_pendaftaran' => 30000,
        ])->id;
    }

    public function testJadwalBerurutanAtauHariBerbedaDiizinkan(): void
    {
        $service = new JadwalDokterService();

        $pagi = $service->create([
            'dokter_id' => $this->dokterId,
            'poli_id' => $this->poliUmumId,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 20,
        ]);
        $siang = $service->create([
            'dokter_id' => $this->dokterId,
            'poli_id' => $this->poliAnakId,
            'hari' => 1,
            'jam_mulai' => '12:00',
            'jam_selesai' => '15:00',
            'kuota' => 15,
        ]);
        $dokterLain = $service->create([
            'dokter_id' => $this->otherDokterId,
            'poli_id' => $this->poliUmumId,
            'hari' => 1,
            'jam_mulai' => '09:00',
            'jam_selesai' => '11:00',
            'kuota' => 10,
        ]);

        $this->assertNotNull($pagi->id);
        $this->assertNotNull($siang->id);
        $this->assertNotNull($dokterLain->id);
    }

    public function testJadwalBentrokDokterYangSamaDiHariYangSamaDitolak(): void
    {
        $service = new JadwalDokterService();
        $service->create([
            'dokter_id' => $this->dokterId,
            'poli_id' => $this->poliUmumId,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 20,
        ]);

        try {
            $service->create([
                'dokter_id' => $this->dokterId,
                'poli_id' => $this->poliAnakId,
                'hari' => 1,
                'jam_mulai' => '10:00',
                'jam_selesai' => '14:00',
                'kuota' => 15,
            ]);
            $this->fail('Jadwal bentrok seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('jam_mulai', $e->errors);
        }
    }

    public function testJamSelesaiSebelumJamMulaiDitolak(): void
    {
        $this->expectException(ValidationException::class);
        (new JadwalDokterService())->create([
            'dokter_id' => $this->dokterId,
            'poli_id' => $this->poliUmumId,
            'hari' => 2,
            'jam_mulai' => '14:00',
            'jam_selesai' => '10:00',
            'kuota' => 10,
        ]);
    }
}
