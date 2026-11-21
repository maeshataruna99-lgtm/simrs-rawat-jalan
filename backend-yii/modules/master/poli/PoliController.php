<?php

namespace app\modules\master\poli;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint CRUD master poli (/master/poli, kode menu `master-poli`).
 */
class PoliController extends CrudController
{
    protected ?string $menuCode = 'master-poli';

    protected function service(): CrudService
    {
        return new PoliService();
    }
}
