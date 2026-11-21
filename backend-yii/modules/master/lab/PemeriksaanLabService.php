<?php

namespace app\modules\master\lab;

use app\common\CrudService;

/**
 * Pengelolaan master pemeriksaan laboratorium dan tarif.
 *
 * Dipakai di: PemeriksaanLabController.
 */
class PemeriksaanLabService extends CrudService
{
    protected function modelClass(): string
    {
        return PemeriksaanLab::class;
    }

    protected function searchClass(): string
    {
        return PemeriksaanLabSearch::class;
    }
}
