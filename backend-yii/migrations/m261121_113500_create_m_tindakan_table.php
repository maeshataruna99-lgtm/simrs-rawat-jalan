<?php

use app\common\Migration;

/**
 * Tabel master tindakan medis dan tarif (m_tindakan).
 * poli_id opsional (nullable): tindakan umum berlaku lintas poli jika poli_id kosong.
 */
class m261121_113500_create_m_tindakan_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_tindakan', array_merge([
            'id' => $this->primaryKey(),
            'kode' => $this->string(30)->notNull(),
            'nama' => $this->string(150)->notNull(),
            'tarif' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'poli_id' => $this->integer(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->execute('ALTER TABLE m_tindakan ADD CONSTRAINT chk_m_tindakan_tarif CHECK (tarif >= 0)');
        $this->createActiveUniqueIndex('m_tindakan', 'kode');
        $this->createIndex('idx_m_tindakan_poli_id', 'm_tindakan', 'poli_id');
        $this->addForeignKey('fk_m_tindakan_poli', 'm_tindakan', 'poli_id', 'm_poli', 'id', 'SET NULL', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('m_tindakan');
    }
}
