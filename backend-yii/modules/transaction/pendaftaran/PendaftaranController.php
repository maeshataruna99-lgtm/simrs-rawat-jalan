<?php

namespace app\modules\transaction\pendaftaran;

use app\common\ApiResponse;
use app\common\BaseApiController;
use Yii;

/**
 * Endpoint pendaftaran kunjungan rawat jalan (/transaction/pendaftaran, kode menu `pendaftaran`).
 */
class PendaftaranController extends BaseApiController
{
    protected ?string $menuCode = 'pendaftaran';
    protected array $actionPermissions = [
        'cari-pasien' => 'read',
    ];

    protected function verbs(): array
    {
        return [
            'cari-pasien' => ['GET'],
        ];
    }

    /**
     * GET /transaction/pendaftaran/cari-pasien?q=
     */
    public function actionCariPasien(): array
    {
        $q = Yii::$app->request->get('q');

        return ApiResponse::success((new PendaftaranService())->cariPasien(is_string($q) ? $q : null));
    }
}
