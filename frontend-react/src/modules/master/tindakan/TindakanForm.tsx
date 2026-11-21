/**
 * Dialog form tambah dan ubah master tindakan medis.
 *
 * Dipakai di: TindakanPage.
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
import type { PoliItem } from '@/modules/master/poli/poli.types';
import * as tindakanApi from './tindakan.api';
import type { TindakanItem } from './tindakan.types';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const schema = z.object({
  kode: z.string().trim().min(1, 'master.tindakan.kodeRequired'),
  nama: z.string().trim().min(1, 'master.tindakan.namaRequired'),
  tarif: z.number().min(0, 'master.tindakan.tarifMin'),
  poli_id: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TindakanItem | null;
  poliList: PoliItem[];
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui data tindakan medis.
 *
 * Dipakai di: TindakanPage.
 */
export function TindakanForm({ open, onOpenChange, editing, poliList, onSaved }: Props) {
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
          tarif: editing.tarif,
          poli_id: editing.poli_id ? String(editing.poli_id) : '',
          is_active: editing.is_active,
        }
      : {
          kode: '',
          nama: '',
          tarif: 0,
          poli_id: '',
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
        tarif: values.tarif,
        poli_id: values.poli_id ? Number(values.poli_id) : null,
        is_active: values.is_active,
      };
      if (editing) {
        await tindakanApi.updateTindakan(editing.id, payload);
      } else {
        await tindakanApi.createTindakan(payload);
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
      title={editing ? t('master.tindakan.editTitle') : t('master.tindakan.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="tindakan-kode">{t('system.common.kode')}</Label>
          <Input id="tindakan-kode" {...register('kode')} />
          {errors.kode && (
            <p className="text-sm text-destructive">
              {t(errors.kode.message ?? '', { defaultValue: errors.kode.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tindakan-nama">{t('system.common.nama')}</Label>
          <Input id="tindakan-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tindakan-tarif">{t('master.tindakan.tarif')}</Label>
            <Controller
              control={control}
              name="tarif"
              render={({ field }) => (
                <AppCurrencyInput
                  id="tindakan-tarif"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.tarif && (
              <p className="text-sm text-destructive">
                {t(errors.tarif.message ?? '', { defaultValue: errors.tarif.message })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tindakan-poli">{t('master.tindakan.poli')}</Label>
            <select id="tindakan-poli" className={selectClassName} {...register('poli_id')}>
              <option value="">{t('master.tindakan.semuaPoli')}</option>
              {poliList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="tindakan-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="tindakan-active">{t('system.common.active')}</Label>
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
