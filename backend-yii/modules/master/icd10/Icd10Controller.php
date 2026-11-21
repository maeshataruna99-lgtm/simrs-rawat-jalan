<?php

namespace app\modules\master\icd10;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint CRUD dan pencarian master ICD-10 (/master/icd10, kode menu `master-icd10`).
 */
class Icd10Controller extends CrudController
{
    protected ?string $menuCode = 'master-icd10';

    protected function service(): CrudService
    {
        return new Icd10Service();
    }
}
