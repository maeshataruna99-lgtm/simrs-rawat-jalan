<?php

namespace app\modules\master\obat;

use app\common\ActiveRecord;

/**
 * Model tabel m_obat.
 * Kolom stok tidak dimasukkan ke dalam rules() agar tidak dapat diubah melalui CRUD biasa,
 * melainkan hanya melalui ObatService::sesuaikanStok() atau penyerahan resep farmasi.
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property string $satuan
 * @property float|string $harga
 * @property int $stok
 * @property bool $is_active
 */
class Obat extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'm_obat';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama', 'satuan', 'harga'], 'required'],
            [['kode', 'nama', 'satuan'], 'trim'],
            [['kode', 'satuan'], 'string', 'max' => 30],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode sudah dipakai.'],
            [['nama'], 'string', 'max' => 150],
            [['harga'], 'number', 'min' => 0, 'message' => 'Harga harus berupa angka.', 'tooSmall' => 'Harga tidak boleh kurang dari 0.'],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'kode' => 'Kode',
            'nama' => 'Nama obat',
            'satuan' => 'Satuan',
            'harga' => 'Harga',
            'stok' => 'Stok',
            'is_active' => 'Status aktif',
        ];
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['harga'] = fn () => (float) $this->harga;
        $fields['stok'] = fn () => (int) $this->stok;

        return $fields;
    }
}
