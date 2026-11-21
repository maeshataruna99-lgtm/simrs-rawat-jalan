<?php

use app\common\Migration;

/**
 * Tabel pengguna aplikasi. Satu user memiliki satu role.
 * dokter_id menghubungkan akun dengan data dokter; foreign key ditambahkan saat m_dokter dibuat (poin 2.2).
 */
class m261121_092420_create_m_user_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_user', array_merge([
            'id' => $this->primaryKey(),
            'username' => $this->string(50)->notNull(),
            'password_hash' => $this->string(255)->notNull(),
            'nama' => $this->string(100)->notNull(),
            'role_id' => $this->integer()->notNull(),
            'dokter_id' => $this->integer(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
            'last_login_at' => $this->timestamp(),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->createActiveUniqueIndex('m_user', 'username');
        $this->createIndex('idx_m_user_role_id', 'm_user', 'role_id');
        $this->addForeignKey('fk_m_user_role', 'm_user', 'role_id', 'm_role', 'id', 'RESTRICT', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('m_user');
    }
}
