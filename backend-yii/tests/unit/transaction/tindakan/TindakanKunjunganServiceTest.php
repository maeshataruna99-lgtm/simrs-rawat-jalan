<?php

namespace app\tests\unit\transaction\tindakan;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\master\tindakan\TindakanService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\modules\transaction\tindakan\TindakanKunjunganService;
use app\tests\TestCase;
use yii\web\ConflictHttpException;
use yii\web\ForbiddenHttpException;

/**
 * Uji tindakan medis per kunjungan dengan snapshot tarif (poin 5.2).
 */
class TindakanKunjunganServiceTest extends TestCase
{
    public function testBanyakTindakanSnapshotTarifDanBatal(): void
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
        $masterService = new TindakanService();
        $injeksi = $masterService->create(['kode' => 'TND01', 'nama' => 'Injeksi', 'tarif' => 50000]);
        $nebu = $masterService->create(['kode' => 'TND02', 'nama' => 'Nebulizer', 'tarif' => 75000]);
        $poliGigi = (new PoliService())->create(['kode' => 'POLI-GIGI', 'nama' => 'Poli Gigi', 'prefix_antrean' => 'G', 'tarif_pendaftaran' => 25000]);
        $tambal = $masterService->create(['kode' => 'TND03', 'nama' => 'Tambal Gigi', 'tarif' => 150000, 'poli_id' => $poliGigi->id]);

        $service = new TindakanKunjunganService();
        foreach ([['tindakan_id' => $injeksi->id, 'qty' => 0], ['tindakan_id' => 999999], ['tindakan_id' => $tambal->id]] as $salah) {
            try {
                $service->tambah($kunjungan->id, $salah, $dokter->id);
                $this->fail('Input tindakan tidak valid seharusnya ditolak');
            } catch (ValidationException) {
            }
        }
        try {
            $service->tambah($kunjungan->id, ['tindakan_id' => $injeksi->id], $dokter->id + 1);
            $this->fail('Dokter lain seharusnya ditolak');
        } catch (ForbiddenHttpException) {
        }

        $item1 = $service->tambah($kunjungan->id, ['tindakan_id' => $injeksi->id, 'qty' => 2], $dokter->id);
        $service->tambah($kunjungan->id, ['tindakan_id' => $nebu->id], $dokter->id);
        $this->assertSame(100000.0, $item1->toArray()['subtotal']);

        // Perubahan tarif master tidak mengubah transaksi lama.
        $masterService->update($injeksi->id, ['tarif' => 60000]);
        $daftar = $service->daftar($kunjungan->id, $dokter->id);
        $this->assertCount(2, $daftar['items']);
        $this->assertSame(50000.0, $daftar['items'][0]['tarif']);
        $this->assertSame(175000.0, $daftar['total']);

        $service->batal($item1->id, $dokter->id);
        $daftar = $service->daftar($kunjungan->id, null);
        $this->assertSame('batal', $daftar['items'][0]['status']);
        $this->assertSame(75000.0, $daftar['total']);

        $riwayat = (new PemeriksaanService())->riwayatMedis($pasien->id);
        $this->assertSame(['Nebulizer'], array_column(array_column($riwayat[0]['tindakan'], 'tindakan'), 'nama'));

        (new AntreanService())->ubahStatus($kunjungan->id, 'batal');
        $this->expectException(ConflictHttpException::class);
        $service->tambah($kunjungan->id, ['tindakan_id' => $nebu->id], $dokter->id);
    }
}
