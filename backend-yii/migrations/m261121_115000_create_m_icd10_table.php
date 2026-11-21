<?php

use app\common\Migration;

/**
 * Tabel master diagnosis ICD-10 (m_icd10).
 */
class m261121_115000_create_m_icd10_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_icd10', array_merge([
            'id' => $this->primaryKey(),
            'kode' => $this->string(20)->notNull(),
            'nama' => $this->string(200)->notNull(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->createActiveUniqueIndex('m_icd10', 'kode');
        $this->createIndex('idx_m_icd10_nama', 'm_icd10', 'nama');
    }

    public function safeDown()
    {
        $this->dropTable('m_icd10');
    }
}
