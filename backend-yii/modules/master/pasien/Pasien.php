<?php

namespace app\modules\master\pasien;

use app\common\ActiveRecord;

/**
 * Model tabel m_pasien.
 * Nomor rekam medis (no_rm) diisi otomatis oleh PasienService saat pasien baru didaftarkan.
 *
 * @property int $id
 * @property string $no_rm
 * @property string $nik
 * @property string $nama
 * @property string $tgl_lahir
 * @property string $jenis_kelamin
 * @property string|null $alamat
 * @property string|null $no_hp
 */
class Pasien extends ActiveRecord
{
    public static function tableName(): string
    {
        return 'm_pasien';
    }

    public function rules(): array
    {
        return [
            [['nik', 'nama', 'tgl_lahir', 'jenis_kelamin'], 'required'],
            [['nik', 'nama', 'alamat', 'no_hp'], 'trim'],
            [['nik'], 'match', 'pattern' => '/^\d{16}$/', 'message' => 'NIK harus terdiri dari 16 digit angka.'],
            [['nama'], 'string', 'max' => 100],
            [['tgl_lahir'], 'date', 'format' => 'php:Y-m-d', 'message' => 'Format tanggal lahir harus YYYY-MM-DD.',
                'max' => date('Y-m-d'), 'tooBig' => 'Tanggal lahir tidak boleh melebihi hari ini.'],
            [['jenis_kelamin'], 'in', 'range' => ['L', 'P'], 'message' => 'Jenis kelamin harus L atau P.'],
            [['alamat'], 'string'],
            [['no_hp'], 'string', 'max' => 20],
            [['no_hp'], 'match', 'pattern' => '/^\+?[0-9]{8,15}$/', 'message' => 'No. HP harus 8-15 digit angka.'],
            [['alamat', 'no_hp'], 'default', 'value' => null],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'no_rm' => 'No. RM',
            'nik' => 'NIK',
            'nama' => 'Nama pasien',
            'tgl_lahir' => 'Tanggal lahir',
            'jenis_kelamin' => 'Jenis kelamin',
            'alamat' => 'Alamat',
            'no_hp' => 'No. HP',
        ];
    }
}
