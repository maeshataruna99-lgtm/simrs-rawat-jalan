<?php

namespace app\modules\transaction\tindakan;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint tindakan medis per kunjungan (/transaction/tindakan, kode menu `pemeriksaan`).
 */
class TindakanController extends BaseApiController
{
    protected ?string $menuCode = 'pemeriksaan';

    protected function verbs(): array
    {
        return [
            'view' => ['GET'],
            'create' => ['POST'],
            'delete' => ['DELETE'],
        ];
    }

    /**
     * GET /transaction/tindakan/{kunjunganId}
     */
    public function actionView(int $id): array
    {
        return ApiResponse::success((new TindakanKunjunganService())->daftar($id, $this->dokterId()));
    }

    /**
     * POST /transaction/tindakan/{kunjunganId} — body { tindakan_id, qty }.
     */
    public function actionCreate(int $id): array
    {
        try {
            $item = (new TindakanKunjunganService())->tambah($id, Yii::$app->request->bodyParams, $this->dokterId());
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }
        Yii::$app->response->statusCode = 201;

        return ApiResponse::success($item->toArray(), 'Tindakan berhasil ditambahkan.');
    }

    /**
     * DELETE /transaction/tindakan/item/{id} — membatalkan tindakan.
     */
    public function actionDelete(int $id): array
    {
        $item = (new TindakanKunjunganService())->batal($id, $this->dokterId());

        return ApiResponse::success($item->toArray(), 'Tindakan dibatalkan.');
    }

    /** dokter_id user login, null bila user tidak tertaut ke dokter. */
    private function dokterId(): ?int
    {
        $dokterId = Yii::$app->user->identity->dokter_id;

        return $dokterId === null ? null : (int) $dokterId;
    }
}
