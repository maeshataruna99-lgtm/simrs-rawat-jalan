<?php

namespace app\tests\unit\seeds;

use app\modules\system\auth\AuthService;
use app\modules\system\auth\LoginForm;
use app\seeds\SystemSeeder;
use app\tests\TestCase;
use yii\db\Query;

/**
 * Uji seeder sistem: hasil lengkap, aman dijalankan ulang, dan hak akses sesuai role.
 */
class SystemSeederTest extends TestCase
{
    private function countRows(string $table): int
    {
        return (int) (new Query())->from($table)->count();
    }

    private function access(string $roleKode): array
    {
        return (new Query())
            ->select(['m.kode', 'a.can_read', 'a.can_create', 'a.can_update', 'a.can_delete'])
            ->from('m_role_access a')
            ->innerJoin('m_role r', 'r.id = a.role_id')
            ->innerJoin('m_menu m', 'm.id = a.menu_id')
            ->where(['r.kode' => $roleKode])
            ->indexBy('kode')
            ->all();
    }

    public function testMenghasilkanSemuaDataAwal(): void
    {
        (new SystemSeeder())->run();

        $this->assertSame(6, $this->countRows('m_role'));
        $this->assertSame(6, $this->countRows('m_user'));
        $this->assertSame(21, $this->countRows('m_menu'));
        $this->assertSame($this->countRows('m_menu'), $this->countRows('m_module_menu'));
    }

    public function testAmanDijalankanBerulang(): void
    {
        (new SystemSeeder())->run();
        $before = [$this->countRows('m_role'), $this->countRows('m_menu'), $this->countRows('m_role_access'), $this->countRows('m_user')];

        (new SystemSeeder())->run();
        $after = [$this->countRows('m_role'), $this->countRows('m_menu'), $this->countRows('m_role_access'), $this->countRows('m_user')];

        $this->assertSame($before, $after);
    }

    public function testAdministratorPunyaAksesPenuhKeSemuaMenu(): void
    {
        (new SystemSeeder())->run();
        $access = $this->access('admin');

        $this->assertCount($this->countRows('m_menu'), $access);
        foreach ($access as $row) {
            $this->assertTrue($row['can_read'] && $row['can_create'] && $row['can_update'] && $row['can_delete']);
        }
    }

    public function testKasirHanyaMengaksesDashboardDanBillingTanpaHapus(): void
    {
        (new SystemSeeder())->run();
        $access = $this->access('kasir');

        $menus = array_keys($access);
        sort($menus);

        $this->assertSame(['billing', 'dashboard'], $menus);
        $this->assertTrue($access['billing']['can_create']);
        $this->assertFalse($access['billing']['can_delete']);
        $this->assertFalse($access['dashboard']['can_create']);
    }

    public function testSetiapAkunDummyBisaLogin(): void
    {
        (new SystemSeeder())->run();
        $auth = new AuthService();

        foreach (['admin', 'pendaftaran', 'dokter', 'farmasi', 'laboratorium', 'kasir'] as $username) {
            $result = $auth->login(new LoginForm(['username' => $username, 'password' => 'simrs123']));
            $this->assertSame($username, $result['user']['role']['kode']);
        }
    }
}
