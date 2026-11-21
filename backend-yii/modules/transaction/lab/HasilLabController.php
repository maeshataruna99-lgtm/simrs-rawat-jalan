<?php

namespace app\modules\transaction\lab;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint input hasil laboratorium (/transaction/hasil-lab/{detailId}, kode menu `laboratorium`).
 * Dipanggil petugas lab dari React dan service Node (header Idempotency-Key).
 */
class HasilLabController extends BaseApiController
{
    protected ?string $menuCode = 'laboratorium';

    protected function verbs(): array
    {
        return [
            'update' => ['PUT', 'PATCH'],
        ];
    }

    /**
     * PUT /transaction/hasil-lab/{detailId} — body { hasil }. Key yang sudah diproses dibalas data lama dengan 200.
     */
    public function actionUpdate(int $id): array
    {
        try {
            $result = (new OrderLabService())->simpanHasil(
                $id,
                Yii::$app->request->bodyParams,
                Yii::$app->request->headers->get('Idempotency-Key')
            );
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        $message = $result['duplikat'] ? 'Hasil sudah pernah diterima.' : 'Hasil laboratorium berhasil disimpan.';

        return ApiResponse::success($result['detail']->toArray(), $message);
    }
}
