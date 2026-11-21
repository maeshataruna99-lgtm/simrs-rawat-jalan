<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ValidationException;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pendaftaran\Kunjungan;
use Yii;
use yii\web\ConflictHttpException;
use yii\web\ForbiddenHttpException;
use yii\web\NotFoundHttpException;

/**
 * Service pemeriksaan dokter: worklist pasien serta penyimpanan anamnesis, tanda vital, dan pemeriksaan fisik.
 *
 * Dipakai di: PemeriksaanController.
 */
class PemeriksaanService
{
    /**
     * Daftar kunjungan berstatus menunggu/diperiksa pada satu tanggal, urut nomor antrean.
     * User yang tertaut ke dokter hanya melihat pasiennya sendiri; user tanpa tautan (misalnya admin) melihat semua.
     *
     * @param int|null $dokterId dokter_id milik user login, null bila user tidak tertaut ke dokter.
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: PemeriksaanController::actionWorklist().
     */
    public function worklist(?int $dokterId, string $tanggal): array
    {
        $query = Kunjungan::find()
            ->with(['pasien', 'poli', 'dokter', 'statusLogs'])
            ->where([
                'tgl_kunjungan' => $tanggal,
                'status' => [Kunjungan::STATUS_MENUNGGU, Kunjungan::STATUS_DIPERIKSA],
            ])
            ->orderBy(['poli_id' => SORT_ASC, 'dokter_id' => SORT_ASC, 'no_antrean' => SORT_ASC]);

        if ($dokterId !== null) {
            $query->andWhere(['dokter_id' => $dokterId]);
        }

        return array_map(fn (Kunjungan $row) => $row->toArray(), $query->all());
    }

    /**
     * Data kunjungan beserta hasil pemeriksaannya (null bila belum diperiksa) untuk form pemeriksaan.
     *
     * @return array<string, mixed>
     *
     * Dipakai di: PemeriksaanController::actionView().
     */
    public function detail(int $kunjunganId, ?int $dokterId): array
    {
        $kunjungan = $this->kunjunganMilik($kunjunganId, $dokterId);
        $pemeriksaan = Pemeriksaan::findOne(['kunjungan_id' => $kunjunganId]);

        return [
            'kunjungan' => $kunjungan->toArray(),
            'pemeriksaan' => $pemeriksaan?->toArray(),
        ];
    }

    /**
     * Menyimpan (membuat atau memperbarui) anamnesis, tanda vital, dan pemeriksaan fisik.
     * Kunjungan yang masih menunggu otomatis berubah menjadi diperiksa dan tercatat di log status.
     *
     * @param array<string, mixed> $data Isian form, hanya kolom Pemeriksaan::FORM_FIELDS yang dipakai.
     *
     * @throws ValidationException Bila isian atau range tanda vital tidak valid.
     * @throws ConflictHttpException Bila kunjungan sudah selesai atau batal.
     *
     * Dipakai di: PemeriksaanController::actionUpdate().
     */
    public function simpan(int $kunjunganId, array $data, ?int $dokterId): Pemeriksaan
    {
        $kunjungan = $this->kunjunganMilik($kunjunganId, $dokterId);
        if (!in_array($kunjungan->status, [Kunjungan::STATUS_MENUNGGU, Kunjungan::STATUS_DIPERIKSA], true)) {
            throw new ConflictHttpException("Kunjungan berstatus {$kunjungan->status} tidak dapat diubah.");
        }

        $model = Pemeriksaan::findOne(['kunjungan_id' => $kunjunganId])
            ?? new Pemeriksaan(['kunjungan_id' => $kunjunganId, 'dokter_id' => $kunjungan->dokter_id]);
        $model->setAttributes(array_intersect_key($data, array_flip(Pemeriksaan::FORM_FIELDS)), false);
        if (!$model->validate()) {
            throw new ValidationException($model->getErrors());
        }

        Yii::$app->db->transaction(function () use ($model, $kunjungan) {
            $model->save(false);
            if ($kunjungan->status === Kunjungan::STATUS_MENUNGGU) {
                (new AntreanService())->ubahStatus($kunjungan->id, Kunjungan::STATUS_DIPERIKSA);
            }
        });

        return $model;
    }

    /**
     * Mengambil kunjungan dan memastikan user dokter hanya membuka kunjungan pasiennya sendiri.
     *
     * @throws NotFoundHttpException
     * @throws ForbiddenHttpException
     */
    private function kunjunganMilik(int $kunjunganId, ?int $dokterId): Kunjungan
    {
        $kunjungan = Kunjungan::findOne($kunjunganId);
        if ($kunjungan === null) {
            throw new NotFoundHttpException('Data kunjungan tidak ditemukan.');
        }
        if ($dokterId !== null && (int) $kunjungan->dokter_id !== $dokterId) {
            throw new ForbiddenHttpException('Kunjungan ini bukan pasien Anda.');
        }

        return $kunjungan;
    }
}
