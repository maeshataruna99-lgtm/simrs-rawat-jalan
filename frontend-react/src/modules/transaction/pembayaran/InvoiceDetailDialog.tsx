/**
 * Dialog rincian satu invoice: item biaya dari 4 sumber (termasuk item void), riwayat pembayaran, dan audit log.
 *
 * Dipakai di: BillingPage.tsx.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatRupiah } from '@/lib/format';
import * as pembayaranApi from './pembayaran.api';
import type { Invoice, InvoiceAuditLog, InvoiceStatus } from './pembayaran.types';

interface Props {
  open: boolean;
  invoice: Invoice | null;
  canPay: boolean;
  onOpenChange: (open: boolean) => void;
  onPay: (invoice: Invoice) => void;
}

const statusVariant: Record<InvoiceStatus, 'destructive' | 'secondary' | 'default'> = {
  belum_dibayar: 'destructive',
  dibayar_sebagian: 'secondary',
  lunas: 'default',
};

/**
 * Menampilkan rincian item tagihan, riwayat pembayaran, dan log audit untuk satu invoice.
 *
 * Dipakai di: BillingPage.tsx.
 */
export function InvoiceDetailDialog({ open, invoice, canPay, onOpenChange, onPay }: Props) {
  const { t } = useTranslation();
  const [auditLogs, setAuditLogs] = useState<InvoiceAuditLog[]>([]);

  useEffect(() => {
    if (!open || !invoice) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      try {
        const logs = await pembayaranApi.getAuditLogInvoice(invoice.id);
        if (!cancelled) {
          setAuditLogs(logs);
        }
      } catch {
        if (!cancelled) {
          setAuditLogs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, invoice]);

  if (!invoice) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle>{invoice.no_invoice}</DialogTitle>
              <DialogDescription>
                {invoice.pasien ? `${invoice.pasien.no_rm} — ${invoice.pasien.nama}` : '-'} ·{' '}
                {invoice.poli?.nama ?? '-'} · {invoice.dokter?.nama ?? '-'}
              </DialogDescription>
            </div>
            <Badge variant={statusVariant[invoice.status]}>
              {t(`transaction.billing.statusLabel.${invoice.status}`)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('transaction.billing.rincianBiaya')}</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('transaction.billing.colSumber')}</TableHead>
                    <TableHead>{t('transaction.billing.colDeskripsi')}</TableHead>
                    <TableHead className="text-right">{t('transaction.billing.colQty')}</TableHead>
                    <TableHead className="text-right">
                      {t('transaction.billing.colHarga')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('transaction.billing.colSubtotal')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={item.is_void ? 'bg-muted/40 text-muted-foreground' : undefined}
                    >
                      <TableCell>
                        <Badge variant="outline">
                          {t(`transaction.billing.sumberLabel.${item.sumber}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={item.is_void ? 'line-through' : undefined}>
                          {item.deskripsi}
                        </div>
                        {item.is_void && (
                          <p className="text-xs text-destructive">
                            {t('transaction.billing.voidReason', {
                              reason: item.alasan_void ?? '-',
                            })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{formatRupiah(item.harga)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${item.is_void ? 'line-through' : ''}`}
                      >
                        {formatRupiah(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/40 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                {t('transaction.billing.totalTagihan')}
              </p>
              <p className="text-base font-semibold">{formatRupiah(invoice.total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('transaction.billing.sudahDibayar')}
              </p>
              <p className="text-base font-semibold">{formatRupiah(invoice.total_bayar)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('transaction.billing.sisaTagihan')}
              </p>
              <p className="text-base font-semibold text-primary">
                {formatRupiah(invoice.sisa_tagihan)}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {t('transaction.billing.riwayatPembayaran')}
            </h3>
            {invoice.pembayaran.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('transaction.billing.belumAdaPembayaran')}
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('transaction.billing.colNoPembayaran')}</TableHead>
                      <TableHead>{t('transaction.billing.metode')}</TableHead>
                      <TableHead>{t('transaction.billing.noReferensi')}</TableHead>
                      <TableHead>{t('transaction.billing.colKasir')}</TableHead>
                      <TableHead className="text-right">
                        {t('transaction.billing.jumlahBayar')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.pembayaran.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.no_pembayaran}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {t(`transaction.billing.metodeLabel.${p.metode}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.no_referensi ?? '-'}</TableCell>
                        <TableCell>{p.kasir?.nama ?? '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRupiah(p.jumlah)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {auditLogs.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  {t('transaction.billing.auditTitle')}
                </h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {auditLogs.slice(0, 6).map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1"
                    >
                      <span>
                        <span className="font-mono font-medium text-foreground">{log.tabel}</span> ·{' '}
                        {log.aksi}
                        {typeof log.data_baru?.alasan === 'string'
                          ? ` — ${log.data_baru.alasan}`
                          : ''}
                      </span>
                      <span>{log.waktu}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.close')}
            </Button>
            {canPay && invoice.status !== 'lunas' && (
              <Button onClick={() => onPay(invoice)}>{t('transaction.billing.payAction')}</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
