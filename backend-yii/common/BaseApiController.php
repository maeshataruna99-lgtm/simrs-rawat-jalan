<?php

namespace app\common;

use yii\filters\Cors;
use yii\rest\Controller;

/**
 * Controller dasar untuk seluruh endpoint API.
 * Menangani CORS dari frontend. Autentikasi dan hak akses ditambahkan di poin 1.
 *
 * Dipakai di: semua controller di modules/ dan controllers/.
 */
abstract class BaseApiController extends Controller
{
    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        unset($behaviors['rateLimiter']);

        $behaviors['corsFilter'] = [
            'class' => Cors::class,
            'cors' => [
                'Origin' => [getenv('CORS_ORIGIN') ?: 'http://localhost:5173'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 3600,
            ],
        ];

        return $behaviors;
    }
}
