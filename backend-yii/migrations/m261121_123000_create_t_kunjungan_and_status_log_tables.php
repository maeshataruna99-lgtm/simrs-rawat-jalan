<?php

use app\common\Migration;

/**
 * Tabel transaksi kunjungan dan antrean rawat jalan (t_kunjungan) beserta log perubahan status (t_kunjungan_status_log).
 * Pengaman D.1:
 * - Partial unique index uq_t_kunjungan_pasien_poli_tgl_aktif mencegah kunjungan aktif ganda untuk pasien, poli, dan tanggal yang sama.
 * - Unique index uq_t_kunjungan_antrean mencegah nomor antrean ganda per poli, dokter, dan tanggal.
 */
class m261121_123000_create_t_kunjungan_and_status_log_tables extends Migration
{
    public function safeUp()
    {
        $this->createTable('t_kunjungan', array_merge([
            'id' => $this->primaryKey(),
            'no_kunjungan' => $this->string(30)->notNull(),
            'pasien_id' => $this->integer()->notNull(),
            'poli_id' => $this->integer()->notNull(),
            'dokter_id' => $this->integer()->notNull(),
            'jadwal_id' => $this->integer()->notNull(),
            'tgl_kunjungan' => $this->date()->notNull(),
            'no_antrean' => $this->integer()->notNull(),
            'status' => $this->string(20)->notNull()->defaultValue('menunggu'),
        ], $this->auditColumns()));

        $this->execute(
            "ALTER TABLE t_kunjungan ADD CONSTRAINT chk_t_kunjungan_status CHECK (status IN ('menunggu', 'diperiksa', 'selesai', 'batal'))"
        );
        $this->execute('ALTER TABLE t_kunjungan ADD CONSTRAINT chk_t_kunjungan_no_antrean CHECK (no_antrean > 0)');

        $this->createIndex('uq_t_kunjungan_no_kunjungan', 't_kunjungan', 'no_kunjungan', true);
        $this->execute(
            "CREATE UNIQUE INDEX uq_t_kunjungan_pasien_poli_tgl_aktif ON t_kunjungan (pasien_id, poli_id, tgl_kunjungan) WHERE status <> 'batal'"
        );
        $this->createIndex(
            'uq_t_kunjungan_antrean',
            't_kunjungan',
            ['poli_id', 'dokter_id', 'tgl_kunjungan', 'no_antrean'],
            true
        );

        $this->addForeignKey('fk_t_kunjungan_pasien', 't_kunjungan', 'pasien_id', 'm_pasien', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_kunjungan_poli', 't_kunjungan', 'poli_id', 'm_poli', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_kunjungan_dokter', 't_kunjungan', 'dokter_id', 'm_dokter', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_kunjungan_jadwal', 't_kunjungan', 'jadwal_id', 'm_jadwal_dokter', 'id', 'RESTRICT', 'CASCADE');

        $this->createTable('t_kunjungan_status_log', array_merge([
            'id' => $this->primaryKey(),
            'kunjungan_id' => $this->integer()->notNull(),
            'status_lama' => $this->string(20),
            'status_baru' => $this->string(20)->notNull(),
            'user_id' => $this->integer(),
            'waktu' => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ], $this->auditColumns()));

        $this->createIndex('idx_t_kunjungan_status_log_kunjungan_id', 't_kunjungan_status_log', 'kunjungan_id');
        $this->addForeignKey(
            'fk_t_kunjungan_status_log_kunjungan',
            't_kunjungan_status_log',
            'kunjungan_id',
            't_kunjungan',
            'id',
            'CASCADE',
            'CASCADE'
        );
    }

    public function safeDown()
    {
        $this->dropTable('t_kunjungan_status_log');
        $this->dropTable('t_kunjungan');
    }
}
