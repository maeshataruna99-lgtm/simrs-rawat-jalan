<?php

namespace app\modules\master\tindakan;

use app\common\ActiveRecord;
use app\modules\master\poli\Poli;
use yii\db\ActiveQuery;

/**
 * Model tabel m_tindakan: master tindakan medis beserta tarif dasar dan keterkaitan poli.
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property float|string $tarif
 * @property int|null $poli_id
 * @property bool $is_active
 * @property Poli|null $poli
 */
class Tindakan extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'm_tindakan';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama', 'tarif'], 'required'],
            [['kode', 'nama'], 'trim'],
            [['kode'], 'string', 'max' => 30],
            [['kode'], 'filter', 'filter' => 'mb_strtoupper'],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode sudah dipakai.'],
            [['nama'], 'string', 'max' => 150],
            [['tarif'], 'number', 'min' => 0, 'message' => 'Tarif harus berupa angka.', 'tooSmall' => 'Tarif tidak boleh kurang dari 0.'],
            [['poli_id'], 'integer'],
            [['poli_id'], 'default', 'value' => null],
            [['poli_id'], 'exist', 'targetClass' => Poli::class, 'targetAttribute' => 'id', 'filter' => ['deleted_at' => null], 'message' => 'Poli tidak ditemukan.'],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'kode' => 'Kode',
            'nama' => 'Nama tindakan',
            'tarif' => 'Tarif',
            'poli_id' => 'Poli',
            'is_active' => 'Status aktif',
        ];
    }

    public function getPoli(): ActiveQuery
    {
        return $this->hasOne(Poli::class, ['id' => 'poli_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['tarif'] = fn () => (float) $this->tarif;
        $fields['poli'] = fn () => $this->poli ? [
            'id' => $this->poli->id,
            'kode' => $this->poli->kode,
            'nama' => $this->poli->nama,
        ] : null;

        return $fields;
    }
}
