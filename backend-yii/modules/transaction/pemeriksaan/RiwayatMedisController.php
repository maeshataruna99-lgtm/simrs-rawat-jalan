<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\modules\transaction\pendaftaran\PendaftaranService;
use Yii;

/**
 * Endpoint riwayat rekam medis pasien (/transaction/riwayat-medis/{pasienId}, kode menu `riwayat-medis`).
 */
class RiwayatMedisController extends BaseApiController
{
    protected ?string $menuCode = 'riwayat-medis';
    protected array $actionPermissions = [
        'cari-pasien' => 'read',
    ];

    protected function verbs(): array
    {
        return [
            'view' => ['GET'],
            'cari-pasien' => ['GET'],
        ];
    }

    /**
     * GET /transaction/riwayat-medis/cari-pasien?q= — cari pasien tanpa perlu izin master pasien.
     */
    public function actionCariPasien(): array
    {
        $q = Yii::$app->request->get('q');

        return ApiResponse::success((new PendaftaranService())->cariPasien(is_string($q) ? $q : null));
    }

    /**
     * GET /transaction/riwayat-medis/{pasienId}
     */
    public function actionView(int $id): array
    {
        return ApiResponse::success((new PemeriksaanService())->riwayatMedis($id));
    }
}
