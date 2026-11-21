<?php

namespace app\commands;

use app\seeds\SystemSeeder;
use yii\console\Controller;
use yii\console\ExitCode;

/**
 * Perintah pengisian data awal. Contoh: `php yii seed` atau `php yii seed/system`.
 * Seeder master data dan data dummy transaksi ditambahkan di poin 2 dan 10.2.
 */
class SeedController extends Controller
{
    /**
     * Menjalankan semua seeder secara berurutan.
     */
    public function actionIndex(): int
    {
        return $this->actionSystem();
    }

    /**
     * Role, modul, menu, hak akses default, dan akun dummy per role.
     */
    public function actionSystem(): int
    {
        (new SystemSeeder())->run();
        $this->stdout("Seeder sistem selesai.\n");

        return ExitCode::OK;
    }
}
