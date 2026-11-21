<?php

namespace app\modules\system\role;

use app\common\ActiveRecord;

/**
 * Model tabel m_role.
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property string|null $keterangan
 * @property string|null $deleted_at
 */
class Role extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'm_role';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama'], 'required'],
            [['kode', 'nama', 'keterangan'], 'trim'],
            [['kode'], 'string', 'max' => 50],
            [['kode'], 'match', 'pattern' => '/^[a-z0-9-]+$/', 'message' => 'Kode hanya boleh huruf kecil, angka, dan tanda hubung.'],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode sudah dipakai.'],
            [['nama'], 'string', 'max' => 100],
            [['keterangan'], 'string', 'max' => 255],
        ];
    }

    public function attributeLabels(): array
    {
        return ['kode' => 'Kode', 'nama' => 'Nama', 'keterangan' => 'Keterangan'];
    }
}
