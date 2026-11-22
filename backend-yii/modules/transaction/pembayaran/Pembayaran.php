<?php

namespace app\modules\transaction\pembayaran;

use app\common\ActiveRecord;
use app\modules\system\user\User;
use yii\db\ActiveQuery;

/**
 * Model tabel t_pembayaran: catatan satu transaksi pembayaran (tunai atau non-tunai) terhadap invoice.
 *
 * @property int $id
 * @property string $no_pembayaran
 * @property int $invoice_id
 * @property string $idempotency_key
 * @property string $metode
 * @property float|string $jumlah
 * @property string|null $no_referensi
 * @property int $kasir_id
 * @property string $dibayar_at
 * @property Invoice $invoice
 * @property User $kasir
 */
class Pembayaran extends ActiveRecord
{
    public const METODE_TUNAI = 'tunai';
    public const METODE_NON_TUNAI = 'non_tunai';

    public static function tableName(): string
    {
        return 't_pembayaran';
    }

    /**
     * Relasi invoice yang dibayar.
     *
     * Dipakai di: PembayaranService, Pembayaran::fields.
     */
    public function getInvoice(): ActiveQuery
    {
        return $this->hasOne(Invoice::class, ['id' => 'invoice_id']);
    }

    /**
     * Relasi user kasir yang memproses pembayaran.
     *
     * Dipakai di: PembayaranService, Pembayaran::fields.
     */
    public function getKasir(): ActiveQuery
    {
        return $this->hasOne(User::class, ['id' => 'kasir_id']);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['jumlah'] = fn () => (float) $this->jumlah;
        // Akumulasi pembayaran invoice sampai transaksi ini, agar kwitansi cicilan lama tidak menampilkan saldo terkini.
        $fields['total_bayar_saat_itu'] = fn () => (float) self::find()
            ->where(['invoice_id' => $this->invoice_id])
            ->andWhere(['<=', 'id', $this->id])
            ->sum('jumlah');
        $fields['kasir'] = fn () => $this->kasir ? [
            'id' => $this->kasir->id,
            'username' => $this->kasir->username,
            'nama' => $this->kasir->nama,
        ] : null;

        // Ringkasan invoice hanya disertakan bila relasi sudah di-eager-load agar tidak memicu rekursi dari Invoice::fields().
        if ($this->isRelationPopulated('invoice') && $this->invoice !== null) {
            $inv = $this->invoice;
            $fields['invoice'] = fn () => [
                'id' => $inv->id,
                'no_invoice' => $inv->no_invoice,
                'kunjungan_id' => $inv->kunjungan_id,
                'total' => (float) $inv->total,
                'total_bayar' => (float) $inv->total_bayar,
                'sisa_tagihan' => round((float) $inv->total - (float) $inv->total_bayar, 2),
                'status' => $inv->status,
                'kunjungan' => $inv->kunjungan ? [
                    'id' => $inv->kunjungan->id,
                    'no_kunjungan' => $inv->kunjungan->no_kunjungan,
                    'tgl_kunjungan' => $inv->kunjungan->tgl_kunjungan,
                ] : null,
                'pasien' => $inv->kunjungan?->pasien ? [
                    'id' => $inv->kunjungan->pasien->id,
                    'no_rm' => $inv->kunjungan->pasien->no_rm,
                    'nama' => $inv->kunjungan->pasien->nama,
                ] : null,
                'poli' => $inv->kunjungan?->poli ? [
                    'id' => $inv->kunjungan->poli->id,
                    'nama' => $inv->kunjungan->poli->nama,
                ] : null,
                'dokter' => $inv->kunjungan?->dokter ? [
                    'id' => $inv->kunjungan->dokter->id,
                    'nama' => $inv->kunjungan->dokter->nama,
                ] : null,
            ];
        }

        return $fields;
    }
}
