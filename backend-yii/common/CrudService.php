<?php

namespace app\common;

use Yii;
use yii\base\Model;
use yii\data\ActiveDataProvider;
use yii\db\Query;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Service CRUD dasar untuk data master: daftar berhalaman, detail, tambah, ubah, dan hapus (soft delete).
 * Turunan cukup menentukan model dan model pencarian, lalu menambah aturan khusus lewat hook.
 *
 * Dipakai di: service master dan sistem (contoh MenuModuleService, MenuService).
 */
abstract class CrudService
{
    /** @return class-string<ActiveRecord> */
    abstract protected function modelClass(): string;

    /** @return class-string<Model> Model pencarian dengan method search(): ActiveDataProvider. */
    abstract protected function searchClass(): string;

    /**
     * Daftar data dengan pencarian, filter, dan halaman dari query string.
     *
     * Dipakai di: CrudController::actionIndex().
     */
    public function list(array $params): ActiveDataProvider
    {
        $searchClass = $this->searchClass();
        $search = new $searchClass();
        $search->load($params, '');
        if (!$search->validate()) {
            throw new ValidationException($search->getErrors());
        }

        return $search->search();
    }

    /**
     * Mengambil satu data yang belum dihapus.
     *
     * @throws NotFoundHttpException
     *
     * Dipakai di: CrudController::actionView(), update(), delete().
     */
    public function find(int $id): ActiveRecord
    {
        $model = $this->modelClass()::findActive()->andWhere([$this->modelClass()::tableName() . '.id' => $id])->one();
        if ($model === null) {
            throw new NotFoundHttpException('Data tidak ditemukan.');
        }

        return $model;
    }

    /**
     * Dipakai di: CrudController::actionCreate().
     */
    public function create(array $data): ActiveRecord
    {
        $modelClass = $this->modelClass();
        $model = new $modelClass();
        $model->load($data, '');
        $this->save($model);

        return $model;
    }

    /**
     * Dipakai di: CrudController::actionUpdate().
     */
    public function update(int $id, array $data): ActiveRecord
    {
        $model = $this->find($id);
        $model->load($data, '');
        $this->save($model);

        return $model;
    }

    /**
     * Dipakai di: CrudController::actionDelete().
     */
    public function delete(int $id): void
    {
        $model = $this->find($id);
        $this->beforeDelete($model);
        $model->softDelete();
    }

    /**
     * Bentuk data untuk response API.
     *
     * Dipakai di: CrudController.
     */
    public function serialize(ActiveRecord $model): array
    {
        return $model->toArray();
    }

    /**
     * Validasi lalu simpan dalam satu transaksi bersama perubahan tambahan di afterSave().
     *
     * @throws ValidationException
     */
    protected function save(ActiveRecord $model): void
    {
        Yii::$app->db->transaction(function () use ($model) {
            if (!$model->save()) {
                throw new ValidationException($model->getErrors());
            }
            $this->afterSave($model);
        });
        // Ambil ulang nilai kolom dari DB agar response tidak berisi objek Expression (contoh updated_at).
        $model->refresh();
    }

    /** Hook setelah data tersimpan, masih di dalam transaksi. */
    protected function afterSave(ActiveRecord $model): void
    {
    }

    /** Hook sebelum hapus, contoh menolak hapus bila data masih dipakai (lempar ConflictHttpException). */
    protected function beforeDelete(ActiveRecord $model): void
    {
    }

    /**
     * Menolak hapus bila masih ada baris aktif yang merujuk data ini.
     * Soft delete tidak memicu FOREIGN KEY ON DELETE RESTRICT, jadi pengecekan dilakukan di aplikasi.
     *
     * @throws ConflictHttpException
     */
    protected function assertNotUsed(string $table, array $where, string $message): void
    {
        $query = (new Query())->from($table)->where($where);
        if (Yii::$app->db->getTableSchema($table)?->getColumn('deleted_at') !== null) {
            $query->andWhere(["{$table}.deleted_at" => null]);
        }
        if ($query->exists()) {
            throw new ConflictHttpException($message);
        }
    }
}
