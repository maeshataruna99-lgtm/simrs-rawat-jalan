<?php

namespace app\modules\transaction\lab;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use Yii;

/**
 * Endpoint order laboratorium (/transaction/order-lab).
 * Daftar order untuk petugas lab dan service Node memakai menu `laboratorium`; dokter membuat dan melihat order lewat menu `pemeriksaan`.
 */
class OrderLabController extends BaseApiController
{
    protected ?string $menuCode = 'laboratorium';
    protected array $actionPermissions = [
        'create' => 'pemeriksaan:create',
        'per-kunjungan' => 'pemeriksaan:read',
    ];

    protected function verbs(): array
    {
        return [
            'index' => ['GET'],
            'create' => ['POST'],
            'per-kunjungan' => ['GET'],
        ];
    }

    /**
     * GET /transaction/order-lab?status=diminta,diproses&tanggal_dari=&tanggal_sampai=&q=&page=&per_page=
     */
    public function actionIndex(): array
    {
        $hasil = (new OrderLabService())->daftar(Yii::$app->request->queryParams);

        return ApiResponse::success($hasil['items'], 'OK', $hasil['meta']);
    }

    /**
     * GET /transaction/order-lab/per-kunjungan?kunjungan_id= — order satu kunjungan untuk dokter.
     */
    public function actionPerKunjungan(): array
    {
        $kunjunganId = (int) Yii::$app->request->get('kunjungan_id');
        $dokterId = Yii::$app->user->identity->dokter_id;
        (new PemeriksaanService())->kunjunganMilik($kunjunganId, $dokterId === null ? null : (int) $dokterId);

        return ApiResponse::success((new OrderLabService())->perKunjungan($kunjunganId));
    }

    /**
     * POST /transaction/order-lab — body { kunjungan_id, catatan_klinis, pemeriksaan_lab_ids: [] }.
     */
    public function actionCreate(): array
    {
        $dokterId = Yii::$app->user->identity->dokter_id;
        try {
            $order = (new OrderLabService())->buat(Yii::$app->request->bodyParams, $dokterId === null ? null : (int) $dokterId);
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }
        Yii::$app->response->statusCode = 201;

        return ApiResponse::success($order->toArray(), 'Order laboratorium berhasil dibuat.');
    }
}
