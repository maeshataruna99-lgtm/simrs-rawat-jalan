<?php

use app\common\Migration;

/**
 * Relasi modul dan menu: menentukan menu mana yang tampil di bawah modul apa, beserta urutannya.
 */
class m261121_092645_create_m_module_menu_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_module_menu', array_merge([
            'id' => $this->primaryKey(),
            'module_id' => $this->integer()->notNull(),
            'menu_id' => $this->integer()->notNull(),
            'urutan' => $this->integer()->notNull()->defaultValue(0),
        ], $this->auditColumns()));

        $this->createIndex('uq_m_module_menu', 'm_module_menu', ['module_id', 'menu_id'], true);
        $this->createIndex('idx_m_module_menu_menu_id', 'm_module_menu', 'menu_id');
        $this->addForeignKey('fk_m_module_menu_module', 'm_module_menu', 'module_id', 'm_module', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_m_module_menu_menu', 'm_module_menu', 'menu_id', 'm_menu', 'id', 'CASCADE', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('m_module_menu');
    }
}
