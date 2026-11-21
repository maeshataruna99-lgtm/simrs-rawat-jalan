<?php

namespace app\modules\transaction\pendaftaran;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
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
            'create' => ['POST'],
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

    /**
     * POST /transaction/pendaftaran
     */
    public function actionCreate(): array
    {
        try {
            $kunjungan = (new PendaftaranService())->daftar(Yii::$app->request->bodyParams);
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        Yii::$app->response->statusCode = 201;

        return ApiResponse::success($kunjungan->toArray(), 'Pendaftaran kunjungan berhasil disimpan.');
    }
}
