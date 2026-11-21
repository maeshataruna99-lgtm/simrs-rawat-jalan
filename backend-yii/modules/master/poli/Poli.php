<?php

namespace app\modules\master\poli;

use app\common\ActiveRecord;

/**
 * Model tabel m_poli: unit pelayanan rawat jalan beserta tarif pendaftarannya.
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property float|string $tarif_pendaftaran
 * @property bool $is_active
 */
class Poli extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'm_poli';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama', 'tarif_pendaftaran'], 'required'],
            [['kode', 'nama'], 'trim'],
            [['kode'], 'string', 'max' => 30],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode sudah dipakai.'],
            [['nama'], 'string', 'max' => 100],
            [['tarif_pendaftaran'], 'number', 'min' => 0, 'message' => 'Tarif pendaftaran harus berupa angka.', 'tooSmall' => 'Tarif pendaftaran tidak boleh kurang dari 0.'],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'kode' => 'Kode',
            'nama' => 'Nama poli',
            'tarif_pendaftaran' => 'Tarif pendaftaran',
            'is_active' => 'Status aktif',
        ];
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['tarif_pendaftaran'] = fn () => (float) $this->tarif_pendaftaran;

        return $fields;
    }
}
