<?php

namespace app\modules\transaction\resep;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint resep oleh dokter (/transaction/resep, kode menu `pemeriksaan`).
 */
class ResepController extends BaseApiController
{
    protected ?string $menuCode = 'pemeriksaan';

    protected function verbs(): array
    {
        return [
            'index' => ['GET'],
            'create' => ['POST'],
        ];
    }

    /**
     * GET /transaction/resep?kunjungan_id= — resep satu kunjungan.
     */
    public function actionIndex(): array
    {
        $kunjunganId = (int) Yii::$app->request->get('kunjungan_id');

        return ApiResponse::success((new ResepService())->daftarPerKunjungan($kunjunganId, $this->dokterId()));
    }

    /**
     * POST /transaction/resep — body { kunjungan_id, catatan, items: [{ obat_id, dosis, frekuensi, jumlah }] }.
     */
    public function actionCreate(): array
    {
        try {
            $resep = (new ResepService())->buat(Yii::$app->request->bodyParams, $this->dokterId());
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }
        Yii::$app->response->statusCode = 201;

        return ApiResponse::success($resep->toArray(), 'Resep berhasil dibuat.');
    }

    /** dokter_id user login, null bila user tidak tertaut ke dokter. */
    private function dokterId(): ?int
    {
        $dokterId = Yii::$app->user->identity->dokter_id;

        return $dokterId === null ? null : (int) $dokterId;
    }
}
