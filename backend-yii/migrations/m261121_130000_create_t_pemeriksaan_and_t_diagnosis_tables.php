<?php

use app\common\Migration;

/**
 * Tabel rekam medis elektronik: hasil pemeriksaan dokter per kunjungan (t_pemeriksaan) dan diagnosis ICD-10 (t_diagnosis).
 * Check range tanda vital menjadi pengaman terakhir bila validasi aplikasi terlewati.
 */
class m261121_130000_create_t_pemeriksaan_and_t_diagnosis_tables extends Migration
{
    /** Batas wajar tanda vital: kolom => [min, max]. */
    private const RANGE_TTV = [
        'td_sistolik' => [50, 300],
        'td_diastolik' => [30, 200],
        'nadi' => [20, 250],
        'suhu' => [30, 45],
        'respirasi' => [5, 80],
        'spo2' => [50, 100],
        'berat_badan' => [0.5, 500],
        'tinggi_badan' => [20, 250],
    ];

    public function safeUp()
    {
        $this->createTable('t_pemeriksaan', array_merge([
            'id' => $this->primaryKey(),
            'kunjungan_id' => $this->integer()->notNull(),
            'dokter_id' => $this->integer()->notNull(),
            'keluhan_utama' => $this->text(),
            'anamnesis' => $this->text(),
            'td_sistolik' => $this->smallInteger(),
            'td_diastolik' => $this->smallInteger(),
            'nadi' => $this->smallInteger(),
            'suhu' => $this->decimal(4, 1),
            'respirasi' => $this->smallInteger(),
            'spo2' => $this->smallInteger(),
            'berat_badan' => $this->decimal(5, 1),
            'tinggi_badan' => $this->decimal(5, 1),
            'pemeriksaan_fisik' => $this->text(),
        ], $this->auditColumns()));

        $this->createIndex('uq_t_pemeriksaan_kunjungan_id', 't_pemeriksaan', 'kunjungan_id', true);
        foreach (self::RANGE_TTV as $kolom => [$min, $max]) {
            $this->execute("ALTER TABLE t_pemeriksaan ADD CONSTRAINT chk_t_pemeriksaan_{$kolom} CHECK ({$kolom} BETWEEN {$min} AND {$max})");
        }
        $this->addForeignKey('fk_t_pemeriksaan_kunjungan', 't_pemeriksaan', 'kunjungan_id', 't_kunjungan', 'id', 'RESTRICT', 'CASCADE');
        $this->addForeignKey('fk_t_pemeriksaan_dokter', 't_pemeriksaan', 'dokter_id', 'm_dokter', 'id', 'RESTRICT', 'CASCADE');

        $this->createTable('t_diagnosis', array_merge([
            'id' => $this->primaryKey(),
            'kunjungan_id' => $this->integer()->notNull(),
            'icd10_id' => $this->integer()->notNull(),
            'jenis' => $this->string(10)->notNull(),
        ], $this->auditColumns()));

        $this->execute("ALTER TABLE t_diagnosis ADD CONSTRAINT chk_t_diagnosis_jenis CHECK (jenis IN ('utama', 'sekunder'))");
        $this->createIndex('uq_t_diagnosis_kunjungan_icd10', 't_diagnosis', ['kunjungan_id', 'icd10_id'], true);
        $this->execute("CREATE UNIQUE INDEX uq_t_diagnosis_utama ON t_diagnosis (kunjungan_id) WHERE jenis = 'utama'");
        $this->addForeignKey('fk_t_diagnosis_kunjungan', 't_diagnosis', 'kunjungan_id', 't_kunjungan', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_t_diagnosis_icd10', 't_diagnosis', 'icd10_id', 'm_icd10', 'id', 'RESTRICT', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('t_diagnosis');
        $this->dropTable('t_pemeriksaan');
    }
}
