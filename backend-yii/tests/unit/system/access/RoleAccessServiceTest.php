<?php

namespace app\tests\unit\system\access;

use app\common\ValidationException;
use app\modules\system\access\AccessService;
use app\modules\system\access\RoleAccessService;
use app\modules\system\role\Role;
use app\modules\system\user\User;
use app\seeds\SystemSeeder;
use app\tests\TestCase;
use Yii;
use yii\db\Query;
use yii\web\NotFoundHttpException;

/**
 * Uji matriks hak akses role.
 */
class RoleAccessServiceTest extends TestCase
{
    private RoleAccessService $service;

    protected function setUp(): void
    {
        parent::setUp();
        (new SystemSeeder())->run();
        $this->service = new RoleAccessService();
    }

    private function roleId(string $kode): int
    {
        return (int) Role::findActive()->select('id')->andWhere(['kode' => $kode])->scalar();
    }

    private function menuId(string $kode): int
    {
        return (int) (new Query())->select('id')->from('m_menu')->where(['kode' => $kode])->scalar();
    }

    private function loginAs(string $username): void
    {
        Yii::$app->user->setIdentity(User::findActive()->andWhere(['username' => $username])->one());
    }

    public function testMatriksMenampilkanSemuaMenuDenganIzinRole(): void
    {
        $matrix = $this->service->matrix($this->roleId('kasir'));

        $menus = array_merge(...array_column($matrix['modules'], 'menus'));
        $billing = array_values(array_filter($menus, fn ($m) => $m['kode'] === 'billing'))[0];
        $pasien = array_values(array_filter($menus, fn ($m) => $m['kode'] === 'master-pasien'))[0];

        $this->assertCount(22, $menus);
        $this->assertTrue($billing['can_create']);
        $this->assertFalse($billing['can_delete']);
        $this->assertFalse($pasien['can_read']);
    }

    public function testSimpanMenggantiSeluruhAksesDanLangsungBerlaku(): void
    {
        $this->loginAs('admin');
        $kasir = $this->roleId('kasir');
        $access = new AccessService();
        $this->assertTrue($access->can($kasir, 'billing', 'read'));

        $this->service->replace($kasir, [['menu_id' => $this->menuId('dashboard'), 'can_read' => true]]);

        $this->assertTrue($access->can($kasir, 'dashboard', 'read'));
        $this->assertFalse($access->can($kasir, 'billing', 'read'));
    }

    public function testIzinUbahOtomatisMenyertakanIzinBacaDanBarisKosongDihapus(): void
    {
        $this->loginAs('admin');
        $kasir = $this->roleId('kasir');

        $this->service->replace($kasir, [
            ['menu_id' => $this->menuId('billing'), 'can_update' => true],
            ['menu_id' => $this->menuId('dashboard')],
        ]);

        $rows = (new Query())->from('m_role_access')->where(['role_id' => $kasir])->all();
        $this->assertCount(1, $rows);
        $this->assertTrue($rows[0]['can_read']);
        $this->assertTrue($rows[0]['can_update']);
    }

    public function testMenuTidakDikenalDitolak(): void
    {
        $this->loginAs('admin');

        $this->expectException(ValidationException::class);
        $this->service->replace($this->roleId('kasir'), [['menu_id' => 999999, 'can_read' => true]]);
    }

    public function testAdminTidakBisaMencabutAksesHakAksesDariRoleSendiri(): void
    {
        $this->loginAs('admin');

        try {
            $this->service->replace($this->roleId('admin'), [['menu_id' => $this->menuId('dashboard'), 'can_read' => true]]);
            $this->fail('Mencabut akses sendiri seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('access', $e->errors);
        }

        $this->assertTrue((new AccessService())->can($this->roleId('admin'), 'system-role-access', 'update'));
    }

    public function testRoleTidakAdaDibalas404(): void
    {
        $this->expectException(NotFoundHttpException::class);
        $this->service->matrix(999999);
    }

    public function testSimpanBerulangMenggantiAksesSecaraKonsisten(): void
    {
        $this->loginAs('admin');
        $kasir = $this->roleId('kasir');
        $dashId = $this->menuId('dashboard');
        $billId = $this->menuId('billing');

        $this->service->replace($kasir, [
            ['menu_id' => $dashId, 'can_read' => true],
            ['menu_id' => $billId, 'can_read' => true, 'can_create' => true],
        ]);
        $this->service->replace($kasir, [
            ['menu_id' => $dashId, 'can_read' => true, 'can_update' => true],
        ]);

        $rows = (new Query())->from('m_role_access')->where(['role_id' => $kasir])->all();
        $this->assertCount(1, $rows);
        $this->assertSame($dashId, (int) $rows[0]['menu_id']);
        $this->assertTrue($rows[0]['can_read']);
        $this->assertTrue($rows[0]['can_update']);
    }
}
