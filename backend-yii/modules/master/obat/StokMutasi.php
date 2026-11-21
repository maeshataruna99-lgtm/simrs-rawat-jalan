<?php

namespace app\modules\master\obat;

use app\common\ActiveRecord;

/**
 * Model tabel t_stok_mutasi: catatan setiap perubahan stok obat (masuk, keluar, penyesuaian).
 *
 * @property int $id
 * @property int $obat_id
 * @property string $jenis
 * @property int $qty
 * @property int $stok_sebelum
 * @property int $stok_sesudah
 * @property string|null $referensi
 * @property string $created_at
 */
class StokMutasi extends ActiveRecord
{
    public static function tableName(): string
    {
        return 't_stok_mutasi';
    }

    public function fields(): array
    {
        return [
            'id' => fn () => (int) $this->id,
            'obat_id' => fn () => (int) $this->obat_id,
            'jenis' => 'jenis',
            'qty' => fn () => (int) $this->qty,
            'stok_sebelum' => fn () => (int) $this->stok_sebelum,
            'stok_sesudah' => fn () => (int) $this->stok_sesudah,
            'referensi' => 'referensi',
            'created_at' => 'created_at',
        ];
    }
}
