<?php

use app\common\Migration;

/**
 * Tabel order laboratorium (t_order_lab), detail pemeriksaan beserta hasilnya (t_order_lab_detail),
 * dan outbox integrasi (t_integration_outbox) yang hanya ditulis service Node.
 * idempotency_key di detail membuat hasil yang dikirim ulang dengan key sama tidak diproses dua kali (D.5).
 */
class m261121_160000_create_t_order_lab_and_outbox_tables extends Migration
{
    public function safeUp()
    {
        $this->createTable('t_order_lab', array_merge([
            'id' => $this->primaryKey(),
            'no_order' => $this->string(30)->notNull(),
            'kunjungan_id' => $this->integer()->notNull(),
            'dokter_id' => $this->integer()->notNull(),
            'status' => $this->string(20)->notNull()->defaultValue('diminta'),
            'catatan_klinis' => $this->text(),
        ], $this->auditColumns()));

        $this->execute("ALTER TABLE t_order_lab ADD CONSTRAINT chk_t_order_lab_status CHECK (status IN ('diminta', 'diproses', 'selesai'))");
        $this->createIndex('uq_t_order_lab_no_order', 't_order_lab', 'no_order', true);
        $this->createIndex('idx_t_order_lab_kunjungan_id', 't_order_lab', 'kunjungan_id');
        $this->createIndex('idx_t_order_lab_status', 't_order_lab', 'status');
        $this->addForeignKey('fk_t_order_lab_kunjungan', 't_order_lab', 'kunjungan_id', 't_kunjungan', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_order_lab_dokter', 't_order_lab', 'dokter_id', 'm_dokter', 'id', 'RESTRICT', 'CASCADE');

        $this->createTable('t_order_lab_detail', array_merge([
            'id' => $this->primaryKey(),
            'order_id' => $this->integer()->notNull(),
            'pemeriksaan_lab_id' => $this->integer()->notNull(),
            'tarif' => $this->decimal(12, 2)->notNull(),
            'hasil' => $this->string(100),
            'satuan' => $this->string(30),
            'nilai_rujukan' => $this->string(100),
            'flag' => $this->string(10),
            'idempotency_key' => $this->string(100),
            'diinput_oleh' => $this->integer(),
            'diinput_at' => $this->timestamp(),
        ], $this->auditColumns()));

        $this->execute('ALTER TABLE t_order_lab_detail ADD CONSTRAINT chk_t_order_lab_detail_tarif CHECK (tarif >= 0)');
        $this->execute("ALTER TABLE t_order_lab_detail ADD CONSTRAINT chk_t_order_lab_detail_flag CHECK (flag IN ('normal', 'tinggi', 'rendah'))");
        $this->createIndex('uq_t_order_lab_detail_order_pemeriksaan', 't_order_lab_detail', ['order_id', 'pemeriksaan_lab_id'], true);
        $this->createIndex('uq_t_order_lab_detail_idempotency_key', 't_order_lab_detail', 'idempotency_key', true);
        $this->addForeignKey('fk_t_order_lab_detail_order', 't_order_lab_detail', 'order_id', 't_order_lab', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_t_order_lab_detail_pemeriksaan', 't_order_lab_detail', 'pemeriksaan_lab_id', 'm_pemeriksaan_lab', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_order_lab_detail_diinput_oleh', 't_order_lab_detail', 'diinput_oleh', 'm_user', 'id', 'SET NULL', 'CASCADE');

        $this->createTable('t_integration_outbox', array_merge([
            'id' => $this->primaryKey(),
            'idempotency_key' => $this->string(100)->notNull(),
            'tujuan' => $this->string(200)->notNull(),
            'payload' => 'jsonb NOT NULL',
            'status' => $this->string(20)->notNull()->defaultValue('pending'),
            'percobaan' => $this->integer()->notNull()->defaultValue(0),
            'retry_berikutnya' => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'error_terakhir' => $this->text(),
        ], $this->auditColumns()));

        $this->execute("ALTER TABLE t_integration_outbox ADD CONSTRAINT chk_t_integration_outbox_status CHECK (status IN ('pending', 'terkirim', 'gagal'))");
        $this->createIndex('uq_t_integration_outbox_idempotency_key', 't_integration_outbox', 'idempotency_key', true);
        $this->createIndex('idx_t_integration_outbox_antrean', 't_integration_outbox', ['status', 'retry_berikutnya']);
    }

    public function safeDown()
    {
        $this->dropTable('t_integration_outbox');
        $this->dropTable('t_order_lab_detail');
        $this->dropTable('t_order_lab');
    }
}
