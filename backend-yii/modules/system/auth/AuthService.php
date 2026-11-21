<?php

namespace app\modules\system\auth;

use app\common\JwtService;
use app\modules\system\access\AccessService;
use app\modules\system\user\User;
use yii\db\Expression;
use yii\web\ForbiddenHttpException;
use yii\web\UnauthorizedHttpException;

/**
 * Proses login dan pembentukan data profil user.
 */
class AuthService
{
    /**
     * Memeriksa username dan password, lalu menerbitkan token JWT.
     * Username tidak dikenal dan password salah dibalas pesan yang sama agar username tidak bisa ditebak.
     *
     * @throws UnauthorizedHttpException Username atau password salah.
     * @throws ForbiddenHttpException Akun dinonaktifkan.
     *
     * Dipakai di: AuthController::actionLogin().
     */
    public function login(LoginForm $form): array
    {
        $user = User::findActive()->with('role')->andWhere(['username' => $form->username])->one();

        if ($user === null || !$user->validatePassword($form->password)) {
            throw new UnauthorizedHttpException('Username atau password salah.');
        }
        if (!$user->is_active) {
            throw new ForbiddenHttpException('Akun tidak aktif. Hubungi administrator.');
        }

        $user->updateAttributes(['last_login_at' => new Expression('CURRENT_TIMESTAMP')]);

        return array_merge(JwtService::issue($user), ['user' => $this->profile($user)]);
    }

    /**
     * Data profil user yang aman dikirim ke frontend (tanpa password hash),
     * beserta pohon menu sidebar dan izin per menu untuk menampilkan/menyembunyikan tombol.
     *
     * Dipakai di: login(), AuthController::actionMe().
     */
    public function profile(User $user): array
    {
        $access = new AccessService();

        return [
            'id' => $user->id,
            'username' => $user->username,
            'nama' => $user->nama,
            'dokter_id' => $user->dokter_id,
            'role' => ['id' => $user->role->id, 'kode' => $user->role->kode, 'nama' => $user->role->nama],
            'modules' => $access->menuTreeFor($user->role_id),
            'permissions' => (object) $access->permissionsFor($user->role_id),
        ];
    }
}
