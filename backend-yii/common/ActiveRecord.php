<?php

namespace app\common;

use yii\behaviors\BlameableBehavior;
use yii\behaviors\TimestampBehavior;
use yii\db\ActiveQuery;
use yii\db\Expression;

/**
 * Model dasar untuk tabel yang memakai kolom audit dan soft delete (common/Migration).
 * Mengisi updated_at, created_by, dan updated_by otomatis dari user yang login.
 *
 * Dipakai di: seluruh model master dan sistem.
 */
abstract class ActiveRecord extends \yii\db\ActiveRecord
{
    public function behaviors(): array
    {
        return [
            'timestamp' => [
                'class' => TimestampBehavior::class,
                'createdAtAttribute' => false,
                'updatedAtAttribute' => 'updated_at',
                'value' => new Expression('CURRENT_TIMESTAMP'),
            ],
            'blameable' => [
                'class' => BlameableBehavior::class,
                'createdByAttribute' => 'created_by',
                'updatedByAttribute' => 'updated_by',
            ],
        ] + (static::class === AuditLog::class ? [] : ['auditLog' => AuditLogBehavior::class]);
    }

    /**
     * Query baris yang belum dihapus.
     *
     * Dipakai di: CrudService, service dan model turunan.
     */
    public static function findActive(): ActiveQuery
    {
        return static::find()->andWhere([static::tableName() . '.deleted_at' => null]);
    }

    /**
     * Menandai baris sebagai terhapus tanpa menghapus datanya.
     *
     * Dipakai di: CrudService::delete().
     */
    public function softDelete(): void
    {
        $this->updateAttributes([
            'deleted_at' => new Expression('CURRENT_TIMESTAMP'),
            'updated_by' => \Yii::$app->has('user') ? \Yii::$app->user->id : null,
        ]);
        // updateAttributes() tidak memicu event behavior, jadi soft delete dicatat manual ke audit log.
        if ($this->getBehavior('auditLog') !== null) {
            AuditLog::catat(static::tableName(), (int) $this->getPrimaryKey(), 'delete', ['id' => $this->getPrimaryKey()], null);
        }
    }

    /**
     * Data yang dikirim ke frontend. Kolom audit dan soft delete tidak ikut.
     *
     * Dipakai di: CrudService::serialize().
     */
    public function fields(): array
    {
        $fields = parent::fields();
        unset($fields['created_by'], $fields['updated_by'], $fields['deleted_at']);

        return $fields;
    }
}
