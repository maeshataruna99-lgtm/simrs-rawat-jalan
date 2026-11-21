<?php

use app\common\Migration;

/**
 * Tabel master pasien (m_pasien).
 * Nomor rekam medis (no_rm) dan NIK bersifat unik untuk baris aktif (belum di-soft delete).
 */
class m261121_111510_create_m_pasien_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('m_pasien', array_merge([
            'id' => $this->primaryKey(),
            'no_rm' => $this->string(20)->notNull(),
            'nik' => $this->string(16)->notNull(),
            'nama' => $this->string(100)->notNull(),
            'tgl_lahir' => $this->date()->notNull(),
            'jenis_kelamin' => $this->char(1)->notNull(),
            'alamat' => $this->text(),
            'no_hp' => $this->string(20),
        ], $this->auditColumns(), $this->softDeleteColumn()));

        $this->execute("ALTER TABLE m_pasien ADD CONSTRAINT chk_m_pasien_jk CHECK (jenis_kelamin IN ('L', 'P'))");
        $this->createActiveUniqueIndex('m_pasien', 'no_rm');
        $this->createActiveUniqueIndex('m_pasien', 'nik');
        $this->createIndex('idx_m_pasien_nama', 'm_pasien', 'nama');
    }

    public function safeDown()
    {
        $this->dropTable('m_pasien');
    }
}
