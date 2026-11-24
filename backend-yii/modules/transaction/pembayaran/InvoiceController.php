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
        'peringatan' => 'read',
        'valid' => 'update',
        'unvalid' => 'update',
    ];

    protected function verbs(): array
    {
        return [
            'index' => ['GET'],
            'view' => ['GET'],
            'create' => ['POST'],
            'belum-tagih' => ['GET'],
            'audit-log' => ['GET'],
            'peringatan' => ['GET'],
            'valid' => ['PUT'],
            'unvalid' => ['PUT'],
        ];
    }

    /**
     * GET /transaction/invoice/peringatan?kunjungan_id= — transaksi belum tuntas yang perlu diketahui kasir
     * sebelum membuat invoice atau validasi.
     */
    public function actionPeringatan(): array
    {
        $kunjunganId = (int) Yii::$app->request->get('kunjungan_id');

        return ApiResponse::success((new ValidasiKunjunganService())->peringatan($kunjunganId));
    }

    /**
     * PUT /transaction/invoice/{id}/valid — kunci kunjungan dari order baru dokter.
     */
    public function actionValid(int $id): array
    {
        (new ValidasiKunjunganService())->validasi($id);

        return ApiResponse::success((new InvoiceService())->detail($id)->toArray(), 'Kunjungan berhasil divalidasi.');
    }

    /**
     * PUT /transaction/invoice/{id}/unvalid — buka kunci agar dokter bisa menambah transaksi lagi.
     */
    public function actionUnvalid(int $id): array
    {
        (new ValidasiKunjunganService())->batalkanValidasi($id);

        return ApiResponse::success((new InvoiceService())->detail($id)->toArray(), 'Validasi kunjungan dibuka.');
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
     * GET /transaction/invoice/belum-tagih?tanggal=&tanggal_dari=&tanggal_sampai=&q=&page=&per_page=
     */
    public function actionBelumTagih(): array
    {
        $hasil = (new InvoiceService())->kunjunganBelumTagih(Yii::$app->request->queryParams);

        return ApiResponse::success($hasil['items'], 'OK', $hasil['meta']);
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
