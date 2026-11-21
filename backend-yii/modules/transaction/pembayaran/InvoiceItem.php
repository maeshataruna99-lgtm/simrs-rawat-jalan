<?php

namespace app\modules\transaction\pembayaran;

use app\common\ActiveRecord;
use yii\db\ActiveQuery;

/**
 * Model tabel t_invoice_item: rincian biaya per sumber (pendaftaran, tindakan, lab, obat) pada satu invoice.
 *
 * @property int $id
 * @property int $invoice_id
 * @property string $sumber
 * @property int $referensi_id
 * @property string $deskripsi
 * @property int $qty
 * @property float|string $harga
 * @property float|string $subtotal
 * @property bool $is_void
 * @property string|null $alasan_void
 */
class InvoiceItem extends ActiveRecord
{
    public const SUMBER_PENDAFTARAN = 'pendaftaran';
    public const SUMBER_TINDAKAN = 'tindakan';
    public const SUMBER_LAB = 'lab';
    public const SUMBER_OBAT = 'obat';

    public static function tableName(): string
    {
        return 't_invoice_item';
    }

    /**
     * Relasi invoice induk dari item ini.
     *
     * Dipakai di: InvoiceService.
     */
    public function getInvoice(): ActiveQuery
    {
        return $this->hasOne(Invoice::class, ['id' => 'invoice_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['qty'] = fn () => (int) $this->qty;
        $fields['harga'] = fn () => (float) $this->harga;
        $fields['subtotal'] = fn () => (float) $this->subtotal;
        $fields['is_void'] = fn () => (bool) $this->is_void;

        return $fields;
    }
}
