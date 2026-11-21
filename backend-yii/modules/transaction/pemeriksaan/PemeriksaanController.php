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
     * GET /transaction/pemeriksaan/worklist — pasien hari ini yang menunggu atau sedang diperiksa.
     */
    public function actionWorklist(): array
    {
        return ApiResponse::success((new PemeriksaanService())->worklist($this->dokterId(), date('Y-m-d')));
    }
}
