<?php

namespace app\modules\system\menu;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint master menu: /system/menu (hak akses menu `system-menu`).
 */
class MenuController extends CrudController
{
    protected ?string $menuCode = 'system-menu';

    protected function service(): CrudService
    {
        return new MenuService();
    }
}
