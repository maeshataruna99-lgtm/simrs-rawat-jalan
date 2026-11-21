<?php

namespace app\modules\master;

/**
 * Modul master data (URL: /master/<modul>).
 * Setiap master berada di sub-folder sendiri, contoh master/pasien, dan didaftarkan di controllerMap.
 */
class Module extends \yii\base\Module
{
    public $controllerMap = [
        'pasien' => pasien\PasienController::class,
        'dokter' => dokter\DokterController::class,
        'poli' => poli\PoliController::class,
        'jadwal-dokter' => jadwal\JadwalDokterController::class,
        'tindakan' => tindakan\TindakanController::class,
        'obat' => obat\ObatController::class,
    ];
}
