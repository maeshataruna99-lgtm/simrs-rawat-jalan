<?php

namespace app\modules\transaction\pendaftaran;

use app\common\ActiveRecord;
use app\modules\master\dokter\Dokter;
use app\modules\master\jadwal\JadwalDokter;
use app\modules\master\pasien\Pasien;
use app\modules\master\poli\Poli;
use yii\db\ActiveQuery;

/**
 * Model tabel t_kunjungan: transaksi pendaftaran kunjungan dan nomor antrean pasien rawat jalan.
 *
 * @property int $id
 * @property string $no_kunjungan
 * @property int $pasien_id
 * @property int $poli_id
 * @property int $dokter_id
 * @property int $jadwal_id
 * @property string $tgl_kunjungan
 * @property int $no_antrean
 * @property string $status
 * @property string $created_at
 * @property string|null $updated_at
 * @property Pasien $pasien
 * @property Poli $poli
 * @property Dokter $dokter
 * @property JadwalDokter $jadwal
 */
class Kunjungan extends ActiveRecord
{
    public const STATUS_MENUNGGU = 'menunggu';
    public const STATUS_DIPERIKSA = 'diperiksa';
    public const STATUS_SELESAI = 'selesai';
    public const STATUS_BATAL = 'batal';

    public const STATUS_LIST = [
        self::STATUS_MENUNGGU,
        self::STATUS_DIPERIKSA,
        self::STATUS_SELESAI,
        self::STATUS_BATAL,
    ];

    public static function tableName(): string
    {
        return 't_kunjungan';
    }

    public function rules(): array
    {
        return [
            [['pasien_id', 'jadwal_id', 'tgl_kunjungan'], 'required'],
            [['pasien_id', 'poli_id', 'dokter_id', 'jadwal_id', 'no_antrean'], 'integer'],
            [['tgl_kunjungan'], 'date', 'format' => 'php:Y-m-d', 'message' => 'Format tanggal kunjungan harus YYYY-MM-DD.'],
            [['status'], 'in', 'range' => self::STATUS_LIST],
            [['status'], 'default', 'value' => self::STATUS_MENUNGGU],
        ];
    }

    public function getPasien(): ActiveQuery
    {
        return $this->hasOne(Pasien::class, ['id' => 'pasien_id']);
    }

    public function getPoli(): ActiveQuery
    {
        return $this->hasOne(Poli::class, ['id' => 'poli_id']);
    }

    public function getDokter(): ActiveQuery
    {
        return $this->hasOne(Dokter::class, ['id' => 'dokter_id']);
    }

    public function getJadwal(): ActiveQuery
    {
        return $this->hasOne(JadwalDokter::class, ['id' => 'jadwal_id']);
    }

    public function getStatusLogs(): ActiveQuery
    {
        return $this->hasMany(KunjunganStatusLog::class, ['kunjungan_id' => 'id'])->orderBy(['id' => SORT_ASC]);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['no_antrean'] = fn () => (int) $this->no_antrean;
        $fields['pasien'] = fn () => $this->pasien ? [
            'id' => $this->pasien->id,
            'no_rm' => $this->pasien->no_rm,
            'nik' => $this->pasien->nik,
            'nama' => $this->pasien->nama,
            'tgl_lahir' => $this->pasien->tgl_lahir,
            'jenis_kelamin' => $this->pasien->jenis_kelamin,
        ] : null;
        $fields['poli'] = fn () => $this->poli ? [
            'id' => $this->poli->id,
            'kode' => $this->poli->kode,
            'nama' => $this->poli->nama,
            'tarif_pendaftaran' => (float) $this->poli->tarif_pendaftaran,
        ] : null;
        $fields['dokter'] = fn () => $this->dokter ? [
            'id' => $this->dokter->id,
            'kode' => $this->dokter->kode,
            'nama' => $this->dokter->nama,
            'spesialis' => $this->dokter->spesialis,
        ] : null;
        $fields['status_logs'] = fn () => array_map(fn (KunjunganStatusLog $log) => $log->toArray(), $this->statusLogs);

        return $fields;
    }
}
