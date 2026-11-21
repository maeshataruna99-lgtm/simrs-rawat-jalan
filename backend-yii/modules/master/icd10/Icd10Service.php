<?php

namespace app\modules\master\icd10;

use app\common\CrudService;

/**
 * Pengelolaan master diagnosis ICD-10.
 *
 * Dipakai di: Icd10Controller.
 */
class Icd10Service extends CrudService
{
    protected function modelClass(): string
    {
        return Icd10::class;
    }

    protected function searchClass(): string
    {
        return Icd10Search::class;
    }
}
