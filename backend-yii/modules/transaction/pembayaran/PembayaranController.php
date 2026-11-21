<?php

namespace app\modules\transaction\pembayaran;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint pembayaran tagihan rawat jalan (/transaction/pembayaran, kode menu `billing`).
 */
class PembayaranController extends BaseApiController
{
    protected ?string $menuCode = 'billing';

    protected function verbs(): array
    {
        return [
            'index' => ['GET'],
            'view' => ['GET'],
            'create' => ['POST'],
        ];
    }

    /**
     * GET /transaction/pembayaran?invoice_id=&metode=&q=&tanggal_dari=&tanggal_sampai=&page=&per_page=
     */
    public function actionIndex(): array
    {
        $hasil = (new PembayaranService())->daftar(Yii::$app->request->queryParams);

        return ApiResponse::success($hasil['items'], 'OK', $hasil['meta']);
    }

    /**
     * GET /transaction/pembayaran/{id} — detail satu transaksi pembayaran beserta ringkasan invoice.
     */
    public function actionView(int $id): array
    {
        return ApiResponse::success((new PembayaranService())->detail($id)->toArray());
    }

    /**
     * POST /transaction/pembayaran — body { invoice_id, metode, jumlah, no_referensi? }.
     */
    public function actionCreate(): array
    {
        $key = Yii::$app->request->headers->get('Idempotency-Key');
        try {
            $hasil = (new PembayaranService())->bayar(
                Yii::$app->request->bodyParams,
                (int) Yii::$app->user->id,
                $key === null ? null : (string) $key
            );
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        Yii::$app->response->statusCode = $hasil['duplikat'] ? 200 : 201;

        return ApiResponse::success([
            'pembayaran' => $hasil['pembayaran']->toArray(),
            'invoice' => $hasil['invoice']->toArray(),
        ], $hasil['duplikat'] ? 'Pembayaran sudah tercatat sebelumnya.' : 'Pembayaran berhasil dicatat.');
    }
}
