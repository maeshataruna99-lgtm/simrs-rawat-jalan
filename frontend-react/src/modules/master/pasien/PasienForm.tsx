/**
 * Dialog form tambah dan ubah master pasien.
 *
 * Dipakai di: PasienPage.
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
import { Textarea } from '@/components/ui/textarea';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import * as pasienApi from './pasien.api';
import type { PasienItem } from './pasien.types';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const schema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'master.pasien.nikPattern'),
  nama: z.string().trim().min(1, 'master.pasien.namaRequired'),
  tgl_lahir: z.string().trim().min(1, 'master.pasien.tglLahirRequired'),
  jenis_kelamin: z.enum(['L', 'P']),
  no_hp: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PasienItem | null;
  onSaved: (saved: PasienItem) => void;
}

/**
 * Menampilkan form dialog pendaftaran atau perubahan identitas pasien.
 *
 * Dipakai di: PasienPage.
 */
export function PasienForm({ open, onOpenChange, editing, onSaved }: Props) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          nik: editing.nik,
          nama: editing.nama,
          tgl_lahir: editing.tgl_lahir,
          jenis_kelamin: editing.jenis_kelamin,
          no_hp: editing.no_hp ?? '',
          alamat: editing.alamat ?? '',
        }
      : {
          nik: '',
          nama: '',
          tgl_lahir: '',
          jenis_kelamin: 'L',
          no_hp: '',
          alamat: '',
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
        nik: values.nik,
        nama: values.nama,
        tgl_lahir: values.tgl_lahir,
        jenis_kelamin: values.jenis_kelamin,
        no_hp: values.no_hp || null,
        alamat: values.alamat || null,
      };
      const saved = editing
        ? await pasienApi.updatePasien(editing.id, payload)
        : await pasienApi.createPasien(payload);
      toast.success(t('common.saveSuccess'));
      handleOpenChange(false);
      onSaved(saved);
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
      title={editing ? t('master.pasien.editTitle') : t('master.pasien.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="pasien-nik">{t('master.pasien.nik')}</Label>
          <Input id="pasien-nik" maxLength={16} {...register('nik')} />
          {errors.nik && (
            <p className="text-sm text-destructive">
              {t(errors.nik.message ?? '', { defaultValue: errors.nik.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pasien-nama">{t('master.pasien.nama')}</Label>
          <Input id="pasien-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pasien-tgl-lahir">{t('master.pasien.tglLahir')}</Label>
            <Input id="pasien-tgl-lahir" type="date" {...register('tgl_lahir')} />
            {errors.tgl_lahir && (
              <p className="text-sm text-destructive">
                {t(errors.tgl_lahir.message ?? '', { defaultValue: errors.tgl_lahir.message })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pasien-jk">{t('master.pasien.jenisKelamin')}</Label>
            <select id="pasien-jk" className={selectClassName} {...register('jenis_kelamin')}>
              <option value="L">{t('master.pasien.jkL')}</option>
              <option value="P">{t('master.pasien.jkP')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pasien-no-hp">{t('master.pasien.noHp')}</Label>
          <Input id="pasien-no-hp" {...register('no_hp')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pasien-alamat">{t('master.pasien.alamat')}</Label>
          <Textarea id="pasien-alamat" {...register('alamat')} />
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
