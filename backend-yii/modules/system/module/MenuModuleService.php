<?php

namespace app\modules\system\module;

use app\common\ActiveRecord;
use app\common\CrudService;
use yii\db\Query;
use yii\web\ConflictHttpException;

/**
 * Pengelolaan master modul.
 *
 * Dipakai di: ModuleController.
 */
class MenuModuleService extends CrudService
{
    protected function modelClass(): string
    {
        return MenuModule::class;
    }

    protected function searchClass(): string
    {
        return MenuModuleSearch::class;
    }

    /**
     * Modul yang masih berisi menu aktif tidak boleh dihapus agar menu tidak hilang dari sidebar tanpa disadari.
     */
    protected function beforeDelete(ActiveRecord $model): void
    {
        $used = (new Query())
            ->from('m_module_menu mm')
            ->innerJoin('m_menu m', 'm.id = mm.menu_id AND m.deleted_at IS NULL')
            ->where(['mm.module_id' => $model->id])
            ->exists();

        if ($used) {
            throw new ConflictHttpException('Modul masih berisi menu. Pindahkan atau hapus menunya terlebih dahulu.');
        }
    }
}
