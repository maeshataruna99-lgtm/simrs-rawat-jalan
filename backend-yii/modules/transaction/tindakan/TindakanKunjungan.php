<?php

namespace app\modules\transaction\tindakan;

use app\common\ActiveRecord;
use app\modules\master\tindakan\Tindakan;
use yii\db\ActiveQuery;

/**
 * Model tabel t_tindakan: tindakan medis yang diberikan pada satu kunjungan beserta snapshot tarifnya.
 *
 * @property int $id
 * @property int $kunjungan_id
 * @property int $tindakan_id
 * @property int $qty
 * @property string $tarif
 * @property string $subtotal
 * @property int $dokter_id
 * @property string $status
 * @property Tindakan $tindakan
 */
class TindakanKunjungan extends ActiveRecord
{
    public const STATUS_AKTIF = 'aktif';
    public const STATUS_BATAL = 'batal';

    public static function tableName(): string
    {
        return 't_tindakan';
    }

    public function getTindakan(): ActiveQuery
    {
        return $this->hasOne(Tindakan::class, ['id' => 'tindakan_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['qty'] = fn () => (int) $this->qty;
        $fields['tarif'] = fn () => (float) $this->tarif;
        $fields['subtotal'] = fn () => (float) $this->subtotal;
        $fields['tindakan'] = fn () => $this->tindakan
            ? ['id' => $this->tindakan->id, 'kode' => $this->tindakan->kode, 'nama' => $this->tindakan->nama]
            : null;

        return $fields;
    }
}
