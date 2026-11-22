/**
 * Halaman cetak bukti pembayaran / kwitansi (/transaction/billing/pembayaran/:id/cetak) dengan CSS print A4.
 *
 * Dipakai di: routes/index.tsx.
 */
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-client';
import { formatRupiah } from '@/lib/format';
import * as pembayaranApi from './pembayaran.api';
import type { PembayaranRingkas } from './pembayaran.types';

export default function BuktiBayarPrintPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [pembayaran, setPembayaran] = useState<PembayaranRingkas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pembayaranId = Number(id);
    if (!Number.isInteger(pembayaranId) || pembayaranId <= 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      setLoading(true);
      try {
        const data = await pembayaranApi.getPembayaran(pembayaranId);
        if (!cancelled) {
          setPembayaran(data);
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

  if (!pembayaran) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('transaction.billing.emptyRiwayat')}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/transaction/billing">{t('transaction.billing.print.back')}</Link>
        </Button>
      </div>
    );
  }

  const inv = pembayaran.invoice;

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to="/transaction/billing">
            <ArrowLeft className="mr-1.5 size-4" />
            {t('transaction.billing.print.back')}
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 size-4" />
          {t('transaction.billing.print.printNow')}
        </Button>
      </div>

      <article className="print-sheet mx-auto max-w-2xl rounded-lg border bg-white p-8 text-gray-900 shadow-sm">
        <header className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('app.name')}</h1>
            <p className="text-xs text-gray-600">{t('app.shortTagline')}</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase tracking-wide">
              {t('transaction.billing.print.receiptHeading')}
            </h2>
            <p className="font-mono text-sm font-semibold">{pembayaran.no_pembayaran}</p>
            <p className="text-xs text-gray-600">{pembayaran.dibayar_at}</p>
          </div>
        </header>

        <section className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between border-b border-gray-200 py-1.5">
            <span className="text-gray-600">{t('transaction.billing.colNoInvoice')}</span>
            <span className="font-mono font-semibold">{inv?.no_invoice ?? '-'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1.5">
            <span className="text-gray-600">{t('transaction.billing.colPasien')}</span>
            <span className="font-medium">
              {inv?.pasien ? `${inv.pasien.no_rm} — ${inv.pasien.nama}` : '-'}
            </span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1.5">
            <span className="text-gray-600">{t('transaction.billing.colPoliDokter')}</span>
            <span>
              {inv?.poli?.nama ?? '-'} / {inv?.dokter?.nama ?? '-'}
            </span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1.5">
            <span className="text-gray-600">{t('transaction.billing.metode')}</span>
            <span>{t(`transaction.billing.metodeLabel.${pembayaran.metode}`)}</span>
          </div>
          {pembayaran.no_referensi && (
            <div className="flex justify-between border-b border-gray-200 py-1.5">
              <span className="text-gray-600">{t('transaction.billing.noReferensi')}</span>
              <span className="font-mono">{pembayaran.no_referensi}</span>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-md border border-gray-300 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              {t('transaction.billing.print.nominalDiterima')}
            </span>
            <span className="text-2xl font-bold">{formatRupiah(pembayaran.jumlah)}</span>
          </div>
          {inv && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-2 text-xs text-gray-600">
              <span>
                {t('transaction.billing.totalTagihan')}: {formatRupiah(inv.total)} ·{' '}
                {t('transaction.billing.sudahDibayar')}:{' '}
                {formatRupiah(pembayaran.total_bayar_saat_itu)} ·{' '}
                {t('transaction.billing.sisaTagihan')}:{' '}
                {formatRupiah(Math.max(inv.total - pembayaran.total_bayar_saat_itu, 0))}
              </span>
              <Badge variant="outline" className="border-gray-400 text-gray-900">
                {t(
                  `transaction.billing.statusLabel.${
                    pembayaran.total_bayar_saat_itu >= inv.total ? 'lunas' : 'dibayar_sebagian'
                  }`,
                )}
              </Badge>
            </div>
          )}
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-gray-700">
          <div>
            <p>{t('transaction.billing.print.penyetorTtd')}</p>
            <div className="mt-14 border-t border-gray-400 pt-1">{inv?.pasien?.nama ?? '-'}</div>
          </div>
          <div>
            <p>{t('transaction.billing.print.kasirTtd')}</p>
            <div className="mt-14 border-t border-gray-400 pt-1">
              {pembayaran.kasir?.nama ?? t('transaction.billing.print.petugasKasir')}
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
