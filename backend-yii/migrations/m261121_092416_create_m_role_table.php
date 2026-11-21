<?php

use app\common\Migration;

/**
 * Tabel role pengguna (Administrator, Pendaftaran, Dokter, Farmasi, Laboratorium, Kasir).
 * Hak akses per menu disimpan di m_role_access (poin 1.2).
 */
class m261121_092416_create_m_role_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_role', array_merge([
            'id' => $this->primaryKey(),
            'kode' => $this->string(50)->notNull(),
            'nama' => $this->string(100)->notNull(),
            'keterangan' => $this->string(255),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->createActiveUniqueIndex('m_role', 'kode');
    }

    public function safeDown()
    {
        $this->dropTable('m_role');
    }
}
