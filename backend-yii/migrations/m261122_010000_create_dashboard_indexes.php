<?php

use app\common\Migration;

/**
 * Index optimasi query dashboard dan laporan (D.6 — poin 9.3).
 * Mempercepat filter rentang tanggal kunjungan, status invoice, waktu pembayaran, tindakan aktif, resep, dan item invoice aktif.
 */
class m261122_010000_create_dashboard_indexes extends Migration
{
    public function safeUp()
    {
        $this->createIndex('idx_t_kunjungan_tgl_poli', 't_kunjungan', ['tgl_kunjungan', 'poli_id']);
        $this->createIndex('idx_t_invoice_status', 't_invoice', 'status');
        $this->createIndex('idx_t_pembayaran_dibayar_at', 't_pembayaran', 'dibayar_at');
        $this->createIndex('idx_t_tindakan_kunjungan_status', 't_tindakan', ['kunjungan_id', 'status']);
        $this->createIndex('idx_t_resep_kunjungan_status', 't_resep', ['kunjungan_id', 'status']);
        $this->execute(
            'CREATE INDEX idx_t_invoice_item_invoice_sumber_aktif ON t_invoice_item (invoice_id, sumber) WHERE is_void = false'
        );
    }

    public function safeDown()
    {
        $this->dropIndex('idx_t_invoice_item_invoice_sumber_aktif', 't_invoice_item');
        $this->dropIndex('idx_t_resep_kunjungan_status', 't_resep');
        $this->dropIndex('idx_t_tindakan_kunjungan_status', 't_tindakan');
        $this->dropIndex('idx_t_pembayaran_dibayar_at', 't_pembayaran');
        $this->dropIndex('idx_t_invoice_status', 't_invoice');
        $this->dropIndex('idx_t_kunjungan_tgl_poli', 't_kunjungan');
    }
}
