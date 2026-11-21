<?php

namespace app\tests\unit\transaction\pembayaran;

use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\lab\PemeriksaanLabService;
use app\modules\master\obat\ObatService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\master\tindakan\TindakanService;
use app\modules\transaction\lab\OrderLabService;
use app\modules\transaction\pembayaran\Invoice;
use app\modules\transaction\pembayaran\InvoiceItem;
use app\modules\transaction\pembayaran\InvoiceService;
use app\modules\transaction\pendaftaran\Kunjungan;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\modules\transaction\resep\Resep;
use app\modules\transaction\resep\ResepService;
use app\modules\transaction\tindakan\TindakanKunjunganService;
use app\tests\TestCase;
use yii\web\ConflictHttpException;

/**
 * Uji pembentukan invoice dari 4 sumber biaya: pendaftaran, tindakan, lab, dan obat (poin 8.2).
 */
class InvoiceServiceTest extends TestCase
{
    /**
     * @return array{kunjungan: int, dokter: int, tindakan1: int, tindakan2: int, obat: int, lab: int}
     */
    private function siapkan(): array
    {
        $poli = (new PoliService())->create(['kode' => 'POLI-INV', 'nama' => 'Poli Umum', 'tarif_pendaftaran' => 25000]);
        $dokter = (new DokterService())->create(['kode' => 'DR-INV', 'nama' => 'dr. Tagih', 'sip' => 'SIP/INV', 'jenis_tenaga' => 'dokter']);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id, 'poli_id' => $poli->id, 'hari' => 1,
            'jam_mulai' => '08:00', 'jam_selesai' => '12:00', 'kuota' => 10,
        ]);
        $pasien = (new PasienService())->create(['nik' => '3201010101900082', 'nama' => 'Siti Tagih', 'tgl_lahir' => '1992-03-10', 'jenis_kelamin' => 'P']);
        $kunjungan = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => self::seninDepan(),
        ]);

        $tindakanSvc = new TindakanService();
        $t1 = $tindakanSvc->create(['kode' => 'TND-01', 'nama' => 'Konsultasi Dokter', 'tarif' => 50000]);
        $t2 = $tindakanSvc->create(['kode' => 'TND-02', 'nama' => 'Nebulizer', 'tarif' => 35000]);
        $obatSvc = new ObatService();
        $obat = $obatSvc->create(['kode' => 'OBT-01', 'nama' => 'Paracetamol 500mg', 'satuan' => 'tablet', 'harga' => 2500]);
        $obatSvc->sesuaikanStok($obat->id, ['stok_baru' => 50]);
        $lab = (new PemeriksaanLabService())->create(['kode' => 'LAB-01', 'nama' => 'Darah Lengkap', 'satuan' => 'g/dL', 'nilai_rujukan' => '12-16', 'tarif' => 65000]);

        return [
            'kunjungan' => $kunjungan->id,
            'dokter' => $dokter->id,
            'tindakan1' => $t1->id,
            'tindakan2' => $t2->id,
            'obat' => $obat->id,
            'lab' => $lab->id,
        ];
    }

    public function testBuatInvoiceMengumpulkanEmpatSumberDanAbaikanItemBatal(): void
    {
        $f = $this->siapkan();
        $tindakanSvc = new TindakanKunjunganService();
        $tAktif = $tindakanSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan1'], 'qty' => 2], $f['dokter']);
        $tBatal = $tindakanSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan2'], 'qty' => 1], $f['dokter']);
        $tindakanSvc->batal($tBatal->id, $f['dokter']);

        (new OrderLabService())->buat([
            'kunjungan_id' => $f['kunjungan'],
            'pemeriksaan_lab_ids' => [$f['lab']],
        ], $f['dokter']);

        $resepSvc = new ResepService();
        $resepSvc->buat([
            'kunjungan_id' => $f['kunjungan'],
            'items' => [['obat_id' => $f['obat'], 'dosis' => '500mg', 'frekuensi' => '3x1', 'jumlah' => 10]],
        ], $f['dokter']);

        $resepBatal = $resepSvc->buat([
            'kunjungan_id' => $f['kunjungan'],
            'items' => [['obat_id' => $f['obat'], 'dosis' => '500mg', 'frekuensi' => '1x1', 'jumlah' => 5]],
        ], $f['dokter']);
        $resepBatal->updateAttributes(['status' => Resep::STATUS_BATAL]);

        $svc = new InvoiceService();
        $this->assertCount(1, $svc->kunjunganBelumTagih(['q' => 'Siti Tagih']));

        $invoice = $svc->buat($f['kunjungan']);
        $data = $invoice->toArray();

        // 25.000 (daftar) + 100.000 (2x50.000 tindakan) + 65.000 (lab) + 25.000 (10x2.500 obat) = 215.000
        $this->assertStringStartsWith('INV', $data['no_invoice']);
        $this->assertSame(215000.0, $data['total']);
        $this->assertSame(0.0, $data['total_bayar']);
        $this->assertSame(215000.0, $data['sisa_tagihan']);
        $this->assertSame(Invoice::STATUS_BELUM_DIBAYAR, $data['status']);
        $this->assertCount(4, $data['items']);

        $sumber = array_column($data['items'], 'sumber');
        $this->assertSame([
            InvoiceItem::SUMBER_PENDAFTARAN,
            InvoiceItem::SUMBER_TINDAKAN,
            InvoiceItem::SUMBER_LAB,
            InvoiceItem::SUMBER_OBAT,
        ], $sumber);
        $this->assertSame($tAktif->id, $data['items'][1]['referensi_id']);

        $this->assertCount(0, $svc->kunjunganBelumTagih(['q' => 'Siti Tagih']));
        $list = $svc->daftar(['status' => Invoice::STATUS_BELUM_DIBAYAR, 'q' => $data['no_invoice']]);
        $this->assertSame(1, $list['meta']['total']);
    }

    public function testTolakBuatInvoiceGandaUntukKunjunganSama(): void
    {
        $f = $this->siapkan();
        $svc = new InvoiceService();
        $svc->buat($f['kunjungan']);

        $this->expectException(ConflictHttpException::class);
        $svc->buat($f['kunjungan']);
    }

    public function testTolakBuatInvoiceUntukKunjunganBatal(): void
    {
        $f = $this->siapkan();
        Kunjungan::updateAll(['status' => Kunjungan::STATUS_BATAL], ['id' => $f['kunjungan']]);

        $this->expectException(ConflictHttpException::class);
        (new InvoiceService())->buat($f['kunjungan']);
    }
}
