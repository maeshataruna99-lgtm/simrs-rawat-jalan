<?php

namespace app\modules\master\jadwal;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint CRUD master jadwal praktik dokter (/master/jadwal-dokter, kode menu `master-jadwal-dokter`).
 */
class JadwalDokterController extends CrudController
{
    protected ?string $menuCode = 'master-jadwal-dokter';

    protected function service(): CrudService
    {
        return new JadwalDokterService();
    }
}
