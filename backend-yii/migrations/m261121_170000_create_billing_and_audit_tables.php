<?php

use app\common\Migration;

/**
 * Tabel billing (t_invoice, t_invoice_item, t_pembayaran) dan audit log (t_audit_log).
 * Pengaman D.3: idempotency_key unik di t_pembayaran dan constraint total_bayar <= total di t_invoice.
 * Pengaman D.4: partial unique index item aktif per (invoice_id, sumber, referensi_id) dan audit log jsonb.
 */
class m261121_170000_create_billing_and_audit_tables extends Migration
{
    public function safeUp()
    {
        $this->createTable('t_invoice', array_merge([
            'id' => $this->primaryKey(),
            'no_invoice' => $this->string(30)->notNull(),
            'kunjungan_id' => $this->integer()->notNull(),
            'total' => $this->decimal(14, 2)->notNull()->defaultValue(0),
            'total_bayar' => $this->decimal(14, 2)->notNull()->defaultValue(0),
            'status' => $this->string(20)->notNull()->defaultValue('belum_dibayar'),
        ], $this->auditColumns()));

        $this->execute("ALTER TABLE t_invoice ADD CONSTRAINT chk_t_invoice_status CHECK (status IN ('belum_dibayar', 'dibayar_sebagian', 'lunas'))");
        $this->execute('ALTER TABLE t_invoice ADD CONSTRAINT chk_t_invoice_total CHECK (total >= 0)');
        $this->execute('ALTER TABLE t_invoice ADD CONSTRAINT chk_t_invoice_total_bayar CHECK (total_bayar >= 0 AND total_bayar <= total)');
        $this->createIndex('uq_t_invoice_no_invoice', 't_invoice', 'no_invoice', true);
        $this->createIndex('uq_t_invoice_kunjungan_id', 't_invoice', 'kunjungan_id', true);
        $this->addForeignKey('fk_t_invoice_kunjungan', 't_invoice', 'kunjungan_id', 't_kunjungan', 'id', 'RESTRICT', 'CASCADE');

        $this->createTable('t_invoice_item', array_merge([
            'id' => $this->primaryKey(),
            'invoice_id' => $this->integer()->notNull(),
            'sumber' => $this->string(20)->notNull(),
            'referensi_id' => $this->integer()->notNull(),
            'deskripsi' => $this->string(200)->notNull(),
            'qty' => $this->integer()->notNull()->defaultValue(1),
            'harga' => $this->decimal(14, 2)->notNull(),
            'subtotal' => $this->decimal(14, 2)->notNull(),
            'is_void' => $this->boolean()->notNull()->defaultValue(false),
            'alasan_void' => $this->string(255),
        ], $this->auditColumns()));

        $this->execute("ALTER TABLE t_invoice_item ADD CONSTRAINT chk_t_invoice_item_sumber CHECK (sumber IN ('pendaftaran', 'tindakan', 'lab', 'obat'))");
        $this->execute('ALTER TABLE t_invoice_item ADD CONSTRAINT chk_t_invoice_item_qty CHECK (qty > 0)');
        $this->execute('ALTER TABLE t_invoice_item ADD CONSTRAINT chk_t_invoice_item_harga CHECK (harga >= 0)');
        $this->execute('ALTER TABLE t_invoice_item ADD CONSTRAINT chk_t_invoice_item_subtotal CHECK (subtotal = qty * harga)');
        $this->execute('ALTER TABLE t_invoice_item ADD CONSTRAINT chk_t_invoice_item_void CHECK (NOT is_void OR (alasan_void IS NOT NULL AND length(trim(alasan_void)) > 0))');
        $this->createIndex('idx_t_invoice_item_invoice_id', 't_invoice_item', 'invoice_id');
        $this->execute('CREATE UNIQUE INDEX uq_t_invoice_item_aktif ON t_invoice_item (invoice_id, sumber, referensi_id) WHERE is_void = false');
        $this->addForeignKey('fk_t_invoice_item_invoice', 't_invoice_item', 'invoice_id', 't_invoice', 'id', 'CASCADE', 'CASCADE');

        $this->createTable('t_pembayaran', array_merge([
            'id' => $this->primaryKey(),
            'no_pembayaran' => $this->string(30)->notNull(),
            'invoice_id' => $this->integer()->notNull(),
            'idempotency_key' => $this->string(100)->notNull(),
            'metode' => $this->string(20)->notNull(),
            'jumlah' => $this->decimal(14, 2)->notNull(),
            'no_referensi' => $this->string(100),
            'kasir_id' => $this->integer()->notNull(),
            'dibayar_at' => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ], $this->auditColumns()));

        $this->execute("ALTER TABLE t_pembayaran ADD CONSTRAINT chk_t_pembayaran_metode CHECK (metode IN ('tunai', 'non_tunai'))");
        $this->execute('ALTER TABLE t_pembayaran ADD CONSTRAINT chk_t_pembayaran_jumlah CHECK (jumlah > 0)');
        $this->createIndex('uq_t_pembayaran_no_pembayaran', 't_pembayaran', 'no_pembayaran', true);
        $this->createIndex('uq_t_pembayaran_idempotency_key', 't_pembayaran', 'idempotency_key', true);
        $this->createIndex('idx_t_pembayaran_invoice_id', 't_pembayaran', 'invoice_id');
        $this->addForeignKey('fk_t_pembayaran_invoice', 't_pembayaran', 'invoice_id', 't_invoice', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_pembayaran_kasir', 't_pembayaran', 'kasir_id', 'm_user', 'id', 'RESTRICT', 'CASCADE');

        $this->createTable('t_audit_log', array_merge([
            'id' => $this->primaryKey(),
            'tabel' => $this->string(64)->notNull(),
            'record_id' => $this->integer()->notNull(),
            'aksi' => $this->string(30)->notNull(),
            'data_lama' => 'jsonb',
            'data_baru' => 'jsonb',
            'user_id' => $this->integer(),
            'waktu' => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ], $this->auditColumns()));

        $this->createIndex('idx_t_audit_log_tabel_record', 't_audit_log', ['tabel', 'record_id']);
        $this->addForeignKey('fk_t_audit_log_user', 't_audit_log', 'user_id', 'm_user', 'id', 'SET NULL', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('t_audit_log');
        $this->dropTable('t_pembayaran');
        $this->dropTable('t_invoice_item');
        $this->dropTable('t_invoice');
    }
}
