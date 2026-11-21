/**
 * Dialog form tambah dan ubah master obat (tanpa kolom stok karena stok hanya diubah melalui mutasi).
 *
 * Dipakai di: ObatPage.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppCurrencyInput } from '@/components/AppCurrencyInput';
import { AppFormDialog } from '@/components/AppFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import * as obatApi from './obat.api';
import type { ObatItem } from './obat.types';

const schema = z.object({
  kode: z.string().trim().min(1, 'master.obat.kodeRequired'),
  nama: z.string().trim().min(1, 'master.obat.namaRequired'),
  satuan: z.string().trim().min(1, 'master.obat.satuanRequired'),
  harga: z.number().min(0, 'master.obat.hargaMin'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ObatItem | null;
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui data obat.
 *
 * Dipakai di: ObatPage.
 */
export function ObatForm({ open, onOpenChange, editing, onSaved }: Props) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          kode: editing.kode,
          nama: editing.nama,
          satuan: editing.satuan,
          harga: editing.harga,
          is_active: editing.is_active,
        }
      : {
          kode: '',
          nama: '',
          satuan: 'tablet',
          harga: 0,
          is_active: true,
        },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setServerError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      if (editing) {
        await obatApi.updateObat(editing.id, values);
      } else {
        await obatApi.createObat(values);
      }
      toast.success(t('common.saveSuccess'));
      handleOpenChange(false);
      onSaved();
    } catch (err) {
      const fields = fieldErrors(err);
      const keys = Object.keys(fields) as (keyof FormValues)[];
      keys.forEach((key) => {
        if (fields[key]?.[0]) {
          setError(key, { message: fields[key][0] });
        }
      });
      if (keys.length === 0) {
        setServerError(errorMessage(err, t('common.saveFailed')));
      }
    }
  };

  return (
    <AppFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={editing ? t('master.obat.editTitle') : t('master.obat.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="obat-kode">{t('system.common.kode')}</Label>
            <Input id="obat-kode" {...register('kode')} />
            {errors.kode && (
              <p className="text-sm text-destructive">
                {t(errors.kode.message ?? '', { defaultValue: errors.kode.message })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="obat-satuan">{t('master.obat.satuan')}</Label>
            <Input id="obat-satuan" {...register('satuan')} placeholder="tablet" />
            {errors.satuan && (
              <p className="text-sm text-destructive">
                {t(errors.satuan.message ?? '', { defaultValue: errors.satuan.message })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="obat-nama">{t('system.common.nama')}</Label>
          <Input id="obat-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="obat-harga">{t('master.obat.harga')}</Label>
          <Controller
            control={control}
            name="harga"
            render={({ field }) => (
              <AppCurrencyInput id="obat-harga" value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.harga && (
            <p className="text-sm text-destructive">
              {t(errors.harga.message ?? '', { defaultValue: errors.harga.message })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="obat-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="obat-active">{t('system.common.active')}</Label>
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
