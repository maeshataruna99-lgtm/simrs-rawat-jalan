<?php

namespace app\modules\transaction\pembayaran;

use app\common\ActiveRecord;
use app\common\AuditLogBehavior;
use app\modules\transaction\pendaftaran\Kunjungan;
use yii\db\ActiveQuery;

/**
 * Model tabel t_invoice: tagihan satu kunjungan rawat jalan yang merangkum item pendaftaran, tindakan, lab, dan obat.
 *
 * @property int $id
 * @property string $no_invoice
 * @property int $kunjungan_id
 * @property float|string $total
 * @property float|string $total_bayar
 * @property string $status
 * @property Kunjungan $kunjungan
 * @property InvoiceItem[] $items
 * @property Pembayaran[] $pembayarans
 */
class Invoice extends ActiveRecord
{
    public const STATUS_BELUM_DIBAYAR = 'belum_dibayar';
    public const STATUS_DIBAYAR_SEBAGIAN = 'dibayar_sebagian';
    public const STATUS_LUNAS = 'lunas';

    public static function tableName(): string
    {
        return 't_invoice';
    }

    public function behaviors(): array
    {
        return array_merge(parent::behaviors(), [
            'auditLog' => AuditLogBehavior::class,
        ]);
    }

    /**
     * Relasi kunjungan pemilik invoice.
     *
     * Dipakai di: InvoiceService, Invoice::fields.
     */
    public function getKunjungan(): ActiveQuery
    {
        return $this->hasOne(Kunjungan::class, ['id' => 'kunjungan_id']);
    }

    /**
     * Relasi seluruh item invoice (aktif dulu, lalu yang di-void).
     *
     * Dipakai di: InvoiceService, Invoice::fields.
     */
    public function getItems(): ActiveQuery
    {
        return $this->hasMany(InvoiceItem::class, ['invoice_id' => 'id'])
            ->orderBy(['is_void' => SORT_ASC, 'id' => SORT_ASC]);
    }

    /**
     * Relasi seluruh pembayaran yang pernah dicatat untuk invoice ini.
     *
     * Dipakai di: InvoiceService, Invoice::fields.
     */
    public function getPembayarans(): ActiveQuery
    {
        return $this->hasMany(Pembayaran::class, ['invoice_id' => 'id'])
            ->orderBy(['id' => SORT_ASC]);
    }

    public function fields(): array
    {
        $fields = parent::fields();
        $fields['total'] = fn () => (float) $this->total;
        $fields['total_bayar'] = fn () => (float) $this->total_bayar;
        $fields['sisa_tagihan'] = fn () => round((float) $this->total - (float) $this->total_bayar, 2);
        $fields['items'] = fn () => array_map(fn (InvoiceItem $item) => $item->toArray(), $this->items);
        $fields['pembayaran'] = function () {
            // Relasi terurut id: running sum di PHP menggantikan satu query SUM per pembayaran.
            $akumulasi = 0.0;
            foreach ($this->pembayarans as $p) {
                $akumulasi += (float) $p->jumlah;
                $p->totalBayarSaatItu = $akumulasi;
            }

            return array_map(fn (Pembayaran $p) => $p->toArray(), $this->pembayarans);
        };
        $fields['kunjungan'] = fn () => $this->kunjungan ? [
            'id' => $this->kunjungan->id,
            'no_kunjungan' => $this->kunjungan->no_kunjungan,
            'tgl_kunjungan' => $this->kunjungan->tgl_kunjungan,
            'status' => $this->kunjungan->status,
            'is_valid' => (bool) $this->kunjungan->is_valid,
        ] : null;
        $fields['pasien'] = fn () => $this->kunjungan?->pasien ? [
            'id' => $this->kunjungan->pasien->id,
            'no_rm' => $this->kunjungan->pasien->no_rm,
            'nama' => $this->kunjungan->pasien->nama,
            'nik' => $this->kunjungan->pasien->nik,
        ] : null;
        $fields['poli'] = fn () => $this->kunjungan?->poli ? [
            'id' => $this->kunjungan->poli->id,
            'kode' => $this->kunjungan->poli->kode,
            'nama' => $this->kunjungan->poli->nama,
        ] : null;
        $fields['dokter'] = fn () => $this->kunjungan?->dokter ? [
            'id' => $this->kunjungan->dokter->id,
            'nama' => $this->kunjungan->dokter->nama,
        ] : null;

        return $fields;
    }
}
