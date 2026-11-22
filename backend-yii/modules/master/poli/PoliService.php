<?php

namespace app\modules\master\poli;

use app\common\ActiveRecord;
use app\common\CrudService;

/**
 * Pengelolaan master poli / unit pelayanan.
 *
 * Dipakai di: PoliController.
 */
class PoliService extends CrudService
{
    protected function modelClass(): string
    {
        return Poli::class;
    }

    protected function searchClass(): string
    {
        return PoliSearch::class;
    }

    protected function beforeDelete(ActiveRecord $model): void
    {
        $this->assertNotUsed('m_jadwal_dokter', ['poli_id' => $model->id], 'Poli masih memiliki jadwal praktik. Hapus jadwalnya terlebih dahulu.');
        $this->assertNotUsed('m_tindakan', ['poli_id' => $model->id], 'Poli masih dipakai oleh master tindakan.');
        $this->assertNotUsed('t_kunjungan', ['and', ['poli_id' => $model->id], ['status' => ['menunggu', 'diperiksa']]], 'Poli masih memiliki kunjungan yang belum selesai.');
    }
}
