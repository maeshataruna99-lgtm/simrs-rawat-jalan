<?php

namespace app\modules\transaction\resep;

use app\common\ActiveRecord;
use app\modules\master\obat\Obat;
use yii\db\ActiveQuery;

/**
 * Model tabel t_resep_detail: satu obat dalam resep beserta dosis, jumlah, dan snapshot harga.
 *
 * @property int $id
 * @property int $resep_id
 * @property int $obat_id
 * @property string $dosis
 * @property string $frekuensi
 * @property int $jumlah
 * @property string $harga
 * @property string $subtotal
 * @property Obat $obat
 */
class ResepDetail extends ActiveRecord
{
    public static function tableName(): string
    {
        return 't_resep_detail';
    }

    public function getObat(): ActiveQuery
    {
        return $this->hasOne(Obat::class, ['id' => 'obat_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['jumlah'] = fn () => (int) $this->jumlah;
        $fields['harga'] = fn () => (float) $this->harga;
        $fields['subtotal'] = fn () => (float) $this->subtotal;
        $fields['obat'] = fn () => $this->obat
            ? ['id' => $this->obat->id, 'kode' => $this->obat->kode, 'nama' => $this->obat->nama, 'satuan' => $this->obat->satuan, 'stok' => (int) $this->obat->stok]
            : null;

        return $fields;
    }
}
