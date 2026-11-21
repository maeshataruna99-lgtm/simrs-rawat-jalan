/**
 * Dialog form penyesuaian stok manual obat (POST /master/obat/{id}/sesuaikan-stok).
 *
 * Dipakai di: ObatPage.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppFormDialog } from '@/components/AppFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import * as obatApi from './obat.api';
import type { ObatItem } from './obat.types';

const schema = z.object({
  stok_baru: z.number().int().min(0, 'master.obat.hargaMin'),
  referensi: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  target: ObatItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/**
 * Menampilkan dialog penyesuaian stok fisik obat beserta keterangan referensinya.
 *
 * Dipakai di: ObatPage.
 */
export function StokAdjustDialog({ target, onOpenChange, onSaved }: Props) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      stok_baru: target?.stok ?? 0,
      referensi: '',
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setServerError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: FormValues) => {
    if (!target) return;
    setServerError(null);
    try {
      await obatApi.adjustObatStok(target.id, {
        stok_baru: values.stok_baru,
        referensi: values.referensi || undefined,
      });
      toast.success(t('master.obat.adjustSuccess'));
      handleOpenChange(false);
      onSaved();
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields.stok_baru?.[0]) {
        setError('stok_baru', { message: fields.stok_baru[0] });
      } else {
        const firstFieldError = Object.values(fields).flat()[0];
        setServerError(firstFieldError ?? errorMessage(err, t('common.saveFailed')));
      }
    }
  };

  return (
    <AppFormDialog
      open={Boolean(target)}
      onOpenChange={handleOpenChange}
      title={t('master.obat.adjustTitle')}
      description={t('master.obat.adjustDescription', {
        nama: target?.nama ?? '',
        stok: target?.stok ?? 0,
      })}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="adjust-stok-baru">{t('master.obat.stokBaru')}</Label>
          <Input
            id="adjust-stok-baru"
            type="number"
            min={0}
            {...register('stok_baru', { valueAsNumber: true })}
          />
          {errors.stok_baru && (
            <p className="text-sm text-destructive">
              {t(errors.stok_baru.message ?? '', { defaultValue: errors.stok_baru.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjust-referensi">{t('master.obat.referensi')}</Label>
          <Input id="adjust-referensi" {...register('referensi')} placeholder="Stok awal opname" />
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </AppFormDialog>
  );
}
