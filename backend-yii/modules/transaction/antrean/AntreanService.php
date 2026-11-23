<?php

namespace app\modules\transaction\antrean;

use app\common\ValidationException;
use app\modules\master\pasien\Pasien;
use app\modules\master\poli\Poli;
use app\modules\transaction\pembayaran\Invoice;
use app\modules\transaction\pendaftaran\Kunjungan;
use app\modules\transaction\resep\Resep;
use Yii;
use yii\web\ConflictHttpException;
use yii\web\ForbiddenHttpException;
use yii\web\NotFoundHttpException;

/**
 * Pengelolaan daftar antrean poli, perubahan status antrean (tercatat di t_kunjungan_status_log),
 * serta riwayat kunjungan pasien.
 *
 * Dipakai di: AntreanController, RiwayatKunjunganController.
 */
class AntreanService
{
    /**
     * Mengambil daftar antrean kunjungan dengan filter poli, dokter, tanggal, status, dan kata kunci.
     *
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: AntreanController::actionIndex().
     */
    public function list(array $params): array
    {
        $query = Kunjungan::find()
            ->joinWith(['pasien p', 'poli po', 'dokter d'])
            ->with(['statusLogs'])
            ->orderBy([
                't_kunjungan.tgl_kunjungan' => SORT_DESC,
                't_kunjungan.poli_id' => SORT_ASC,
                't_kunjungan.dokter_id' => SORT_ASC,
                't_kunjungan.no_antrean' => SORT_ASC,
            ]);

        if (!empty($params['poli_id'])) {
            $query->andWhere(['t_kunjungan.poli_id' => (int) $params['poli_id']]);
        }
        if (!empty($params['dokter_id'])) {
            $query->andWhere(['t_kunjungan.dokter_id' => (int) $params['dokter_id']]);
        }
        if (!empty($params['tanggal'])) {
            $query->andWhere(['t_kunjungan.tgl_kunjungan' => trim((string) $params['tanggal'])]);
        }
        if (!empty($params['status'])) {
            $query->andWhere(['t_kunjungan.status' => trim((string) $params['status'])]);
        }
        if (!empty($params['q'])) {
            $q = trim((string) $params['q']);
            $query->andWhere([
                'or',
                ['ilike', 't_kunjungan.no_kunjungan', $q],
                ['ilike', 'p.no_rm', $q],
                ['ilike', 'p.nama', $q],
            ]);
        }

        return array_map(fn (Kunjungan $row) => $row->toArray(), $query->all());
    }

    /**
     * Mengubah status antrean kunjungan dan mencatat perubahan ke t_kunjungan_status_log.
     *
     * @param int|null $dokterId dokter_id milik user login, null bila user tidak tertaut ke dokter.
     *
     * @throws NotFoundHttpException
     * @throws ForbiddenHttpException Bila user dokter mengubah kunjungan milik dokter lain.
     * @throws ConflictHttpException Bila kunjungan akan dibatalkan padahal resep sudah diserahkan atau sudah memiliki invoice.
     * @throws ValidationException
     *
     * Dipakai di: AntreanController::actionStatus().
     */
    public function ubahStatus(int $id, ?string $statusBaru, ?int $dokterId = null): Kunjungan
    {
        $target = trim((string) $statusBaru);
        if (!in_array($target, Kunjungan::STATUS_LIST, true)) {
            throw new ValidationException([
                'status' => ['Status harus salah satu dari: menunggu, diperiksa, selesai, batal.'],
            ]);
        }

        // Selesai dan batal adalah status akhir; membuka kembali kunjungan batal bisa bentrok dengan kunjungan aktif baru.
        $transisi = [
            Kunjungan::STATUS_MENUNGGU => [Kunjungan::STATUS_DIPERIKSA, Kunjungan::STATUS_BATAL],
            Kunjungan::STATUS_DIPERIKSA => [Kunjungan::STATUS_SELESAI, Kunjungan::STATUS_BATAL],
        ];

        // Baris dikunci lalu status dibaca ulang di dalam transaksi: perubahan paralel diproses bergiliran
        // sehingga transisi selalu dicek terhadap status terbaru (tidak ada lost update).
        $kunjungan = Yii::$app->db->transaction(function () use ($id, $target, $transisi, $dokterId) {
            /** @var Kunjungan|null $kunjungan */
            $kunjungan = Kunjungan::findBySql('SELECT * FROM t_kunjungan WHERE id = :id FOR UPDATE', [':id' => $id])->one();
            if ($kunjungan === null) {
                throw new NotFoundHttpException('Data kunjungan tidak ditemukan.');
            }
            if ($dokterId !== null && (int) $kunjungan->dokter_id !== $dokterId) {
                throw new ForbiddenHttpException('Kunjungan ini bukan pasien Anda.');
            }
            if ($kunjungan->status === $target) {
                return $kunjungan;
            }
            if (!in_array($target, $transisi[$kunjungan->status] ?? [], true)) {
                throw new ValidationException([
                    'status' => ["Status tidak dapat diubah dari {$kunjungan->status} menjadi {$target}."],
                ]);
            }
            if ($target === Kunjungan::STATUS_BATAL) {
                $adaResepDiserahkan = Resep::find()
                    ->where(['kunjungan_id' => $kunjungan->id, 'status' => Resep::STATUS_DISERAHKAN])
                    ->exists();
                if ($adaResepDiserahkan) {
                    throw new ConflictHttpException('Kunjungan tidak dapat dibatalkan karena resep obat sudah diserahkan.');
                }
                $adaInvoice = Invoice::find()
                    ->where(['kunjungan_id' => $kunjungan->id])
                    ->exists();
                if ($adaInvoice) {
                    throw new ConflictHttpException('Kunjungan tidak dapat dibatalkan karena sudah memiliki invoice.');
                }
            }

            $statusLama = $kunjungan->status;
            $userId = Yii::$app->has('user') ? Yii::$app->user->id : null;

            $kunjungan->status = $target;
            $kunjungan->save(false, ['status', 'updated_at', 'updated_by']);

            Yii::$app->db->createCommand()->insert('t_kunjungan_status_log', [
                'kunjungan_id' => $kunjungan->id,
                'status_lama' => $statusLama,
                'status_baru' => $target,
                'user_id' => $userId,
                'created_by' => $userId,
            ])->execute();

            return $kunjungan;
        });

        $kunjungan->refresh();

        return $kunjungan;
    }

    /**
     * Mengambil riwayat seluruh kunjungan untuk satu pasien, dari yang terbaru.
     *
     * @return array<int, array<string, mixed>>
     *
     * @throws NotFoundHttpException Bila pasien tidak ditemukan.
     *
     * Dipakai di: RiwayatKunjunganController::actionView().
     */
    public function riwayatPasien(int $pasienId): array
    {
        $exists = Pasien::findActive()->andWhere(['id' => $pasienId])->exists();
        if (!$exists) {
            throw new NotFoundHttpException('Pasien tidak ditemukan.');
        }

        $rows = Kunjungan::find()
            ->with(['pasien', 'poli', 'dokter', 'statusLogs'])
            ->where(['pasien_id' => $pasienId])
            ->orderBy(['tgl_kunjungan' => SORT_DESC, 'id' => SORT_DESC])
            ->all();

        return array_map(fn (Kunjungan $row) => $row->toArray(), $rows);
    }

    /**
     * Mengambil ringkasan antrean publik per poli untuk layar display ruang tunggu.
     * Nama pasien disamarkan dan tidak menyertakan NIK maupun nomor rekam medis.
     *
     * @param array<string, mixed> $params Filter opsional `tanggal` (YYYY-MM-DD) dan `poli_id`.
     * @return array<string, mixed>
     *
     * Dipakai di: AntreanController::actionDisplay().
     */
    public function display(array $params = []): array
    {
        $tanggal = !empty($params['tanggal']) ? trim((string) $params['tanggal']) : date('Y-m-d');
        $poliFilter = !empty($params['poli_id']) ? (int) $params['poli_id'] : null;

        /** @var Poli[] $allPoli */
        $allPoli = Poli::findActive()
            ->andWhere(['is_active' => true])
            ->orderBy(['nama' => SORT_ASC])
            ->all();

        $poliList = array_map(fn (Poli $p) => [
            'id' => (int) $p->id,
            'kode' => $p->kode,
            'nama' => $p->nama,
        ], $allPoli);

        $targetPoli = $poliFilter !== null
            ? array_values(array_filter($allPoli, fn (Poli $p) => (int) $p->id === $poliFilter))
            : $allPoli;

        $query = Kunjungan::find()
            ->with(['pasien', 'poli', 'dokter'])
            ->where(['tgl_kunjungan' => $tanggal])
            ->andWhere(['!=', 'status', Kunjungan::STATUS_BATAL])
            ->orderBy(['poli_id' => SORT_ASC, 'no_antrean' => SORT_ASC]);

        if ($poliFilter !== null) {
            $query->andWhere(['poli_id' => $poliFilter]);
        }

        /** @var Kunjungan[] $kunjunganList */
        $kunjunganList = $query->all();

        /** @var array<int, array<string, mixed>> $grouped */
        $grouped = [];
        foreach ($targetPoli as $p) {
            $grouped[(int) $p->id] = [
                'poli_id' => (int) $p->id,
                'poli_kode' => $p->kode,
                'poli_nama' => $p->nama,
                'sedang_diperiksa' => [],
                'menunggu' => [],
                'total_menunggu' => 0,
                'total_selesai' => 0,
            ];
        }

        foreach ($kunjunganList as $k) {
            $pid = (int) $k->poli_id;
            if (!isset($grouped[$pid])) {
                $grouped[$pid] = [
                    'poli_id' => $pid,
                    'poli_kode' => $k->poli->kode ?? 'POLI',
                    'poli_nama' => $k->poli->nama ?? '-',
                    'sedang_diperiksa' => [],
                    'menunggu' => [],
                    'total_menunggu' => 0,
                    'total_selesai' => 0,
                ];
            }

            if ($k->status === Kunjungan::STATUS_SELESAI) {
                $grouped[$pid]['total_selesai']++;
                continue;
            }

            $prefix = $k->poli->prefix_antrean ?? 'X';
            $entry = [
                'id' => (int) $k->id,
                'no_antrean' => (int) $k->no_antrean,
                'kode_antrean' => sprintf('%s-%03d', $prefix, (int) $k->no_antrean),
                'inisial_pasien' => self::maskNama($k->pasien->nama ?? ''),
                'dokter_nama' => $k->dokter->nama ?? '-',
                'status' => $k->status,
            ];

            if ($k->status === Kunjungan::STATUS_DIPERIKSA) {
                $grouped[$pid]['sedang_diperiksa'][] = $entry;
            } elseif ($k->status === Kunjungan::STATUS_MENUNGGU) {
                $grouped[$pid]['total_menunggu']++;
                if (count($grouped[$pid]['menunggu']) < 10) {
                    $grouped[$pid]['menunggu'][] = $entry;
                }
            }
        }

        return [
            'tanggal' => $tanggal,
            'updated_at' => date(DATE_ATOM),
            'poli_list' => $poliList,
            'poli' => array_values($grouped),
        ];
    }

    /**
     * Menyamarkan nama pasien menjadi inisial tiap kata agar aman ditampilkan di layar ruang tunggu.
     *
     * Dipakai di: AntreanService::display().
     */
    public static function maskNama(string $nama): string
    {
        $parts = preg_split('/\s+/', trim($nama)) ?: [];
        $masked = [];
        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }
            $first = mb_strtoupper(mb_substr($part, 0, 1));
            $masked[] = $first . '***';
        }

        return $masked === [] ? '-' : implode(' ', $masked);
    }
}
