<?php

namespace app\modules\master\obat;

use app\common\ApiResponse;
use app\common\CrudController;
use app\common\CrudService;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint CRUD master obat, penyesuaian stok manual, dan riwayat mutasi (/master/obat).
 */
class ObatController extends CrudController
{
    protected ?string $menuCode = 'master-obat';
    protected array $actionPermissions = [
        'sesuaikan-stok' => 'update',
        'mutasi' => 'read',
    ];

    protected function service(): CrudService
    {
        return new ObatService();
    }

    protected function verbs(): array
    {
        return array_merge(parent::verbs(), [
            'sesuaikan-stok' => ['POST', 'PUT'],
            'mutasi' => ['GET'],
        ]);
    }

    /**
     * POST|PUT /master/obat/{id}/sesuaikan-stok
     */
    public function actionSesuaikanStok(int $id): array
    {
        /** @var ObatService $service */
        $service = $this->service();
        try {
            $obat = $service->sesuaikanStok($id, Yii::$app->request->bodyParams);
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        return ApiResponse::success($service->serialize($obat), 'Stok obat berhasil disesuaikan.');
    }

    /**
     * GET /master/obat/{id}/mutasi
     */
    public function actionMutasi(int $id): array
    {
        /** @var ObatService $service */
        $service = $this->service();

        return ApiResponse::success($service->listMutasi($id));
    }
}
