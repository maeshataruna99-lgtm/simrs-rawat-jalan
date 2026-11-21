<?php

namespace app\tests\unit\system\access;

use app\modules\system\access\AccessService;
use app\modules\system\auth\AuthService;
use app\modules\system\role\Role;
use app\modules\system\user\User;
use app\seeds\SystemSeeder;
use app\tests\Fixtures;
use app\tests\TestCase;
use Yii;

/**
 * Uji pohon menu sidebar per role.
 */
class MenuTreeTest extends TestCase
{
    private function roleId(string $kode): int
    {
        return Role::findActive()->select('id')->andWhere(['kode' => $kode])->scalar();
    }

    private function menuKodes(array $tree): array
    {
        $kodes = [];
        foreach ($tree as $module) {
            foreach ($module['menus'] as $menu) {
                $kodes[] = $menu['kode'];
            }
        }

        return $kodes;
    }

    public function testKasirHanyaMelihatDashboardDanBilling(): void
    {
        (new SystemSeeder())->run();

        $tree = (new AccessService())->menuTreeFor($this->roleId('kasir'));

        $this->assertSame(['dashboard', 'billing'], array_column($tree, 'kode'));
        $this->assertSame(['dashboard', 'billing'], $this->menuKodes($tree));
    }

    public function testDokterMelihatMenuPelayananDanMasterYangBolehDibaca(): void
    {
        (new SystemSeeder())->run();

        $tree = (new AccessService())->menuTreeFor($this->roleId('dokter'));

        $this->assertSame(['dashboard', 'pendaftaran', 'pelayanan', 'master'], array_column($tree, 'kode'));
        $this->assertContains('pemeriksaan', $this->menuKodes($tree));
        $this->assertNotContains('billing', $this->menuKodes($tree));
        $this->assertNotContains('master-pasien', $this->menuKodes($tree));
    }

    public function testAdministratorMelihatSemuaModulBerurutan(): void
    {
        (new SystemSeeder())->run();

        $tree = (new AccessService())->menuTreeFor($this->roleId('admin'));

        $this->assertSame(
            ['dashboard', 'pendaftaran', 'pelayanan', 'farmasi', 'laboratorium', 'billing', 'master', 'sistem'],
            array_column($tree, 'kode')
        );
    }

    public function testMenuIndukTampilBilaAnaknyaBolehDibaca(): void
    {
        $role = Fixtures::role('dokter', 'Dokter');
        Yii::$app->db->createCommand()->insert('m_module', ['kode' => 'pelayanan', 'nama' => 'Pelayanan'])->execute();
        $moduleId = (int) Yii::$app->db->getLastInsertID('m_module_id_seq');
        $parentId = Fixtures::menu('grup-rme', ['nama' => 'Rekam Medis']);
        $childId = Fixtures::menu('pemeriksaan', ['parent_id' => $parentId, 'path' => '/transaction/pemeriksaan']);
        $hiddenId = Fixtures::menu('rahasia', ['parent_id' => $parentId, 'path' => '/rahasia']);
        foreach ([$parentId, $childId, $hiddenId] as $menuId) {
            Yii::$app->db->createCommand()->insert('m_module_menu', ['module_id' => $moduleId, 'menu_id' => $menuId])->execute();
        }
        Fixtures::grant($role, $childId, 'R');

        $tree = (new AccessService())->menuTreeFor($role->id);

        $this->assertSame('grup-rme', $tree[0]['menus'][0]['kode']);
        $this->assertSame(['pemeriksaan'], array_column($tree[0]['menus'][0]['children'], 'kode'));
    }

    public function testProfilBerisiModulDanIzin(): void
    {
        (new SystemSeeder())->run();
        $user = User::findActive()->andWhere(['username' => 'kasir'])->one();

        $profile = (new AuthService())->profile($user);

        $this->assertSame(['dashboard', 'billing'], array_column($profile['modules'], 'kode'));
        $this->assertTrue($profile['permissions']->billing['create']);
        $this->assertFalse($profile['permissions']->billing['delete']);
    }
}
