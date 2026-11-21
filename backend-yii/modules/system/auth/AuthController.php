<?php

namespace app\modules\system\auth;

use app\common\ApiResponse;
use app\common\BaseApiController;
use Yii;

/**
 * Endpoint autentikasi: login dan profil user aktif.
 */
class AuthController extends BaseApiController
{
    protected array $publicActions = ['login'];

    private AuthService $service;

    public function init(): void
    {
        parent::init();
        $this->service = new AuthService();
    }

    protected function verbs(): array
    {
        return ['login' => ['POST'], 'me' => ['GET']];
    }

    /**
     * POST /system/auth/login
     * Body: { "username": "...", "password": "..." }
     */
    public function actionLogin(): array
    {
        $form = new LoginForm();
        $form->load(Yii::$app->request->bodyParams, '');
        if (!$form->validate()) {
            return $this->validationError($form);
        }

        return ApiResponse::success($this->service->login($form), 'Login berhasil.');
    }

    /**
     * GET /system/auth/me
     * Profil user dari token. Pohon menu dan izin ditambahkan di poin 1.6.
     */
    public function actionMe(): array
    {
        return ApiResponse::success($this->service->profile(Yii::$app->user->identity));
    }
}
