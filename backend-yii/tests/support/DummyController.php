<?php

namespace app\tests\support;

use app\common\BaseApiController;

/**
 * Controller tiruan untuk menguji rangkaian filter BaseApiController (JWT + hak akses menu).
 *
 * Dipakai di: tests/unit/common/AccessFilterTest.php.
 */
class DummyController extends BaseApiController
{
    protected ?string $menuCode = 'master-pasien';
    protected array $actionPermissions = ['serahkan' => 'update', 'antrean' => 'antrean:read', 'lain' => 'billing:read'];

    public function actionIndex(): string
    {
        return 'index';
    }

    public function actionCreate(): string
    {
        return 'create';
    }

    public function actionDelete(): string
    {
        return 'delete';
    }

    public function actionSerahkan(): string
    {
        return 'serahkan';
    }

    public function actionAntrean(): string
    {
        return 'antrean';
    }

    public function actionLain(): string
    {
        return 'lain';
    }

    public function actionBelumDipetakan(): string
    {
        return 'tidak boleh sampai sini';
    }
}
