<?php

namespace app\tests\unit\transaction\pemeriksaan;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\icd10\Icd10Service;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\Kunjungan;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;
use yii\web\ConflictHttpException;
use yii\web\ForbiddenHttpException;
use yii\web\NotFoundHttpException;

/**
 * Uji worklist dan penyimpanan pemeriksaan dokter (poin 4.2 dan seterusnya).
 */
class PemeriksaanServiceTest extends TestCase
{
    /** Parameter worklist untuk satu tanggal. */
    private static function rentang(string $tanggal): array
    {
        return ['tanggal_dari' => $tanggal, 'tanggal_sampai' => $tanggal];
    }

    /**
     * Membuat dua dokter dengan jadwal Senin, lalu tiga kunjungan: dua milik dokter pertama, satu milik dokter kedua.
     *
     * @return array{dokter1: int, dokter2: int, kunjungan: int[]}
     */
    private function siapkanKunjungan(): array
    {
        $poli = (new PoliService())->create(['kode' => 'POLI-UMUM', 'nama' => 'Poli Umum', 'prefix_antrean' => 'U', 'tarif_pendaftaran' => 25000]);
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

        $milikDokter1 = $service->worklist($data['dokter1'], self::rentang(self::seninDepan()))['items'];
        $this->assertSame([$data['kunjungan'][0]], array_column($milikDokter1, 'id'));
        $this->assertSame('diperiksa', $milikDokter1[0]['status']);

        $milikDokter2 = $service->worklist($data['dokter2'], self::rentang(self::seninDepan()))['items'];
        $this->assertSame([$data['kunjungan'][2]], array_column($milikDokter2, 'id'));

        $this->assertCount(2, $service->worklist(null, self::rentang(self::seninDepan()))['items']);
        $this->assertCount(0, $service->worklist($data['dokter1'], self::rentang(self::seninDepan(1)))['items']);
        $this->assertSame([], $service->worklist(null, ['tanggal_dari' => 'bukan-tanggal'])['items']);
    }

    public function testSimpanPemeriksaanValidasiTtvDanStatusMenjadiDiperiksa(): void
    {
        $data = $this->siapkanKunjungan();
        $kunjunganId = $data['kunjungan'][0];
        $service = new PemeriksaanService();

        try {
            $service->simpan($kunjunganId, ['keluhan_utama' => 'Demam', 'suhu' => 50, 'spo2' => 120], $data['dokter1']);
            $this->fail('Tanda vital di luar range seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('suhu', $e->errors);
            $this->assertArrayHasKey('spo2', $e->errors);
        }
        $this->assertSame('menunggu', Kunjungan::findOne($kunjunganId)->status);

        try {
            $service->simpan($kunjunganId, ['keluhan_utama' => 'Demam'], $data['dokter2']);
            $this->fail('Dokter lain seharusnya tidak boleh mengisi pemeriksaan');
        } catch (ForbiddenHttpException) {
        }

        $form = ['keluhan_utama' => 'Demam 3 hari', 'td_sistolik' => 120, 'td_diastolik' => 80, 'suhu' => 38.5, 'nadi' => ''];
        $hasil = $service->simpan($kunjunganId, $form, $data['dokter1']);
        $this->assertSame(38.5, $hasil->toArray()['suhu']);
        $this->assertNull($hasil->nadi);
        $this->assertSame('diperiksa', Kunjungan::findOne($kunjunganId)->status);

        // Simpan ulang memperbarui baris yang sama, bukan membuat baru.
        $service->simpan($kunjunganId, ['keluhan_utama' => 'Demam 4 hari'], null);
        $detail = $service->detail($kunjunganId, $data['dokter1']);
        $this->assertSame('Demam 4 hari', $detail['pemeriksaan']['keluhan_utama']);
        $this->assertSame(120, $detail['pemeriksaan']['td_sistolik']);

        (new AntreanService())->ubahStatus($kunjunganId, 'selesai');
        $this->expectException(ConflictHttpException::class);
        $service->simpan($kunjunganId, ['keluhan_utama' => 'Ubah'], $data['dokter1']);
    }

    public function testDiagnosisWajibTepatSatuUtamaDanSekunderBolehBanyak(): void
    {
        $data = $this->siapkanKunjungan();
        $kunjunganId = $data['kunjungan'][0];
        $icd = [];
        foreach (['A09', 'J06.9', 'R50.9'] as $kode) {
            $icd[] = (new Icd10Service())->create(['kode' => "T{$kode}", 'nama' => "Uji {$kode}"])->id;
        }
        $service = new PemeriksaanService();

        $tanpaUtama = [['icd10_id' => $icd[0], 'jenis' => 'sekunder']];
        $duaUtama = [['icd10_id' => $icd[0], 'jenis' => 'utama'], ['icd10_id' => $icd[1], 'jenis' => 'utama']];
        $ganda = [['icd10_id' => $icd[0], 'jenis' => 'utama'], ['icd10_id' => $icd[0], 'jenis' => 'sekunder']];
        foreach ([$tanpaUtama, $duaUtama, $ganda, [], 'bukan-array'] as $items) {
            try {
                $service->simpanDiagnosis($kunjunganId, $items, $data['dokter1']);
                $this->fail('Diagnosis tidak valid seharusnya ditolak');
            } catch (ValidationException) {
            }
        }

        $rows = $service->simpanDiagnosis($kunjunganId, [
            ['icd10_id' => $icd[1], 'jenis' => 'sekunder'],
            ['icd10_id' => $icd[0], 'jenis' => 'utama'],
            ['icd10_id' => $icd[2], 'jenis' => 'sekunder'],
        ], $data['dokter1']);
        $this->assertSame(['utama', 'sekunder', 'sekunder'], array_column($rows, 'jenis'));
        $this->assertSame('TA09', $rows[0]['icd10']['kode']);

        // Simpan ulang mengganti seluruh diagnosis lama.
        $service->simpanDiagnosis($kunjunganId, [['icd10_id' => $icd[2], 'jenis' => 'utama']], null);
        $detail = $service->detail($kunjunganId, null);
        $this->assertCount(1, $detail['diagnosis']);
        $this->assertSame($icd[2], $detail['diagnosis'][0]['icd10_id']);

        // Kunjungan selesai: diagnosis terkunci.
        \Yii::$app->db->createCommand()->update('t_kunjungan', ['status' => 'selesai'], ['id' => $kunjunganId])->execute();
        $this->expectException(\yii\web\ConflictHttpException::class);
        $service->simpanDiagnosis($kunjunganId, [['icd10_id' => $icd[0], 'jenis' => 'utama']], null);
    }

    public function testRiwayatMedisBerisiPemeriksaanDanDiagnosisPerKunjungan(): void
    {
        $data = $this->siapkanKunjungan();
        $kunjunganId = $data['kunjungan'][0];
        $pasienId = Kunjungan::findOne($kunjunganId)->pasien_id;
        $icd = (new Icd10Service())->create(['kode' => 'TJ06', 'nama' => 'Uji ISPA'])->id;
        $service = new PemeriksaanService();

        $this->assertSame([null], array_column($service->riwayatMedis($pasienId), 'pemeriksaan'));

        $service->simpan($kunjunganId, ['keluhan_utama' => 'Batuk', 'suhu' => 37.5], $data['dokter1']);
        $service->simpanDiagnosis($kunjunganId, [['icd10_id' => $icd, 'jenis' => 'utama']], $data['dokter1']);

        $riwayat = $service->riwayatMedis($pasienId);
        $this->assertCount(1, $riwayat);
        $this->assertSame('Batuk', $riwayat[0]['pemeriksaan']['keluhan_utama']);
        $this->assertSame('TJ06', $riwayat[0]['diagnosis'][0]['icd10']['kode']);
        $this->assertSame('Poli Umum', $riwayat[0]['kunjungan']['poli']['nama']);

        $this->expectException(NotFoundHttpException::class);
        $service->riwayatMedis(999999);
    }

    public function testSimpanDanDiagnosisMenolakKunjunganBatal(): void
    {
        $data = $this->siapkanKunjungan();
        $kunjunganId = $data['kunjungan'][0];
        $icd = (new Icd10Service())->create(['kode' => 'TBTL', 'nama' => 'Uji Batal'])->id;
        (new AntreanService())->ubahStatus($kunjunganId, 'batal');

        $service = new PemeriksaanService();
        try {
            $service->simpan($kunjunganId, ['keluhan_utama' => 'Pusing'], $data['dokter1']);
            $this->fail('Simpan pemeriksaan pada kunjungan batal seharusnya ditolak 409');
        } catch (ConflictHttpException) {
        }

        $this->expectException(ConflictHttpException::class);
        $service->simpanDiagnosis($kunjunganId, [['icd10_id' => $icd, 'jenis' => 'utama']], $data['dokter1']);
    }
}
