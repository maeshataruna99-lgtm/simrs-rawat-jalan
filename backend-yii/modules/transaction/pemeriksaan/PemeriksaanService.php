<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ValidationException;
use app\modules\master\icd10\Icd10;
use app\modules\master\pasien\Pasien;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pendaftaran\Kunjungan;
use app\modules\transaction\resep\ResepService;
use app\modules\transaction\tindakan\TindakanKunjunganService;
use Yii;
use yii\web\ConflictHttpException;
use yii\web\ForbiddenHttpException;
use yii\web\NotFoundHttpException;

/**
 * Service pemeriksaan dokter: worklist pasien, anamnesis, tanda vital, pemeriksaan fisik, dan diagnosis ICD-10.
 *
 * Dipakai di: PemeriksaanController, DiagnosisController, RiwayatMedisController.
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

    /**
     * Data kunjungan beserta hasil pemeriksaannya (null bila belum diperiksa) untuk form pemeriksaan.
     *
     * @return array<string, mixed>
     *
     * Dipakai di: PemeriksaanController::actionView().
     */
    public function detail(int $kunjunganId, ?int $dokterId): array
    {
        $kunjungan = $this->kunjunganMilik($kunjunganId, $dokterId);
        $pemeriksaan = Pemeriksaan::findOne(['kunjungan_id' => $kunjunganId]);

        return [
            'kunjungan' => $kunjungan->toArray(),
            'pemeriksaan' => $pemeriksaan?->toArray(),
            'diagnosis' => $this->daftarDiagnosis($kunjunganId),
        ];
    }

    /**
     * Menyimpan (membuat atau memperbarui) anamnesis, tanda vital, dan pemeriksaan fisik.
     * Kunjungan yang masih menunggu otomatis berubah menjadi diperiksa dan tercatat di log status.
     *
     * @param array<string, mixed> $data Isian form, hanya kolom Pemeriksaan::FORM_FIELDS yang dipakai.
     *
     * @throws ValidationException Bila isian atau range tanda vital tidak valid.
     * @throws ConflictHttpException Bila kunjungan sudah selesai atau batal.
     *
     * Dipakai di: PemeriksaanController::actionUpdate().
     */
    public function simpan(int $kunjunganId, array $data, ?int $dokterId): Pemeriksaan
    {
        $kunjungan = $this->kunjunganMilik($kunjunganId, $dokterId);
        if (!in_array($kunjungan->status, [Kunjungan::STATUS_MENUNGGU, Kunjungan::STATUS_DIPERIKSA], true)) {
            throw new ConflictHttpException("Kunjungan berstatus {$kunjungan->status} tidak dapat diubah.");
        }

        $model = Pemeriksaan::findOne(['kunjungan_id' => $kunjunganId])
            ?? new Pemeriksaan(['kunjungan_id' => $kunjunganId, 'dokter_id' => $kunjungan->dokter_id]);
        $model->setAttributes(array_intersect_key($data, array_flip(Pemeriksaan::FORM_FIELDS)), false);
        if (!$model->validate()) {
            throw new ValidationException($model->getErrors());
        }

        Yii::$app->db->transaction(function () use ($model, $kunjungan) {
            $model->save(false);
            if ($kunjungan->status === Kunjungan::STATUS_MENUNGGU) {
                (new AntreanService())->ubahStatus($kunjungan->id, Kunjungan::STATUS_DIPERIKSA);
            }
        });

        return $model;
    }

    /**
     * Mengganti seluruh diagnosis kunjungan dengan daftar baru: wajib tepat satu utama, sekunder boleh banyak.
     *
     * @param mixed $items Daftar [{icd10_id, jenis}] dari request.
     * @return array<int, array<string, mixed>> Diagnosis tersimpan, utama lebih dulu.
     *
     * @throws ValidationException Bila jumlah diagnosis utama bukan satu, ICD-10 tidak ada, atau ganda.
     * @throws ConflictHttpException Bila kunjungan sudah batal.
     *
     * Dipakai di: DiagnosisController::actionUpdate().
     */
    public function simpanDiagnosis(int $kunjunganId, mixed $items, ?int $dokterId): array
    {
        $kunjungan = $this->kunjunganMilik($kunjunganId, $dokterId);
        if ($kunjungan->status === Kunjungan::STATUS_BATAL) {
            throw new ConflictHttpException('Kunjungan batal tidak dapat diberi diagnosis.');
        }

        $items = is_array($items) ? array_values($items) : [];
        $ids = [];
        $utama = 0;
        foreach ($items as $i => $item) {
            $item = is_array($item) ? $item : [];
            $icd10Id = filter_var($item['icd10_id'] ?? null, FILTER_VALIDATE_INT);
            $jenis = $item['jenis'] ?? null;
            if ($icd10Id === false || !in_array($jenis, [Diagnosis::JENIS_UTAMA, Diagnosis::JENIS_SEKUNDER], true)) {
                throw new ValidationException(["diagnosis.{$i}" => ['ICD-10 dan jenis (utama/sekunder) wajib diisi.']]);
            }
            $ids[] = $icd10Id;
            $utama += $jenis === Diagnosis::JENIS_UTAMA ? 1 : 0;
        }
        if ($utama !== 1) {
            throw new ValidationException(['diagnosis' => ['Wajib tepat satu diagnosis utama.']]);
        }
        if (count(array_unique($ids)) !== count($ids)) {
            throw new ValidationException(['diagnosis' => ['Kode ICD-10 tidak boleh dipilih lebih dari sekali.']]);
        }
        if ((int) Icd10::findActive()->andWhere(['id' => $ids, 'is_active' => true])->count() !== count($ids)) {
            throw new ValidationException(['diagnosis' => ['Kode ICD-10 tidak ditemukan.']]);
        }

        Yii::$app->db->transaction(function () use ($kunjunganId, $items) {
            Diagnosis::deleteAll(['kunjungan_id' => $kunjunganId]);
            foreach ($items as $item) {
                (new Diagnosis([
                    'kunjungan_id' => $kunjunganId,
                    'icd10_id' => (int) $item['icd10_id'],
                    'jenis' => $item['jenis'],
                ]))->save(false);
            }
        });

        return $this->daftarDiagnosis($kunjunganId);
    }

    /**
     * Riwayat rekam medis pasien: setiap kunjungan yang tidak batal beserta pemeriksaan, diagnosis, tindakan aktif, dan resep, terbaru dulu.
     *
     * @return array<int, array<string, mixed>>
     *
     * @throws NotFoundHttpException Bila pasien tidak ditemukan.
     *
     * Dipakai di: RiwayatMedisController::actionView().
     */
    public function riwayatMedis(int $pasienId): array
    {
        if (!Pasien::findActive()->andWhere(['id' => $pasienId])->exists()) {
            throw new NotFoundHttpException('Pasien tidak ditemukan.');
        }

        $kunjungan = Kunjungan::find()->with(['poli', 'dokter'])
            ->where(['pasien_id' => $pasienId])
            ->andWhere(['<>', 'status', Kunjungan::STATUS_BATAL])
            ->orderBy(['tgl_kunjungan' => SORT_DESC, 'id' => SORT_DESC])
            ->all();
        $ids = array_map(fn (Kunjungan $k) => $k->id, $kunjungan);

        $pemeriksaan = Pemeriksaan::find()->where(['kunjungan_id' => $ids])->indexBy('kunjungan_id')->all();
        $diagnosis = [];
        $rows = Diagnosis::find()->with('icd10')->where(['kunjungan_id' => $ids])
            ->orderBy(['jenis' => SORT_DESC, 'id' => SORT_ASC])->all();
        foreach ($rows as $d) {
            $diagnosis[$d->kunjungan_id][] = $d->toArray();
        }
        $tindakan = (new TindakanKunjunganService())->itemsPerKunjungan($ids, true);
        $resep = (new ResepService())->resepPerKunjungan($ids);

        return array_map(fn (Kunjungan $k) => [
            'kunjungan' => $k->toArray(['id', 'no_kunjungan', 'tgl_kunjungan', 'status', 'poli', 'dokter']),
            'pemeriksaan' => isset($pemeriksaan[$k->id]) ? $pemeriksaan[$k->id]->toArray() : null,
            'diagnosis' => $diagnosis[$k->id] ?? [],
            'tindakan' => $tindakan[$k->id] ?? [],
            'resep' => $resep[$k->id] ?? [],
        ], $kunjungan);
    }

    /**
     * Diagnosis satu kunjungan, utama lebih dulu.
     *
     * @return array<int, array<string, mixed>>
     */
    private function daftarDiagnosis(int $kunjunganId): array
    {
        $rows = Diagnosis::find()->with('icd10')->where(['kunjungan_id' => $kunjunganId])
            ->orderBy(['jenis' => SORT_DESC, 'id' => SORT_ASC])->all();

        return array_map(fn (Diagnosis $d) => $d->toArray(), $rows);
    }

    /**
     * Mengambil kunjungan dan memastikan user dokter hanya membuka kunjungan pasiennya sendiri.
     *
     * @throws NotFoundHttpException
     * @throws ForbiddenHttpException
     *
     * Dipakai di: method service ini, TindakanKunjunganService.
     */
    public function kunjunganMilik(int $kunjunganId, ?int $dokterId): Kunjungan
    {
        $kunjungan = Kunjungan::findOne($kunjunganId);
        if ($kunjungan === null) {
            throw new NotFoundHttpException('Data kunjungan tidak ditemukan.');
        }
        if ($dokterId !== null && (int) $kunjungan->dokter_id !== $dokterId) {
            throw new ForbiddenHttpException('Kunjungan ini bukan pasien Anda.');
        }

        return $kunjungan;
    }
}
