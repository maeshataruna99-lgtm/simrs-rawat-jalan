/**
 * Halaman cetak invoice rawat jalan (/transaction/billing/invoice/:id/cetak) dengan tata letak CSS print A4.
 *
 * Dipakai di: routes/index.tsx.
 */
import { ArrowLeft, FileDown, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-client';
import { exportInvoicePdf } from '@/lib/export-pdf';
import { formatRupiah } from '@/lib/format';
import * as pembayaranApi from './pembayaran.api';
import type { Invoice } from './pembayaran.types';

export default function InvoicePrintPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      setLoading(true);
      try {
        const data = await pembayaranApi.getInvoice(invoiceId);
        if (!cancelled) {
          setInvoice(data);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(errorMessage(err, t('common.loadFailed')));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  if (!invoice) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('transaction.billing.emptyInvoice')}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/transaction/billing">{t('transaction.billing.print.back')}</Link>
        </Button>
      </div>
    );
  }

  const activeItems = invoice.items.filter((i) => !i.is_void);
  const voidItems = invoice.items.filter((i) => i.is_void);

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to="/transaction/billing">
            <ArrowLeft className="mr-1.5 size-4" />
            {t('transaction.billing.print.back')}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportInvoicePdf(invoice)}>
            <FileDown className="mr-1.5 size-4" />
            {t('common.exportPdf')}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 size-4" />
            {t('transaction.billing.print.printNow')}
          </Button>
        </div>
      </div>

      <article className="print-sheet mx-auto max-w-3xl rounded-lg border bg-white p-8 text-gray-900 shadow-sm">
        <header className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('app.name')}</h1>
            <p className="text-xs text-gray-600">{t('app.shortTagline')}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase tracking-wide">
              {t('transaction.billing.print.invoiceHeading')}
            </h2>
            <p className="font-mono text-sm font-semibold">{invoice.no_invoice}</p>
            <div className="mt-1">
              <Badge variant="outline" className="border-gray-400 text-gray-900">
                {t(`transaction.billing.statusLabel.${invoice.status}`)}
              </Badge>
            </div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-6 text-sm">
          <dl className="space-y-1">
            <div className="flex gap-2">
              <dt className="w-28 text-gray-600">{t('transaction.billing.print.noRm')}</dt>
              <dd className="font-mono font-medium">{invoice.pasien?.no_rm ?? '-'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-gray-600">{t('transaction.billing.colPasien')}</dt>
              <dd className="font-medium">{invoice.pasien?.nama ?? '-'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-gray-600">{t('transaction.billing.print.nik')}</dt>
              <dd className="font-mono">{invoice.pasien?.nik ?? '-'}</dd>
            </div>
          </dl>
          <dl className="space-y-1">
            <div className="flex gap-2">
              <dt className="w-28 text-gray-600">{t('transaction.billing.colNoKunjungan')}</dt>
              <dd className="font-mono font-medium">{invoice.kunjungan?.no_kunjungan ?? '-'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-gray-600">{t('transaction.billing.print.tanggal')}</dt>
              <dd>{invoice.kunjungan?.tgl_kunjungan ?? invoice.created_at}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-gray-600">{t('transaction.billing.colPoliDokter')}</dt>
              <dd>
                {invoice.poli?.nama ?? '-'} / {invoice.dokter?.nama ?? '-'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-gray-400 bg-gray-100 text-left">
                <th className="px-2 py-2 font-semibold">{t('transaction.billing.colSumber')}</th>
                <th className="px-2 py-2 font-semibold">{t('transaction.billing.colDeskripsi')}</th>
                <th className="px-2 py-2 text-right font-semibold">
                  {t('transaction.billing.colQty')}
                </th>
                <th className="px-2 py-2 text-right font-semibold">
                  {t('transaction.billing.colHarga')}
                </th>
                <th className="px-2 py-2 text-right font-semibold">
                  {t('transaction.billing.colSubtotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="px-2 py-2">
                    {t(`transaction.billing.sumberLabel.${item.sumber}`)}
                  </td>
                  <td className="px-2 py-2">{item.deskripsi}</td>
                  <td className="px-2 py-2 text-right">{item.qty}</td>
                  <td className="px-2 py-2 text-right">{formatRupiah(item.harga)}</td>
                  <td className="px-2 py-2 text-right font-medium">
                    {formatRupiah(item.subtotal)}
                  </td>
                </tr>
              ))}
              {voidItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 text-gray-400">
                  <td className="px-2 py-2 line-through">
                    {t(`transaction.billing.sumberLabel.${item.sumber}`)}
                  </td>
                  <td className="px-2 py-2">
                    <span className="line-through">{item.deskripsi}</span>
                    <div className="text-xs italic">
                      {t('transaction.billing.voidReason', { reason: item.alasan_void ?? '-' })}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right line-through">{item.qty}</td>
                  <td className="px-2 py-2 text-right line-through">{formatRupiah(item.harga)}</td>
                  <td className="px-2 py-2 text-right line-through">
                    {formatRupiah(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-4 flex justify-end">
          <dl className="w-72 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">{t('transaction.billing.totalTagihan')}</dt>
              <dd className="font-semibold">{formatRupiah(invoice.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">{t('transaction.billing.sudahDibayar')}</dt>
              <dd>{formatRupiah(invoice.total_bayar)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-400 pt-1 text-base font-bold">
              <dt>{t('transaction.billing.sisaTagihan')}</dt>
              <dd>{formatRupiah(invoice.sisa_tagihan)}</dd>
            </div>
          </dl>
        </section>

        {invoice.pembayaran.length > 0 && (
          <section className="mt-6">
            <h3 className="mb-2 text-sm font-semibold">
              {t('transaction.billing.riwayatPembayaran')}
            </h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-y border-gray-300 bg-gray-50 text-left">
                  <th className="px-2 py-1.5">{t('transaction.billing.colNoPembayaran')}</th>
                  <th className="px-2 py-1.5">{t('transaction.billing.print.waktuBayar')}</th>
                  <th className="px-2 py-1.5">{t('transaction.billing.metode')}</th>
                  <th className="px-2 py-1.5">{t('transaction.billing.noReferensi')}</th>
                  <th className="px-2 py-1.5">{t('transaction.billing.colKasir')}</th>
                  <th className="px-2 py-1.5 text-right">{t('transaction.billing.jumlahBayar')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.pembayaran.map((p) => (
                  <tr key={p.id} className="border-b border-gray-200">
                    <td className="px-2 py-1.5 font-mono">{p.no_pembayaran}</td>
                    <td className="px-2 py-1.5">{p.dibayar_at}</td>
                    <td className="px-2 py-1.5">
                      {t(`transaction.billing.metodeLabel.${p.metode}`)}
                    </td>
                    <td className="px-2 py-1.5">{p.no_referensi ?? '-'}</td>
                    <td className="px-2 py-1.5">{p.kasir?.nama ?? '-'}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{formatRupiah(p.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-gray-700">
          <div>
            <p>{t('transaction.billing.print.pasienTtd')}</p>
            <div className="mt-14 border-t border-gray-400 pt-1">{invoice.pasien?.nama ?? '-'}</div>
          </div>
          <div>
            <p>{t('transaction.billing.print.kasirTtd')}</p>
            <div className="mt-14 border-t border-gray-400 pt-1">
              {t('transaction.billing.print.petugasKasir')}
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
