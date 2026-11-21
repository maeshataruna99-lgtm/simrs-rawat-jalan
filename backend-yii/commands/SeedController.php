<?php

namespace app\commands;

use app\seeds\Icd10Seeder;
use app\seeds\SystemSeeder;
use yii\console\Controller;
use yii\console\ExitCode;

/**
 * Perintah pengisian data awal. Contoh: `php yii seed`, `php yii seed/system`, atau `php yii seed/icd10`.
 * Seeder data dummy transaksi ditambahkan di poin 10.2.
 */
class SeedController extends Controller
{
    /**
     * Menjalankan semua seeder secara berurutan.
     */
    public function actionIndex(): int
    {
        $this->actionSystem();
        $this->actionIcd10();

        return ExitCode::OK;
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

    /**
     * Master diagnosis ICD-10 umum rawat jalan.
     */
    public function actionIcd10(): int
    {
        (new Icd10Seeder())->run();
        $this->stdout("Seeder ICD-10 selesai.\n");

        return ExitCode::OK;
    }
}
