<?php

namespace app\tests\unit\system\auth;

use app\modules\system\auth\AuthService;
use app\modules\system\auth\LoginForm;
use app\modules\system\user\User;
use app\tests\Fixtures;
use app\tests\TestCase;
use yii\web\ForbiddenHttpException;
use yii\web\UnauthorizedHttpException;

/**
 * Uji proses login.
 */
class AuthServiceTest extends TestCase
{
    private function form(string $username, string $password): LoginForm
    {
        return new LoginForm(['username' => $username, 'password' => $password]);
    }

    public function testLoginBenarMendapatTokenDanProfil(): void
    {
        $user = Fixtures::user(Fixtures::role('dokter', 'Dokter'), 'drbudi', 'rahasia123');

        $result = (new AuthService())->login($this->form('drbudi', 'rahasia123'));

        $this->assertNotEmpty($result['token']);
        $this->assertSame('dokter', $result['user']['role']['kode']);
        $this->assertArrayNotHasKey('password_hash', $result['user']);
        $this->assertNotNull(User::findOne($user->id)->last_login_at);
    }

    public function testPasswordSalahDitolak(): void
    {
        Fixtures::user(Fixtures::role(), 'admin', 'rahasia123');

        $this->expectException(UnauthorizedHttpException::class);
        (new AuthService())->login($this->form('admin', 'salah'));
    }

    public function testUsernameTidakDikenalDitolakDenganPesanSama(): void
    {
        $this->expectException(UnauthorizedHttpException::class);
        $this->expectExceptionMessage('Username atau password salah.');
        (new AuthService())->login($this->form('tidak-ada', 'apa-saja'));
    }

    public function testUserNonaktifDitolak(): void
    {
        Fixtures::user(Fixtures::role(), 'admin', 'rahasia123', ['is_active' => false]);

        $this->expectException(ForbiddenHttpException::class);
        (new AuthService())->login($this->form('admin', 'rahasia123'));
    }

    public function testUserTerhapusTidakBisaLogin(): void
    {
        Fixtures::user(Fixtures::role(), 'admin', 'rahasia123', ['deleted_at' => date('Y-m-d H:i:s')]);

        $this->expectException(UnauthorizedHttpException::class);
        (new AuthService())->login($this->form('admin', 'rahasia123'));
    }

    public function testFormKosongTidakValid(): void
    {
        $form = $this->form('', '');

        $this->assertFalse($form->validate());
        $this->assertArrayHasKey('username', $form->getErrors());
        $this->assertArrayHasKey('password', $form->getErrors());
    }
}
