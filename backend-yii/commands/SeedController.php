<?php

namespace app\commands;

use app\seeds\DummySeeder;
use app\seeds\Icd10Seeder;
use app\seeds\SystemSeeder;
use yii\console\Controller;
use yii\console\ExitCode;

/**
 * Perintah pengisian data awal. Contoh: `php yii seed`, `php yii seed/system`, `php yii seed/icd10`, atau `php yii seed/dummy`.
 */
class SeedController extends Controller
{
    /**
     * Menjalankan seeder sistem, ICD-10, dan data dummy end-to-end secara berurutan.
     */
    public function actionIndex(): int
    {
        $this->actionSystem();
        $this->actionIcd10();
        $this->actionDummy();

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

    /**
     * Data dummy end-to-end: 50 pasien, 5 dokter, 4 poli, jadwal seminggu, dan kunjungan 30 hari.
     */
    public function actionDummy(): int
    {
        (new DummySeeder())->run();
        $this->stdout("Seeder dummy selesai.\n");

        return ExitCode::OK;
    }
}
