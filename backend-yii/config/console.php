<?php

/**
 * Konfigurasi aplikasi console (migrasi dan seeder).
 * Dipakai di: file `yii` di root backend-yii.
 */

return [
    'id' => 'simrs-console',
    'basePath' => dirname(__DIR__),
    'timeZone' => 'Asia/Jakarta',
    'controllerNamespace' => 'app\commands',
    'components' => [
        'db' => require __DIR__ . '/db.php',
    ],
    'controllerMap' => [
        'migrate' => [
            'class' => yii\console\controllers\MigrateController::class,
            'migrationPath' => '@app/migrations',
        ],
    ],
];
