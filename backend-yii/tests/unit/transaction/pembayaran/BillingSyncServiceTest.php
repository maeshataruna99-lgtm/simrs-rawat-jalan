<?php

namespace app\tests\unit\transaction\pembayaran;

use app\common\AuditLog;
use app\modules\master\dokter\DokterService;
use app\modules\master\icd10\Icd10Service;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\lab\PemeriksaanLabService;
use app\modules\master\obat\ObatService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\master\tindakan\TindakanService;
use app\modules\transaction\lab\OrderLabService;
use app\modules\transaction\pembayaran\BillingSyncService;
use app\modules\transaction\pembayaran\Invoice;
use app\modules\transaction\pembayaran\InvoiceItem;
use app\modules\transaction\pembayaran\InvoiceService;
use app\modules\transaction\pembayaran\PembayaranService;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\modules\transaction\resep\ResepService;
use app\modules\transaction\tindakan\TindakanKunjunganService;
use app\tests\Fixtures;
use app\tests\TestCase;
use yii\web\ConflictHttpException;

/**
 * Uji revisi tagihan otomatis (BillingSyncService) dan pencatatan audit log (AuditLogBehavior) (D.4, poin 8.5).
 */
class BillingSyncServiceTest extends TestCase
{
    /**
     * @return array{kunjungan: int, dokter: int, kasir: int, tindakan1: int, tindakan2: int, obat: int, lab: int, icd1: int, icd2: int}
     */
    private function siapkan(): array
    {
        $role = Fixtures::role('kasir_sync', 'Kasir Sync');
        $kasir = Fixtures::user($role, 'kasir_sync');

        $poli = (new PoliService())->create(['kode' => 'POLI-SYNC', 'nama' => 'Poli Sync', 'prefix_antrean' => 'S', 'tarif_pendaftaran' => 25000]);
        $dokter = (new DokterService())->create(['kode' => 'DR-SYNC', 'nama' => 'dr. Sync', 'sip' => 'SIP/SYNC', 'jenis_tenaga' => 'dokter']);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id, 'poli_id' => $poli->id, 'hari' => 1,
            'jam_mulai' => '08:00', 'jam_selesai' => '12:00', 'kuota' => 10,
        ]);
        $pasien = (new PasienService())->create(['nik' => '3201010101900085', 'nama' => 'Rina Sync', 'tgl_lahir' => '1993-07-08', 'jenis_kelamin' => 'P']);
        $kunjungan = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien->id, 'jadwal_id' => $jadwal->id, 'tgl_kunjungan' => self::seninDepan(),
        ]);

        $tSvc = new TindakanService();
        $t1 = $tSvc->create(['kode' => 'TND-S1', 'nama' => 'Konsultasi', 'tarif' => 50000]);
        $t2 = $tSvc->create(['kode' => 'TND-S2', 'nama' => 'EKG', 'tarif' => 75000]);

        $obatSvc = new ObatService();
        $obat = $obatSvc->create(['kode' => 'OBT-S1', 'nama' => 'Amoxicillin', 'satuan' => 'kapsul', 'harga' => 3000]);
        $obatSvc->sesuaikanStok($obat->id, ['stok_baru' => 30]);

        $lab = (new PemeriksaanLabService())->create(['kode' => 'LAB-S1', 'nama' => 'Kolesterol', 'satuan' => 'mg/dL', 'nilai_rujukan' => '< 200', 'tarif' => 40000]);

        $icdSvc = new Icd10Service();
        $icd1 = $icdSvc->create(['kode' => 'J06.9', 'nama' => 'ISPA']);
        $icd2 = $icdSvc->create(['kode' => 'I10', 'nama' => 'Hipertensi']);

        return [
            'kunjungan' => $kunjungan->id,
            'dokter' => $dokter->id,
            'kasir' => $kasir->id,
            'tindakan1' => $t1->id,
            'tindakan2' => $t2->id,
            'obat' => $obat->id,
            'lab' => $lab->id,
            'icd1' => $icd1->id,
            'icd2' => $icd2->id,
        ];
    }

    public function testBatalTindakanSetelahInvoiceVoidItemTurunkanTotalDanCatatAudit(): void
    {
        $f = $this->siapkan();
        $tSvc = new TindakanKunjunganService();
        $t1 = $tSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan1'], 'qty' => 1], $f['dokter']);
        $t2 = $tSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan2'], 'qty' => 1], $f['dokter']);

        $invSvc = new InvoiceService();
        $invoice = $invSvc->buat($f['kunjungan']);
        $this->assertSame(150000.0, (float) $invoice->total);

        // Batalkan EKG (75.000) setelah invoice dibuat.
        $tSvc->batal($t2->id, $f['dokter']);

        $revisi = $invSvc->detail($invoice->id);
        $this->assertSame(75000.0, (float) $revisi->total);
        $this->assertSame(Invoice::STATUS_BELUM_DIBAYAR, $revisi->status);

        $itemVoid = InvoiceItem::findOne([
            'invoice_id' => $invoice->id,
            'sumber' => InvoiceItem::SUMBER_TINDAKAN,
            'referensi_id' => $t2->id,
        ]);
        $this->assertNotNull($itemVoid);
        $this->assertTrue((bool) $itemVoid->is_void);
        $this->assertStringContainsString('EKG', (string) $itemVoid->alasan_void);

        // Item tindakan lain tetap aktif.
        $itemAktif = InvoiceItem::findOne([
            'invoice_id' => $invoice->id,
            'sumber' => InvoiceItem::SUMBER_TINDAKAN,
            'referensi_id' => $t1->id,
            'is_void' => false,
        ]);
        $this->assertNotNull($itemAktif);

        // Audit log mencatat perubahan t_tindakan dan sinkronisasi t_invoice.
        $syncLog = AuditLog::findOne(['tabel' => 't_invoice', 'record_id' => $invoice->id, 'aksi' => 'sync']);
        $this->assertNotNull($syncLog);
        $this->assertSame(150000, $syncLog->data_lama['total']);
        $this->assertSame(75000, $syncLog->data_baru['total']);

        $tindakanLog = AuditLog::findOne(['tabel' => 't_tindakan', 'record_id' => $t2->id, 'aksi' => 'update']);
        $this->assertNotNull($tindakanLog);
        $this->assertSame('batal', $tindakanLog->data_baru['status']);
    }

    public function testTambahTindakanResepLabSetelahInvoiceSinkronkanOtomatis(): void
    {
        $f = $this->siapkan();
        $invSvc = new InvoiceService();
        $invoice = $invSvc->buat($f['kunjungan']);
        $this->assertSame(25000.0, (float) $invoice->total);

        (new TindakanKunjunganService())->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan1'], 'qty' => 1], $f['dokter']);
        (new ResepService())->buat([
            'kunjungan_id' => $f['kunjungan'],
            'items' => [['obat_id' => $f['obat'], 'dosis' => '500mg', 'frekuensi' => '3x1', 'jumlah' => 10]],
        ], $f['dokter']);
        (new OrderLabService())->buat([
            'kunjungan_id' => $f['kunjungan'],
            'pemeriksaan_lab_ids' => [$f['lab']],
        ], $f['dokter']);

        $revisi = $invSvc->detail($invoice->id);
        // 25.000 + 50.000 + 30.000 + 40.000 = 145.000
        $this->assertSame(145000.0, (float) $revisi->total);
        $this->assertCount(4, $revisi->items);
    }

    public function testTolakPerubahanBiayaSetelahInvoiceLunasTapiDiagnosisTetapBolehDanTeraudit(): void
    {
        $f = $this->siapkan();
        $pemeriksaanSvc = new PemeriksaanService();
        $pemeriksaanSvc->simpanDiagnosis($f['kunjungan'], [['icd10_id' => $f['icd1'], 'jenis' => 'utama']], $f['dokter']);

        $invoice = (new InvoiceService())->buat($f['kunjungan']);
        (new PembayaranService())->bayar([
            'invoice_id' => $invoice->id,
            'metode' => 'tunai',
            'jumlah' => 25000,
        ], $f['kasir'], 'idem-sync-lunas-1');

        // Diagnosis diubah setelah lunas: tetap diizinkan, total tidak berubah, audit log tercatat.
        $pemeriksaanSvc->simpanDiagnosis($f['kunjungan'], [['icd10_id' => $f['icd2'], 'jenis' => 'utama']], $f['dokter']);
        $logs = (new BillingSyncService())->auditLogInvoice($invoice->id);
        $diagLogs = array_values(array_filter($logs, fn (array $l) => $l['tabel'] === 't_diagnosis'));
        $this->assertGreaterThanOrEqual(2, count($diagLogs));
        $this->assertSame(25000.0, (float) (new InvoiceService())->detail($invoice->id)->total);

        // Tambah tindakan setelah invoice lunas harus ditolak 409.
        $this->expectException(ConflictHttpException::class);
        (new TindakanKunjunganService())->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan1'], 'qty' => 1], $f['dokter']);
    }

    public function testBatalTindakanSaatSebagianDibayarMembuatStatusOtomatisLunas(): void
    {
        $f = $this->siapkan();
        $tSvc = new TindakanKunjunganService();
        $tSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan1'], 'qty' => 1], $f['dokter']);
        $t2 = $tSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan2'], 'qty' => 1], $f['dokter']);

        $invSvc = new InvoiceService();
        $invoice = $invSvc->buat($f['kunjungan']);
        (new PembayaranService())->bayar([
            'invoice_id' => $invoice->id,
            'metode' => 'tunai',
            'jumlah' => 75000,
        ], $f['kasir'], 'idem-sync-sebagian-1');

        $tSvc->batal($t2->id, $f['dokter']);
        $revisi = $invSvc->detail($invoice->id);

        $this->assertSame(75000.0, (float) $revisi->total);
        $this->assertSame(75000.0, (float) $revisi->total_bayar);
        $this->assertSame(Invoice::STATUS_LUNAS, $revisi->status);
    }

    public function testTolakBatalTindakanBilaTotalBaruKurangDariTotalBayarDanRollback(): void
    {
        $f = $this->siapkan();
        $tSvc = new TindakanKunjunganService();
        $tSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan1'], 'qty' => 1], $f['dokter']);
        $t2 = $tSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan2'], 'qty' => 1], $f['dokter']);

        $invSvc = new InvoiceService();
        $invoice = $invSvc->buat($f['kunjungan']);
        (new PembayaranService())->bayar([
            'invoice_id' => $invoice->id,
            'metode' => 'tunai',
            'jumlah' => 100000,
        ], $f['kasir'], 'idem-sync-rollback-1');

        try {
            $tSvc->batal($t2->id, $f['dokter']);
            $this->fail('Seharusnya menolak pembatalan karena total baru (75.000) < total_bayar (100.000).');
        } catch (ConflictHttpException) {
            // Diharapkan ditolak 409 dan transaksi di-rollback.
        }

        $t2->refresh();
        $revisi = $invSvc->detail($invoice->id);
        $this->assertSame('aktif', $t2->status);
        $this->assertSame(150000.0, (float) $revisi->total);
    }

    public function testTolakResepLabDanBatalTindakanSetelahInvoiceLunas(): void
    {
        $f = $this->siapkan();
        $tSvc = new TindakanKunjunganService();
        $t1 = $tSvc->tambah($f['kunjungan'], ['tindakan_id' => $f['tindakan1'], 'qty' => 1], $f['dokter']);

        $invoice = (new InvoiceService())->buat($f['kunjungan']);
        (new PembayaranService())->bayar([
            'invoice_id' => $invoice->id,
            'metode' => 'tunai',
            'jumlah' => 75000,
        ], $f['kasir'], 'idem-sync-lock-all');

        foreach ([
            fn () => $tSvc->batal($t1->id, $f['dokter']),
            fn () => (new ResepService())->buat([
                'kunjungan_id' => $f['kunjungan'],
                'items' => [['obat_id' => $f['obat'], 'dosis' => '500mg', 'frekuensi' => '3x1', 'jumlah' => 2]],
            ], $f['dokter']),
            fn () => (new OrderLabService())->buat([
                'kunjungan_id' => $f['kunjungan'],
                'pemeriksaan_lab_ids' => [$f['lab']],
            ], $f['dokter']),
        ] as $aksi) {
            $tertolak = false;
            try {
                $aksi();
            } catch (ConflictHttpException) {
                $tertolak = true;
            }
            $this->assertTrue($tertolak, 'Perubahan biaya setelah invoice lunas harus ditolak 409.');
        }
    }
}
