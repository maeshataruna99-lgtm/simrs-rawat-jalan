<?php

namespace app\tests\unit\system\user;

use app\common\ValidationException;
use app\modules\system\auth\AuthService;
use app\modules\system\auth\LoginForm;
use app\modules\system\role\Role;
use app\modules\system\user\User;
use app\modules\system\user\UserService;
use app\tests\Fixtures;
use app\tests\TestCase;
use Yii;
use yii\web\ConflictHttpException;

/**
 * Uji master user: password, reset password, dan perlindungan akun sendiri.
 */
class UserServiceTest extends TestCase
{
    private UserService $service;
    private Role $role;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new UserService();
        $this->role = Fixtures::role('admin', 'Administrator');
        $this->admin = Fixtures::user($this->role, 'admin');
        Yii::$app->user->setIdentity($this->admin);
    }

    private function canLogin(string $username, string $password): bool
    {
        try {
            (new AuthService())->login(new LoginForm(['username' => $username, 'password' => $password]));

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    public function testTambahUserDenganPasswordDanBisaLogin(): void
    {
        $user = $this->service->create(['username' => 'kasir1', 'nama' => 'Kasir Satu', 'role_id' => $this->role->id, 'password' => 'rahasia123']);

        $this->assertTrue($this->canLogin('kasir1', 'rahasia123'));
        $this->assertArrayNotHasKey('password_hash', $this->service->serialize($user));
        $this->assertArrayNotHasKey('password', $this->service->serialize($user));
        $this->assertSame('admin', $this->service->serialize($user)['role']['kode']);
    }

    public function testPasswordWajibDanMinimalDelapanKarakter(): void
    {
        try {
            $this->service->create(['username' => 'kasir1', 'nama' => 'Kasir', 'role_id' => $this->role->id, 'password' => 'pendek']);
            $this->fail('Password pendek seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('password', $e->errors);
        }
    }

    public function testUsernameGandaDanRoleTidakAdaDitolak(): void
    {
        try {
            $this->service->create(['username' => 'admin', 'nama' => 'X', 'role_id' => 999999, 'password' => 'rahasia123']);
            $this->fail('Seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('username', $e->errors);
            $this->assertArrayHasKey('role_id', $e->errors);
        }
    }

    public function testUbahDataTidakMengubahPassword(): void
    {
        $user = Fixtures::user($this->role, 'kasir1', 'rahasia123');

        $this->service->update($user->id, ['nama' => 'Nama Baru', 'password' => 'diabaikan123']);

        $this->assertTrue($this->canLogin('kasir1', 'rahasia123'));
        $this->assertSame('Nama Baru', User::findOne($user->id)->nama);
    }

    public function testResetPassword(): void
    {
        $user = Fixtures::user($this->role, 'kasir1', 'rahasia123');

        $this->service->resetPassword($user->id, 'passwordbaru1');

        $this->assertFalse($this->canLogin('kasir1', 'rahasia123'));
        $this->assertTrue($this->canLogin('kasir1', 'passwordbaru1'));

        $this->expectException(ValidationException::class);
        $this->service->resetPassword($user->id, 'pendek');
    }

    public function testUserNonaktifTidakBisaLogin(): void
    {
        $user = Fixtures::user($this->role, 'kasir1', 'rahasia123');

        $this->service->update($user->id, ['is_active' => false]);

        $this->assertFalse($this->canLogin('kasir1', 'rahasia123'));
    }

    public function testAdminTidakBisaMenonaktifkanAtauMenggantiRoleSendiri(): void
    {
        $lain = Fixtures::role('kasir', 'Kasir');

        try {
            $this->service->update($this->admin->id, ['is_active' => false, 'role_id' => $lain->id]);
            $this->fail('Seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('is_active', $e->errors);
            $this->assertArrayHasKey('role_id', $e->errors);
        }
    }

    public function testAdminTidakBisaMenghapusAkunSendiri(): void
    {
        $this->expectException(ConflictHttpException::class);
        $this->service->delete($this->admin->id);
    }
}
