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
}
