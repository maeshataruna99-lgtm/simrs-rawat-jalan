/**
 * Dialog form tambah dan ubah master poli.
 *
 * Dipakai di: PoliPage.
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
import * as poliApi from './poli.api';
import type { PoliItem } from './poli.types';

const schema = z.object({
  kode: z.string().trim().min(1, 'master.poli.kodeRequired'),
  nama: z.string().trim().min(1, 'master.poli.namaRequired'),
  prefix_antrean: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]$/, 'master.poli.prefixAntreanInvalid'),
  tarif_pendaftaran: z.number().min(0, 'master.poli.tarifMin'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PoliItem | null;
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui data poli.
 *
 * Dipakai di: PoliPage.
 */
export function PoliForm({ open, onOpenChange, editing, onSaved }: Props) {
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
          prefix_antrean: editing.prefix_antrean,
          tarif_pendaftaran: editing.tarif_pendaftaran,
          is_active: editing.is_active,
        }
      : {
          kode: '',
          nama: '',
          prefix_antrean: '',
          tarif_pendaftaran: 0,
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
        await poliApi.updatePoli(editing.id, values);
      } else {
        await poliApi.createPoli(values);
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
      title={editing ? t('master.poli.editTitle') : t('master.poli.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="poli-kode">{t('system.common.kode')}</Label>
          <Input id="poli-kode" {...register('kode')} />
          {errors.kode && (
            <p className="text-sm text-destructive">
              {t(errors.kode.message ?? '', { defaultValue: errors.kode.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="poli-nama">{t('system.common.nama')}</Label>
          <Input id="poli-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="poli-prefix">{t('master.poli.prefixAntrean')}</Label>
          <Input
            id="poli-prefix"
            maxLength={1}
            className="w-20 font-mono uppercase"
            aria-describedby="poli-prefix-hint"
            {...register('prefix_antrean')}
          />
          <p id="poli-prefix-hint" className="text-xs text-muted-foreground">
            {t('master.poli.prefixAntreanHint')}
          </p>
          {errors.prefix_antrean && (
            <p className="text-sm text-destructive">
              {t(errors.prefix_antrean.message ?? '', {
                defaultValue: errors.prefix_antrean.message,
              })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="poli-tarif">{t('master.poli.tarifPendaftaran')}</Label>
          <Controller
            control={control}
            name="tarif_pendaftaran"
            render={({ field }) => (
              <AppCurrencyInput id="poli-tarif" value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.tarif_pendaftaran && (
            <p className="text-sm text-destructive">
              {t(errors.tarif_pendaftaran.message ?? '', {
                defaultValue: errors.tarif_pendaftaran.message,
              })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="poli-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="poli-active">{t('system.common.active')}</Label>
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
