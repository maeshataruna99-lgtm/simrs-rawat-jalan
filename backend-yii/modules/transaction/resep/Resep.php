<?php

namespace app\modules\transaction\resep;

use app\common\ActiveRecord;
use app\modules\master\dokter\Dokter;
use app\modules\transaction\pendaftaran\Kunjungan;
use yii\db\ActiveQuery;

/**
 * Model tabel t_resep: resep obat yang dibuat dokter untuk satu kunjungan.
 *
 * @property int $id
 * @property string $no_resep
 * @property int $kunjungan_id
 * @property int $dokter_id
 * @property string $status
 * @property string|null $catatan
 * @property int|null $diserahkan_oleh
 * @property string|null $diserahkan_at
 * @property ResepDetail[] $details
 * @property Kunjungan $kunjungan
 * @property Dokter $dokter
 */
class Resep extends ActiveRecord
{
    public const STATUS_BARU = 'baru';
    public const STATUS_DIPROSES = 'diproses';
    public const STATUS_DISERAHKAN = 'diserahkan';
    public const STATUS_BATAL = 'batal';

    public static function tableName(): string
    {
        return 't_resep';
    }

    public function getDetails(): ActiveQuery
    {
        return $this->hasMany(ResepDetail::class, ['resep_id' => 'id'])->orderBy(['id' => SORT_ASC]);
    }

    public function getKunjungan(): ActiveQuery
    {
        return $this->hasOne(Kunjungan::class, ['id' => 'kunjungan_id']);
    }

    public function getDokter(): ActiveQuery
    {
        return $this->hasOne(Dokter::class, ['id' => 'dokter_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['details'] = fn () => array_map(fn (ResepDetail $d) => $d->toArray(), $this->details);
        $fields['total'] = fn () => (float) array_sum(array_map(fn (ResepDetail $d) => $d->subtotal, $this->details));
        $fields['dokter'] = fn () => $this->dokter ? ['id' => $this->dokter->id, 'nama' => $this->dokter->nama] : null;
        $fields['pasien'] = fn () => $this->kunjungan?->pasien
            ? ['id' => $this->kunjungan->pasien->id, 'no_rm' => $this->kunjungan->pasien->no_rm, 'nama' => $this->kunjungan->pasien->nama]
            : null;
        $fields['poli'] = fn () => $this->kunjungan?->poli
            ? ['id' => $this->kunjungan->poli->id, 'nama' => $this->kunjungan->poli->nama]
            : null;

        return $fields;
    }
}
