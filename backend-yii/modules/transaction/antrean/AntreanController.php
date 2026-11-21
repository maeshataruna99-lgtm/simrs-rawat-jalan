<?php

namespace app\modules\transaction\antrean;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint daftar antrean poli dan pembaruan status antrean (/transaction/antrean, kode menu `antrean`).
 */
class AntreanController extends BaseApiController
{
    protected array $publicActions = ['display'];
    protected ?string $menuCode = 'antrean';
    protected array $actionPermissions = [
        'status' => 'update',
    ];

    protected function verbs(): array
    {
        return [
            'index' => ['GET'],
            'display' => ['GET'],
            'status' => ['PUT', 'POST'],
        ];
    }

    /**
     * GET /transaction/antrean/display?tanggal=&poli_id=
     * Endpoint publik khusus layar display ruang tunggu (tanpa data identitas sensitif pasien).
     */
    public function actionDisplay(): array
    {
        $payload = (new AntreanService())->display(Yii::$app->request->queryParams);

        return ApiResponse::success($payload);
    }

    /**
     * GET /transaction/antrean?poli_id=&tanggal=&status=&q=
     */
    public function actionIndex(): array
    {
        $rows = (new AntreanService())->list(Yii::$app->request->queryParams);

        return ApiResponse::success($rows);
    }

    /**
     * PUT /transaction/antrean/{id}/status
     */
    public function actionStatus(int $id): array
    {
        $status = Yii::$app->request->bodyParams['status'] ?? null;
        try {
            $kunjungan = (new AntreanService())->ubahStatus($id, is_string($status) ? $status : null);
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        return ApiResponse::success($kunjungan->toArray(), 'Status antrean berhasil diperbarui.');
    }
}
