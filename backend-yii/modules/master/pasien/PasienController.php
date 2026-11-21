<?php

namespace app\modules\master\pasien;

use app\common\CrudController;
use app\common\CrudService;

/**
 * Endpoint CRUD master pasien (/master/pasien, kode menu `master-pasien`).
 */
class PasienController extends CrudController
{
    protected ?string $menuCode = 'master-pasien';

    protected function service(): CrudService
    {
        return new PasienService();
    }
}
