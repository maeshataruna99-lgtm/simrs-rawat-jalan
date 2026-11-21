<?php

namespace app\modules\system\role;

use app\common\ActiveRecord;
use app\common\CrudService;
use app\modules\system\access\AccessService;
use app\modules\system\user\User;
use yii\web\ConflictHttpException;

/**
 * Pengelolaan master role. Hak akses role diatur terpisah lewat RoleAccessService.
 *
 * Dipakai di: RoleController.
 */
class RoleService extends CrudService
{
    protected function modelClass(): string
    {
        return Role::class;
    }

    protected function searchClass(): string
    {
        return RoleSearch::class;
    }

    /**
     * Role yang masih dipakai user tidak boleh dihapus agar user tidak kehilangan akses tanpa disadari.
     */
    protected function beforeDelete(ActiveRecord $model): void
    {
        if (User::findActive()->andWhere(['role_id' => $model->id])->exists()) {
            throw new ConflictHttpException('Role masih dipakai oleh user. Pindahkan user ke role lain terlebih dahulu.');
        }
        AccessService::clearCache();
    }
}
