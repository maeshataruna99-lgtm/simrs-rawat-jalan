<?php

use app\common\Migration;

/**
 * Tabel transaksi tindakan medis per kunjungan (t_tindakan).
 * Tarif disalin dari m_tindakan saat insert agar perubahan tarif master tidak mengubah transaksi lama.
 */
class m261121_140000_create_t_tindakan_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('t_tindakan', array_merge([
            'id' => $this->primaryKey(),
            'kunjungan_id' => $this->integer()->notNull(),
            'tindakan_id' => $this->integer()->notNull(),
            'qty' => $this->integer()->notNull()->defaultValue(1),
            'tarif' => $this->decimal(14, 2)->notNull(),
            'subtotal' => $this->decimal(14, 2)->notNull(),
            'dokter_id' => $this->integer()->notNull(),
            'status' => $this->string(10)->notNull()->defaultValue('aktif'),
        ], $this->auditColumns()));

        $this->execute('ALTER TABLE t_tindakan ADD CONSTRAINT chk_t_tindakan_qty CHECK (qty > 0)');
        $this->execute('ALTER TABLE t_tindakan ADD CONSTRAINT chk_t_tindakan_tarif CHECK (tarif >= 0)');
        $this->execute('ALTER TABLE t_tindakan ADD CONSTRAINT chk_t_tindakan_subtotal CHECK (subtotal = qty * tarif)');
        $this->execute("ALTER TABLE t_tindakan ADD CONSTRAINT chk_t_tindakan_status CHECK (status IN ('aktif', 'batal'))");

        $this->createIndex('idx_t_tindakan_kunjungan_id', 't_tindakan', 'kunjungan_id');
        $this->addForeignKey('fk_t_tindakan_kunjungan', 't_tindakan', 'kunjungan_id', 't_kunjungan', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_tindakan_tindakan', 't_tindakan', 'tindakan_id', 'm_tindakan', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_tindakan_dokter', 't_tindakan', 'dokter_id', 'm_dokter', 'id', 'RESTRICT', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('t_tindakan');
    }
}
