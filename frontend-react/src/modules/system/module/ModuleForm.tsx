/**
 * Dialog form tambah dan ubah master modul.
 *
 * Dipakai di: ModulePage.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppFormDialog } from '@/components/AppFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import * as moduleApi from './module.api';
import type { ModuleItem } from './module.types';

const schema = z.object({
  kode: z
    .string()
    .trim()
    .min(1, 'system.module.kodeRequired')
    .regex(/^[a-z0-9-]+$/, 'system.common.kodePattern'),
  nama: z.string().trim().min(1, 'system.module.namaRequired'),
  icon: z.string().trim().optional(),
  urutan: z.number().int().min(0, 'system.common.urutanMin'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ModuleItem | null;
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui data modul.
 *
 * Dipakai di: ModulePage.
 */
export function ModuleForm({ open, onOpenChange, editing, onSaved }: Props) {
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
          icon: editing.icon ?? '',
          urutan: editing.urutan,
          is_active: editing.is_active,
        }
      : { kode: '', nama: '', icon: '', urutan: 0, is_active: true },
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
        icon: values.icon || null,
        urutan: values.urutan,
        is_active: values.is_active,
      };
      if (editing) {
        await moduleApi.updateModule(editing.id, payload);
      } else {
        await moduleApi.createModule(payload);
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
      title={editing ? t('system.module.editTitle') : t('system.module.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="module-kode">{t('system.common.kode')}</Label>
          <Input id="module-kode" {...register('kode')} />
          {errors.kode && (
            <p className="text-sm text-destructive">
              {t(errors.kode.message ?? '', { defaultValue: errors.kode.message })}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-nama">{t('system.common.nama')}</Label>
          <Input id="module-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="module-icon">{t('system.common.icon')}</Label>
            <Input id="module-icon" {...register('icon')} placeholder="layout-grid" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-urutan">{t('system.common.urutan')}</Label>
            <Input
              id="module-urutan"
              type="number"
              min={0}
              {...register('urutan', { valueAsNumber: true })}
            />
            {errors.urutan && (
              <p className="text-sm text-destructive">
                {t(errors.urutan.message ?? '', { defaultValue: errors.urutan.message })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="module-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="module-active">{t('system.common.active')}</Label>
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
