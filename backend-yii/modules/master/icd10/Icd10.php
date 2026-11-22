<?php

namespace app\modules\master\icd10;

use app\common\ActiveRecord;

/**
 * Model tabel m_icd10: katalog kode dan nama diagnosis ICD-10.
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property bool $is_active
 */
class Icd10 extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'm_icd10';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama'], 'required'],
            [['kode', 'nama'], 'trim'],
            [['kode'], 'string', 'max' => 20],
            [['kode'], 'filter', 'filter' => 'mb_strtoupper'],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode ICD-10 sudah dipakai.'],
            [['nama'], 'string', 'max' => 200],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'kode' => 'Kode ICD-10',
            'nama' => 'Nama diagnosis',
            'is_active' => 'Status aktif',
        ];
    }
}
