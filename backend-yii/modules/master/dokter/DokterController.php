<?php

namespace app\modules\master\dokter;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint CRUD master dokter dan tenaga medis (/master/dokter, kode menu `master-dokter`).
 */
class DokterController extends CrudController
{
    protected ?string $menuCode = 'master-dokter';

    protected function service(): CrudService
    {
        return new DokterService();
    }
}
