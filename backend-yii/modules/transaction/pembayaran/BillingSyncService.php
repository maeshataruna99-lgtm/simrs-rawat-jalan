<?php

namespace app\modules\transaction\pembayaran;

use app\common\AuditLog;
use app\modules\transaction\pendaftaran\Kunjungan;
use Yii;
use yii\db\Expression;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Service sinkronisasi ulang tagihan saat tindakan, resep, atau order lab berubah setelah invoice dibuat (D.4).
 * Item lama yang tidak cocok di-void dengan alasan, item baru ditambahkan, total dihitung ulang, dan jejak dicatat ke t_audit_log.
 */
class BillingSyncService
{
    /**
     * Memastikan perubahan biaya tidak dilakukan bila invoice kunjungan sudah lunas.
     *
     * @throws ConflictHttpException Bila invoice sudah berstatus lunas.
     *
     * Dipakai di: TindakanKunjunganService, ResepService, OrderLabService.
     */
    public function pastikanBelumLunas(int $kunjunganId): void
    {
        $status = Yii::$app->db->createCommand(
            'SELECT status FROM t_invoice WHERE kunjungan_id = :id',
            [':id' => $kunjunganId]
        )->queryScalar();

        if ($status === Invoice::STATUS_LUNAS) {
            throw new ConflictHttpException('Invoice kunjungan ini sudah lunas sehingga perubahan biaya tidak diizinkan.');
        }
    }

    /**
     * Menyinkronkan item invoice terhadap 4 sumber biaya aktifnya bila kunjungan sudah memiliki invoice.
     * Jika kunjungan belum memiliki invoice, method ini tidak melakukan apa-apa dan mengembalikan null.
     *
     * @throws ConflictHttpException Bila invoice sudah lunas atau revisi membuat total lebih kecil dari jumlah yang sudah dibayar.
     *
     * Dipakai di: TindakanKunjunganService, ResepService, OrderLabService.
     */
    public function sinkronkan(int $kunjunganId, string $alasan): ?Invoice
    {
        $alasanBersih = mb_substr(trim($alasan) ?: 'Sinkronisasi ulang tagihan', 0, 255);

        $tx = Yii::$app->db->beginTransaction();
        try {
            // Kunci baris invoice agar sinkronisasi tidak berbenturan dengan proses pembayaran paralel.
            $row = Yii::$app->db->createCommand(
                'SELECT id, total, total_bayar, status FROM t_invoice WHERE kunjungan_id = :id FOR UPDATE',
                [':id' => $kunjunganId]
            )->queryOne();

            if (!$row) {
                $tx->commit();

                return null;
            }

            if ($row['status'] === Invoice::STATUS_LUNAS) {
                throw new ConflictHttpException('Invoice kunjungan ini sudah lunas sehingga tagihan tidak dapat direvisi.');
            }

            $invoiceId = (int) $row['id'];
            $totalLama = round((float) $row['total'], 2);
            $totalBayar = round((float) $row['total_bayar'], 2);
            $statusLama = (string) $row['status'];

            /** @var Kunjungan $kunjungan */
            $kunjungan = Kunjungan::find()->with(['poli'])->where(['id' => $kunjunganId])->one();
            $sumberList = (new InvoiceService())->kumpulkanItemSumber($kunjungan);

            $sumberMap = [];
            foreach ($sumberList as $s) {
                $sumberMap[$s['sumber'] . ':' . $s['referensi_id']] = $s;
            }

            /** @var InvoiceItem[] $aktifList */
            $aktifList = InvoiceItem::find()
                ->where(['invoice_id' => $invoiceId, 'is_void' => false])
                ->orderBy(['id' => SORT_ASC])
                ->all();

            $aktifMap = [];
            foreach ($aktifList as $item) {
                $aktifMap[$item->sumber . ':' . $item->referensi_id] = $item;
            }

            $itemVoid = [];
            $itemBaru = [];

            // Void item lama yang tidak ada di sumber atau nominal/qty-nya berubah.
            foreach ($aktifMap as $kunci => $item) {
                $target = $sumberMap[$kunci] ?? null;
                $berubah = $target === null
                    || (int) $item->qty !== (int) $target['qty']
                    || round((float) $item->harga, 2) !== round((float) $target['harga'], 2)
                    || round((float) $item->subtotal, 2) !== round((float) $target['subtotal'], 2);

                if (!$berubah) {
                    continue;
                }

                $item->is_void = true;
                $item->alasan_void = $alasanBersih;
                $item->save(false, ['is_void', 'alasan_void', 'updated_at', 'updated_by']);
                $itemVoid[] = [
                    'id' => $item->id,
                    'sumber' => $item->sumber,
                    'referensi_id' => $item->referensi_id,
                    'deskripsi' => $item->deskripsi,
                    'subtotal' => (float) $item->subtotal,
                ];

                if ($target !== null) {
                    $baru = $this->simpanItemBaru($invoiceId, $target);
                    $itemBaru[] = [
                        'id' => $baru->id,
                        'sumber' => $baru->sumber,
                        'referensi_id' => $baru->referensi_id,
                        'deskripsi' => $baru->deskripsi,
                        'subtotal' => (float) $baru->subtotal,
                    ];
                }
            }

            // Tambahkan item sumber baru yang belum tercatat di invoice.
            foreach ($sumberMap as $kunci => $target) {
                if (isset($aktifMap[$kunci])) {
                    continue;
                }
                $baru = $this->simpanItemBaru($invoiceId, $target);
                $itemBaru[] = [
                    'id' => $baru->id,
                    'sumber' => $baru->sumber,
                    'referensi_id' => $baru->referensi_id,
                    'deskripsi' => $baru->deskripsi,
                    'subtotal' => (float) $baru->subtotal,
                ];
            }

            $totalBaru = round((float) InvoiceItem::find()
                ->where(['invoice_id' => $invoiceId, 'is_void' => false])
                ->sum('subtotal'), 2);

            if ($totalBaru < $totalBayar) {
                throw new ConflictHttpException(
                    'Revisi membuat total tagihan lebih kecil dari jumlah yang sudah dibayar.'
                );
            }

            if ($totalBaru <= $totalBayar) {
                $statusBaru = Invoice::STATUS_LUNAS;
            } elseif ($totalBayar > 0) {
                $statusBaru = Invoice::STATUS_DIBAYAR_SEBAGIAN;
            } else {
                $statusBaru = Invoice::STATUS_BELUM_DIBAYAR;
            }

            $adaPerubahan = $itemVoid !== [] || $itemBaru !== [] || $totalBaru !== $totalLama || $statusBaru !== $statusLama;
            if ($adaPerubahan) {
                Yii::$app->db->createCommand()->update('t_invoice', [
                    'total' => $totalBaru,
                    'status' => $statusBaru,
                    'updated_at' => new Expression('CURRENT_TIMESTAMP'),
                    'updated_by' => Yii::$app->has('user') && !Yii::$app->user->isGuest ? (int) Yii::$app->user->id : null,
                ], ['id' => $invoiceId])->execute();

                AuditLog::catat('t_invoice', $invoiceId, 'sync', [
                    'total' => $totalLama,
                    'status' => $statusLama,
                    'item_void' => $itemVoid,
                ], [
                    'total' => $totalBaru,
                    'status' => $statusBaru,
                    'item_baru' => $itemBaru,
                    'alasan' => $alasanBersih,
                ]);
            }

            $tx->commit();

            return (new InvoiceService())->detail($invoiceId);
        } catch (\Throwable $e) {
            $tx->rollBack();
            throw $e;
        }
    }

    /**
     * Mengambil jejak audit log terkait satu invoice dan perubahan diagnosis pada kunjungannya.
     *
     * @return array<int, array<string, mixed>>
     *
     * @throws NotFoundHttpException
     *
     * Dipakai di: InvoiceController::actionAuditLog.
     */
    public function auditLogInvoice(int $invoiceId): array
    {
        $invoice = Invoice::findOne($invoiceId);
        if ($invoice === null) {
            throw new NotFoundHttpException('Invoice tidak ditemukan.');
        }

        $tindakanIds = Yii::$app->db->createCommand(
            'SELECT id FROM t_tindakan WHERE kunjungan_id = :id',
            [':id' => $invoice->kunjungan_id]
        )->queryColumn();

        $kondisi = [
            'or',
            ['tabel' => 't_invoice', 'record_id' => $invoice->id],
            ['tabel' => 't_diagnosis', 'record_id' => $invoice->kunjungan_id],
        ];
        if ($tindakanIds !== []) {
            $kondisi[] = ['tabel' => 't_tindakan', 'record_id' => array_map('intval', $tindakanIds)];
        }

        $rows = AuditLog::find()
            ->where($kondisi)
            ->orderBy(['id' => SORT_DESC])
            ->limit(100)
            ->all();

        return array_map(fn (AuditLog $log) => [
            'id' => $log->id,
            'tabel' => $log->tabel,
            'record_id' => $log->record_id,
            'aksi' => $log->aksi,
            'data_lama' => $log->data_lama,
            'data_baru' => $log->data_baru,
            'user_id' => $log->user_id,
            'waktu' => $log->waktu,
        ], $rows);
    }

    /**
     * @param array{sumber: string, referensi_id: int, deskripsi: string, qty: int, harga: float, subtotal: float} $target
     */
    private function simpanItemBaru(int $invoiceId, array $target): InvoiceItem
    {
        $item = new InvoiceItem([
            'invoice_id' => $invoiceId,
            'sumber' => $target['sumber'],
            'referensi_id' => $target['referensi_id'],
            'deskripsi' => $target['deskripsi'],
            'qty' => $target['qty'],
            'harga' => $target['harga'],
            'subtotal' => $target['subtotal'],
            'is_void' => false,
        ]);
        $item->save(false);

        return $item;
    }
}
