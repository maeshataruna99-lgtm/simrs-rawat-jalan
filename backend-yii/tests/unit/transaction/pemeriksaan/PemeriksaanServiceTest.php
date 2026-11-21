<?php

namespace app\tests\unit\transaction\pemeriksaan;

use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;

/**
 * Uji worklist dan penyimpanan pemeriksaan dokter (poin 4.2 dan seterusnya).
 */
class PemeriksaanServiceTest extends TestCase
{
    /**
     * Membuat dua dokter dengan jadwal Senin, lalu tiga kunjungan: dua milik dokter pertama, satu milik dokter kedua.
     *
     * @return array{dokter1: int, dokter2: int, kunjungan: int[]}
     */
    private function siapkanKunjungan(): array
    {
        $poli = (new PoliService())->create(['kode' => 'POLI-UMUM', 'nama' => 'Poli Umum', 'tarif_pendaftaran' => 25000]);
        $jadwal = [];
        $dokter = [];
        foreach ([1, 2] as $i) {
            $d = (new DokterService())->create([
                'kode' => "DR00{$i}", 'nama' => "dr. Uji {$i}", 'sip' => "SIP/00{$i}", 'jenis_tenaga' => 'dokter',
            ]);
            $dokter[] = $d->id;
            $jadwal[] = (new JadwalDokterService())->create([
                'dokter_id' => $d->id, 'poli_id' => $poli->id, 'hari' => 1,
                'jam_mulai' => '08:00', 'jam_selesai' => '12:00', 'kuota' => 10,
            ])->id;
        }

        $kunjungan = [];
        foreach ([0, 0, 1] as $i => $idx) {
            $pasien = (new PasienService())->create([
                'nik' => '320101010190000' . $i, 'nama' => "Pasien {$i}", 'tgl_lahir' => '1990-01-01', 'jenis_kelamin' => 'L',
            ]);
            $kunjungan[] = (new PendaftaranService())->daftar([
                'pasien_id' => $pasien->id, 'jadwal_id' => $jadwal[$idx], 'tgl_kunjungan' => self::seninDepan(),
            ])->id;
        }

        return ['dokter1' => $dokter[0], 'dokter2' => $dokter[1], 'kunjungan' => $kunjungan];
    }

    public function testWorklistHanyaPasienDokterSendiriYangMenungguAtauDiperiksa(): void
    {
        $data = $this->siapkanKunjungan();
        $antrean = new AntreanService();
        $antrean->ubahStatus($data['kunjungan'][0], 'diperiksa');
        $antrean->ubahStatus($data['kunjungan'][1], 'batal');

        $service = new PemeriksaanService();

        $milikDokter1 = $service->worklist($data['dokter1'], self::seninDepan());
        $this->assertSame([$data['kunjungan'][0]], array_column($milikDokter1, 'id'));
        $this->assertSame('diperiksa', $milikDokter1[0]['status']);

        $milikDokter2 = $service->worklist($data['dokter2'], self::seninDepan());
        $this->assertSame([$data['kunjungan'][2]], array_column($milikDokter2, 'id'));

        $this->assertCount(2, $service->worklist(null, self::seninDepan()));
        $this->assertCount(0, $service->worklist($data['dokter1'], self::seninDepan(1)));
    }
}
