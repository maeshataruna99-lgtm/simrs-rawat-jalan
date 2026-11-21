<?php

namespace app\tests\unit\system\role;

use app\common\ValidationException;
use app\modules\system\role\RoleService;
use app\tests\Fixtures;
use app\tests\TestCase;
use yii\web\ConflictHttpException;

/**
 * Uji master role.
 */
class RoleServiceTest extends TestCase
{
    public function testTambahDanKodeGandaDitolak(): void
    {
        $service = new RoleService();
        $service->create(['kode' => 'perawat', 'nama' => 'Perawat']);

        $this->expectException(ValidationException::class);
        $service->create(['kode' => 'perawat', 'nama' => 'Perawat Lain']);
    }

    public function testRoleYangMasihDipakaiUserTidakBisaDihapus(): void
    {
        $role = Fixtures::role('kasir', 'Kasir');
        Fixtures::user($role, 'kasir1');

        $this->expectException(ConflictHttpException::class);
        (new RoleService())->delete($role->id);
    }

    public function testRoleTanpaUserBisaDihapus(): void
    {
        $role = Fixtures::role('kosong', 'Role Kosong');
        $service = new RoleService();

        $service->delete($role->id);

        $this->assertSame(0, $service->list(['q' => 'kosong'])->getTotalCount());
    }
}
