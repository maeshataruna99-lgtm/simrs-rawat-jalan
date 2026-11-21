<?php

namespace app\tests\unit\transaction\lab;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\lab\PemeriksaanLabService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\lab\OrderLab;
use app\modules\transaction\lab\OrderLabService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;
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
        $poli = (new PoliService())->create(['kode' => 'POLI-UMUM', 'nama' => 'Poli Umum', 'tarif_pendaftaran' => 25000]);
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
        $this->assertSame([$order['id']], array_column($service->daftar(['status' => 'diminta,diproses']), 'id'));

        [$gula, $hb] = $order['details'];
        $first = $service->simpanHasil($gula['id'], ['hasil' => '180'], 'kunci-1');
        $this->assertFalse($first['duplikat']);
        $this->assertSame('tinggi', $first['detail']->flag);
        $this->assertSame('diproses', OrderLab::findOne($order['id'])->status);

        // Key sama dikirim ulang dengan isi berbeda: data lama dikembalikan, tidak diubah.
        $ulang = $service->simpanHasil($gula['id'], ['hasil' => '999'], 'kunci-1');
        $this->assertTrue($ulang['duplikat']);
        $this->assertSame('180', $ulang['detail']->hasil);

        $service->simpanHasil($hb['id'], ['hasil' => '13'], null);
        $this->assertSame('selesai', OrderLab::findOne($order['id'])->status);

        $this->expectException(ValidationException::class);
        $service->simpanHasil($hb['id'], ['hasil' => ''], null);
    }
}
