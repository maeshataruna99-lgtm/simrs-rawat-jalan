<?php

namespace app\modules\system\role;

use yii\db\ActiveQuery;
use yii\db\ActiveRecord;

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

    /**
     * Query role yang belum dihapus.
     *
     * Dipakai di: User::getRole(), service master role (poin 1.8).
     */
    public static function findActive(): ActiveQuery
    {
        return static::find()->andWhere(['deleted_at' => null]);
    }
}
