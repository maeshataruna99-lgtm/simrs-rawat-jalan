<?php

use app\common\Migration;

/**
 * Hak akses role per menu: izin baca, tambah, ubah, dan hapus.
 * Tidak ada baris berarti role tidak punya akses sama sekali ke menu tersebut.
 */
class m261121_092648_create_m_role_access_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_role_access', array_merge([
            'role_id' => $this->integer()->notNull(),
            'menu_id' => $this->integer()->notNull(),
            'can_read' => $this->boolean()->notNull()->defaultValue(false),
            'can_create' => $this->boolean()->notNull()->defaultValue(false),
            'can_update' => $this->boolean()->notNull()->defaultValue(false),
            'can_delete' => $this->boolean()->notNull()->defaultValue(false),
        ], $this->auditColumns()));

        $this->addPrimaryKey('pk_m_role_access', 'm_role_access', ['role_id', 'menu_id']);
        $this->createIndex('idx_m_role_access_menu_id', 'm_role_access', 'menu_id');
        $this->addForeignKey('fk_m_role_access_role', 'm_role_access', 'role_id', 'm_role', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_m_role_access_menu', 'm_role_access', 'menu_id', 'm_menu', 'id', 'CASCADE', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('m_role_access');
    }
}
