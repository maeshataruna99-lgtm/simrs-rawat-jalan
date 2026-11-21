<?php

namespace app\modules\transaction\antrean;

use app\common\ValidationException;
use app\modules\master\pasien\Pasien;
use app\modules\transaction\pendaftaran\Kunjungan;
use Yii;
use yii\web\NotFoundHttpException;

/**
 * Pengelolaan daftar antrean poli, perubahan status antrean (tercatat di t_kunjungan_status_log),
 * serta riwayat kunjungan pasien.
 *
 * Dipakai di: AntreanController, RiwayatKunjunganController.
 */
class AntreanService
{
    /**
     * Mengambil daftar antrean kunjungan dengan filter poli, dokter, tanggal, status, dan kata kunci.
     *
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: AntreanController::actionIndex().
     */
    public function list(array $params): array
    {
        $query = Kunjungan::find()
            ->joinWith(['pasien p', 'poli po', 'dokter d'])
            ->with(['statusLogs'])
            ->orderBy([
                't_kunjungan.tgl_kunjungan' => SORT_DESC,
                't_kunjungan.poli_id' => SORT_ASC,
                't_kunjungan.dokter_id' => SORT_ASC,
                't_kunjungan.no_antrean' => SORT_ASC,
            ]);

        if (!empty($params['poli_id'])) {
            $query->andWhere(['t_kunjungan.poli_id' => (int) $params['poli_id']]);
        }
        if (!empty($params['dokter_id'])) {
            $query->andWhere(['t_kunjungan.dokter_id' => (int) $params['dokter_id']]);
        }
        if (!empty($params['tanggal'])) {
            $query->andWhere(['t_kunjungan.tgl_kunjungan' => trim((string) $params['tanggal'])]);
        }
        if (!empty($params['status'])) {
            $query->andWhere(['t_kunjungan.status' => trim((string) $params['status'])]);
        }
        if (!empty($params['q'])) {
            $q = trim((string) $params['q']);
            $query->andWhere([
                'or',
                ['ilike', 't_kunjungan.no_kunjungan', $q],
                ['ilike', 'p.no_rm', $q],
                ['ilike', 'p.nama', $q],
            ]);
        }

        return array_map(fn (Kunjungan $row) => $row->toArray(), $query->all());
    }

    /**
     * Mengubah status antrean kunjungan dan mencatat perubahan ke t_kunjungan_status_log.
     *
     * @throws NotFoundHttpException
     * @throws ValidationException
     *
     * Dipakai di: AntreanController::actionStatus().
     */
    public function ubahStatus(int $id, ?string $statusBaru): Kunjungan
    {
        /** @var Kunjungan|null $kunjungan */
        $kunjungan = Kunjungan::find()->where(['id' => $id])->one();
        if ($kunjungan === null) {
            throw new NotFoundHttpException('Data kunjungan tidak ditemukan.');
        }

        $target = trim((string) $statusBaru);
        if (!in_array($target, Kunjungan::STATUS_LIST, true)) {
            throw new ValidationException([
                'status' => ['Status harus salah satu dari: menunggu, diperiksa, selesai, batal.'],
            ]);
        }

        if ($kunjungan->status === $target) {
            return $kunjungan;
        }

        Yii::$app->db->transaction(function () use ($kunjungan, $target) {
            $statusLama = $kunjungan->status;
            $userId = Yii::$app->has('user') ? Yii::$app->user->id : null;

            $kunjungan->status = $target;
            $kunjungan->save(false, ['status', 'updated_at', 'updated_by']);

            Yii::$app->db->createCommand()->insert('t_kunjungan_status_log', [
                'kunjungan_id' => $kunjungan->id,
                'status_lama' => $statusLama,
                'status_baru' => $target,
                'user_id' => $userId,
                'created_by' => $userId,
            ])->execute();
        });

        $kunjungan->refresh();

        return $kunjungan;
    }

    /**
     * Mengambil riwayat seluruh kunjungan untuk satu pasien, dari yang terbaru.
     *
     * @return array<int, array<string, mixed>>
     *
     * @throws NotFoundHttpException Bila pasien tidak ditemukan.
     *
     * Dipakai di: RiwayatKunjunganController::actionView().
     */
    public function riwayatPasien(int $pasienId): array
    {
        $exists = Pasien::findActive()->andWhere(['id' => $pasienId])->exists();
        if (!$exists) {
            throw new NotFoundHttpException('Pasien tidak ditemukan.');
        }

        $rows = Kunjungan::find()
            ->with(['pasien', 'poli', 'dokter', 'statusLogs'])
            ->where(['pasien_id' => $pasienId])
            ->orderBy(['tgl_kunjungan' => SORT_DESC, 'id' => SORT_DESC])
            ->all();

        return array_map(fn (Kunjungan $row) => $row->toArray(), $rows);
    }
}
