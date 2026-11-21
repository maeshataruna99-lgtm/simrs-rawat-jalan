<?php

namespace app\modules\transaction\resep;

use app\common\ApiResponse;
use app\common\BaseApiController;
use Yii;

/**
 * Endpoint pelayanan resep farmasi (/transaction/farmasi, kode menu `farmasi`).
 */
class FarmasiController extends BaseApiController
{
    protected ?string $menuCode = 'farmasi';
    protected array $actionPermissions = [
        'antrean' => 'read',
        'proses' => 'update',
        'serahkan' => 'update',
    ];

    protected function verbs(): array
    {
        return [
            'antrean' => ['GET'],
            'proses' => ['PUT'],
            'serahkan' => ['PUT'],
        ];
    }

    /**
     * GET /transaction/farmasi/antrean?status=&tanggal=
     */
    public function actionAntrean(): array
    {
        return ApiResponse::success((new FarmasiService())->antrean(Yii::$app->request->queryParams));
    }

    /**
     * PUT /transaction/farmasi/{resepId}/proses
     */
    public function actionProses(int $id): array
    {
        return ApiResponse::success((new FarmasiService())->proses($id)->toArray(), 'Resep sedang diproses.');
    }

    /**
     * PUT /transaction/farmasi/{resepId}/serahkan
     */
    public function actionSerahkan(int $id): array
    {
        return ApiResponse::success((new FarmasiService())->serahkan($id)->toArray(), 'Obat berhasil diserahkan.');
    }
}
