<?php

namespace app\modules\master\jadwal;

use app\common\ActiveRecord;
use app\modules\master\dokter\Dokter;
use app\modules\master\poli\Poli;
use yii\db\ActiveQuery;

/**
 * Model tabel m_jadwal_dokter.
 * Mencegah tumpang tindih jam praktik untuk dokter yang sama pada hari yang sama.
 *
 * @property int $id
 * @property int $dokter_id
 * @property int $poli_id
 * @property int $hari
 * @property string $jam_mulai
 * @property string $jam_selesai
 * @property int $kuota
 * @property bool $is_active
 * @property Dokter $dokter
 * @property Poli $poli
 */
class JadwalDokter extends ActiveRecord
{
    public const NAMA_HARI = [
        1 => 'Senin',
        2 => 'Selasa',
        3 => 'Rabu',
        4 => 'Kamis',
        5 => 'Jumat',
        6 => 'Sabtu',
        7 => 'Minggu',
    ];

    public static function tableName(): string
    {
        return 'm_jadwal_dokter';
    }

    public function beforeValidate(): bool
    {
        if (is_string($this->hari)) {
            $map = [
                'senin' => 1, 'selasa' => 2, 'rabu' => 3, 'kamis' => 4,
                'jumat' => 5, 'sabtu' => 6, 'minggu' => 7,
            ];
            $lower = strtolower(trim($this->hari));
            if (isset($map[$lower])) {
                $this->hari = $map[$lower];
            }
        }

        return parent::beforeValidate();
    }

    public function rules(): array
    {
        return [
            [['dokter_id', 'poli_id', 'hari', 'jam_mulai', 'jam_selesai', 'kuota'], 'required'],
            [['jam_mulai', 'jam_selesai'], 'trim'],
            [['dokter_id', 'poli_id', 'hari', 'kuota'], 'integer'],
            [['dokter_id'], 'exist', 'targetClass' => Dokter::class, 'targetAttribute' => 'id', 'filter' => ['deleted_at' => null], 'message' => 'Dokter tidak ditemukan.'],
            [['poli_id'], 'exist', 'targetClass' => Poli::class, 'targetAttribute' => 'id', 'filter' => ['deleted_at' => null], 'message' => 'Poli tidak ditemukan.'],
            [['hari'], 'integer', 'min' => 1, 'max' => 7, 'message' => 'Hari harus antara 1 (Senin) sampai 7 (Minggu).', 'tooSmall' => 'Hari harus antara 1 (Senin) sampai 7 (Minggu).', 'tooBig' => 'Hari harus antara 1 (Senin) sampai 7 (Minggu).'],
            [['jam_mulai', 'jam_selesai'], 'match', 'pattern' => '/^(?:[01]\d|2[0-3]):[0-5]\d$/', 'message' => 'Format jam harus HH:MM (contoh 08:00).'],
            [['jam_selesai'], 'validateUrutanJam'],
            [['jam_mulai'], 'validateBentrok'],
            [['kuota'], 'integer', 'min' => 1, 'tooSmall' => 'Kuota minimal 1 pasien.'],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'dokter_id' => 'Dokter',
            'poli_id' => 'Poli',
            'hari' => 'Hari',
            'jam_mulai' => 'Jam mulai',
            'jam_selesai' => 'Jam selesai',
            'kuota' => 'Kuota',
            'is_active' => 'Status aktif',
        ];
    }

    /**
     * Memastikan jam selesai lebih besar daripada jam mulai.
     */
    public function validateUrutanJam(string $attribute): void
    {
        if ($this->hasErrors('jam_mulai') || $this->hasErrors('jam_selesai')) {
            return;
        }
        if ($this->jam_selesai <= $this->jam_mulai) {
            $this->addError($attribute, 'Jam selesai harus setelah jam mulai.');
        }
    }

    /**
     * Memastikan tidak ada jadwal aktif lain milik dokter yang sama di hari yang sama yang beririsan waktu.
     * Dua rentang [mulaiA, selesaiA) dan [mulaiB, selesaiB) beririsan bila mulaiA < selesaiB dan selesaiA > mulaiB.
     */
    public function validateBentrok(string $attribute): void
    {
        if ($this->hasErrors('dokter_id') || $this->hasErrors('hari') || $this->hasErrors('jam_mulai') || $this->hasErrors('jam_selesai')) {
            return;
        }

        // Kunci baris dokter agar dua simpan jadwal paralel untuk dokter yang sama diperiksa bergiliran
        // (dipanggil di dalam transaksi CrudService::save, lock bertahan sampai commit).
        static::getDb()->createCommand('SELECT id FROM m_dokter WHERE id = :id FOR UPDATE', [':id' => $this->dokter_id])->execute();

        $query = static::findActive()
            ->andWhere(['dokter_id' => $this->dokter_id, 'hari' => $this->hari])
            ->andWhere(['<', 'jam_mulai', $this->jam_selesai])
            ->andWhere(['>', 'jam_selesai', $this->jam_mulai]);

        if (!$this->isNewRecord) {
            $query->andWhere(['<>', 'id', $this->id]);
        }

        if ($query->exists()) {
            $this->addError($attribute, 'Jadwal praktik dokter bentrok dengan jadwal lain di hari yang sama.');
        }
    }

    public function getDokter(): ActiveQuery
    {
        return $this->hasOne(Dokter::class, ['id' => 'dokter_id']);
    }

    public function getPoli(): ActiveQuery
    {
        return $this->hasOne(Poli::class, ['id' => 'poli_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['hari'] = fn () => (int) $this->hari;
        $fields['hari_nama'] = fn () => self::NAMA_HARI[(int) $this->hari] ?? null;
        $fields['kuota'] = fn () => (int) $this->kuota;
        $fields['dokter'] = fn () => $this->dokter ? [
            'id' => $this->dokter->id,
            'kode' => $this->dokter->kode,
            'nama' => $this->dokter->nama,
            'spesialis' => $this->dokter->spesialis,
        ] : null;
        $fields['poli'] = fn () => $this->poli ? [
            'id' => $this->poli->id,
            'kode' => $this->poli->kode,
            'nama' => $this->poli->nama,
        ] : null;

        return $fields;
    }
}
