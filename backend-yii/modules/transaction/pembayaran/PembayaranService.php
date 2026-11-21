<?php

namespace app\modules\transaction\pembayaran;

use app\common\SequenceService;
use app\common\ValidationException;
use Yii;
use yii\db\Expression;
use yii\db\IntegrityException;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Service pemrosesan pembayaran tunai/non-tunai bertahap terhadap invoice rawat jalan.
 * Pengaman D.3: Idempotency-Key wajib & unik di t_pembayaran; baris invoice dikunci FOR UPDATE.
 */
class PembayaranService
{
    /**
     * Mencatat pembayaran (penuh atau bertahap) untuk satu invoice dalam satu transaksi.
     * Bila Idempotency-Key sudah pernah diproses untuk invoice yang sama, pembayaran lama dikembalikan (duplikat=true).
     *
     * @param array<string, mixed> $data invoice_id, metode (tunai|non_tunai), jumlah, no_referensi (opsional).
     * @return array{pembayaran: Pembayaran, invoice: Invoice, duplikat: bool}
     *
     * @throws ValidationException
     * @throws NotFoundHttpException
     * @throws ConflictHttpException
     *
     * Dipakai di: PembayaranController::actionCreate.
     */
    public function bayar(array $data, int $kasirId, ?string $idempotencyKey): array
    {
        $key = $this->validasiIdempotencyKey($idempotencyKey);
        $validated = $this->validasiInput($data);

        if (($lama = Pembayaran::findOne(['idempotency_key' => $key])) !== null) {
            return $this->hasilIdempoten($lama, $validated['invoice_id']);
        }

        $tx = Yii::$app->db->beginTransaction();
        try {
            // Kunci baris invoice agar pembayaran paralel terurut dan tidak melebihi sisa tagihan.
            $row = Yii::$app->db->createCommand(
                'SELECT id, total, total_bayar, status FROM t_invoice WHERE id = :id FOR UPDATE',
                [':id' => $validated['invoice_id']]
            )->queryOne();

            if (!$row) {
                throw new NotFoundHttpException('Invoice tidak ditemukan.');
            }

            // Cek ulang setelah memegang row lock: request paralel dengan key sama yang menunggu lock langsung mendapat hasil pemenang.
            if (($lama = Pembayaran::findOne(['idempotency_key' => $key])) !== null) {
                $tx->rollBack();

                return $this->hasilIdempoten($lama, $validated['invoice_id']);
            }

            if ($row['status'] === Invoice::STATUS_LUNAS) {
                throw new ConflictHttpException('Invoice sudah lunas.');
            }

            $total = round((float) $row['total'], 2);
            $totalBayarLama = round((float) $row['total_bayar'], 2);
            $sisa = round($total - $totalBayarLama, 2);

            if ($validated['jumlah'] > $sisa) {
                throw new ValidationException([
                    'jumlah' => ["Jumlah pembayaran melebihi sisa tagihan ({$sisa})."],
                ]);
            }

            $totalBayarBaru = round($totalBayarLama + $validated['jumlah'], 2);
            $statusBaru = $totalBayarBaru >= $total
                ? Invoice::STATUS_LUNAS
                : Invoice::STATUS_DIBAYAR_SEBAGIAN;

            $ymd = date('Ymd');
            $pembayaran = new Pembayaran([
                'no_pembayaran' => SequenceService::nextFormatted('PEMBAYARAN', $ymd, "PAY{$ymd}", 4),
                'invoice_id' => $validated['invoice_id'],
                'idempotency_key' => $key,
                'metode' => $validated['metode'],
                'jumlah' => $validated['jumlah'],
                'no_referensi' => $validated['no_referensi'],
                'kasir_id' => $kasirId,
                'dibayar_at' => new Expression('CURRENT_TIMESTAMP'),
            ]);
            $pembayaran->save(false);

            Yii::$app->db->createCommand()->update('t_invoice', [
                'total_bayar' => $totalBayarBaru,
                'status' => $statusBaru,
                'updated_at' => new Expression('CURRENT_TIMESTAMP'),
                'updated_by' => $kasirId,
            ], ['id' => $validated['invoice_id']])->execute();

            $tx->commit();

            return [
                'pembayaran' => $this->detail($pembayaran->id),
                'invoice' => (new InvoiceService())->detail($validated['invoice_id']),
                'duplikat' => false,
            ];
        } catch (IntegrityException $e) {
            if ($tx->getIsActive()) {
                $tx->rollBack();
            }
            // Pengaman terakhir bila dua transaksi berbeda lolos bersamaan dengan idempotency_key sama.
            $lama = Pembayaran::findOne(['idempotency_key' => $key]);
            if ($lama !== null) {
                return $this->hasilIdempoten($lama, $validated['invoice_id']);
            }
            throw $e;
        } catch (\Throwable $e) {
            if ($tx->getIsActive()) {
                $tx->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Mengambil satu pembayaran lengkap dengan kasir dan ringkasan invoice (untuk bukti bayar).
     *
     * Dipakai di: PembayaranController::actionView, PembayaranService::bayar.
     */
    public function detail(int $id): Pembayaran
    {
        $pembayaran = Pembayaran::find()
            ->with(['kasir', 'invoice.kunjungan.pasien', 'invoice.kunjungan.poli', 'invoice.kunjungan.dokter'])
            ->where(['t_pembayaran.id' => $id])
            ->one();

        if (!$pembayaran) {
            throw new NotFoundHttpException('Data pembayaran tidak ditemukan.');
        }

        return $pembayaran;
    }

    /**
     * Mengambil daftar riwayat pembayaran dengan filter metode, invoice, kata kunci, dan periode tanggal.
     *
     * @param array<string, mixed> $params
     * @return array{items: array<int, array<string, mixed>>, meta: array{page: int, per_page: int, total: int}}
     *
     * Dipakai di: PembayaranController::actionIndex.
     */
    public function daftar(array $params): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $perPage = min(100, max(1, (int) ($params['per_page'] ?? 20)));

        $query = Pembayaran::find()
            ->alias('b')
            ->joinWith(['invoice i', 'invoice.kunjungan k', 'invoice.kunjungan.pasien p', 'invoice.kunjungan.poli pl', 'invoice.kunjungan.dokter d'])
            ->with(['kasir']);

        if (!empty($params['invoice_id'])) {
            $query->andWhere(['b.invoice_id' => (int) $params['invoice_id']]);
        }

        if (!empty($params['metode'])) {
            $query->andWhere(['b.metode' => (string) $params['metode']]);
        }

        if (!empty($params['tanggal_dari'])) {
            $query->andWhere(['>=', 'b.dibayar_at', (string) $params['tanggal_dari'] . ' 00:00:00']);
        }

        if (!empty($params['tanggal_sampai'])) {
            $query->andWhere(['<=', 'b.dibayar_at', (string) $params['tanggal_sampai'] . ' 23:59:59']);
        }

        if (!empty($params['q'])) {
            $q = trim((string) $params['q']);
            $query->andWhere([
                'or',
                ['ilike', 'b.no_pembayaran', $q],
                ['ilike', 'i.no_invoice', $q],
                ['ilike', 'p.nama', $q],
                ['ilike', 'p.no_rm', $q],
            ]);
        }

        $total = (int) (clone $query)->count('b.id');
        $rows = $query
            ->orderBy(['b.id' => SORT_DESC])
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->all();

        return [
            'items' => array_map(fn (Pembayaran $p) => $p->toArray(), $rows),
            'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $total],
        ];
    }

    /**
     * Memastikan header Idempotency-Key diisi dan panjangnya sesuai batas kolom.
     *
     * @throws ValidationException
     */
    private function validasiIdempotencyKey(?string $idempotencyKey): string
    {
        $key = $idempotencyKey === null ? '' : trim($idempotencyKey);
        if ($key === '' || mb_strlen($key) > 100) {
            throw new ValidationException([
                'idempotency_key' => ['Header Idempotency-Key wajib diisi (maksimal 100 karakter).'],
            ]);
        }

        return $key;
    }

    /**
     * Mengembalikan pembayaran lama saat Idempotency-Key cocok; menolak 409 bila key dipakai untuk invoice lain.
     *
     * @return array{pembayaran: Pembayaran, invoice: Invoice, duplikat: bool}
     *
     * @throws ConflictHttpException
     */
    private function hasilIdempoten(Pembayaran $lama, int $invoiceId): array
    {
        if ((int) $lama->invoice_id !== $invoiceId) {
            throw new ConflictHttpException('Idempotency-Key sudah digunakan untuk invoice lain.');
        }

        return [
            'pembayaran' => $this->detail($lama->id),
            'invoice' => (new InvoiceService())->detail($lama->invoice_id),
            'duplikat' => true,
        ];
    }

    /**
     * Memvalidasi field input pembayaran sebelum masuk transaksi.
     *
     * @param array<string, mixed> $data
     * @return array{invoice_id: int, metode: string, jumlah: float, no_referensi: ?string}
     */
    private function validasiInput(array $data): array
    {
        $errors = [];

        $invoiceId = filter_var($data['invoice_id'] ?? null, FILTER_VALIDATE_INT);
        if ($invoiceId === false || $invoiceId < 1) {
            $errors['invoice_id'] = ['Invoice wajib dipilih.'];
        }

        $metode = trim((string) ($data['metode'] ?? ''));
        if (!in_array($metode, [Pembayaran::METODE_TUNAI, Pembayaran::METODE_NON_TUNAI], true)) {
            $errors['metode'] = ['Metode pembayaran harus tunai atau non_tunai.'];
        }

        $rawJumlah = $data['jumlah'] ?? null;
        if (!is_numeric($rawJumlah) || (float) $rawJumlah <= 0) {
            $errors['jumlah'] = ['Jumlah pembayaran harus lebih besar dari 0.'];
        }

        $noRef = isset($data['no_referensi']) ? trim((string) $data['no_referensi']) : '';
        if (mb_strlen($noRef) > 100) {
            $errors['no_referensi'] = ['Nomor referensi maksimal 100 karakter.'];
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'invoice_id' => (int) $invoiceId,
            'metode' => $metode,
            'jumlah' => round((float) $rawJumlah, 2),
            'no_referensi' => $noRef === '' ? null : $noRef,
        ];
    }
}
