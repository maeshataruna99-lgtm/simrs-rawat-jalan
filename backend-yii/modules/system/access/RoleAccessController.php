<?php

namespace app\modules\system\access;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint matriks hak akses role (hak akses menu `system-role-access`):
 * GET /system/role-access/{roleId} dan PUT /system/role-access/{roleId}.
 */
class RoleAccessController extends BaseApiController
{
    protected ?string $menuCode = 'system-role-access';

    protected function verbs(): array
    {
        return ['view' => ['GET'], 'update' => ['PUT']];
    }

    public function actionView(int $id): array
    {
        return ApiResponse::success((new RoleAccessService())->matrix($id));
    }

    /**
     * Body: { "access": [ { "menu_id": 1, "can_read": true, "can_create": false, ... }, ... ] }
     * Menu yang tidak dikirim dianggap tanpa akses.
     */
    public function actionUpdate(int $id): array
    {
        $items = Yii::$app->request->bodyParams['access'] ?? null;
        if (!is_array($items)) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error('Validasi gagal.', ['access' => ['Daftar akses wajib dikirim.']]);
        }

        try {
            $matrix = (new RoleAccessService())->replace($id, $items);
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        return ApiResponse::success($matrix, 'Hak akses berhasil disimpan.');
    }
}
