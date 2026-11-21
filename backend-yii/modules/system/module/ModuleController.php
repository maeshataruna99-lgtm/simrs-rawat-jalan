<?php

namespace app\modules\system\module;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint master modul: /system/module (hak akses menu `system-module`).
 */
class ModuleController extends CrudController
{
    protected ?string $menuCode = 'system-module';

    protected function service(): CrudService
    {
        return new MenuModuleService();
    }
}
