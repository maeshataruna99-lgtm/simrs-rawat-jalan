<?php

namespace app\modules\master\tindakan;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint CRUD master tindakan medis (/master/tindakan, kode menu `master-tindakan`).
 */
class TindakanController extends CrudController
{
    protected ?string $menuCode = 'master-tindakan';

    protected function service(): CrudService
    {
        return new TindakanService();
    }
}
