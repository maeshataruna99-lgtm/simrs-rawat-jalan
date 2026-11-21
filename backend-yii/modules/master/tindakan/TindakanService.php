<?php

namespace app\modules\master\tindakan;

use app\common\CrudService;

/**
 * Pengelolaan master tindakan medis dan tarif.
 *
 * Dipakai di: TindakanController.
 */
class TindakanService extends CrudService
{
    protected function modelClass(): string
    {
        return Tindakan::class;
    }

    protected function searchClass(): string
    {
        return TindakanSearch::class;
    }
}
