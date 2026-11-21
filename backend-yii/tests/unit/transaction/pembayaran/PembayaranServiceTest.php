<?php

namespace app\tests\unit\transaction\pembayaran;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\master\tindakan\TindakanService;
use app\modules\transaction\pembayaran\Invoice;
use app\modules\transaction\pembayaran\InvoiceService;
use app\modules\transaction\pembayaran\Pembayaran;
use app\modules\transaction\pembayaran\PembayaranService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\modules\transaction\tindakan\TindakanKunjunganService;
use app\tests\Fixtures;
use app\tests\TestCase;
use yii\web\ConflictHttpException;

/**
 * Uji pembayaran tunai/non-tunai bertahap dan proteksi melebihi sisa tagihan (poin 8.3).
 */
class PembayaranServiceTest extends TestCase
{
    /**
     * Menyiapkan satu invoice senilai 100.000 (daftar 25.000 + tindakan 75.000) dan satu user kasir.
     *
     * @return array{invoice: int, kasir: int}
     */
    private function siapkan(): array
    {
        $role = Fixtures::role('kasir_uji', 'Kasir Uji');
        $kasir = Fixtures::user($role, 'kasir_uji');

        $poli = (new PoliService())->create(['kode' => 'POLI-PAY', 'nama' => 'Poli Bayar', 'tarif_pendaftaran' => 25000]);
        $dokter = (new DokterService())->create(['kode' => 'DR-PAY', 'nama' => 'dr. Bayar', 'sip' => 'SIP/PAY', 'jenis_tenaga' => 'dokter']);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id, 'poli_id' => $poli->id, 'hari' => 1,
            'jam_mulai' => '08:00', 'jam_selesai' => '12:00', 'kuota' => 10,
        ]);
        $pasien = (new PasienService())->create(['nik' => '3201010101900083', 'nama' => 'Agus Bayar', 'tgl_lahir' => '1991-05-12', 'jenis_kelamin' => 'L']);
        $kunjungan = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => self::seninDepan(),
        ]);
        $tindakan = (new TindakanService())->create(['kode' => 'TND-PAY', 'nama' => 'Jahit Luka', 'tarif' => 75000]);
        (new TindakanKunjunganService())->tambah($kunjungan->id, ['tindakan_id' => $tindakan->id, 'qty' => 1], $dokter->id);

        $invoice = (new InvoiceService())->buat($kunjungan->id);

        return ['invoice' => $invoice->id, 'kasir' => $kasir->id];
    }

    public function testPembayaranBertahapMengubahStatusSebagianKeLunas(): void
    {
        $f = $this->siapkan();
        $svc = new PembayaranService();

        $tahap1 = $svc->bayar([
            'invoice_id' => $f['invoice'],
            'metode' => Pembayaran::METODE_TUNAI,
            'jumlah' => 40000,
        ], $f['kasir'], 'key-uji-83-1');

        $this->assertFalse($tahap1['duplikat']);
        $this->assertStringStartsWith('PAY', $tahap1['pembayaran']->no_pembayaran);
        $this->assertSame(Invoice::STATUS_DIBAYAR_SEBAGIAN, $tahap1['invoice']->status);
        $this->assertSame(40000.0, (float) $tahap1['invoice']->total_bayar);

        $tahap2 = $svc->bayar([
            'invoice_id' => $f['invoice'],
            'metode' => Pembayaran::METODE_NON_TUNAI,
            'jumlah' => 60000,
            'no_referensi' => 'TRF-998877',
        ], $f['kasir'], 'key-uji-83-2');

        $this->assertSame(Invoice::STATUS_LUNAS, $tahap2['invoice']->status);
        $this->assertSame(100000.0, (float) $tahap2['invoice']->total_bayar);
        $this->assertSame('TRF-998877', $tahap2['pembayaran']->no_referensi);

        $riwayat = $svc->daftar(['invoice_id' => $f['invoice']]);
        $this->assertSame(2, $riwayat['meta']['total']);
    }

    public function testTolakPembayaranMelebihiSisaTagihan(): void
    {
        $f = $this->siapkan();
        $svc = new PembayaranService();
        $svc->bayar(['invoice_id' => $f['invoice'], 'metode' => 'tunai', 'jumlah' => 70000], $f['kasir'], 'key-uji-83-sisa-1');

        $this->expectException(ValidationException::class);
        $svc->bayar(['invoice_id' => $f['invoice'], 'metode' => 'tunai', 'jumlah' => 35000], $f['kasir'], 'key-uji-83-sisa-2');
    }

    public function testTolakPembayaranPadaInvoiceSudahLunas(): void
    {
        $f = $this->siapkan();
        $svc = new PembayaranService();
        $svc->bayar(['invoice_id' => $f['invoice'], 'metode' => 'tunai', 'jumlah' => 100000], $f['kasir'], 'key-uji-83-lunas-1');

        $this->expectException(ConflictHttpException::class);
        $svc->bayar(['invoice_id' => $f['invoice'], 'metode' => 'tunai', 'jumlah' => 1000], $f['kasir'], 'key-uji-83-lunas-2');
    }
}
