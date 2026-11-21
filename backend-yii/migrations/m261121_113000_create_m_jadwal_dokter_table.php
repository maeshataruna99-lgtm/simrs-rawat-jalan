<?php

use app\common\Migration;

/**
 * Tabel master jadwal praktik dokter per poli dan hari (m_jadwal_dokter).
 * Hari disimpan sebagai angka 1 (Senin) sampai 7 (Minggu).
 */
class m261121_113000_create_m_jadwal_dokter_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_jadwal_dokter', array_merge([
            'id' => $this->primaryKey(),
            'dokter_id' => $this->integer()->notNull(),
            'poli_id' => $this->integer()->notNull(),
            'hari' => $this->smallInteger()->notNull(),
            'jam_mulai' => $this->string(5)->notNull(),
            'jam_selesai' => $this->string(5)->notNull(),
            'kuota' => $this->integer()->notNull()->defaultValue(20),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->execute('ALTER TABLE m_jadwal_dokter ADD CONSTRAINT chk_m_jadwal_dokter_hari CHECK (hari BETWEEN 1 AND 7)');
        $this->execute('ALTER TABLE m_jadwal_dokter ADD CONSTRAINT chk_m_jadwal_dokter_jam CHECK (jam_selesai > jam_mulai)');
        $this->execute('ALTER TABLE m_jadwal_dokter ADD CONSTRAINT chk_m_jadwal_dokter_kuota CHECK (kuota > 0)');

        $this->createIndex('idx_m_jadwal_dokter_dokter_hari', 'm_jadwal_dokter', ['dokter_id', 'hari']);
        $this->createIndex('idx_m_jadwal_dokter_poli_hari', 'm_jadwal_dokter', ['poli_id', 'hari']);

        $this->addForeignKey('fk_m_jadwal_dokter_dokter', 'm_jadwal_dokter', 'dokter_id', 'm_dokter', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_m_jadwal_dokter_poli', 'm_jadwal_dokter', 'poli_id', 'm_poli', 'id', 'RESTRICT', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('m_jadwal_dokter');
    }
}
