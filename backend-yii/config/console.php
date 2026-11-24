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
        // Cache skema sama dengan aplikasi web: migrasi DDL ikut menyegarkannya, dan
        // `php yii cache/flush-schema` membersihkannya setelah migrasi SQL mentah.
        'db' => array_merge(require __DIR__ . '/db.php', [
            'enableSchemaCache' => YII_ENV !== 'test',
            'schemaCacheDuration' => 3600,
        ]),
        // Di luar folder proyek: pada bind mount Windows, baca file cache di runtime/ hampir selambat query skema.
        'cache' => [
            'class' => yii\caching\FileCache::class,
            'cachePath' => sys_get_temp_dir() . '/simrs-yii-cache',
        ],
    ],
    'controllerMap' => [
        'migrate' => [
            'class' => yii\console\controllers\MigrateController::class,
            'migrationPath' => '@app/migrations',
        ],
    ],
];
