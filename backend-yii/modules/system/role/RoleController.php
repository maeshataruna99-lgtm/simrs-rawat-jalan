<?php

namespace app\modules\system\role;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint master role: /system/role (hak akses menu `system-role`).
 */
class RoleController extends CrudController
{
    protected ?string $menuCode = 'system-role';

    protected function service(): CrudService
    {
        return new RoleService();
    }
}
