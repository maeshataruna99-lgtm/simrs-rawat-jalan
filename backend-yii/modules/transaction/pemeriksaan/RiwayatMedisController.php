<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ApiResponse;
use app\common\BaseApiController;

/**
 * Endpoint riwayat rekam medis pasien (/transaction/riwayat-medis/{pasienId}, kode menu `riwayat-medis`).
 */
class RiwayatMedisController extends BaseApiController
{
    protected ?string $menuCode = 'riwayat-medis';

    protected function verbs(): array
    {
        return [
            'view' => ['GET'],
        ];
    }

    /**
     * GET /transaction/riwayat-medis/{pasienId}
     */
    public function actionView(int $id): array
    {
        return ApiResponse::success((new PemeriksaanService())->riwayatMedis($id));
    }
}
