<?php

namespace app\modules\system\auth;

use yii\base\Model;

/**
 * Validasi input form login.
 *
 * Dipakai di: AuthController::actionLogin(), AuthService::login().
 */
class LoginForm extends Model
{
    public ?string $username = null;
    public ?string $password = null;

    public function rules(): array
    {
        return [
            [['username', 'password'], 'required', 'message' => '{attribute} wajib diisi.'],
            [['username'], 'trim'],
            [['username'], 'string', 'max' => 50],
            [['password'], 'string', 'max' => 100],
        ];
    }

    public function attributeLabels(): array
    {
        return ['username' => 'Username', 'password' => 'Password'];
    }
}
