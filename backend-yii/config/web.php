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
                // Tindakan per kunjungan: POST /transaction/tindakan/{kunjunganId}, DELETE /transaction/tindakan/item/{id}.
                'POST transaction/tindakan/<id:\d+>' => 'transaction/tindakan/create',
                'DELETE transaction/tindakan/item/<id:\d+>' => 'transaction/tindakan/delete',
                'OPTIONS transaction/tindakan/item/<id:\d+>' => 'transaction/tindakan/options',
                // Invoice per kunjungan: POST /transaction/invoice/{kunjunganId}.
                'POST transaction/invoice/<id:\d+>' => 'transaction/invoice/create',
                // Pola REST untuk semua controller CRUD di modul master, transaction, dan system.
                'GET <module:(master|transaction|system)>/<controller:[\w-]+>' => '<module>/<controller>/index',
                'GET <module:(master|transaction|system)>/<controller:[\w-]+>/<id:\d+>' => '<module>/<controller>/view',
                'POST <module:(master|transaction|system)>/<controller:[\w-]+>' => '<module>/<controller>/create',
                'PUT,PATCH <module:(master|transaction|system)>/<controller:[\w-]+>/<id:\d+>' => '<module>/<controller>/update',
                'DELETE <module:(master|transaction|system)>/<controller:[\w-]+>/<id:\d+>' => '<module>/<controller>/delete',
                // Aksi khusus pada satu data, contoh PUT /system/user/5/reset-password atau GET /master/obat/1/mutasi.
                'GET,PUT,POST <module:(master|transaction|system)>/<controller:[\w-]+>/<id:\d+>/<action:[\w-]+>' => '<module>/<controller>/<action>',
                // Aksi khusus tingkat controller, contoh GET /transaction/pendaftaran/cari-pasien.
                'GET,PUT,POST <module:(master|transaction|system)>/<controller:[\w-]+>/<action:[a-zA-Z][\w-]*>' => '<module>/<controller>/<action>',
                // Preflight CORS diarahkan ke BaseApiController::actionOptions agar tidak terhalang VerbFilter/Auth.
                'OPTIONS <module:(master|transaction|system)>/<controller:[\w-]+>' => '<module>/<controller>/options',
                'OPTIONS <module:(master|transaction|system)>/<controller:[\w-]+>/<id:\d+>' => '<module>/<controller>/options',
                'OPTIONS <module:(master|transaction|system)>/<controller:[\w-]+>/<id:\d+>/<action:[\w-]+>' => '<module>/<controller>/options',
                'OPTIONS <module:(master|transaction|system)>/<controller:[\w-]+>/<action:[a-zA-Z][\w-]*>' => '<module>/<controller>/options',
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
