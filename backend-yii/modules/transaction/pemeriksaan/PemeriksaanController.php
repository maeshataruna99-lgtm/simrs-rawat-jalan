<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
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
            'view' => ['GET'],
            'update' => ['PUT', 'PATCH'],
        ];
    }

    /**
     * GET /transaction/pemeriksaan/{kunjunganId} — data kunjungan dan hasil pemeriksaan untuk form.
     */
    public function actionView(int $id): array
    {
        return ApiResponse::success((new PemeriksaanService())->detail($id, $this->dokterId()));
    }

    /**
     * PUT /transaction/pemeriksaan/{kunjunganId} — simpan anamnesis, tanda vital, dan pemeriksaan fisik.
     */
    public function actionUpdate(int $id): array
    {
        try {
            $model = (new PemeriksaanService())->simpan($id, Yii::$app->request->bodyParams, $this->dokterId());
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        return ApiResponse::success($model->toArray(), 'Hasil pemeriksaan berhasil disimpan.');
    }

    /** dokter_id user login, null bila user tidak tertaut ke dokter. */
    private function dokterId(): ?int
    {
        $dokterId = Yii::$app->user->identity->dokter_id;

        return $dokterId === null ? null : (int) $dokterId;
    }

    /**
     * GET /transaction/pemeriksaan/worklist?tanggal_dari=&tanggal_sampai=&q=&page=&per_page=
     * Pasien yang menunggu atau sedang diperiksa; bawaan hari ini.
     */
    public function actionWorklist(): array
    {
        $hasil = (new PemeriksaanService())->worklist($this->dokterId(), Yii::$app->request->queryParams);

        return ApiResponse::success($hasil['items'], 'OK', $hasil['meta']);
    }
}
