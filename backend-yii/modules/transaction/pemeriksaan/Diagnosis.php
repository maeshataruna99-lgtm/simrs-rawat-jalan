<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ActiveRecord;
use app\modules\master\icd10\Icd10;
use yii\db\ActiveQuery;

/**
 * Model tabel t_diagnosis: diagnosis ICD-10 utama atau sekunder pada satu kunjungan.
 *
 * @property int $id
 * @property int $kunjungan_id
 * @property int $icd10_id
 * @property string $jenis
 * @property Icd10 $icd10
 */
class Diagnosis extends ActiveRecord
{
    public const JENIS_UTAMA = 'utama';
    public const JENIS_SEKUNDER = 'sekunder';

    public static function tableName(): string
    {
        return 't_diagnosis';
    }

    public function getIcd10(): ActiveQuery
    {
        return $this->hasOne(Icd10::class, ['id' => 'icd10_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['icd10'] = fn () => $this->icd10 ? ['id' => $this->icd10->id, 'kode' => $this->icd10->kode, 'nama' => $this->icd10->nama] : null;

        return $fields;
    }
}
