/**
 * Dialog form tambah dan ubah master dokter dan tenaga medis.
 *
 * Dipakai di: DokterPage.
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
import * as dokterApi from './dokter.api';
import type { DokterItem, JenisTenaga } from './dokter.types';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const JENIS_TENAGA_LIST: JenisTenaga[] = ['dokter', 'perawat', 'analis', 'apoteker'];

const schema = z.object({
  kode: z.string().trim().min(1, 'master.dokter.kodeRequired'),
  nama: z.string().trim().min(1, 'master.dokter.namaRequired'),
  sip: z.string().trim().min(1, 'master.dokter.sipRequired'),
  spesialis: z.string().trim().optional(),
  jenis_tenaga: z.enum(['dokter', 'perawat', 'analis', 'apoteker']),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DokterItem | null;
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui data dokter dan tenaga medis.
 *
 * Dipakai di: DokterPage.
 */
export function DokterForm({ open, onOpenChange, editing, onSaved }: Props) {
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
          sip: editing.sip,
          spesialis: editing.spesialis ?? '',
          jenis_tenaga: editing.jenis_tenaga,
          is_active: editing.is_active,
        }
      : {
          kode: '',
          nama: '',
          sip: '',
          spesialis: '',
          jenis_tenaga: 'dokter',
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
        sip: values.sip,
        spesialis: values.spesialis || null,
        jenis_tenaga: values.jenis_tenaga,
        is_active: values.is_active,
      };
      if (editing) {
        await dokterApi.updateDokter(editing.id, payload);
      } else {
        await dokterApi.createDokter(payload);
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
      title={editing ? t('master.dokter.editTitle') : t('master.dokter.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dokter-kode">{t('system.common.kode')}</Label>
            <Input id="dokter-kode" {...register('kode')} />
            {errors.kode && (
              <p className="text-sm text-destructive">
                {t(errors.kode.message ?? '', { defaultValue: errors.kode.message })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dokter-jenis">{t('master.dokter.jenisTenaga')}</Label>
            <select id="dokter-jenis" className={selectClassName} {...register('jenis_tenaga')}>
              {JENIS_TENAGA_LIST.map((jenis) => (
                <option key={jenis} value={jenis}>
                  {t(`master.dokter.jenis.${jenis}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dokter-nama">{t('system.common.nama')}</Label>
          <Input id="dokter-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dokter-sip">{t('master.dokter.sip')}</Label>
            <Input id="dokter-sip" {...register('sip')} />
            {errors.sip && (
              <p className="text-sm text-destructive">
                {t(errors.sip.message ?? '', { defaultValue: errors.sip.message })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dokter-spesialis">{t('master.dokter.spesialis')}</Label>
            <Input id="dokter-spesialis" {...register('spesialis')} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="dokter-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="dokter-active">{t('system.common.active')}</Label>
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
