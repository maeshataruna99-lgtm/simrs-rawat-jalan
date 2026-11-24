<?php

namespace app\modules\transaction\pembayaran;

use app\modules\transaction\lab\OrderLab;
use app\modules\transaction\pemeriksaan\Pemeriksaan;
use app\modules\transaction\pendaftaran\Kunjungan;
use app\modules\transaction\resep\Resep;
use Yii;
use yii\db\Expression;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Validasi kunjungan oleh kasir: kunjungan valid terkunci dari order baru dokter (pemeriksaan, diagnosis,
 * tindakan, resep, order lab). Order yang sudah ada tetap boleh diproses farmasi dan laboratorium.
 * Invoice lunas menyelesaikan kunjungan secara permanen.
 */
class ValidasiKunjunganService
{
    public const PESAN_TERKUNCI = 'Kunjungan sudah divalidasi kasir sehingga tidak dapat ditambah atau diubah. Minta kasir menekan Unvalid terlebih dahulu.';

    /**
     * Daftar peringatan transaksi yang belum tuntas, ditampilkan ke kasir sebelum membuat invoice atau validasi.
     *
     * @return string[]
     *
     * Dipakai di: InvoiceController::actionPeringatan.
     */
    public function peringatan(int $kunjunganId): array
    {
        $kunjungan = Kunjungan::findOne($kunjunganId);
        if ($kunjungan === null) {
            throw new NotFoundHttpException('Kunjungan tidak ditemukan.');
        }

        $pesan = [];
        if ($kunjungan->status === Kunjungan::STATUS_MENUNGGU) {
            $pesan[] = 'Pasien belum diperiksa dokter.';
        } elseif (!Pemeriksaan::find()->where(['kunjungan_id' => $kunjunganId])->exists()) {
            $pesan[] = 'Hasil pemeriksaan dokter belum disimpan.';
        }

        $orderLab = OrderLab::find()
            ->where(['kunjungan_id' => $kunjunganId])
            ->andWhere(['<>', 'status', OrderLab::STATUS_SELESAI])
            ->orderBy(['id' => SORT_ASC])->all();
        foreach ($orderLab as $order) {
            $pesan[] = "Order laboratorium {$order->no_order} belum selesai (status {$order->status}).";
        }

        $resep = Resep::find()
            ->where(['kunjungan_id' => $kunjunganId, 'status' => [Resep::STATUS_BARU, Resep::STATUS_DIPROSES]])
            ->orderBy(['id' => SORT_ASC])->all();
        foreach ($resep as $r) {
            $pesan[] = "Resep {$r->no_resep} belum diserahkan (status {$r->status}).";
        }

        return $pesan;
    }

    /**
     * Mengunci kunjungan yang sudah memiliki invoice dari order baru dokter.
     *
     * @throws ConflictHttpException Bila kunjungan batal atau sudah selesai.
     *
     * Dipakai di: InvoiceController::actionValid.
     */
    public function validasi(int $invoiceId): Kunjungan
    {
        return Yii::$app->db->transaction(function () use ($invoiceId) {
            $kunjungan = $this->kunciKunjunganInvoice($invoiceId);
            if ($kunjungan->status === Kunjungan::STATUS_BATAL) {
                throw new ConflictHttpException('Kunjungan yang dibatalkan tidak dapat divalidasi.');
            }
            if (!$kunjungan->is_valid) {
                $this->tandaiValid($kunjungan->id);
            }

            return Kunjungan::findOne($kunjungan->id);
        });
    }

    /**
     * Membuka kunci kunjungan agar dokter bisa menambah transaksi lagi; tagihan disinkronkan otomatis.
     *
     * @throws ConflictHttpException Bila invoice sudah lunas atau kunjungan sudah selesai.
     *
     * Dipakai di: InvoiceController::actionUnvalid.
     */
    public function batalkanValidasi(int $invoiceId): Kunjungan
    {
        return Yii::$app->db->transaction(function () use ($invoiceId) {
            $kunjungan = $this->kunciKunjunganInvoice($invoiceId);
            $statusInvoice = Invoice::find()->select('status')->where(['id' => $invoiceId])->scalar();
            if ($statusInvoice === Invoice::STATUS_LUNAS || $kunjungan->status === Kunjungan::STATUS_SELESAI) {
                throw new ConflictHttpException('Kunjungan dengan invoice lunas sudah selesai dan tidak dapat di-unvalid.');
            }
            if ($kunjungan->is_valid) {
                Yii::$app->db->createCommand()->update('t_kunjungan', [
                    'is_valid' => false,
                    'divalidasi_at' => null,
                    'divalidasi_by' => null,
                    'updated_at' => new Expression('CURRENT_TIMESTAMP'),
                    'updated_by' => $this->userId(),
                ], ['id' => $kunjungan->id])->execute();
            }

            return Kunjungan::findOne($kunjungan->id);
        });
    }

    /**
     * Menandai kunjungan valid. Pemanggil wajib sudah memegang lock baris kunjungan.
     *
     * Dipakai di: ValidasiKunjunganService::validasi, InvoiceService::buat.
     */
    public function tandaiValid(int $kunjunganId): void
    {
        Yii::$app->db->createCommand()->update('t_kunjungan', [
            'is_valid' => true,
            'divalidasi_at' => new Expression('CURRENT_TIMESTAMP'),
            'divalidasi_by' => $this->userId(),
            'updated_at' => new Expression('CURRENT_TIMESTAMP'),
            'updated_by' => $this->userId(),
        ], ['id' => $kunjunganId])->execute();
    }

    /**
     * Invoice lunas menyelesaikan kunjungan (menunggu/diperiksa menjadi selesai) beserta jejak status log.
     * Dipanggil di dalam transaksi yang mengubah status invoice.
     *
     * Dipakai di: InvoiceService::buat, PembayaranService::bayar, BillingSyncService::sinkronkan.
     */
    public function selesaikanKarenaLunas(int $kunjunganId): void
    {
        $status = Yii::$app->db->createCommand(
            'SELECT status FROM t_kunjungan WHERE id = :id FOR UPDATE',
            [':id' => $kunjunganId]
        )->queryScalar();
        if (!in_array($status, [Kunjungan::STATUS_MENUNGGU, Kunjungan::STATUS_DIPERIKSA], true)) {
            return;
        }

        Yii::$app->db->createCommand()->update('t_kunjungan', [
            'status' => Kunjungan::STATUS_SELESAI,
            'is_valid' => true,
            'updated_at' => new Expression('CURRENT_TIMESTAMP'),
            'updated_by' => $this->userId(),
        ], ['id' => $kunjunganId])->execute();
        Yii::$app->db->createCommand()->insert('t_kunjungan_status_log', [
            'kunjungan_id' => $kunjunganId,
            'status_lama' => $status,
            'status_baru' => Kunjungan::STATUS_SELESAI,
            'user_id' => $this->userId(),
            'waktu' => new Expression('CURRENT_TIMESTAMP'),
        ])->execute();
    }

    /**
     * Menolak order baru dokter bila kunjungan sudah valid atau invoicenya lunas.
     *
     * @throws ConflictHttpException
     *
     * Dipakai di: BillingSyncService::pastikanBolehDiubah, PemeriksaanService.
     */
    public function pastikanBelumValid(Kunjungan|int $kunjungan): void
    {
        $isValid = $kunjungan instanceof Kunjungan
            ? (bool) $kunjungan->is_valid
            : (bool) Kunjungan::find()->select('is_valid')->where(['id' => $kunjungan])->scalar();
        if ($isValid) {
            throw new ConflictHttpException(self::PESAN_TERKUNCI);
        }
    }

    private function kunciKunjunganInvoice(int $invoiceId): Kunjungan
    {
        $kunjunganId = Invoice::find()->select('kunjungan_id')->where(['id' => $invoiceId])->scalar();
        if ($kunjunganId === false || $kunjunganId === null) {
            throw new NotFoundHttpException('Invoice tidak ditemukan.');
        }

        /** @var Kunjungan $kunjungan */
        $kunjungan = Kunjungan::findBySql('SELECT * FROM t_kunjungan WHERE id = :id FOR UPDATE', [':id' => (int) $kunjunganId])->one();

        return $kunjungan;
    }

    private function userId(): ?int
    {
        return Yii::$app->has('user') && !Yii::$app->user->isGuest ? (int) Yii::$app->user->id : null;
    }
}
