<?php

namespace app\modules\master\lab;

use app\common\ActiveRecord;

/**
 * Model tabel m_pemeriksaan_lab: parameter pemeriksaan laboratorium beserta satuan, nilai rujukan, dan tarif.
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property string|null $satuan
 * @property string|null $nilai_rujukan
 * @property float|string $tarif
 * @property bool $is_active
 */
class PemeriksaanLab extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'm_pemeriksaan_lab';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama', 'tarif'], 'required'],
            [['kode', 'nama', 'satuan', 'nilai_rujukan'], 'trim'],
            [['kode', 'satuan'], 'string', 'max' => 30],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode sudah dipakai.'],
            [['nama'], 'string', 'max' => 150],
            [['nilai_rujukan'], 'string', 'max' => 100],
            [['satuan', 'nilai_rujukan'], 'default', 'value' => null],
            [['tarif'], 'number', 'min' => 0, 'message' => 'Tarif harus berupa angka.', 'tooSmall' => 'Tarif tidak boleh kurang dari 0.'],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'kode' => 'Kode',
            'nama' => 'Nama pemeriksaan',
            'satuan' => 'Satuan',
            'nilai_rujukan' => 'Nilai rujukan',
            'tarif' => 'Tarif',
            'is_active' => 'Status aktif',
        ];
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['tarif'] = fn () => (float) $this->tarif;

        return $fields;
    }
}
