<?php

namespace app\modules\system\menu;

use app\common\ActiveRecord;
use app\common\CrudService;
use app\modules\system\access\AccessService;
use Yii;
use yii\web\ConflictHttpException;

/**
 * Pengelolaan master menu beserta penempatannya di modul.
 *
 * Dipakai di: MenuController.
 */
class MenuService extends CrudService
{
    protected function modelClass(): string
    {
        return Menu::class;
    }

    protected function searchClass(): string
    {
        return MenuSearch::class;
    }

    /**
     * Menyimpan penempatan menu di satu modul (m_module_menu) dalam transaksi yang sama.
     *
     * @param Menu $model
     */
    protected function afterSave(ActiveRecord $model): void
    {
        $db = Yii::$app->db;
        $db->createCommand()->delete('m_module_menu', ['menu_id' => $model->id])->execute();
        $db->createCommand()->insert('m_module_menu', [
            'module_id' => $model->module_id,
            'menu_id' => $model->id,
            'urutan' => $model->urutan,
        ])->execute();

        AccessService::clearCache();
    }

    /**
     * Menu yang masih punya sub-menu aktif tidak boleh dihapus.
     */
    protected function beforeDelete(ActiveRecord $model): void
    {
        if (Menu::findActive()->andWhere(['parent_id' => $model->id])->exists()) {
            throw new ConflictHttpException('Menu masih memiliki sub-menu. Hapus atau pindahkan sub-menunya terlebih dahulu.');
        }
        AccessService::clearCache();
    }
}
