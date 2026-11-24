<?php

use app\common\Migration;

/**
 * Menambah flag validasi kasir pada t_kunjungan. Kunjungan valid terkunci dari order baru dokter;
 * kunjungan dengan invoice lunas dianggap selesai sepenuhnya.
 * Backfill: kunjungan yang sudah punya invoice ditandai valid, dan kunjungan lunas yang belum selesai
 * diubah menjadi selesai beserta jejak status log.
 */
class m261124_010000_add_validasi_to_t_kunjungan extends Migration
{
    public function safeUp()
    {
        $this->addColumn('t_kunjungan', 'is_valid', $this->boolean()->notNull()->defaultValue(false));
        $this->addColumn('t_kunjungan', 'divalidasi_at', $this->timestamp(0)->null());
        $this->addColumn('t_kunjungan', 'divalidasi_by', $this->integer()->null());

        $this->execute('UPDATE t_kunjungan k SET is_valid = true, divalidasi_at = i.created_at, divalidasi_by = i.created_by
            FROM t_invoice i WHERE i.kunjungan_id = k.id');
        $this->execute("INSERT INTO t_kunjungan_status_log (kunjungan_id, status_lama, status_baru, user_id, waktu)
            SELECT k.id, k.status, 'selesai', NULL, CURRENT_TIMESTAMP FROM t_kunjungan k
            JOIN t_invoice i ON i.kunjungan_id = k.id
            WHERE i.status = 'lunas' AND k.status IN ('menunggu', 'diperiksa')");
        $this->execute("UPDATE t_kunjungan k SET status = 'selesai' FROM t_invoice i
            WHERE i.kunjungan_id = k.id AND i.status = 'lunas' AND k.status IN ('menunggu', 'diperiksa')");
    }

    public function safeDown()
    {
        $this->dropColumn('t_kunjungan', 'divalidasi_by');
        $this->dropColumn('t_kunjungan', 'divalidasi_at');
        $this->dropColumn('t_kunjungan', 'is_valid');
    }
}
