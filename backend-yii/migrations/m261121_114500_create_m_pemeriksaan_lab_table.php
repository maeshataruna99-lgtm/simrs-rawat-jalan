<?php

use app\common\Migration;

/**
 * Tabel master pemeriksaan laboratorium dan tarif (m_pemeriksaan_lab).
 */
class m261121_114500_create_m_pemeriksaan_lab_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_pemeriksaan_lab', array_merge([
            'id' => $this->primaryKey(),
            'kode' => $this->string(30)->notNull(),
            'nama' => $this->string(150)->notNull(),
            'satuan' => $this->string(30),
            'nilai_rujukan' => $this->string(100),
            'tarif' => $this->decimal(12, 2)->notNull()->defaultValue(0),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->execute('ALTER TABLE m_pemeriksaan_lab ADD CONSTRAINT chk_m_pemeriksaan_lab_tarif CHECK (tarif >= 0)');
        $this->createActiveUniqueIndex('m_pemeriksaan_lab', 'kode');
    }

    public function safeDown()
    {
        $this->dropTable('m_pemeriksaan_lab');
    }
}
