<?php

namespace app\common;

use Yii;

/**
 * Controller CRUD dasar dengan URL REST (lihat aturan urlManager di config/web.php):
 * GET /x, GET /x/{id}, POST /x, PUT /x/{id}, DELETE /x/{id}.
 * Hak akses mengikuti $menuCode: index/view = read, create, update, delete.
 *
 * Dipakai di: controller master dan sistem (contoh ModuleController, MenuController).
 */
abstract class CrudController extends BaseApiController
{
    abstract protected function service(): CrudService;

    protected function verbs(): array
    {
        return [
            'index' => ['GET'],
            'view' => ['GET'],
            'create' => ['POST'],
            'update' => ['PUT', 'PATCH'],
            'delete' => ['DELETE'],
        ];
    }

    public function actionIndex(): array
    {
        try {
            $provider = $this->service()->list(Yii::$app->request->queryParams);
        } catch (ValidationException $e) {
            return $this->errorResponse($e);
        }

        $pagination = $provider->getPagination();

        return ApiResponse::success(
            array_map(fn ($model) => $this->service()->serialize($model), $provider->getModels()),
            'OK',
            ['page' => $pagination->getPage() + 1, 'per_page' => $pagination->getPageSize(), 'total' => $provider->getTotalCount()]
        );
    }

    public function actionView(int $id): array
    {
        return ApiResponse::success($this->service()->serialize($this->service()->find($id)));
    }

    public function actionCreate(): array
    {
        try {
            $model = $this->service()->create(Yii::$app->request->bodyParams);
        } catch (ValidationException $e) {
            return $this->errorResponse($e);
        }

        Yii::$app->response->statusCode = 201;

        return ApiResponse::success($this->service()->serialize($model), 'Data berhasil disimpan.');
    }

    public function actionUpdate(int $id): array
    {
        try {
            $model = $this->service()->update($id, Yii::$app->request->bodyParams);
        } catch (ValidationException $e) {
            return $this->errorResponse($e);
        }

        return ApiResponse::success($this->service()->serialize($model), 'Data berhasil diperbarui.');
    }

    public function actionDelete(int $id): array
    {
        $this->service()->delete($id);

        return ApiResponse::success(null, 'Data berhasil dihapus.');
    }

    private function errorResponse(ValidationException $e): array
    {
        Yii::$app->response->statusCode = 422;

        return ApiResponse::error($e->getMessage(), $e->errors);
    }
}
