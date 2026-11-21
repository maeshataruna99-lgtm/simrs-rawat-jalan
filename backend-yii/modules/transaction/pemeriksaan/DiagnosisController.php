<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ApiResponse;
use app\common\BaseApiController;
use app\common\ValidationException;
use Yii;

/**
 * Endpoint diagnosis ICD-10 per kunjungan (/transaction/diagnosis/{kunjunganId}, kode menu `pemeriksaan`).
 */
class DiagnosisController extends BaseApiController
{
    protected ?string $menuCode = 'pemeriksaan';

    protected function verbs(): array
    {
        return [
            'update' => ['PUT', 'PATCH'],
        ];
    }

    /**
     * PUT /transaction/diagnosis/{kunjunganId} — body { diagnosis: [{ icd10_id, jenis }] } mengganti seluruh diagnosis.
     */
    public function actionUpdate(int $id): array
    {
        $dokterId = Yii::$app->user->identity->dokter_id;
        try {
            $rows = (new PemeriksaanService())->simpanDiagnosis(
                $id,
                Yii::$app->request->bodyParams['diagnosis'] ?? null,
                $dokterId === null ? null : (int) $dokterId
            );
        } catch (ValidationException $e) {
            Yii::$app->response->statusCode = 422;

            return ApiResponse::error($e->getMessage(), $e->errors);
        }

        return ApiResponse::success($rows, 'Diagnosis berhasil disimpan.');
    }
}
