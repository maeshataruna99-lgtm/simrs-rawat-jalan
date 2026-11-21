<?php

namespace app\modules\transaction\resep;

use Yii;
use yii\db\Expression;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Pelayanan resep di farmasi: antrean resep, proses, dan penyerahan obat dengan pengurangan stok atomik (Pengaman D.2).
 *
 * Dipakai di: FarmasiController.
 */
class FarmasiService
{
    /**
     * Antrean resep untuk farmasi, bawaan status baru dan diproses, terlama dulu.
     *
     * @param array<string, mixed> $params status (opsional), tanggal (Y-m-d, opsional, tanggal resep dibuat).
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: FarmasiController::actionAntrean().
     */
    public function antrean(array $params): array
    {
        $status = trim((string) ($params['status'] ?? ''));
        $query = Resep::find()->with(['details.obat', 'dokter', 'kunjungan.pasien', 'kunjungan.poli'])
            ->where(['status' => $status !== '' ? $status : [Resep::STATUS_BARU, Resep::STATUS_DIPROSES]])
            ->orderBy(['id' => SORT_ASC]);
        $tanggal = trim((string) ($params['tanggal'] ?? ''));
        if ($tanggal !== '') {
            $query->andWhere(['DATE(created_at)' => $tanggal]);
        }

        return array_map(fn (Resep $r) => $r->toArray(), $query->all());
    }

    /**
     * Menandai resep baru sebagai sedang diproses (disiapkan) oleh farmasi.
     *
     * @throws NotFoundHttpException
     * @throws ConflictHttpException Bila resep bukan berstatus baru.
     *
     * Dipakai di: FarmasiController::actionProses().
     */
    public function proses(int $resepId): Resep
    {
        Yii::$app->db->transaction(function () use ($resepId) {
            $resep = $this->kunci($resepId);
            if ($resep->status !== Resep::STATUS_BARU) {
                throw new ConflictHttpException("Resep berstatus {$resep->status} tidak dapat diproses.");
            }
            $resep->status = Resep::STATUS_DIPROSES;
            $resep->save(false, ['status', 'updated_at', 'updated_by']);
        });

        return $this->muat($resepId);
    }

    /**
     * Menyerahkan obat: semua detail resep mengurangi stok dalam satu transaksi, gagal satu batal semua.
     * Pengurangan memakai UPDATE bersyarat `stok >= jumlah`; baris resep dikunci agar resep yang sama tidak diserahkan dua kali.
     *
     * @throws NotFoundHttpException
     * @throws ConflictHttpException Bila resep belum diproses/sudah diserahkan atau stok salah satu obat tidak cukup.
     *
     * Dipakai di: FarmasiController::actionSerahkan().
     */
    public function serahkan(int $resepId): Resep
    {
        Yii::$app->db->transaction(function () use ($resepId) {
            $db = Yii::$app->db;
            $resep = $this->kunci($resepId);
            if ($resep->status !== Resep::STATUS_DIPROSES) {
                throw new ConflictHttpException("Resep berstatus {$resep->status} tidak dapat diserahkan.");
            }
            $userId = Yii::$app->has('user') ? Yii::$app->user->id : null;

            // Urut per obat_id agar dua penyerahan bersamaan mengunci baris m_obat dengan urutan sama (hindari deadlock).
            $details = ResepDetail::find()->with('obat')->where(['resep_id' => $resep->id])->orderBy(['obat_id' => SORT_ASC])->all();
            foreach ($details as $detail) {
                $stokSesudah = $db->createCommand(
                    'UPDATE m_obat SET stok = stok - :qty, updated_at = CURRENT_TIMESTAMP, updated_by = :user
                     WHERE id = :id AND stok >= :qty RETURNING stok',
                    [':qty' => $detail->jumlah, ':user' => $userId, ':id' => $detail->obat_id]
                )->queryScalar();
                if ($stokSesudah === false) {
                    throw new ConflictHttpException("Stok {$detail->obat->nama} tidak cukup untuk diserahkan.");
                }
                $db->createCommand()->insert('t_stok_mutasi', [
                    'obat_id' => $detail->obat_id,
                    'jenis' => 'keluar',
                    'qty' => -$detail->jumlah,
                    'stok_sebelum' => (int) $stokSesudah + $detail->jumlah,
                    'stok_sesudah' => (int) $stokSesudah,
                    'referensi' => "Resep {$resep->no_resep}",
                    'created_by' => $userId,
                ])->execute();
            }

            $resep->status = Resep::STATUS_DISERAHKAN;
            $resep->diserahkan_oleh = $userId;
            $resep->diserahkan_at = new Expression('CURRENT_TIMESTAMP');
            $resep->save(false, ['status', 'diserahkan_oleh', 'diserahkan_at', 'updated_at', 'updated_by']);
        });

        return $this->muat($resepId);
    }

    /**
     * Mengunci baris resep (SELECT ... FOR UPDATE) di dalam transaksi berjalan.
     *
     * @throws NotFoundHttpException
     */
    private function kunci(int $resepId): Resep
    {
        $resep = Resep::findBySql('SELECT * FROM t_resep WHERE id = :id FOR UPDATE', [':id' => $resepId])->one();
        if ($resep === null) {
            throw new NotFoundHttpException('Resep tidak ditemukan.');
        }

        return $resep;
    }

    private function muat(int $resepId): Resep
    {
        return Resep::find()->with(['details.obat', 'dokter', 'kunjungan.pasien', 'kunjungan.poli'])->where(['id' => $resepId])->one();
    }
}
