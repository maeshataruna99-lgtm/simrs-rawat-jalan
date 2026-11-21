<?php

namespace app\modules\transaction\pendaftaran;

use app\common\ActiveRecord;

/**
 * Model tabel t_kunjungan_status_log: catatan perubahan status antrean kunjungan.
 *
 * @property int $id
 * @property int $kunjungan_id
 * @property string|null $status_lama
 * @property string $status_baru
 * @property int|null $user_id
 * @property string $waktu
 */
class KunjunganStatusLog extends ActiveRecord
{
    public static function tableName(): string
    {
        return 't_kunjungan_status_log';
    }

    public function fields(): array
    {
        return [
            'id' => fn () => (int) $this->id,
            'kunjungan_id' => fn () => (int) $this->kunjungan_id,
            'status_lama' => 'status_lama',
            'status_baru' => 'status_baru',
            'user_id' => fn () => $this->user_id === null ? null : (int) $this->user_id,
            'waktu' => 'waktu',
        ];
    }
}
