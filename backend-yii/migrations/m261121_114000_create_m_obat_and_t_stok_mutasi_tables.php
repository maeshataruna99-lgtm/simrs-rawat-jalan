<?php

use app\common\Migration;

/**
 * Tabel master obat (m_obat) dengan pengaman CHECK stok >= 0 dan harga >= 0,
 * serta tabel riwayat mutasi stok (t_stok_mutasi).
 */
class m261121_114000_create_m_obat_and_t_stok_mutasi_tables extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_obat', array_merge([
            'id' => $this->primaryKey(),
            'kode' => $this->string(30)->notNull(),
            'nama' => $this->string(150)->notNull(),
            'satuan' => $this->string(30)->notNull(),
            'harga' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'stok' => $this->integer()->notNull()->defaultValue(0),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->execute('ALTER TABLE m_obat ADD CONSTRAINT chk_m_obat_harga CHECK (harga >= 0)');
        $this->execute('ALTER TABLE m_obat ADD CONSTRAINT chk_m_obat_stok CHECK (stok >= 0)');
        $this->createActiveUniqueIndex('m_obat', 'kode');
        $this->createIndex('idx_m_obat_nama', 'm_obat', 'nama');

        $this->createTable('t_stok_mutasi', array_merge([
            'id' => $this->primaryKey(),
            'obat_id' => $this->integer()->notNull(),
            'jenis' => $this->string(20)->notNull(),
            'qty' => $this->integer()->notNull(),
            'stok_sebelum' => $this->integer()->notNull(),
            'stok_sesudah' => $this->integer()->notNull(),
            'referensi' => $this->string(150),
        ], $this->auditColumns()));

        $this->execute(
            "ALTER TABLE t_stok_mutasi ADD CONSTRAINT chk_t_stok_mutasi_jenis CHECK (jenis IN ('keluar', 'masuk', 'penyesuaian'))"
        );
        $this->execute('ALTER TABLE t_stok_mutasi ADD CONSTRAINT chk_t_stok_mutasi_stok_sesudah CHECK (stok_sesudah >= 0)');
        $this->createIndex('idx_t_stok_mutasi_obat_id', 't_stok_mutasi', 'obat_id');
        $this->addForeignKey('fk_t_stok_mutasi_obat', 't_stok_mutasi', 'obat_id', 'm_obat', 'id', 'RESTRICT', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('t_stok_mutasi');
        $this->dropTable('m_obat');
    }
}
