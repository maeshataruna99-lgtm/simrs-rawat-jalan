/**
 * Dialog form tambah dan ubah master pemeriksaan laboratorium.
 *
 * Dipakai di: PemeriksaanLabPage.
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
import * as labApi from './lab.api';
import type { PemeriksaanLabItem } from './lab.types';

const schema = z.object({
  kode: z.string().trim().min(1, 'master.lab.kodeRequired'),
  nama: z.string().trim().min(1, 'master.lab.namaRequired'),
  satuan: z.string().trim().optional(),
  nilai_rujukan: z.string().trim().optional(),
  tarif: z.number().min(0, 'master.lab.tarifMin'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PemeriksaanLabItem | null;
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui data pemeriksaan laboratorium.
 *
 * Dipakai di: PemeriksaanLabPage.
 */
export function PemeriksaanLabForm({ open, onOpenChange, editing, onSaved }: Props) {
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
          satuan: editing.satuan ?? '',
          nilai_rujukan: editing.nilai_rujukan ?? '',
          tarif: editing.tarif,
          is_active: editing.is_active,
        }
      : {
          kode: '',
          nama: '',
          satuan: '',
          nilai_rujukan: '',
          tarif: 0,
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
      const payload = {
        kode: values.kode,
        nama: values.nama,
        satuan: values.satuan || null,
        nilai_rujukan: values.nilai_rujukan || null,
        tarif: values.tarif,
        is_active: values.is_active,
      };
      if (editing) {
        await labApi.updatePemeriksaanLab(editing.id, payload);
      } else {
        await labApi.createPemeriksaanLab(payload);
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
      title={editing ? t('master.lab.editTitle') : t('master.lab.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="lab-kode">{t('system.common.kode')}</Label>
          <Input id="lab-kode" {...register('kode')} />
          {errors.kode && (
            <p className="text-sm text-destructive">
              {t(errors.kode.message ?? '', { defaultValue: errors.kode.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lab-nama">{t('system.common.nama')}</Label>
          <Input id="lab-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lab-satuan">{t('master.lab.satuan')}</Label>
            <Input id="lab-satuan" {...register('satuan')} placeholder="mg/dL" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lab-rujukan">{t('master.lab.nilaiRujukan')}</Label>
            <Input id="lab-rujukan" {...register('nilai_rujukan')} placeholder="70 - 140" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lab-tarif">{t('master.lab.tarif')}</Label>
          <Controller
            control={control}
            name="tarif"
            render={({ field }) => (
              <AppCurrencyInput id="lab-tarif" value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.tarif && (
            <p className="text-sm text-destructive">
              {t(errors.tarif.message ?? '', { defaultValue: errors.tarif.message })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="lab-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="lab-active">{t('system.common.active')}</Label>
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
