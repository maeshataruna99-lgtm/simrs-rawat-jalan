<?php

use app\common\Migration;

/**
 * Tabel menu bertingkat. Menu induk tanpa path berfungsi sebagai grup; menu anak memiliki path halaman.
 * `kode` menjadi kunci hak akses, contoh `master-pasien` dipakai pada izin `master-pasien:create`.
 */
class m261121_092642_create_m_menu_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_menu', array_merge([
            'id' => $this->primaryKey(),
            'parent_id' => $this->integer(),
            'kode' => $this->string(100)->notNull(),
            'nama' => $this->string(100)->notNull(),
            'path' => $this->string(200),
            'icon' => $this->string(50),
            'urutan' => $this->integer()->notNull()->defaultValue(0),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->createActiveUniqueIndex('m_menu', 'kode');
        $this->createIndex('idx_m_menu_parent_id', 'm_menu', 'parent_id');
        $this->addForeignKey('fk_m_menu_parent', 'm_menu', 'parent_id', 'm_menu', 'id', 'RESTRICT', 'CASCADE');
        $this->execute('ALTER TABLE m_menu ADD CONSTRAINT chk_m_menu_parent CHECK (parent_id IS NULL OR parent_id <> id)');
    }

    public function safeDown()
    {
        $this->dropTable('m_menu');
    }
}
