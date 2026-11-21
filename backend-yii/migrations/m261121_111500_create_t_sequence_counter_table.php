<?php

use app\common\Migration;

/**
 * Tabel penghitung nomor urut otomatis (nomor RM, nomor kunjungan, nomor antrean, dll.).
 * Dikunci dengan SELECT ... FOR UPDATE saat mengambil nomor baru agar aman dari race condition.
 */
class m261121_111500_create_t_sequence_counter_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('t_sequence_counter', array_merge([
            'kode' => $this->string(50)->notNull(),
            'periode' => $this->string(30)->notNull(),
            'nilai_terakhir' => $this->integer()->notNull()->defaultValue(0),
        ], $this->auditColumns()));

        $this->addPrimaryKey('pk_t_sequence_counter', 't_sequence_counter', ['kode', 'periode']);
    }

    public function safeDown()
    {
        $this->dropTable('t_sequence_counter');
    }
}
