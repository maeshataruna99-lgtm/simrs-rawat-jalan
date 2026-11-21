<?php

namespace app\modules\transaction\lab;

use app\common\ActiveRecord;
use app\modules\master\lab\PemeriksaanLab;
use yii\db\ActiveQuery;

/**
 * Model tabel t_order_lab_detail: satu pemeriksaan dalam order beserta snapshot tarif, nilai rujukan, dan hasilnya.
 *
 * @property int $id
 * @property int $order_id
 * @property int $pemeriksaan_lab_id
 * @property string $tarif
 * @property string|null $hasil
 * @property string|null $satuan
 * @property string|null $nilai_rujukan
 * @property string|null $flag
 * @property string|null $idempotency_key
 * @property int|null $diinput_oleh
 * @property string|null $diinput_at
 * @property PemeriksaanLab $pemeriksaan
 */
class OrderLabDetail extends ActiveRecord
{
    public static function tableName(): string
    {
        return 't_order_lab_detail';
    }

    public function getPemeriksaan(): ActiveQuery
    {
        return $this->hasOne(PemeriksaanLab::class, ['id' => 'pemeriksaan_lab_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        unset($fields['idempotency_key']);
        $fields['tarif'] = fn () => (float) $this->tarif;
        $fields['pemeriksaan'] = fn () => $this->pemeriksaan
            ? ['id' => $this->pemeriksaan->id, 'kode' => $this->pemeriksaan->kode, 'nama' => $this->pemeriksaan->nama]
            : null;

        return $fields;
    }
}
