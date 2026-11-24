<?php

namespace app\tests\unit\transaction\lab;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\lab\PemeriksaanLabService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\lab\OrderLab;
use app\modules\transaction\lab\OrderLabDetail;
use app\modules\transaction\lab\OrderLabService;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\Kunjungan;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;
use yii\web\ConflictHttpException;
use yii\web\ForbiddenHttpException;

/**
 * Uji order laboratorium dan input hasil idempoten (poin 7.2).
 */
class OrderLabServiceTest extends TestCase
{
    /**
     * @return array{kunjungan: int, dokter: int, gula: int, hb: int}
     */
    private function siapkan(): array
    {
        $poli = (new PoliService())->create(['kode' => 'POLI-UMUM', 'nama' => 'Poli Umum', 'prefix_antrean' => 'U', 'tarif_pendaftaran' => 25000]);
        $dokter = (new DokterService())->create(['kode' => 'DR001', 'nama' => 'dr. Uji', 'sip' => 'SIP/001', 'jenis_tenaga' => 'dokter']);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id, 'poli_id' => $poli->id, 'hari' => 1,
            'jam_mulai' => '08:00', 'jam_selesai' => '12:00', 'kuota' => 10,
        ]);
        $pasien = (new PasienService())->create(['nik' => '3201010101900001', 'nama' => 'Budi', 'tgl_lahir' => '1990-01-01', 'jenis_kelamin' => 'L']);
        $kunjungan = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => self::seninDepan(),
        ]);
        $master = new PemeriksaanLabService();
        $gula = $master->create(['kode' => 'LAB01', 'nama' => 'Gula Darah Puasa', 'satuan' => 'mg/dL', 'nilai_rujukan' => '70-110', 'tarif' => 40000]);
        $hb = $master->create(['kode' => 'LAB02', 'nama' => 'Hemoglobin', 'satuan' => 'g/dL', 'nilai_rujukan' => '12 - 16', 'tarif' => 30000]);

        return ['kunjungan' => $kunjungan->id, 'dokter' => $dokter->id, 'gula' => $gula->id, 'hb' => $hb->id];
    }

    public function testHitungFlagDariNilaiRujukan(): void
    {
        $this->assertSame('normal', OrderLabService::hitungFlag('95', '70-110'));
        $this->assertSame('tinggi', OrderLabService::hitungFlag('180', '70-110'));
        $this->assertSame('rendah', OrderLabService::hitungFlag('10,5', '12 - 16'));
        $this->assertSame('tinggi', OrderLabService::hitungFlag('7', '< 5'));
        $this->assertSame('rendah', OrderLabService::hitungFlag('30', '>40'));
        $this->assertNull(OrderLabService::hitungFlag('Negatif', '70-110'));
        $this->assertNull(OrderLabService::hitungFlag('5', 'Negatif'));
    }

    public function testOrderSnapshotTarifDanStatusSelesaiSaatSemuaHasilTerisi(): void
    {
        $d = $this->siapkan();
        $service = new OrderLabService();

        try {
            $service->buat(['kunjungan_id' => $d['kunjungan'], 'pemeriksaan_lab_ids' => []], $d['dokter']);
            $this->fail('Order tanpa pemeriksaan seharusnya ditolak');
        } catch (ValidationException) {
        }
        try {
            $service->buat(['kunjungan_id' => $d['kunjungan'], 'pemeriksaan_lab_ids' => [$d['gula']]], $d['dokter'] + 1);
            $this->fail('Dokter lain seharusnya ditolak');
        } catch (ForbiddenHttpException) {
        }

        $order = $service->buat(['kunjungan_id' => $d['kunjungan'], 'pemeriksaan_lab_ids' => [$d['gula'], $d['hb']], 'catatan_klinis' => 'DM?'], $d['dokter'])->toArray();
        $this->assertSame('diminta', $order['status']);
        $this->assertSame(70000.0, $order['total']);
        $this->assertSame('70-110', $order['details'][0]['nilai_rujukan']);
        $this->assertSame([$order['id']], array_column($service->daftar(['status' => 'diminta,diproses'])['items'], 'id'));

        [$gula, $hb] = $order['details'];
        $first = $service->simpanHasil($gula['id'], ['hasil' => '180'], 'kunci-1');
        $this->assertFalse($first['duplikat']);
        $this->assertSame('tinggi', $first['detail']->flag);
        $this->assertSame('diproses', OrderLab::findOne($order['id'])->status);

        // Key sama dikirim ulang dengan isi sama: data lama dikembalikan.
        $ulang = $service->simpanHasil($gula['id'], ['hasil' => '180'], 'kunci-1');
        $this->assertTrue($ulang['duplikat']);
        $this->assertSame('180', $ulang['detail']->hasil);

        // Key sama dengan isi berbeda ditolak, data tidak berubah.
        try {
            $service->simpanHasil($gula['id'], ['hasil' => '999'], 'kunci-1');
            $this->fail('Key sama dengan isi berbeda seharusnya ditolak');
        } catch (ConflictHttpException) {
        }
        $this->assertSame('180', OrderLabDetail::findOne($gula['id'])->hasil);

        $service->simpanHasil($hb['id'], ['hasil' => '13'], null);
        $this->assertSame('selesai', OrderLab::findOne($order['id'])->status);
        // Simpan tanpa key tidak menghapus key kiriman sebelumnya.
        $this->assertSame('kunci-1', OrderLabDetail::findOne($gula['id'])->idempotency_key);

        // Order selesai: hasil terkunci.
        try {
            $service->simpanHasil($hb['id'], ['hasil' => '14'], null);
            $this->fail('Hasil order selesai seharusnya tidak bisa diubah');
        } catch (ConflictHttpException) {
        }

        // Hasil tampil di riwayat rekam medis kunjungan tersebut.
        $pasienId = Kunjungan::findOne($d['kunjungan'])->pasien_id;
        $riwayat = (new PemeriksaanService())->riwayatMedis($pasienId);
        $this->assertSame(['180', '13'], array_column($riwayat[0]['order_lab'][0]['details'], 'hasil'));
        $this->assertSame('tinggi', $riwayat[0]['order_lab'][0]['details'][0]['flag']);

        $this->expectException(ValidationException::class);
        $service->simpanHasil($hb['id'], ['hasil' => ''], null);
    }

    public function testSimpanHasilMenolakEditSetelahOrderSelesaiDanMenjagaIdempotensi(): void
    {
        $d = $this->siapkan();
        $service = new OrderLabService();

        $order = $service->buat([
            'kunjungan_id' => $d['kunjungan'],
            'pemeriksaan_lab_ids' => [$d['gula'], $d['hb']],
        ], $d['dokter'])->toArray();
        [$gula, $hb] = $order['details'];

        $service->simpanHasil($gula['id'], ['hasil' => '95'], 'kunci-gula-1');
        $service->simpanHasil($hb['id'], ['hasil' => '13.5'], 'kunci-hb-1');
        $this->assertSame(OrderLab::STATUS_SELESAI, OrderLab::findOne($order['id'])->status);

        // Replay dengan key dan isi identik pada order selesai tetap idempoten.
        $replay = $service->simpanHasil($hb['id'], ['hasil' => '13.5'], 'kunci-hb-1');
        $this->assertTrue($replay['duplikat']);
        $this->assertSame('13.5', $replay['detail']->hasil);

        // Key baru pada order yang sudah selesai harus ditolak 409 dan tidak menimpa hasil.
        try {
            $service->simpanHasil($gula['id'], ['hasil' => '199'], 'kunci-gula-baru');
            $this->fail('Update dengan key baru setelah order selesai seharusnya ditolak');
        } catch (ConflictHttpException $e) {
            $this->assertStringContainsString('sudah selesai', $e->getMessage());
        }
        $this->assertSame('95', OrderLabDetail::findOne($gula['id'])->hasil);
    }
}
