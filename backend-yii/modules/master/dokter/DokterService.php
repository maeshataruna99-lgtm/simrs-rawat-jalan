<?php

namespace app\modules\master\dokter;

use app\common\ActiveRecord;
use app\common\CrudService;

/**
 * Pengelolaan master dokter dan tenaga medis.
 *
 * Dipakai di: DokterController.
 */
class DokterService extends CrudService
{
    protected function modelClass(): string
    {
        return Dokter::class;
    }

    protected function searchClass(): string
    {
        return DokterSearch::class;
    }

    protected function beforeDelete(ActiveRecord $model): void
    {
        $this->assertNotUsed('m_jadwal_dokter', ['dokter_id' => $model->id], 'Dokter masih memiliki jadwal praktik. Hapus jadwalnya terlebih dahulu.');
        $this->assertNotUsed('m_user', ['dokter_id' => $model->id], 'Dokter masih terhubung dengan akun pengguna.');
        $this->assertNotUsed('t_kunjungan', ['and', ['dokter_id' => $model->id], ['status' => ['menunggu', 'diperiksa']]], 'Dokter masih memiliki kunjungan yang belum selesai.');
    }
}
