<?php

namespace app\common;

use yii\filters\auth\HttpBearerAuth;
use yii\web\UnauthorizedHttpException;

/**
 * Filter autentikasi token Bearer JWT dengan pesan gagal berbahasa Indonesia.
 *
 * Dipakai di: BaseApiController::behaviors().
 */
class JwtAuth extends HttpBearerAuth
{
    public function handleFailure($response): void
    {
        throw new UnauthorizedHttpException('Sesi tidak valid atau sudah berakhir, silakan login ulang.');
    }
}
