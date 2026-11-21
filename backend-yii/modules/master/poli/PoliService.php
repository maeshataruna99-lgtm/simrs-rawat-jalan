<?php

namespace app\modules\master\poli;

use app\common\CrudService;

/**
 * Pengelolaan master poli / unit pelayanan.
 *
 * Dipakai di: PoliController.
 */
class PoliService extends CrudService
{
    protected function modelClass(): string
    {
        return Poli::class;
    }

    protected function searchClass(): string
    {
        return PoliSearch::class;
    }
}
