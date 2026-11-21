<?php

namespace app\modules\master\pasien;

use app\common\ActiveRecord;
use app\common\CrudService;
use app\common\SequenceService;
use app\common\ValidationException;
use Yii;
use yii\web\ConflictHttpException;

/**
 * Pengelolaan master pasien dan penerbitan nomor rekam medis otomatis (format RM000001).
 * Duplikasi NIK ditolak dengan status 409 Conflict.
 *
 * Dipakai di: PasienController.
 */
class PasienService extends CrudService
{
    protected function modelClass(): string
    {
        return Pasien::class;
    }

    protected function searchClass(): string
    {
        return PasienSearch::class;
    }

    /**
     * Mendaftarkan pasien baru dan membangkitkan nomor RM otomatis dari t_sequence_counter.
     *
     * @throws ValidationException
     * @throws ConflictHttpException Bila NIK sudah terdaftar.
     *
     * Dipakai di: PasienController::actionCreate().
     */
    public function create(array $data): ActiveRecord
    {
        $pasien = new Pasien();
        unset($data['no_rm']);
        $pasien->load($data, '');
        if (!$pasien->validate()) {
            throw new ValidationException($pasien->getErrors());
        }

        $this->assertUniqueNik($pasien->nik);

        Yii::$app->db->transaction(function () use ($pasien) {
            $pasien->no_rm = SequenceService::nextFormatted('RM', 'ALL', 'RM', 6);
            if (!$pasien->save(false)) {
                throw new ValidationException($pasien->getErrors());
            }
        });

        return $pasien;
    }

    /**
     * Memperbarui data pasien tanpa mengubah nomor RM.
     *
     * @throws ValidationException
     * @throws ConflictHttpException Bila NIK dipakai pasien lain.
     *
     * Dipakai di: PasienController::actionUpdate().
     */
    public function update(int $id, array $data): ActiveRecord
    {
        /** @var Pasien $pasien */
        $pasien = $this->find($id);
        unset($data['no_rm']);
        $pasien->load($data, '');
        if (!$pasien->validate()) {
            throw new ValidationException($pasien->getErrors());
        }

        $this->assertUniqueNik($pasien->nik, $pasien->id);
        $this->save($pasien);

        return $pasien;
    }

    private function assertUniqueNik(string $nik, ?int $ignoreId = null): void
    {
        $query = Pasien::findActive()->andWhere(['nik' => $nik]);
        if ($ignoreId !== null) {
            $query->andWhere(['<>', 'id', $ignoreId]);
        }

        if ($query->exists()) {
            throw new ConflictHttpException('NIK sudah terdaftar.');
        }
    }
}
