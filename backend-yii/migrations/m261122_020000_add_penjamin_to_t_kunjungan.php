<?php

use app\common\Migration;

/**
 * Menambah kolom penjamin (umum, bpjs, asuransi) dan index filter lanjutan pada t_kunjungan.
 */
class m261122_020000_add_penjamin_to_t_kunjungan extends Migration
{
    public function safeUp()
    {
        $this->addColumn('t_kunjungan', 'penjamin', $this->string(20)->notNull()->defaultValue('umum'));
        $this->execute("ALTER TABLE t_kunjungan ADD CONSTRAINT chk_t_kunjungan_penjamin CHECK (penjamin IN ('umum', 'bpjs', 'asuransi'))");
        $this->createIndex('idx_t_kunjungan_dokter_penjamin', 't_kunjungan', ['dokter_id', 'penjamin']);
    }

    public function safeDown()
    {
        $this->dropIndex('idx_t_kunjungan_dokter_penjamin', 't_kunjungan');
        $this->execute('ALTER TABLE t_kunjungan DROP CONSTRAINT chk_t_kunjungan_penjamin');
        $this->dropColumn('t_kunjungan', 'penjamin');
    }
}
