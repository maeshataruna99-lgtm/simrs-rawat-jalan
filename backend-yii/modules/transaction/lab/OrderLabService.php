<?php

namespace app\modules\transaction\lab;

use app\common\SequenceService;
use app\common\ValidationException;
use app\modules\master\lab\PemeriksaanLab;
use app\modules\transaction\pembayaran\BillingSyncService;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\Kunjungan;
use Yii;
use yii\db\Expression;
use yii\db\IntegrityException;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Service order dan hasil laboratorium: order oleh dokter, worklist laboratorium, dan input hasil idempoten (D.5).
 *
 * Dipakai di: OrderLabController, HasilLabController, PemeriksaanService::riwayatMedis().
 */
class OrderLabService
{
    private const WITH = ['details.pemeriksaan', 'dokter', 'kunjungan.pasien', 'kunjungan.poli'];

    /**
     * Membuat order laboratorium; tarif, satuan, dan nilai rujukan disalin dari master saat ini.
     *
     * @param array<string, mixed> $data kunjungan_id, catatan_klinis, pemeriksaan_lab_ids[].
     *
     * @throws ValidationException
     * @throws ConflictHttpException Bila kunjungan sudah selesai atau batal.
     *
     * Dipakai di: OrderLabController::actionCreate().
     */
    public function buat(array $data, ?int $dokterId): OrderLab
    {
        $kunjunganId = filter_var($data['kunjungan_id'] ?? null, FILTER_VALIDATE_INT);
        if ($kunjunganId === false) {
            throw new ValidationException(['kunjungan_id' => ['Kunjungan wajib dipilih.']]);
        }
        $kunjungan = (new PemeriksaanService())->kunjunganMilik($kunjunganId, $dokterId);
        if (!in_array($kunjungan->status, [Kunjungan::STATUS_MENUNGGU, Kunjungan::STATUS_DIPERIKSA], true)) {
            throw new ConflictHttpException("Kunjungan berstatus {$kunjungan->status} tidak dapat diberi order laboratorium.");
        }

        $ids = is_array($data['pemeriksaan_lab_ids'] ?? null) ? $data['pemeriksaan_lab_ids'] : [];
        $ids = array_values(array_unique(array_filter(array_map(fn ($v) => filter_var($v, FILTER_VALIDATE_INT), $ids))));
        if ($ids === []) {
            throw new ValidationException(['pemeriksaan_lab_ids' => ['Pilih minimal satu pemeriksaan laboratorium.']]);
        }
        $pemeriksaan = PemeriksaanLab::findActive()->andWhere(['id' => $ids, 'is_active' => true])->all();
        if (count($pemeriksaan) !== count($ids)) {
            throw new ValidationException(['pemeriksaan_lab_ids' => ['Pemeriksaan laboratorium tidak ditemukan atau nonaktif.']]);
        }

        $billing = new BillingSyncService();
        $billing->pastikanBelumLunas($kunjungan->id);

        $orderId = Yii::$app->db->transaction(function () use ($kunjungan, $pemeriksaan, $data, $billing) {
            $ymd = date('Ymd');
            $order = new OrderLab([
                'no_order' => SequenceService::nextFormatted('ORDER_LAB', $ymd, "LAB{$ymd}", 4),
                'kunjungan_id' => $kunjungan->id,
                'dokter_id' => $kunjungan->dokter_id,
                'status' => OrderLab::STATUS_DIMINTA,
                'catatan_klinis' => trim((string) ($data['catatan_klinis'] ?? '')) ?: null,
            ]);
            $order->save(false);
            foreach ($pemeriksaan as $p) {
                (new OrderLabDetail([
                    'order_id' => $order->id,
                    'pemeriksaan_lab_id' => $p->id,
                    'tarif' => $p->tarif,
                    'satuan' => $p->satuan,
                    'nilai_rujukan' => $p->nilai_rujukan,
                ]))->save(false);
            }
            $billing->sinkronkan($kunjungan->id, 'Penambahan order laboratorium: ' . $order->no_order);

            return $order->id;
        });

        return OrderLab::find()->with(self::WITH)->where(['id' => $orderId])->one();
    }

    /**
     * Order laboratorium terlama dulu, difilter status dan/atau kunjungan.
     *
     * @param array<string, mixed> $params status, kunjungan_id (opsional).
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: OrderLabController::actionIndex(), OrderLabController::actionPerKunjungan().
     */
    public function daftar(array $params): array
    {
        $query = OrderLab::find()->with(self::WITH)->orderBy(['id' => SORT_ASC]);
        $status = $params['status'] ?? '';
        if ($status !== '' && $status !== null) {
            $query->andWhere(['status' => is_array($status) ? $status : explode(',', (string) $status)]);
        }
        if (!empty($params['kunjungan_id'])) {
            $query->andWhere(['kunjungan_id' => (int) $params['kunjungan_id']]);
        }

        return array_map(fn (OrderLab $o) => $o->toArray(), $query->all());
    }

    /**
     * Order beberapa kunjungan sekaligus, untuk riwayat rekam medis.
     *
     * @param int[] $kunjunganIds
     * @return array<int, array<int, array<string, mixed>>> kunjungan_id => daftar order.
     *
     * Dipakai di: PemeriksaanService::riwayatMedis().
     */
    public function orderPerKunjungan(array $kunjunganIds): array
    {
        $result = [];
        foreach (OrderLab::find()->with('details.pemeriksaan')->where(['kunjungan_id' => $kunjunganIds])->orderBy(['id' => SORT_ASC])->all() as $o) {
            $result[$o->kunjungan_id][] = $o->toArray(['id', 'no_order', 'status', 'catatan_klinis', 'details']);
        }

        return $result;
    }

    /**
     * Menyimpan hasil satu pemeriksaan. Flag normal/tinggi/rendah dihitung dari nilai rujukan.
     * Idempotency-Key yang sudah pernah diproses mengembalikan data lama tanpa perubahan.
     * Status order menjadi diproses, lalu selesai otomatis saat semua hasil terisi.
     *
     * @param array<string, mixed> $data hasil (wajib).
     * @return array{detail: OrderLabDetail, duplikat: bool}
     *
     * @throws ValidationException
     * @throws NotFoundHttpException
     *
     * Dipakai di: HasilLabController::actionUpdate().
     */
    public function simpanHasil(int $detailId, array $data, ?string $idempotencyKey): array
    {
        $key = $idempotencyKey === null ? null : mb_substr(trim($idempotencyKey), 0, 100);
        $key = $key === '' ? null : $key;
        $hasil = trim((string) ($data['hasil'] ?? ''));
        if ($key !== null && ($lama = OrderLabDetail::findOne(['idempotency_key' => $key])) !== null) {
            if ((int) $lama->id !== $detailId || $lama->hasil !== $hasil) {
                throw new ConflictHttpException('Idempotency-Key sudah digunakan untuk hasil dengan isi berbeda.');
            }

            return ['detail' => $lama, 'duplikat' => true];
        }

        if ($hasil === '' || mb_strlen($hasil) > 100) {
            throw new ValidationException(['hasil' => ['Hasil wajib diisi, maksimal 100 karakter.']]);
        }
        $existing = OrderLabDetail::findOne($detailId);
        if ($existing === null) {
            throw new NotFoundHttpException('Detail order laboratorium tidak ditemukan.');
        }
        if (OrderLab::find()->where(['id' => $existing->order_id, 'status' => OrderLab::STATUS_SELESAI])->exists()) {
            throw new ConflictHttpException('Order laboratorium sudah selesai, hasil tidak dapat diubah.');
        }

        try {
            Yii::$app->db->transaction(function () use ($detailId, $hasil, $key) {
                $detail = OrderLabDetail::findOne($detailId);
                // Kunci order agar penentuan status selesai tidak balapan antar input hasil.
                $order = OrderLab::findBySql('SELECT * FROM t_order_lab WHERE id = :id FOR UPDATE', [':id' => $detail->order_id])->one();

                $detail->hasil = $hasil;
                $detail->flag = self::hitungFlag($hasil, $detail->nilai_rujukan);
                // Simpan dari UI (tanpa key) tidak boleh menghapus key kiriman eksternal sebelumnya.
                $detail->idempotency_key = $key ?? $detail->idempotency_key;
                $detail->diinput_oleh = Yii::$app->has('user') ? Yii::$app->user->id : null;
                $detail->diinput_at = new Expression('CURRENT_TIMESTAMP');
                $detail->save(false);

                $kosong = OrderLabDetail::find()->where(['order_id' => $order->id, 'hasil' => null])->exists();
                $order->status = $kosong ? OrderLab::STATUS_DIPROSES : OrderLab::STATUS_SELESAI;
                $order->save(false, ['status', 'updated_at', 'updated_by']);
            });
        } catch (IntegrityException $e) {
            // Request kembar dengan key sama yang lolos bersamaan: kembalikan hasil pemenang.
            $lama = $key === null ? null : OrderLabDetail::findOne(['idempotency_key' => $key]);
            if ($lama === null) {
                throw $e;
            }

            return ['detail' => $lama, 'duplikat' => true];
        }

        return ['detail' => OrderLabDetail::findOne($detailId), 'duplikat' => false];
    }

    /**
     * Menentukan flag dari hasil angka dan nilai rujukan berbentuk "70-110", "< 5", atau "> 40".
     * Hasil atau nilai rujukan yang bukan angka menghasilkan null (tidak dinilai).
     *
     * Dipakai di: simpanHasil(), OrderLabServiceTest.
     */
    public static function hitungFlag(string $hasil, ?string $nilaiRujukan): ?string
    {
        $angka = str_replace(',', '.', trim($hasil));
        $rujukan = str_replace(',', '.', (string) $nilaiRujukan);
        if (!is_numeric($angka)) {
            return null;
        }
        $nilai = (float) $angka;
        if (preg_match('/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/', $rujukan, $m)) {
            return $nilai < (float) $m[1] ? 'rendah' : ($nilai > (float) $m[2] ? 'tinggi' : 'normal');
        }
        if (preg_match('/^\s*<\s*=?\s*(\d+(?:\.\d+)?)/', $rujukan, $m)) {
            return $nilai > (float) $m[1] ? 'tinggi' : 'normal';
        }
        if (preg_match('/^\s*>\s*=?\s*(\d+(?:\.\d+)?)/', $rujukan, $m)) {
            return $nilai < (float) $m[1] ? 'rendah' : 'normal';
        }

        return null;
    }
}
