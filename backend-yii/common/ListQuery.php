<?php

namespace app\common;

use DateTimeImmutable;
use yii\db\ActiveQuery;

/**
 * Helper daftar transaksi: filter rentang tanggal dan paginasi offset dengan meta seragam.
 *
 * Dipakai di: AntreanService, PemeriksaanService, OrderLabService, FarmasiService.
 */
class ListQuery
{
    public const MAX_PER_PAGE = 100;

    /**
     * Menerapkan filter `tanggal_dari` dan `tanggal_sampai` (Y-m-d, inklusif) pada kolom tanggal.
     * Kolom timestamp memakai `< sampai + 1 hari` agar predikat tetap sargable (index tetap terpakai).
     * Tanggal tidak valid menghasilkan daftar kosong, bukan error database.
     *
     * @param array<string, mixed> $params
     *
     * Dipakai di: service daftar transaksi.
     */
    public static function rentangTanggal(ActiveQuery $query, string $column, array $params, bool $timestamp = false): void
    {
        foreach (['tanggal_dari', 'tanggal_sampai'] as $key) {
            $value = trim((string) ($params[$key] ?? ''));
            if ($value === '') {
                continue;
            }
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            if ($date === false || $date->format('Y-m-d') !== $value) {
                $query->andWhere('1 = 0');

                return;
            }
            if ($key === 'tanggal_dari') {
                $query->andWhere(['>=', $column, $value]);
            } elseif ($timestamp) {
                $query->andWhere(['<', $column, $date->modify('+1 day')->format('Y-m-d')]);
            } else {
                $query->andWhere(['<=', $column, $value]);
            }
        }
    }

    /**
     * Mengambil satu halaman data beserta total baris.
     *
     * @param array<string, mixed> $params page dan per_page (maksimal MAX_PER_PAGE).
     * @return array{items: array<int, array<string, mixed>>, meta: array{page: int, per_page: int, total: int}}
     *
     * Dipakai di: service daftar transaksi.
     */
    public static function paginate(ActiveQuery $query, array $params, string $countColumn): array
    {
        $page = max(1, (int) ($params['page'] ?? 1));
        $perPage = min(self::MAX_PER_PAGE, max(1, (int) ($params['per_page'] ?? 20)));
        $total = (int) (clone $query)->orderBy(null)->count($countColumn);
        $rows = $query->offset(($page - 1) * $perPage)->limit($perPage)->all();

        return [
            'items' => array_map(fn ($row) => $row->toArray(), $rows),
            'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $total],
        ];
    }
}
