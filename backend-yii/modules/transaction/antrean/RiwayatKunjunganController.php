<?php

namespace app\modules\transaction\antrean;

use app\common\ApiResponse;
use app\common\BaseApiController;

/**
 * Endpoint riwayat kunjungan seorang pasien (/transaction/riwayat-kunjungan/{pasienId}, kode menu `antrean`).
 */
class RiwayatKunjunganController extends BaseApiController
{
    protected ?string $menuCode = 'antrean';

    protected function verbs(): array
    {
        return [
            'view' => ['GET'],
        ];
    }

    /**
     * GET /transaction/riwayat-kunjungan/{pasienId}
     */
    public function actionView(int $id): array
    {
        return ApiResponse::success((new AntreanService())->riwayatPasien($id));
    }
}
