<?php

namespace app\modules\transaction\resep;

use app\common\ApiResponse;
use app\common\BaseApiController;

/**
 * Endpoint riwayat penggunaan obat pasien (/transaction/riwayat-obat/{pasienId}, kode menu `riwayat-medis`).
 */
class RiwayatObatController extends BaseApiController
{
    protected ?string $menuCode = 'riwayat-medis';

    protected function verbs(): array
    {
        return [
            'view' => ['GET'],
        ];
    }

    /**
     * GET /transaction/riwayat-obat/{pasienId}
     */
    public function actionView(int $id): array
    {
        return ApiResponse::success((new ResepService())->riwayatObat($id));
    }
}
