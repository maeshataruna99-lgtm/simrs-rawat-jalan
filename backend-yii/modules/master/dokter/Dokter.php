<?php

namespace app\modules\master\dokter;

use app\common\ActiveRecord;

/**
 * Model tabel m_dokter: data dokter dan tenaga medis (perawat, analis, apoteker).
 *
 * @property int $id
 * @property string $kode
 * @property string $nama
 * @property string $sip
 * @property string|null $spesialis
 * @property string $jenis_tenaga
 * @property bool $is_active
 */
class Dokter extends ActiveRecord
{
    public const JENIS_TENAGA = ['dokter', 'perawat', 'analis', 'apoteker'];

    public static function tableName(): string
    {
        return 'm_dokter';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama', 'sip', 'jenis_tenaga'], 'required'],
            [['kode', 'nama', 'sip', 'spesialis'], 'trim'],
            [['kode'], 'string', 'max' => 30],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode sudah dipakai.'],
            [['nama', 'spesialis'], 'string', 'max' => 100],
            [['sip'], 'string', 'max' => 50],
            [['sip'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Nomor SIP sudah terdaftar.'],
            [['jenis_tenaga'], 'in', 'range' => self::JENIS_TENAGA, 'message' => 'Jenis tenaga harus dokter, perawat, analis, atau apoteker.'],
            [['spesialis'], 'default', 'value' => null],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'kode' => 'Kode',
            'nama' => 'Nama',
            'sip' => 'Nomor SIP',
            'spesialis' => 'Spesialis',
            'jenis_tenaga' => 'Jenis tenaga',
            'is_active' => 'Status aktif',
        ];
    }
}
