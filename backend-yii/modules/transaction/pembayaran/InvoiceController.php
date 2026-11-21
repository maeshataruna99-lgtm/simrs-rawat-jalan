<?php

namespace app\modules\transaction\pembayaran;

use app\common\ApiResponse;
use app\common\BaseApiController;
use Yii;

/**
 * Endpoint tagihan / invoice rawat jalan (/transaction/invoice, kode menu `billing`).
 */
class InvoiceController extends BaseApiController
{
    protected ?string $menuCode = 'billing';
    protected array $actionPermissions = [
        'belum-tagih' => 'read',
        'audit-log' => 'read',
    ];

    protected function verbs(): array
    {
        return [
            'index' => ['GET'],
            'view' => ['GET'],
            'create' => ['POST'],
            'belum-tagih' => ['GET'],
            'audit-log' => ['GET'],
        ];
    }

    /**
     * GET /transaction/invoice?status=&q=&tanggal_dari=&tanggal_sampai=&page=&per_page=
     */
    public function actionIndex(): array
    {
        $hasil = (new InvoiceService())->daftar(Yii::$app->request->queryParams);

        return ApiResponse::success($hasil['items'], 'OK', $hasil['meta']);
    }

    /**
     * GET /transaction/invoice/belum-tagih?tanggal=&q=
     */
    public function actionBelumTagih(): array
    {
        return ApiResponse::success((new InvoiceService())->kunjunganBelumTagih(Yii::$app->request->queryParams));
    }

    /**
     * GET /transaction/invoice/{id}
     */
    public function actionView(int $id): array
    {
        return ApiResponse::success((new InvoiceService())->detail($id)->toArray());
    }

    /**
     * POST /transaction/invoice/{kunjunganId} — membentuk invoice dari 4 sumber biaya kunjungan.
     */
    public function actionCreate(int $id): array
    {
        $invoice = (new InvoiceService())->buat($id);
        Yii::$app->response->statusCode = 201;

        return ApiResponse::success($invoice->toArray(), 'Invoice berhasil dibuat.');
    }

    /**
     * GET /transaction/invoice/{id}/audit-log — jejak perubahan tagihan dan klinis kunjungan (D.4).
     */
    public function actionAuditLog(int $id): array
    {
        return ApiResponse::success((new BillingSyncService())->auditLogInvoice($id));
    }
}
