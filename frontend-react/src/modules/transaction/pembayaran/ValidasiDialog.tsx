/**
 * Dialog catatan untuk kasir sebelum membuat invoice atau validasi kunjungan.
 * Transaksi yang belum tuntas tampil sebagai peringatan merah; kasir tetap bisa melanjutkan setelah membaca.
 *
 * Dipakai di: BillingPage.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-client';
import * as pembayaranApi from './pembayaran.api';

interface Props {
  /** Kunjungan yang dicek; null berarti dialog tertutup. */
  kunjunganId: number | null;
  title: string;
  confirmLabel: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

export function ValidasiDialog({
  kunjunganId,
  title,
  confirmLabel,
  loading = false,
  onOpenChange,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [peringatan, setPeringatan] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kunjunganId === null) return;
    let aktif = true;
    void (async () => {
      setPeringatan(null);
      setError(null);
      try {
        const hasil = await pembayaranApi.peringatanKunjungan(kunjunganId);
        if (aktif) setPeringatan(hasil);
      } catch (err) {
        if (aktif) setError(errorMessage(err, t('common.loadFailed')));
      }
    })();
    return () => {
      aktif = false;
    };
  }, [kunjunganId, t]);

  const adaPeringatan = (peringatan?.length ?? 0) > 0;

  return (
    <AlertDialog open={kunjunganId !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('transaction.billing.validasi.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {peringatan === null && !error && (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        )}
        {adaPeringatan && (
          <div
            role="alert"
            className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <p className="font-semibold">{t('transaction.billing.validasi.warningTitle')}</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {peringatan?.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p>{t('transaction.billing.validasi.warningHint')}</p>
          </div>
        )}
        {peringatan !== null && !adaPeringatan && (
          <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {t('transaction.billing.validasi.allDone')}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('common.cancel')}</AlertDialogCancel>
          <Button
            variant={adaPeringatan ? 'destructive' : 'default'}
            disabled={loading || (peringatan === null && !error)}
            onClick={() => void onConfirm()}
          >
            {adaPeringatan ? t('transaction.billing.validasi.proceedAnyway') : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
