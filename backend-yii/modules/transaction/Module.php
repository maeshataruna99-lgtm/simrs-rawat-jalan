<?php

namespace app\modules\transaction;

/**
 * Modul transaksi pelayanan (URL: /transaction/<modul>).
 * Setiap transaksi berada di sub-folder sendiri, contoh transaction/pendaftaran, dan didaftarkan di controllerMap.
 */
class Module extends \yii\base\Module
{
    public $controllerMap = [
        'pendaftaran' => pendaftaran\PendaftaranController::class,
        'antrean' => antrean\AntreanController::class,
        'riwayat-kunjungan' => antrean\RiwayatKunjunganController::class,
        'pemeriksaan' => pemeriksaan\PemeriksaanController::class,
    ];
}
