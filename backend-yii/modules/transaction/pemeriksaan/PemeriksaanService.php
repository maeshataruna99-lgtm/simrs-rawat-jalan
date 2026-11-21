<?php

namespace app\modules\transaction\pemeriksaan;

use app\modules\transaction\pendaftaran\Kunjungan;

/**
 * Service pemeriksaan dokter: worklist pasien yang menunggu atau sedang diperiksa.
 *
 * Dipakai di: PemeriksaanController.
 */
class PemeriksaanService
{
    /**
     * Daftar kunjungan berstatus menunggu/diperiksa pada satu tanggal, urut nomor antrean.
     * User yang tertaut ke dokter hanya melihat pasiennya sendiri; user tanpa tautan (misalnya admin) melihat semua.
     *
     * @param int|null $dokterId dokter_id milik user login, null bila user tidak tertaut ke dokter.
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: PemeriksaanController::actionWorklist().
     */
    public function worklist(?int $dokterId, string $tanggal): array
    {
        $query = Kunjungan::find()
            ->with(['pasien', 'poli', 'dokter', 'statusLogs'])
            ->where([
                'tgl_kunjungan' => $tanggal,
                'status' => [Kunjungan::STATUS_MENUNGGU, Kunjungan::STATUS_DIPERIKSA],
            ])
            ->orderBy(['poli_id' => SORT_ASC, 'dokter_id' => SORT_ASC, 'no_antrean' => SORT_ASC]);

        if ($dokterId !== null) {
            $query->andWhere(['dokter_id' => $dokterId]);
        }

        return array_map(fn (Kunjungan $row) => $row->toArray(), $query->all());
    }
}
