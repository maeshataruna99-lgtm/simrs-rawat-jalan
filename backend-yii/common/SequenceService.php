<?php

namespace app\common;

use Yii;

/**
 * Pembangkit nomor urut atomik berbasis tabel t_sequence_counter dengan row lock (SELECT ... FOR UPDATE).
 *
 * Dipakai di: PasienService (nomor RM), PendaftaranService (nomor kunjungan dan antrean), ResepService (nomor resep).
 */
class SequenceService
{
    /**
     * Mengambil nilai urut berikutnya untuk pasangan kode dan periode.
     * Wajib dipanggil di dalam transaksi database agar row lock bertahan sampai data utama tersimpan.
     *
     * Dipakai di: nextFormatted(), PendaftaranService.
     */
    public static function next(string $kode, string $periode = 'ALL', int $floor = 0): int
    {
        $db = Yii::$app->db;
        $userId = Yii::$app->has('user') ? Yii::$app->user->id : null;

        $current = $db->createCommand(
            'SELECT nilai_terakhir FROM t_sequence_counter WHERE kode = :kode AND periode = :periode FOR UPDATE',
            [':kode' => $kode, ':periode' => $periode]
        )->queryScalar();

        if ($current === false) {
            $db->createCommand(
                'INSERT INTO t_sequence_counter (kode, periode, nilai_terakhir, created_by)
                 VALUES (:kode, :periode, 0, :user)
                 ON CONFLICT (kode, periode) DO NOTHING',
                [':kode' => $kode, ':periode' => $periode, ':user' => $userId]
            )->execute();

            $current = $db->createCommand(
                'SELECT nilai_terakhir FROM t_sequence_counter WHERE kode = :kode AND periode = :periode FOR UPDATE',
                [':kode' => $kode, ':periode' => $periode]
            )->queryScalar();
        }

        // $floor = nilai terbesar yang sudah dipakai di tabel data, agar counter yang tertinggal (data impor/seed) tidak menerbitkan nomor ganda.
        $next = max((int) $current, $floor) + 1;

        $db->createCommand(
            'UPDATE t_sequence_counter
             SET nilai_terakhir = :next, updated_at = CURRENT_TIMESTAMP, updated_by = :user
             WHERE kode = :kode AND periode = :periode',
            [':next' => $next, ':user' => $userId, ':kode' => $kode, ':periode' => $periode]
        )->execute();

        return $next;
    }

    /**
     * Membentuk kode berformat awalan + angka dengan padding nol, contoh RM000001.
     *
     * Dipakai di: PasienService::create(), PendaftaranService::daftar(), ResepService::buat().
     */
    public static function nextFormatted(string $kode, string $periode, string $prefix, int $padLength = 6): string
    {
        $number = self::next($kode, $periode);

        return $prefix . str_pad((string) $number, $padLength, '0', STR_PAD_LEFT);
    }
}
