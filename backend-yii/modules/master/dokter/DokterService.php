<?php

namespace app\modules\master\dokter;

use app\common\CrudService;

/**
 * Pengelolaan master dokter dan tenaga medis.
 *
 * Dipakai di: DokterController.
 */
class DokterService extends CrudService
{
    protected function modelClass(): string
    {
        return Dokter::class;
    }

    protected function searchClass(): string
    {
        return DokterSearch::class;
    }
}
