<?php

/**
 * Koneksi PostgreSQL. Nilai diambil dari environment (lihat docker-compose.yml dan .env.example).
 * Dipakai di: config/web.php, config/console.php.
 */

return [
    'class' => yii\db\Connection::class,
    'dsn' => sprintf(
        'pgsql:host=%s;port=%s;dbname=%s',
        getenv('DB_HOST') ?: 'localhost',
        getenv('DB_PORT') ?: '5432',
        getenv('DB_NAME') ?: 'simrs'
    ),
    'username' => getenv('DB_USER') ?: 'simrs',
    'password' => getenv('DB_PASSWORD') ?: '',
    'charset' => 'utf8',
];
