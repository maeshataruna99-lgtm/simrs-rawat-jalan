<?php

use app\common\Migration;

/**
 * Tabel master poli / unit pelayanan (m_poli).
 * Menyimpan tarif pendaftaran per poli dengan pengaman CHECK tarif_pendaftaran >= 0.
 */
class m261121_112500_create_m_poli_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_poli', array_merge([
            'id' => $this->primaryKey(),
            'kode' => $this->string(30)->notNull(),
            'nama' => $this->string(100)->notNull(),
            'tarif_pendaftaran' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->execute('ALTER TABLE m_poli ADD CONSTRAINT chk_m_poli_tarif CHECK (tarif_pendaftaran >= 0)');
        $this->createActiveUniqueIndex('m_poli', 'kode');
    }

    public function safeDown()
    {
        $this->dropTable('m_poli');
    }
}
