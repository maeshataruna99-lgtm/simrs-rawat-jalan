<?php

namespace app\modules\master\lab;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint CRUD master pemeriksaan laboratorium (/master/pemeriksaan-lab, kode menu `master-pemeriksaan-lab`).
 */
class PemeriksaanLabController extends CrudController
{
    protected ?string $menuCode = 'master-pemeriksaan-lab';

    protected function service(): CrudService
    {
        return new PemeriksaanLabService();
    }
}
