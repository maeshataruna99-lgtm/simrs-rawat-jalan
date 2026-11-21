<?php

/**
 * Konfigurasi aplikasi web (REST API).
 * Dipakai di: web/index.php.
 */

use app\common\ApiResponse;

return [
    'id' => 'simrs-backend',
    'basePath' => dirname(__DIR__),
    'timeZone' => 'Asia/Jakarta',
    'language' => 'id-ID',
    'bootstrap' => ['log'],
    'modules' => [
        'master' => app\modules\master\Module::class,
        'transaction' => app\modules\transaction\Module::class,
        'system' => app\modules\system\Module::class,
    ],
    'components' => [
        'db' => require __DIR__ . '/db.php',
        'request' => [
            'enableCookieValidation' => false,
            'parsers' => [
                'application/json' => yii\web\JsonParser::class,
            ],
        ],
        'response' => [
            'format' => yii\web\Response::FORMAT_JSON,
            'on beforeSend' => [ApiResponse::class, 'normalizeError'],
        ],
        'user' => [
            'identityClass' => app\modules\system\user\User::class,
            'enableSession' => false,
            'loginUrl' => null,
        ],
        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName' => false,
            'rules' => [
                'GET health' => 'health/index',
            ],
        ],
        'log' => [
            'targets' => [
                [
                    'class' => yii\log\FileTarget::class,
                    'levels' => ['error', 'warning'],
                ],
            ],
        ],
    ],
];
