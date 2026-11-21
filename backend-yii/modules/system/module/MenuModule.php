<?php

namespace app\modules\system\module;

use app\common\ActiveRecord;

/**
 * Model tabel m_module: kelompok menu di sidebar.
 * Dinamai MenuModule agar tidak tertukar dengan class Module milik Yii.
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property string|null $icon
 * @property int $urutan
 * @property bool $is_active
 */
class MenuModule extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'm_module';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama'], 'required'],
            [['kode', 'nama', 'icon'], 'trim'],
            [['kode'], 'string', 'max' => 50],
            [['kode'], 'match', 'pattern' => '/^[a-z0-9-]+$/', 'message' => 'Kode hanya boleh huruf kecil, angka, dan tanda hubung.'],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode sudah dipakai.'],
            [['nama'], 'string', 'max' => 100],
            [['icon'], 'string', 'max' => 50],
            [['urutan'], 'integer', 'min' => 0],
            [['urutan'], 'default', 'value' => 0],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
        ];
    }

    public function attributeLabels(): array
    {
        return ['kode' => 'Kode', 'nama' => 'Nama', 'icon' => 'Ikon', 'urutan' => 'Urutan', 'is_active' => 'Status aktif'];
    }
}
