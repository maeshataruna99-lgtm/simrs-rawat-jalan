<?php

namespace app\tests\unit\system\access;

use app\modules\system\access\AccessService;
use app\tests\Fixtures;
use app\tests\TestCase;

/**
 * Uji pembacaan hak akses role per menu.
 */
class AccessServiceTest extends TestCase
{
    public function testIzinSesuaiFlag(): void
    {
        $role = Fixtures::role('kasir', 'Kasir');
        Fixtures::grant($role, Fixtures::menu('billing'), 'RCU');
        $service = new AccessService();

        $this->assertTrue($service->can($role->id, 'billing', 'read'));
        $this->assertTrue($service->can($role->id, 'billing', 'create'));
        $this->assertFalse($service->can($role->id, 'billing', 'delete'));
    }

    public function testMenuTanpaBarisAksesDitolak(): void
    {
        $role = Fixtures::role('kasir', 'Kasir');
        Fixtures::menu('master-pasien');

        $this->assertFalse((new AccessService())->can($role->id, 'master-pasien', 'read'));
    }

    public function testMenuTanpaIzinBacaTidakDihitung(): void
    {
        $role = Fixtures::role('kasir', 'Kasir');
        Fixtures::grant($role, Fixtures::menu('billing'), 'C');

        $this->assertSame([], (new AccessService())->permissionsFor($role->id));
    }

    public function testMenuNonaktifAtauTerhapusTidakDihitung(): void
    {
        $role = Fixtures::role('admin', 'Administrator');
        Fixtures::grant($role, Fixtures::menu('nonaktif', ['is_active' => false]), 'RCUD');
        Fixtures::grant($role, Fixtures::menu('terhapus', ['deleted_at' => date('Y-m-d H:i:s')]), 'RCUD');
        Fixtures::grant($role, Fixtures::menu('aktif'), 'R');

        $this->assertSame(['aktif'], array_keys((new AccessService())->permissionsFor($role->id)));
    }
}
