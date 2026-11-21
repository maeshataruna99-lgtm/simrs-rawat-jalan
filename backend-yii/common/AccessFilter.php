<?php

namespace app\common;

use app\modules\system\access\AccessService;
use Yii;
use yii\base\ActionFilter;
use yii\base\InvalidConfigException;
use yii\web\ForbiddenHttpException;

/**
 * Filter hak akses: setiap action dipetakan ke kode menu + aksi, lalu dicocokkan dengan m_role_access.
 * Controller tanpa kode menu (contoh AuthController) cukup mewajibkan login.
 *
 * Dipakai di: BaseApiController::behaviors(), dijalankan setelah JwtAuth.
 */
class AccessFilter extends ActionFilter
{
    /** Pemetaan bawaan nama action ke aksi izin. */
    private const DEFAULT_PERMISSIONS = [
        'index' => 'read',
        'view' => 'read',
        'create' => 'create',
        'update' => 'update',
        'delete' => 'delete',
    ];

    /** Kode menu, contoh `master-pasien`. Null berarti cukup login. */
    public ?string $menu = null;

    /** @var array<string, string> Pemetaan tambahan action => aksi, contoh ['proses' => 'update']. */
    public array $actionPermissions = [];

    public function beforeAction($action): bool
    {
        if ($this->menu === null) {
            return true;
        }

        $permission = $this->actionPermissions[$action->id] ?? self::DEFAULT_PERMISSIONS[$action->id] ?? null;
        if (!in_array($permission, AccessService::PERMISSIONS, true)) {
            throw new InvalidConfigException("Action '{$action->id}' belum dipetakan ke aksi izin pada menu '{$this->menu}'.");
        }

        $roleId = Yii::$app->user->identity->role_id;
        if (!(new AccessService())->can($roleId, $this->menu, $permission)) {
            throw new ForbiddenHttpException('Anda tidak memiliki akses ke fitur ini.');
        }

        return true;
    }
}
