<?php

namespace app\modules\master\jadwal;

use app\common\CrudService;

/**
 * Pengelolaan master jadwal praktik dokter.
 *
 * Dipakai di: JadwalDokterController.
 */
class JadwalDokterService extends CrudService
{
    protected function modelClass(): string
    {
        return JadwalDokter::class;
    }

    protected function searchClass(): string
    {
        return JadwalDokterSearch::class;
    }
}
