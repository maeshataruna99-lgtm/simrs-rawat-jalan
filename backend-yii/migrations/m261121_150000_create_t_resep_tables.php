<?php

use app\common\Migration;

/**
 * Tabel resep (t_resep) dan detail obatnya (t_resep_detail). Harga obat disalin saat resep dibuat.
 * Mutasi stok memakai t_stok_mutasi yang sudah dibuat bersama m_obat; check stok >= 0 di m_obat menjadi pengaman D.2.
 */
class m261121_150000_create_t_resep_tables extends Migration
{
    public function safeUp()
    {
        $this->createTable('t_resep', array_merge([
            'id' => $this->primaryKey(),
            'no_resep' => $this->string(30)->notNull(),
            'kunjungan_id' => $this->integer()->notNull(),
            'dokter_id' => $this->integer()->notNull(),
            'status' => $this->string(20)->notNull()->defaultValue('baru'),
            'catatan' => $this->text(),
            'diserahkan_oleh' => $this->integer(),
            'diserahkan_at' => $this->timestamp(),
        ], $this->auditColumns()));

        $this->execute(
            "ALTER TABLE t_resep ADD CONSTRAINT chk_t_resep_status CHECK (status IN ('baru', 'diproses', 'diserahkan', 'batal'))"
        );
        $this->execute(
            "ALTER TABLE t_resep ADD CONSTRAINT chk_t_resep_diserahkan CHECK (status <> 'diserahkan' OR diserahkan_at IS NOT NULL)"
        );
        $this->createIndex('uq_t_resep_no_resep', 't_resep', 'no_resep', true);
        $this->createIndex('idx_t_resep_kunjungan_id', 't_resep', 'kunjungan_id');
        $this->createIndex('idx_t_resep_status', 't_resep', 'status');
        $this->addForeignKey('fk_t_resep_kunjungan', 't_resep', 'kunjungan_id', 't_kunjungan', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_resep_dokter', 't_resep', 'dokter_id', 'm_dokter', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_resep_diserahkan_oleh', 't_resep', 'diserahkan_oleh', 'm_user', 'id', 'SET NULL', 'CASCADE');

        $this->createTable('t_resep_detail', array_merge([
            'id' => $this->primaryKey(),
            'resep_id' => $this->integer()->notNull(),
            'obat_id' => $this->integer()->notNull(),
            'dosis' => $this->string(50)->notNull(),
            'frekuensi' => $this->string(50)->notNull(),
            'jumlah' => $this->integer()->notNull(),
            'harga' => $this->decimal(12, 2)->notNull(),
            'subtotal' => $this->decimal(14, 2)->notNull(),
        ], $this->auditColumns()));

        $this->execute('ALTER TABLE t_resep_detail ADD CONSTRAINT chk_t_resep_detail_jumlah CHECK (jumlah > 0)');
        $this->execute('ALTER TABLE t_resep_detail ADD CONSTRAINT chk_t_resep_detail_harga CHECK (harga >= 0)');
        $this->execute('ALTER TABLE t_resep_detail ADD CONSTRAINT chk_t_resep_detail_subtotal CHECK (subtotal = jumlah * harga)');
        $this->createIndex('uq_t_resep_detail_resep_obat', 't_resep_detail', ['resep_id', 'obat_id'], true);
        $this->addForeignKey('fk_t_resep_detail_resep', 't_resep_detail', 'resep_id', 't_resep', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_t_resep_detail_obat', 't_resep_detail', 'obat_id', 'm_obat', 'id', 'RESTRICT', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('t_resep_detail');
        $this->dropTable('t_resep');
    }
}
