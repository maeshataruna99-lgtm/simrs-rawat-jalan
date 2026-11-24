<?php

namespace app\modules\transaction\resep;

use app\common\ListQuery;
use app\modules\transaction\pendaftaran\Kunjungan;
use DateTimeImmutable;
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
     * @param array<string, mixed> $params status, tanggal (Y-m-d, tanggal resep dibuat), tanggal_dari/tanggal_sampai (tanggal kunjungan), q, page, per_page; semua opsional.
     * @return array{items: array<int, array<string, mixed>>, meta: array{page: int, per_page: int, total: int}}
     *
     * Dipakai di: FarmasiController::actionAntrean().
     */
    public function antrean(array $params): array
    {
        $status = trim((string) ($params['status'] ?? ''));
        $query = Resep::find()
            ->joinWith(['kunjungan k', 'kunjungan.pasien p'])
            ->with(['details.obat', 'dokter', 'kunjungan.poli'])
            ->where(['t_resep.status' => $status !== '' ? $status : [Resep::STATUS_BARU, Resep::STATUS_DIPROSES]])
            ->orderBy(['t_resep.id' => SORT_ASC]);
        $tanggal = trim((string) ($params['tanggal'] ?? ''));
        if ($tanggal !== '') {
            $mulai = DateTimeImmutable::createFromFormat('!Y-m-d', $tanggal);
            if ($mulai !== false && $mulai->format('Y-m-d') === $tanggal) {
                $besok = $mulai->modify('+1 day')->format('Y-m-d 00:00:00');
                $query->andWhere(['>=', 't_resep.created_at', "{$tanggal} 00:00:00"])
                    ->andWhere(['<', 't_resep.created_at', $besok]);
            } else {
                $query->andWhere('1 = 0');
            }
        }
        ListQuery::rentangTanggal($query, 'k.tgl_kunjungan', $params);
        $q = trim((string) ($params['q'] ?? ''));
        if ($q !== '') {
            $query->andWhere([
                'or',
                ['ilike', 't_resep.no_resep', $q],
                ['ilike', 'p.no_rm', $q],
                ['ilike', 'p.nama', $q],
            ]);
        }

        return ListQuery::paginate($query, $params, 't_resep.id');
    }

    /**
     * Menandai resep baru sebagai sedang diproses (disiapkan) oleh farmasi.
     *
     * @throws NotFoundHttpException
     * @throws ConflictHttpException Bila kunjungan sudah batal atau resep bukan berstatus baru.
     *
     * Dipakai di: FarmasiController::actionProses().
     */
    public function proses(int $resepId): Resep
    {
        Yii::$app->db->transaction(function () use ($resepId) {
            $resep = $this->kunciDenganKunjungan($resepId, 'diproses');
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
     * Pengurangan memakai UPDATE bersyarat `stok >= jumlah`; baris kunjungan dan resep dikunci agar konsisten
     * terhadap pembatalan kunjungan serta mencegah penyerahan ganda.
     *
     * @throws NotFoundHttpException
     * @throws ConflictHttpException Bila kunjungan sudah batal, resep belum diproses/sudah diserahkan, atau stok obat tidak cukup.
     *
     * Dipakai di: FarmasiController::actionSerahkan().
     */
    public function serahkan(int $resepId): Resep
    {
        Yii::$app->db->transaction(function () use ($resepId) {
            $db = Yii::$app->db;
            $resep = $this->kunciDenganKunjungan($resepId, 'diserahkan');
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
     * Mengunci baris kunjungan induk terlebih dahulu (t_kunjungan -> t_resep) agar urutan lock
     * konsisten dengan AntreanService::ubahStatus(), lalu memastikan kunjungan tidak berstatus batal.
     *
     * @throws NotFoundHttpException
     * @throws ConflictHttpException Bila kunjungan sudah dibatalkan.
     */
    private function kunciDenganKunjungan(int $resepId, string $aksi): Resep
    {
        $kunjunganId = Yii::$app->db->createCommand(
            'SELECT kunjungan_id FROM t_resep WHERE id = :id',
            [':id' => $resepId]
        )->queryScalar();
        if ($kunjunganId === false) {
            throw new NotFoundHttpException('Resep tidak ditemukan.');
        }

        /** @var Kunjungan|null $kunjungan */
        $kunjungan = Kunjungan::findBySql(
            'SELECT * FROM t_kunjungan WHERE id = :id FOR UPDATE',
            [':id' => (int) $kunjunganId]
        )->one();
        if ($kunjungan === null) {
            throw new NotFoundHttpException('Data kunjungan tidak ditemukan.');
        }
        if ($kunjungan->status === Kunjungan::STATUS_BATAL) {
            throw new ConflictHttpException("Kunjungan sudah dibatalkan, resep tidak dapat {$aksi}.");
        }

        return $this->kunci($resepId);
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
