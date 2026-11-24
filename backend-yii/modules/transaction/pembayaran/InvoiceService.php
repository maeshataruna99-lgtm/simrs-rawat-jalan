<?php

namespace app\modules\transaction\pembayaran;

use app\common\ListQuery;
use app\common\SequenceService;
use app\modules\transaction\lab\OrderLab;
use app\modules\transaction\lab\OrderLabDetail;
use app\modules\transaction\pendaftaran\Kunjungan;
use app\modules\transaction\resep\Resep;
use app\modules\transaction\resep\ResepDetail;
use app\modules\transaction\tindakan\TindakanKunjungan;
use Yii;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Service pembentukan dan pembacaan invoice rawat jalan dari 4 sumber biaya:
 * pendaftaran (m_poli.tarif_pendaftaran), tindakan (t_tindakan aktif), laboratorium (t_order_lab_detail), dan obat (t_resep_detail non-batal).
 */
class InvoiceService
{
    /**
     * Membentuk invoice baru untuk satu kunjungan beserta seluruh item biaya aktifnya dalam satu transaksi.
     * Baris kunjungan dikunci FOR UPDATE agar pembuatan invoice paralel untuk kunjungan sama tidak ganda.
     *
     * Dipakai di: InvoiceController::actionCreate.
     */
    public function buat(int $kunjunganId): Invoice
    {
        $tx = Yii::$app->db->beginTransaction();
        try {
            // Kunci baris kunjungan agar dua request paralel tidak lolos cek invoice bersamaan.
            $locked = Yii::$app->db->createCommand(
                'SELECT id, status FROM t_kunjungan WHERE id = :id FOR UPDATE',
                [':id' => $kunjunganId]
            )->queryOne();

            if (!$locked) {
                throw new NotFoundHttpException('Kunjungan tidak ditemukan.');
            }
            if ($locked['status'] === Kunjungan::STATUS_BATAL) {
                throw new ConflictHttpException('Kunjungan yang dibatalkan tidak dapat dibuatkan invoice.');
            }

            if (Invoice::find()->where(['kunjungan_id' => $kunjunganId])->exists()) {
                throw new ConflictHttpException('Invoice untuk kunjungan ini sudah dibuat.');
            }

            /** @var Kunjungan $kunjungan */
            $kunjungan = Kunjungan::find()
                ->with(['poli', 'pasien', 'dokter'])
                ->where(['id' => $kunjunganId])
                ->one();

            $sumberItems = $this->kumpulkanItemSumber($kunjungan);
            $total = round(array_sum(array_column($sumberItems, 'subtotal')), 2);
            $ymd = date('Ymd');

            $invoice = new Invoice([
                'no_invoice' => SequenceService::nextFormatted('INVOICE', $ymd, "INV{$ymd}", 4),
                'kunjungan_id' => $kunjungan->id,
                'total' => $total,
                'total_bayar' => 0,
                'status' => $total <= 0 ? Invoice::STATUS_LUNAS : Invoice::STATUS_BELUM_DIBAYAR,
            ]);
            $invoice->save(false);

            foreach ($sumberItems as $row) {
                $item = new InvoiceItem([
                    'invoice_id' => $invoice->id,
                    'sumber' => $row['sumber'],
                    'referensi_id' => $row['referensi_id'],
                    'deskripsi' => $row['deskripsi'],
                    'qty' => $row['qty'],
                    'harga' => $row['harga'],
                    'subtotal' => $row['subtotal'],
                    'is_void' => false,
                ]);
                $item->save(false);
            }

            // Membuat invoice sekaligus validasi pertama: kunjungan terkunci dari order baru dokter.
            $validasi = new ValidasiKunjunganService();
            $validasi->tandaiValid($kunjungan->id);
            if ($invoice->status === Invoice::STATUS_LUNAS) {
                $validasi->selesaikanKarenaLunas($kunjungan->id);
            }

            $tx->commit();

            return $this->detail($invoice->id);
        } catch (\Throwable $e) {
            $tx->rollBack();
            throw $e;
        }
    }

    /**
     * Mengambil satu invoice lengkap dengan item dan ringkasan kunjungan.
     *
     * Dipakai di: InvoiceController::actionView, InvoiceService::buat.
     */
    public function detail(int $id): Invoice
    {
        $invoice = Invoice::find()
            ->with(['kunjungan.pasien', 'kunjungan.poli', 'kunjungan.dokter', 'items', 'pembayarans.kasir'])
            ->where(['t_invoice.id' => $id])
            ->one();

        if (!$invoice) {
            throw new NotFoundHttpException('Invoice tidak ditemukan.');
        }

        return $invoice;
    }

    /**
     * Mengambil daftar invoice dengan filter status, kata kunci, dan rentang tanggal pembuatan.
     *
     * @param array<string, mixed> $params
     * @return array{items: array<int, array<string, mixed>>, meta: array{page: int, per_page: int, total: int}}
     *
     * Dipakai di: InvoiceController::actionIndex.
     */
    public function daftar(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $perPage = min(100, max(1, (int) ($params['per_page'] ?? 20)));

        $query = Invoice::find()
            ->alias('i')
            ->joinWith(['kunjungan k', 'kunjungan.pasien p', 'kunjungan.poli pl', 'kunjungan.dokter d'])
            ->with(['items', 'pembayarans.kasir']);

        if (!empty($params['status'])) {
            $statuses = array_filter(array_map('trim', explode(',', (string) $params['status'])));
            if ($statuses !== []) {
                $query->andWhere(['i.status' => $statuses]);
            }
        }

        if (!empty($params['kunjungan_id'])) {
            $query->andWhere(['i.kunjungan_id' => (int) $params['kunjungan_id']]);
        }

        ListQuery::rentangTanggal($query, 'k.tgl_kunjungan', $params);

        if (!empty($params['q'])) {
            $q = trim((string) $params['q']);
            $query->andWhere([
                'or',
                ['ilike', 'i.no_invoice', $q],
                ['ilike', 'k.no_kunjungan', $q],
                ['ilike', 'p.nama', $q],
                ['ilike', 'p.no_rm', $q],
            ]);
        }

        $total = (int) (clone $query)->count('i.id');
        $rows = $query
            ->orderBy(['i.id' => SORT_DESC])
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->all();

        return [
            'items' => array_map(fn (Invoice $inv) => $inv->toArray(), $rows),
            'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $total],
        ];
    }

    /**
     * Satu halaman kunjungan non-batal yang belum memiliki invoice agar kasir bisa menerbitkan tagihan.
     *
     * @param array<string, mixed> $params tanggal, tanggal_dari, tanggal_sampai, q, page, per_page.
     * @return array{items: array<int, array<string, mixed>>, meta: array{page: int, per_page: int, total: int}}
     *
     * Dipakai di: InvoiceController::actionBelumTagih.
     */
    public function kunjunganBelumTagih(array $params = []): array
    {
        $query = Kunjungan::find()
            ->alias('k')
            ->leftJoin('t_invoice i', 'i.kunjungan_id = k.id')
            ->joinWith(['pasien p', 'poli pl', 'dokter d'])
            ->with(['statusLogs'])
            ->where(['i.id' => null])
            ->andWhere(['<>', 'k.status', Kunjungan::STATUS_BATAL]);

        if (!empty($params['tanggal'])) {
            $query->andWhere(['k.tgl_kunjungan' => (string) $params['tanggal']]);
        }
        ListQuery::rentangTanggal($query, 'k.tgl_kunjungan', $params);

        if (!empty($params['q'])) {
            $q = trim((string) $params['q']);
            $query->andWhere([
                'or',
                ['ilike', 'k.no_kunjungan', $q],
                ['ilike', 'p.nama', $q],
                ['ilike', 'p.no_rm', $q],
            ]);
        }

        return ListQuery::paginate($query->orderBy(['k.tgl_kunjungan' => SORT_DESC, 'k.id' => SORT_DESC]), $params, 'k.id');
    }

    /**
     * Mengumpulkan seluruh item biaya yang seharusnya ada untuk satu kunjungan dari 4 sumber.
     *
     * @return array<int, array{sumber: string, referensi_id: int, deskripsi: string, qty: int, harga: float, subtotal: float}>
     *
     * Dipakai di: InvoiceService::buat, BillingSyncService::sinkronkan.
     */
    public function kumpulkanItemSumber(Kunjungan $kunjungan): array
    {
        $items = [];

        // 1. Biaya pendaftaran poli
        $tarifDaftar = round((float) $kunjungan->poli->tarif_pendaftaran, 2);
        $items[] = [
            'sumber' => InvoiceItem::SUMBER_PENDAFTARAN,
            'referensi_id' => (int) $kunjungan->id,
            'deskripsi' => 'Biaya Pendaftaran - ' . $kunjungan->poli->nama,
            'qty' => 1,
            'harga' => $tarifDaftar,
            'subtotal' => $tarifDaftar,
        ];

        // 2. Tindakan medis aktif
        /** @var TindakanKunjungan[] $tindakans */
        $tindakans = TindakanKunjungan::find()
            ->with('tindakan')
            ->where(['kunjungan_id' => $kunjungan->id, 'status' => TindakanKunjungan::STATUS_AKTIF])
            ->orderBy(['id' => SORT_ASC])
            ->all();

        foreach ($tindakans as $t) {
            $qty = (int) $t->qty;
            $harga = round((float) $t->tarif, 2);
            $items[] = [
                'sumber' => InvoiceItem::SUMBER_TINDAKAN,
                'referensi_id' => (int) $t->id,
                'deskripsi' => $t->tindakan->nama,
                'qty' => $qty,
                'harga' => $harga,
                'subtotal' => round($qty * $harga, 2),
            ];
        }

        // 3. Pemeriksaan laboratorium
        /** @var OrderLabDetail[] $labDetails */
        $labDetails = OrderLabDetail::find()
            ->alias('d')
            ->innerJoin(OrderLab::tableName() . ' o', 'o.id = d.order_id')
            ->with('pemeriksaan')
            ->where(['o.kunjungan_id' => $kunjungan->id])
            ->orderBy(['d.id' => SORT_ASC])
            ->all();

        foreach ($labDetails as $d) {
            $harga = round((float) $d->tarif, 2);
            $items[] = [
                'sumber' => InvoiceItem::SUMBER_LAB,
                'referensi_id' => (int) $d->id,
                'deskripsi' => 'Lab - ' . $d->pemeriksaan->nama,
                'qty' => 1,
                'harga' => $harga,
                'subtotal' => $harga,
            ];
        }

        // 4. Obat dari resep yang tidak dibatalkan
        /** @var ResepDetail[] $resepDetails */
        $resepDetails = ResepDetail::find()
            ->alias('d')
            ->innerJoin(Resep::tableName() . ' r', 'r.id = d.resep_id')
            ->with('obat')
            ->where(['r.kunjungan_id' => $kunjungan->id])
            ->andWhere(['<>', 'r.status', Resep::STATUS_BATAL])
            ->orderBy(['d.id' => SORT_ASC])
            ->all();

        foreach ($resepDetails as $d) {
            $qty = (int) $d->jumlah;
            $harga = round((float) $d->harga, 2);
            $items[] = [
                'sumber' => InvoiceItem::SUMBER_OBAT,
                'referensi_id' => (int) $d->id,
                'deskripsi' => 'Obat - ' . $d->obat->nama,
                'qty' => $qty,
                'harga' => $harga,
                'subtotal' => round($qty * $harga, 2),
            ];
        }

        return $items;
    }
}
