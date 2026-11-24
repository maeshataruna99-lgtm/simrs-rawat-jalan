<?php

namespace app\tests\unit\transaction\pembayaran;

use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\lab\PemeriksaanLabService;
use app\modules\master\obat\ObatService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\master\tindakan\TindakanService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\lab\OrderLabService;
use app\modules\transaction\pembayaran\InvoiceService;
use app\modules\transaction\pembayaran\PembayaranService;
use app\modules\transaction\pembayaran\ValidasiKunjunganService;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\Kunjungan;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\modules\transaction\resep\FarmasiService;
use app\modules\transaction\resep\ResepService;
use app\modules\transaction\tindakan\TindakanKunjunganService;
use app\tests\Fixtures;
use app\tests\TestCase;
use yii\web\ConflictHttpException;

/**
 * Uji validasi kunjungan oleh kasir: peringatan transaksi belum tuntas, kunci Valid/Unvalid,
 * dan kunjungan lunas yang hanya tampil di billing.
 */
class ValidasiKunjunganServiceTest extends TestCase
{
    /**
     * @return array{kunjungan: int, dokter: int, kasir: int, tindakan: int, obat: int, lab: int, tanggal: string}
     */
    private function siapkan(): array
    {
        $kasir = Fixtures::user(Fixtures::role('kasir_valid', 'Kasir Valid'), 'kasir_valid');
        $poli = (new PoliService())->create(['kode' => 'POLI-VAL', 'nama' => 'Poli Valid', 'prefix_antrean' => 'V', 'tarif_pendaftaran' => 25000]);
        $dokter = (new DokterService())->create(['kode' => 'DR-VAL', 'nama' => 'dr. Valid', 'sip' => 'SIP/VAL', 'jenis_tenaga' => 'dokter']);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id, 'poli_id' => $poli->id, 'hari' => 1,
            'jam_mulai' => '08:00', 'jam_selesai' => '12:00', 'kuota' => 10,
        ]);
        $pasien = (new PasienService())->create(['nik' => '3201010101900091', 'nama' => 'Tono Valid', 'tgl_lahir' => '1990-03-04', 'jenis_kelamin' => 'L']);
        $tanggal = self::seninDepan();
        $kunjungan = (new PendaftaranService())->daftar(['pasien_id' => $pasien->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => $tanggal]);

        $tindakan = (new TindakanService())->create(['kode' => 'TND-V1', 'nama' => 'Konsultasi', 'tarif' => 50000]);
        $obatSvc = new ObatService();
        $obat = $obatSvc->create(['kode' => 'OBT-V1', 'nama' => 'Parasetamol', 'satuan' => 'tablet', 'harga' => 1000]);
        $obatSvc->sesuaikanStok($obat->id, ['stok_baru' => 50]);
        $lab = (new PemeriksaanLabService())->create(['kode' => 'LAB-V1', 'nama' => 'Gula Darah', 'satuan' => 'mg/dL', 'nilai_rujukan' => '70-110', 'tarif' => 30000]);

        return [
            'kunjungan' => $kunjungan->id,
            'dokter' => $dokter->id,
            'kasir' => $kasir->id,
            'tindakan' => $tindakan->id,
            'obat' => $obat->id,
            'lab' => $lab->id,
            'tanggal' => $tanggal,
        ];
    }

    public function testPeringatanMenampilkanTransaksiBelumTuntasHinggaSemuaSelesai(): void
    {
        $f = $this->siapkan();
        $svc = new ValidasiKunjunganService();

        $this->assertSame(['Pasien belum diperiksa dokter.'], $svc->peringatan($f['kunjungan']));

        (new PemeriksaanService())->simpan($f['kunjungan'], ['keluhan_utama' => 'Demam'], $f['dokter']);
        $resep = (new ResepService())->buat([
            'kunjungan_id' => $f['kunjungan'],
            'items' => [['obat_id' => $f['obat'], 'dosis' => '500mg', 'frekuensi' => '3x1', 'jumlah' => 6]],
        ], $f['dokter']);
        $order = (new OrderLabService())->buat(['kunjungan_id' => $f['kunjungan'], 'pemeriksaan_lab_ids' => [$f['lab']]], $f['dokter']);

        $peringatan = $svc->peringatan($f['kunjungan']);
        $this->assertCount(2, $peringatan);
        $this->assertStringContainsString($order->no_order, $peringatan[0]);
        $this->assertStringContainsString($resep->no_resep, $peringatan[1]);

        $farmasi = new FarmasiService();
        $farmasi->proses($resep->id);
        $farmasi->serahkan($resep->id);
        (new OrderLabService())->simpanHasil($order->toArray()['details'][0]['id'], ['hasil' => '95'], null);

        $this->assertSame([], $svc->peringatan($f['kunjungan']));
    }

    public function testInvoiceMemvalidasiLaluUnvalidMembukaDanValidMenguncipKembali(): void
    {
        $f = $this->siapkan();
        $svc = new ValidasiKunjunganService();
        $tambahTindakan = fn () => (new TindakanKunjunganService())->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan'], 'qty' => 1], $f['dokter']);

        $invoice = (new InvoiceService())->buat($f['kunjungan']);
        $this->assertTrue((bool) Kunjungan::findOne($f['kunjungan'])->is_valid);
        $this->assertTrue($invoice->toArray()['kunjungan']['is_valid']);

        $this->assertFalse((bool) $svc->batalkanValidasi($invoice->id)->is_valid);
        $tambahTindakan();
        $this->assertSame(75000.0, (float) (new InvoiceService())->detail($invoice->id)->total);

        $kunjungan = $svc->validasi($invoice->id);
        $this->assertTrue((bool) $kunjungan->is_valid);
        $this->assertNotNull($kunjungan->divalidasi_at);

        $this->expectException(ConflictHttpException::class);
        $this->expectExceptionMessage(ValidasiKunjunganService::PESAN_TERKUNCI);
        $tambahTindakan();
    }

    public function testKunjunganLunasHanyaTampilDiBilling(): void
    {
        $f = $this->siapkan();
        $order = (new OrderLabService())->buat(['kunjungan_id' => $f['kunjungan'], 'pemeriksaan_lab_ids' => [$f['lab']]], $f['dokter']);
        $resep = (new ResepService())->buat([
            'kunjungan_id' => $f['kunjungan'],
            'items' => [['obat_id' => $f['obat'], 'dosis' => '500mg', 'frekuensi' => '3x1', 'jumlah' => 2]],
        ], $f['dokter']);
        $rentang = ['tanggal_dari' => $f['tanggal'], 'tanggal_sampai' => $f['tanggal']];
        $ids = fn (array $hasil) => array_column($hasil['items'], 'id');

        $this->assertContains($f['kunjungan'], $ids((new AntreanService())->list($rentang)));

        $invoice = (new InvoiceService())->buat($f['kunjungan']);
        (new PembayaranService())->bayar(['invoice_id' => $invoice->id, 'metode' => 'tunai', 'jumlah' => 57000], $f['kasir'], 'idem-valid-lunas');
        $this->assertSame(Kunjungan::STATUS_SELESAI, Kunjungan::findOne($f['kunjungan'])->status);

        $this->assertNotContains($f['kunjungan'], $ids((new AntreanService())->list($rentang)));
        $this->assertNotContains($order->id, $ids((new OrderLabService())->daftar($rentang + ['status' => ''])));
        $this->assertNotContains($resep->id, $ids((new FarmasiService())->antrean($rentang)));
        $this->assertContains($invoice->id, $ids((new InvoiceService())->daftar($rentang)));
    }
}
