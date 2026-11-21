<?php

namespace app\modules\transaction\pendaftaran;

use app\common\SequenceService;
use app\common\ValidationException;
use app\modules\master\jadwal\JadwalDokter;
use app\modules\master\pasien\Pasien;
use DateTimeImmutable;
use Yii;
use yii\db\IntegrityException;
use yii\web\ConflictHttpException;

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
     * Dipakai di: PendaftaranController::actionCariPasien(), RiwayatMedisController::actionCariPasien().
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

    /**
     * Mendaftarkan kunjungan rawat jalan dan menerbitkan nomor antrean dalam satu transaksi database.
     * Counter antrean dikunci dengan SELECT ... FOR UPDATE per poli, dokter, dan tanggal (Pengaman D.1).
     *
     * @param array<string, mixed> $data Data pendaftaran (pasien_id, jadwal_id, tgl_kunjungan opsional).
     *
     * @throws ValidationException Bila input tidak valid, di luar hari jadwal, atau kuota penuh.
     * @throws ConflictHttpException Bila pasien sudah memiliki kunjungan aktif pada poli dan tanggal yang sama.
     *
     * Dipakai di: PendaftaranController::actionCreate().
     */
    public function daftar(array $data): Kunjungan
    {
        $pasienId = filter_var($data['pasien_id'] ?? null, FILTER_VALIDATE_INT);
        $jadwalId = filter_var($data['jadwal_id'] ?? null, FILTER_VALIDATE_INT);
        $tglKunjungan = trim((string) ($data['tgl_kunjungan'] ?? date('Y-m-d')));

        $errors = [];
        if ($pasienId === false || $pasienId <= 0) {
            $errors['pasien_id'] = ['Pasien wajib dipilih.'];
        }
        if ($jadwalId === false || $jadwalId <= 0) {
            $errors['jadwal_id'] = ['Jadwal praktik wajib dipilih.'];
        }
        $dateObj = DateTimeImmutable::createFromFormat('!Y-m-d', $tglKunjungan);
        if (!$dateObj || $dateObj->format('Y-m-d') !== $tglKunjungan) {
            $errors['tgl_kunjungan'] = ['Format tanggal kunjungan harus YYYY-MM-DD.'];
        } elseif ($tglKunjungan < date('Y-m-d')) {
            $errors['tgl_kunjungan'] = ['Tanggal kunjungan tidak boleh sebelum hari ini.'];
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $pasien = Pasien::findActive()->andWhere(['id' => $pasienId])->one();
        if ($pasien === null) {
            throw new ValidationException(['pasien_id' => ['Pasien tidak ditemukan.']]);
        }

        /** @var JadwalDokter|null $jadwal */
        $jadwal = JadwalDokter::findActive()->andWhere(['id' => $jadwalId, 'is_active' => true])->one();
        if ($jadwal === null) {
            throw new ValidationException(['jadwal_id' => ['Jadwal praktik dokter tidak ditemukan atau nonaktif.']]);
        }

        if (!empty($data['poli_id']) && (int) $data['poli_id'] !== (int) $jadwal->poli_id) {
            throw new ValidationException(['poli_id' => ['Poli tidak sesuai dengan jadwal praktik.']]);
        }
        if (!empty($data['dokter_id']) && (int) $data['dokter_id'] !== (int) $jadwal->dokter_id) {
            throw new ValidationException(['dokter_id' => ['Dokter tidak sesuai dengan jadwal praktik.']]);
        }

        $hariKunjungan = (int) $dateObj->format('N');
        if ((int) $jadwal->hari !== $hariKunjungan) {
            throw new ValidationException([
                'tgl_kunjungan' => ['Tanggal kunjungan tidak sesuai dengan hari jadwal praktik dokter.'],
            ]);
        }

        try {
            /** @var Kunjungan $kunjungan */
            $kunjungan = Yii::$app->db->transaction(function () use ($pasien, $jadwal, $tglKunjungan) {
                $db = Yii::$app->db;

                // Kunci baris jadwal agar pengecekan kuota dan penerbitan antrean pada jadwal yang sama berjalan serial.
                $db->createCommand(
                    'SELECT id FROM m_jadwal_dokter WHERE id = :id FOR UPDATE',
                    [':id' => $jadwal->id]
                )->queryScalar();

                $alreadyRegistered = Kunjungan::find()
                    ->where([
                        'pasien_id' => $pasien->id,
                        'poli_id' => $jadwal->poli_id,
                        'tgl_kunjungan' => $tglKunjungan,
                    ])
                    ->andWhere(['<>', 'status', Kunjungan::STATUS_BATAL])
                    ->exists();

                if ($alreadyRegistered) {
                    throw new ConflictHttpException(
                        'Pasien sudah memiliki kunjungan aktif pada poli dan tanggal yang sama.'
                    );
                }

                $terdaftarCount = (int) Kunjungan::find()
                    ->where([
                        'jadwal_id' => $jadwal->id,
                        'tgl_kunjungan' => $tglKunjungan,
                    ])
                    ->andWhere(['<>', 'status', Kunjungan::STATUS_BATAL])
                    ->count();

                if ($terdaftarCount >= (int) $jadwal->kuota) {
                    throw new ValidationException([
                        'jadwal_id' => ['Kuota jadwal praktik dokter pada tanggal tersebut sudah penuh.'],
                    ]);
                }

                $noAntrean = SequenceService::next(
                    "ANTREAN:{$jadwal->poli_id}:{$jadwal->dokter_id}",
                    $tglKunjungan
                );
                $ymd = str_replace('-', '', $tglKunjungan);
                $noKunjungan = SequenceService::nextFormatted('KUNJUNGAN', $ymd, "RJ{$ymd}", 4);

                $penjaminRaw = $data['penjamin'] ?? 'umum';
                $penjamin = is_string($penjaminRaw) && in_array($penjaminRaw, ['umum', 'bpjs', 'asuransi'], true)
                    ? $penjaminRaw
                    : 'umum';

                $model = new Kunjungan([
                    'no_kunjungan' => $noKunjungan,
                    'pasien_id' => $pasien->id,
                    'poli_id' => $jadwal->poli_id,
                    'dokter_id' => $jadwal->dokter_id,
                    'jadwal_id' => $jadwal->id,
                    'tgl_kunjungan' => $tglKunjungan,
                    'no_antrean' => $noAntrean,
                    'status' => Kunjungan::STATUS_MENUNGGU,
                    'penjamin' => $penjamin,
                ]);

                if (!$model->save(false)) {
                    throw new ValidationException($model->getErrors());
                }

                $userId = Yii::$app->has('user') ? Yii::$app->user->id : null;
                $db->createCommand()->insert('t_kunjungan_status_log', [
                    'kunjungan_id' => $model->id,
                    'status_lama' => null,
                    'status_baru' => Kunjungan::STATUS_MENUNGGU,
                    'user_id' => $userId,
                    'created_by' => $userId,
                ])->execute();

                return $model;
            });
        } catch (IntegrityException) {
            throw new ConflictHttpException(
                'Pasien sudah memiliki kunjungan aktif pada poli dan tanggal yang sama.'
            );
        }

        return $kunjungan;
    }
}
