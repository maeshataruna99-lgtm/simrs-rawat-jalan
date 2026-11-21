<?php

use app\common\Migration;

/**
 * Tabel modul: pengelompokan menu di sidebar (contoh: Master Data, Pendaftaran, Farmasi, Billing).
 */
class m261121_092638_create_m_module_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_module', array_merge([
            'id' => $this->primaryKey(),
            'kode' => $this->string(50)->notNull(),
            'nama' => $this->string(100)->notNull(),
            'icon' => $this->string(50),
            'urutan' => $this->integer()->notNull()->defaultValue(0),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->createActiveUniqueIndex('m_module', 'kode');
    }

    public function safeDown()
    {
        $this->dropTable('m_module');
    }
}
