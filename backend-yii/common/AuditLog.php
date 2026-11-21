<?php

namespace app\common;

use Yii;
use yii\db\Expression;
use yii\db\JsonExpression;

/**
 * Model dan helper pencatatan tabel t_audit_log untuk jejak perubahan data klinis dan tagihan (D.4).
 *
 * @property int $id
 * @property string $tabel
 * @property int $record_id
 * @property string $aksi
 * @property mixed $data_lama
 * @property mixed $data_baru
 * @property int|null $user_id
 * @property string $waktu
 */
class AuditLog extends ActiveRecord
{
    public static function tableName(): string
    {
        return 't_audit_log';
    }

    /**
     * Mencatat satu baris audit log ke t_audit_log.
     *
     * @param array<string, mixed>|null $dataLama
     * @param array<string, mixed>|null $dataBaru
     *
     * Dipakai di: AuditLogBehavior, BillingSyncService, PemeriksaanService::simpanDiagnosis.
     */
    public static function catat(
        string $tabel,
        int $recordId,
        string $aksi,
        ?array $dataLama,
        ?array $dataBaru,
        ?int $userId = null
    ): void {
        $uid = $userId ?? (Yii::$app->has('user') && !Yii::$app->user->isGuest ? (int) Yii::$app->user->id : null);

        Yii::$app->db->createCommand()->insert(self::tableName(), [
            'tabel' => $tabel,
            'record_id' => $recordId,
            'aksi' => $aksi,
            'data_lama' => $dataLama === null ? null : new JsonExpression($dataLama),
            'data_baru' => $dataBaru === null ? null : new JsonExpression($dataBaru),
            'user_id' => $uid,
            'waktu' => new Expression('CURRENT_TIMESTAMP'),
            'created_by' => $uid,
            'updated_by' => $uid,
        ])->execute();
    }
}
