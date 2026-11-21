/**
 * Dialog form pembayaran invoice (tunai atau non-tunai, bertahap maupun lunas).
 * Membuat satu Idempotency-Key (UUID) saat form dibuka dan mengirim ulang key yang sama saat retry (D.3).
 *
 * Dipakai di: BillingPage.tsx.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppCurrencyInput } from '@/components/AppCurrencyInput';
import { AppFormDialog } from '@/components/AppFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { formatRupiah } from '@/lib/format';
import * as pembayaranApi from './pembayaran.api';
import type { BayarResult, Invoice, MetodePembayaran } from './pembayaran.types';

interface Props {
  open: boolean;
  invoice: Invoice | null;
  idempotencyKey: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: BayarResult) => void;
}

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * Merender dialog form pembayaran dengan pengaman Idempotency-Key tetap sepanjang dialog terbuka.
 *
 * Dipakai di: BillingPage.tsx.
 */
export function BayarDialog({ open, invoice, idempotencyKey, onOpenChange, onSuccess }: Props) {
  const { t } = useTranslation();
  const [metode, setMetode] = useState<MetodePembayaran>('tunai');
  const [jumlah, setJumlah] = useState<number>(invoice?.sisa_tagihan ?? 0);
  const [noReferensi, setNoReferensi] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [prevKey, setPrevKey] = useState(idempotencyKey);

  // Reset isi form hanya saat sesi dialog baru dibuka (idempotencyKey baru), sehingga retry tetap memakai key & input sama.
  if (idempotencyKey !== prevKey) {
    setPrevKey(idempotencyKey);
    setMetode('tunai');
    setJumlah(invoice?.sisa_tagihan ?? 0);
    setNoReferensi('');
    setErrors({});
  }

  if (!invoice) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (jumlah <= 0) {
      setErrors({ jumlah: [t('transaction.billing.validationJumlahMin')] });
      return;
    }
    if (jumlah > invoice.sisa_tagihan) {
      setErrors({ jumlah: [t('transaction.billing.validationJumlahMax')] });
      return;
    }

    setSubmitting(true);
    try {
      const result = await pembayaranApi.bayarInvoice(
        {
          invoice_id: invoice.id,
          metode,
          jumlah,
          ...(noReferensi.trim() ? { no_referensi: noReferensi.trim() } : {}),
        },
        idempotencyKey,
      );
      toast.success(t('transaction.billing.paymentSaved'));
      onSuccess(result);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length > 0) {
        setErrors(fe);
      } else {
        toast.error(errorMessage(err, t('common.saveFailed')));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('transaction.billing.payDialogTitle')}
      description={t('transaction.billing.payDialogDesc', { noInvoice: invoice.no_invoice })}
    >
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-md border bg-muted/40 p-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{t('transaction.billing.totalTagihan')}</p>
          <p className="font-semibold">{formatRupiah(invoice.total)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('transaction.billing.sudahDibayar')}</p>
          <p className="font-semibold">{formatRupiah(invoice.total_bayar)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('transaction.billing.sisaTagihan')}</p>
          <p className="font-semibold text-primary">{formatRupiah(invoice.sisa_tagihan)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bayar-metode">{t('transaction.billing.metode')}</Label>
          <select
            id="bayar-metode"
            className={selectClassName}
            value={metode}
            onChange={(e) => setMetode(e.target.value as MetodePembayaran)}
            disabled={submitting}
          >
            <option value="tunai">{t('transaction.billing.metodeLabel.tunai')}</option>
            <option value="non_tunai">{t('transaction.billing.metodeLabel.non_tunai')}</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bayar-jumlah">{t('transaction.billing.jumlahBayar')}</Label>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setJumlah(invoice.sisa_tagihan)}
              disabled={submitting}
            >
              {t('transaction.billing.lunasiSisa')}
            </Button>
          </div>
          <AppCurrencyInput
            id="bayar-jumlah"
            value={jumlah}
            onChange={setJumlah}
            disabled={submitting}
          />
          {errors.jumlah?.[0] && <p className="text-xs text-destructive">{errors.jumlah[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bayar-referensi">{t('transaction.billing.noReferensi')}</Label>
          <Input
            id="bayar-referensi"
            value={noReferensi}
            onChange={(e) => setNoReferensi(e.target.value)}
            placeholder={t('transaction.billing.noReferensiPlaceholder')}
            disabled={submitting}
          />
          {errors.no_referensi?.[0] && (
            <p className="text-xs text-destructive">{errors.no_referensi[0]}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.saving') : t('transaction.billing.submitPay')}
          </Button>
        </div>
      </form>
    </AppFormDialog>
  );
}
