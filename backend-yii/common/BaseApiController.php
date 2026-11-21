<?php

namespace app\common;

use Yii;
use yii\base\Model;
use yii\filters\Cors;
use yii\rest\Controller;

/**
 * Controller dasar untuk seluruh endpoint API.
 * Urutan filter: CORS dulu (agar preflight tidak butuh token), lalu autentikasi JWT.
 * Semua action wajib login kecuali yang didaftarkan di $publicActions.
 *
 * Dipakai di: semua controller di modules/ dan controllers/.
 */
abstract class BaseApiController extends Controller
{
    /** @var string[] Action yang boleh diakses tanpa token, contoh ['login']. */
    protected array $publicActions = [];

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        unset($behaviors['authenticator'], $behaviors['rateLimiter']);

        return array_merge([
            'corsFilter' => [
                'class' => Cors::class,
                'cors' => [
                    'Origin' => [getenv('CORS_ORIGIN') ?: 'http://localhost:5173'],
                    'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                    'Access-Control-Request-Headers' => ['*'],
                    'Access-Control-Max-Age' => 3600,
                ],
            ],
            'authenticator' => [
                'class' => JwtAuth::class,
                'except' => array_merge(['options'], $this->publicActions),
            ],
        ], $behaviors);
    }

    /**
     * Membalas 422 dengan pesan validasi per field dari model.
     *
     * Dipakai di: controller yang memvalidasi form sebelum memanggil service.
     */
    protected function validationError(Model $model): array
    {
        Yii::$app->response->statusCode = 422;

        return ApiResponse::error('Validasi gagal.', $model->getErrors());
    }
}
