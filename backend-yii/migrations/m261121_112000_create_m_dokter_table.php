<?php

use app\common\Migration;

/**
 * Tabel master dokter dan tenaga medis (m_dokter).
 * Juga memasang foreign key dari m_user.dokter_id ke m_dokter.id.
 */
class m261121_112000_create_m_dokter_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_dokter', array_merge([
            'id' => $this->primaryKey(),
            'kode' => $this->string(30)->notNull(),
            'nama' => $this->string(100)->notNull(),
            'sip' => $this->string(50)->notNull(),
            'spesialis' => $this->string(100),
            'jenis_tenaga' => $this->string(20)->notNull(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->execute(
            "ALTER TABLE m_dokter ADD CONSTRAINT chk_m_dokter_jenis_tenaga CHECK (jenis_tenaga IN ('dokter', 'perawat', 'analis', 'apoteker'))"
        );
        $this->createActiveUniqueIndex('m_dokter', 'kode');
        $this->createActiveUniqueIndex('m_dokter', 'sip');
        $this->createIndex('idx_m_dokter_jenis_tenaga', 'm_dokter', 'jenis_tenaga');

        $this->createIndex('idx_m_user_dokter_id', 'm_user', 'dokter_id');
        $this->addForeignKey('fk_m_user_dokter', 'm_user', 'dokter_id', 'm_dokter', 'id', 'SET NULL', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropForeignKey('fk_m_user_dokter', 'm_user');
        $this->dropIndex('idx_m_user_dokter_id', 'm_user');
        $this->dropTable('m_dokter');
    }
}
