<?php

namespace app\modules\transaction\pemeriksaan;

use app\common\ActiveRecord;
use app\common\AuditLogBehavior;

/**
 * Model tabel t_pemeriksaan: anamnesis, tanda vital, dan pemeriksaan fisik satu kunjungan.
 * Batas tanda vital sama dengan check constraint di migrasi.
 *
 * @property int $id
 * @property int $kunjungan_id
 * @property int $dokter_id
 * @property string|null $keluhan_utama
 * @property string|null $anamnesis
 * @property int|null $td_sistolik
 * @property int|null $td_diastolik
 * @property int|null $nadi
 * @property string|null $suhu
 * @property int|null $respirasi
 * @property int|null $spo2
 * @property string|null $berat_badan
 * @property string|null $tinggi_badan
 * @property string|null $pemeriksaan_fisik
 */
class Pemeriksaan extends ActiveRecord
{
    /** Kolom yang boleh diisi dari form pemeriksaan. */
    public const FORM_FIELDS = [
        'keluhan_utama', 'anamnesis', 'td_sistolik', 'td_diastolik', 'nadi', 'suhu',
        'respirasi', 'spo2', 'berat_badan', 'tinggi_badan', 'pemeriksaan_fisik',
    ];

    public static function tableName(): string
    {
        return 't_pemeriksaan';
    }

    public function behaviors(): array
    {
        return array_merge(parent::behaviors(), [
            'auditLog' => AuditLogBehavior::class,
        ]);
    }

    public function rules(): array
    {
        return [
            [['keluhan_utama'], 'required', 'message' => 'Keluhan utama wajib diisi.'],
            [['keluhan_utama', 'anamnesis', 'pemeriksaan_fisik'], 'string'],
            [['keluhan_utama', 'anamnesis', 'pemeriksaan_fisik'], 'trim'],
            [['td_sistolik'], 'integer', 'min' => 50, 'max' => 300, 'tooSmall' => '{attribute} minimal {min}.', 'tooBig' => '{attribute} maksimal {max}.'],
            [['td_diastolik'], 'integer', 'min' => 30, 'max' => 200, 'tooSmall' => '{attribute} minimal {min}.', 'tooBig' => '{attribute} maksimal {max}.'],
            [['nadi'], 'integer', 'min' => 20, 'max' => 250, 'tooSmall' => '{attribute} minimal {min}.', 'tooBig' => '{attribute} maksimal {max}.'],
            [['suhu'], 'number', 'min' => 30, 'max' => 45, 'tooSmall' => '{attribute} minimal {min}.', 'tooBig' => '{attribute} maksimal {max}.'],
            [['respirasi'], 'integer', 'min' => 5, 'max' => 80, 'tooSmall' => '{attribute} minimal {min}.', 'tooBig' => '{attribute} maksimal {max}.'],
            [['spo2'], 'integer', 'min' => 50, 'max' => 100, 'tooSmall' => '{attribute} minimal {min}.', 'tooBig' => '{attribute} maksimal {max}.'],
            [['berat_badan'], 'number', 'min' => 0.5, 'max' => 500, 'tooSmall' => '{attribute} minimal {min}.', 'tooBig' => '{attribute} maksimal {max}.'],
            [['tinggi_badan'], 'number', 'min' => 20, 'max' => 250, 'tooSmall' => '{attribute} minimal {min}.', 'tooBig' => '{attribute} maksimal {max}.'],
            [['td_diastolik'], 'compare', 'compareAttribute' => 'td_sistolik', 'operator' => '<', 'type' => 'number',
                'when' => fn () => $this->td_sistolik !== null && $this->td_sistolik !== '',
                'message' => 'Tekanan diastolik harus lebih kecil dari sistolik.'],
            [self::FORM_FIELDS, 'default', 'value' => null],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'keluhan_utama' => 'Keluhan utama', 'anamnesis' => 'Anamnesis', 'td_sistolik' => 'Tekanan sistolik',
            'td_diastolik' => 'Tekanan diastolik', 'nadi' => 'Nadi', 'suhu' => 'Suhu', 'respirasi' => 'Respirasi',
            'spo2' => 'SpO2', 'berat_badan' => 'Berat badan', 'tinggi_badan' => 'Tinggi badan',
            'pemeriksaan_fisik' => 'Pemeriksaan fisik',
        ];
    }

    public function fields(): array
    {
        $fields = parent::fields();
        foreach (['td_sistolik', 'td_diastolik', 'nadi', 'respirasi', 'spo2'] as $f) {
            $fields[$f] = fn () => $this->$f === null ? null : (int) $this->$f;
        }
        foreach (['suhu', 'berat_badan', 'tinggi_badan'] as $f) {
            $fields[$f] = fn () => $this->$f === null ? null : (float) $this->$f;
        }

        return $fields;
    }
}
