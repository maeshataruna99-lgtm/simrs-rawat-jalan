<?php

namespace app\modules\system\user;

use app\common\ApiResponse;
use app\common\CrudController;
use app\common\CrudService;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint master user: /system/user (hak akses menu `system-user`)
 * dan PUT /system/user/{id}/reset-password (izin ubah).
 */
class UserController extends CrudController
{
    protected ?string $menuCode = 'system-user';
    protected array $actionPermissions = ['reset-password' => 'update'];

    protected function service(): CrudService
    {
        return new UserService();
    }

    protected function verbs(): array
    {
        return array_merge(parent::verbs(), ['reset-password' => ['PUT']]);
    }

    /**
     * Body: { "password": "..." }
     */
    public function actionResetPassword(int $id): array
    {
        try {
            (new UserService())->resetPassword($id, Yii::$app->request->bodyParams['password'] ?? null);
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        return ApiResponse::success(null, 'Password berhasil direset.');
    }
}
