<?php

namespace app\controllers;

use app\common\ApiResponse;
use app\common\BaseApiController;
use Yii;

/**
 * Pengecekan kesehatan service dan koneksi database.
 * Dipakai oleh healthcheck Docker dan service Node sebelum meneruskan data.
 */
class HealthController extends BaseApiController
{
    protected array $publicActions = ['index'];

    /**
     * GET /health
     */
    public function actionIndex(): array
    {
        Yii::$app->db->createCommand('SELECT 1')->queryScalar();

        return ApiResponse::success(['service' => 'backend-yii', 'database' => 'ok']);
    }
}
