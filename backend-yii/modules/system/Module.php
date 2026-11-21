<?php

namespace app\modules\system;

/**
 * Modul sistem: autentikasi, user, role, modul, menu, dan hak akses (URL: /system/<modul>).
 */
class Module extends \yii\base\Module
{
    public $controllerMap = [
        'auth' => auth\AuthController::class,
        'module' => module\ModuleController::class,
        'menu' => menu\MenuController::class,
    ];
}
