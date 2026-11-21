<?php

namespace app\modules\transaction\pendaftaran;

use app\modules\master\pasien\Pasien;

/**
 * Service pendaftaran kunjungan rawat jalan dan pencarian pasien untuk loket pendaftaran.
 *
 * Dipakai di: PendaftaranController.
 */
class PendaftaranService
{
    /**
     * Mencari pasien aktif berdasarkan nomor rekam medis (no_rm), NIK, atau nama.
     *
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: PendaftaranController::actionCariPasien().
     */
    public function cariPasien(?string $q, int $limit = 20): array
    {
        $keyword = trim((string) $q);
        $query = Pasien::findActive()
            ->orderBy(['nama' => SORT_ASC])
            ->limit(max(1, min(100, $limit)));

        if ($keyword !== '') {
            $query->andWhere([
                'or',
                ['ilike', 'no_rm', $keyword],
                ['ilike', 'nik', $keyword],
                ['ilike', 'nama', $keyword],
            ]);
        }

        return array_map(fn (Pasien $pasien) => $pasien->toArray(), $query->all());
    }
}
