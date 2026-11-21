<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ApiResponse;
use app\common\BaseApiController;
use Yii;

/**
 * Endpoint pemeriksaan dokter (/transaction/pemeriksaan, kode menu `pemeriksaan`).
 */
class PemeriksaanController extends BaseApiController
{
    protected ?string $menuCode = 'pemeriksaan';
    protected array $actionPermissions = [
        'worklist' => 'read',
    ];

    protected function verbs(): array
    {
        return [
            'worklist' => ['GET'],
        ];
    }

    /**
     * GET /transaction/pemeriksaan/worklist — pasien hari ini yang menunggu atau sedang diperiksa.
     */
    public function actionWorklist(): array
    {
        $dokterId = Yii::$app->user->identity->dokter_id;

        return ApiResponse::success(
            (new PemeriksaanService())->worklist($dokterId === null ? null : (int) $dokterId, date('Y-m-d'))
        );
    }
}
