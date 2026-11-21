<?php

namespace app\modules\transaction\lab;

use app\common\ActiveRecord;
use app\modules\master\dokter\Dokter;
use app\modules\transaction\pendaftaran\Kunjungan;
use yii\db\ActiveQuery;

/**
 * Model tabel t_order_lab: permintaan pemeriksaan laboratorium dari dokter untuk satu kunjungan.
 *
 * @property int $id
 * @property string $no_order
 * @property int $kunjungan_id
 * @property int $dokter_id
 * @property string $status
 * @property string|null $catatan_klinis
 * @property OrderLabDetail[] $details
 * @property Kunjungan $kunjungan
 * @property Dokter $dokter
 */
class OrderLab extends ActiveRecord
{
    public const STATUS_DIMINTA = 'diminta';
    public const STATUS_DIPROSES = 'diproses';
    public const STATUS_SELESAI = 'selesai';

    public static function tableName(): string
    {
        return 't_order_lab';
    }

    public function getDetails(): ActiveQuery
    {
        return $this->hasMany(OrderLabDetail::class, ['order_id' => 'id'])->orderBy(['id' => SORT_ASC]);
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
        $fields['details'] = fn () => array_map(fn (OrderLabDetail $d) => $d->toArray(), $this->details);
        $fields['total'] = fn () => (float) array_sum(array_map(fn (OrderLabDetail $d) => $d->tarif, $this->details));
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
