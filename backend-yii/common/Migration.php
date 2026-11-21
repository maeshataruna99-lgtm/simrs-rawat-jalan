<?php

namespace app\common;

/**
 * Migration dasar dengan kolom audit dan soft delete yang seragam (docs/roadmap-detail.md, Konvensi Umum).
 *
 * Dipakai di: seluruh file di migrations/.
 */
class Migration extends \yii\db\Migration
{
    /**
     * Kolom audit: waktu dan user pembuat/pengubah terakhir.
     * created_by/updated_by sengaja tanpa foreign key agar tabel m_user tidak bergantung pada dirinya sendiri.
     */
    protected function auditColumns(): array
    {
        return [
            'created_at' => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp(),
            'created_by' => $this->integer(),
            'updated_by' => $this->integer(),
        ];
    }

    /**
     * Kolom soft delete untuk tabel master. Data yang dihapus tetap ada agar riwayat transaksi utuh.
     */
    protected function softDeleteColumn(): array
    {
        return ['deleted_at' => $this->timestamp()];
    }

    /**
     * Unique index yang hanya berlaku untuk baris yang belum dihapus,
     * sehingga kode yang sama bisa dipakai lagi setelah data lama di-soft delete.
     */
    protected function createActiveUniqueIndex(string $table, string $column): void
    {
        $this->execute(sprintf(
            'CREATE UNIQUE INDEX %s ON %s (%s) WHERE deleted_at IS NULL',
            "uq_{$table}_{$column}",
            $table,
            $column
        ));
    }
}
