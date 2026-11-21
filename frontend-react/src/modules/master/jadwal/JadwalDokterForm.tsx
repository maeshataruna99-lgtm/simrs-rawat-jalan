/**
 * Dialog form tambah dan ubah jadwal praktik dokter.
 * Menampilkan pesan validasi bila jadwal dokter bentrok di hari yang sama.
 *
 * Dipakai di: JadwalDokterPage.
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
import type { DokterItem } from '@/modules/master/dokter/dokter.types';
import type { PoliItem } from '@/modules/master/poli/poli.types';
import * as jadwalApi from './jadwal.api';
import type { JadwalDokterItem } from './jadwal.types';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const HARI_OPTIONS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
];

const schema = z.object({
  dokter_id: z.number().int().min(1, 'master.jadwal.dokterRequired'),
  poli_id: z.number().int().min(1, 'master.jadwal.poliRequired'),
  hari: z.number().int().min(1).max(7),
  jam_mulai: z
    .string()
    .trim()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'master.jadwal.jamPattern'),
  jam_selesai: z
    .string()
    .trim()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'master.jadwal.jamPattern'),
  kuota: z.number().int().min(1, 'master.jadwal.kuotaMin'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: JadwalDokterItem | null;
  dokterList: DokterItem[];
  poliList: PoliItem[];
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui jadwal praktik dokter.
 *
 * Dipakai di: JadwalDokterPage.
 */
export function JadwalDokterForm({
  open,
  onOpenChange,
  editing,
  dokterList,
  poliList,
  onSaved,
}: Props) {
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
          dokter_id: editing.dokter_id,
          poli_id: editing.poli_id,
          hari: editing.hari,
          jam_mulai: editing.jam_mulai,
          jam_selesai: editing.jam_selesai,
          kuota: editing.kuota,
          is_active: editing.is_active,
        }
      : {
          dokter_id: dokterList[0]?.id ?? 0,
          poli_id: poliList[0]?.id ?? 0,
          hari: 1,
          jam_mulai: '08:00',
          jam_selesai: '12:00',
          kuota: 20,
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
        await jadwalApi.updateJadwalDokter(editing.id, values);
      } else {
        await jadwalApi.createJadwalDokter(values);
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
      const firstFieldError = Object.values(fields).flat()[0];
      setServerError(firstFieldError ?? errorMessage(err, t('common.saveFailed')));
    }
  };

  return (
    <AppFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={editing ? t('master.jadwal.editTitle') : t('master.jadwal.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="jadwal-dokter">{t('master.jadwal.dokter')}</Label>
          <select
            id="jadwal-dokter"
            className={selectClassName}
            {...register('dokter_id', { valueAsNumber: true })}
          >
            <option value={0}>{t('master.jadwal.chooseDokter')}</option>
            {dokterList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama}
              </option>
            ))}
          </select>
          {errors.dokter_id && (
            <p className="text-sm text-destructive">
              {t(errors.dokter_id.message ?? '', { defaultValue: errors.dokter_id.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="jadwal-poli">{t('master.jadwal.poli')}</Label>
          <select
            id="jadwal-poli"
            className={selectClassName}
            {...register('poli_id', { valueAsNumber: true })}
          >
            <option value={0}>{t('master.jadwal.choosePoli')}</option>
            {poliList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
          {errors.poli_id && (
            <p className="text-sm text-destructive">
              {t(errors.poli_id.message ?? '', { defaultValue: errors.poli_id.message })}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jadwal-hari">{t('master.jadwal.hari')}</Label>
            <select
              id="jadwal-hari"
              className={selectClassName}
              {...register('hari', { valueAsNumber: true })}
            >
              {HARI_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jadwal-kuota">{t('master.jadwal.kuota')}</Label>
            <Input
              id="jadwal-kuota"
              type="number"
              min={1}
              {...register('kuota', { valueAsNumber: true })}
            />
            {errors.kuota && (
              <p className="text-sm text-destructive">
                {t(errors.kuota.message ?? '', { defaultValue: errors.kuota.message })}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jadwal-mulai">{t('master.jadwal.jamMulai')}</Label>
            <Input id="jadwal-mulai" placeholder="08:00" {...register('jam_mulai')} />
            {errors.jam_mulai && (
              <p className="text-sm text-destructive">
                {t(errors.jam_mulai.message ?? '', { defaultValue: errors.jam_mulai.message })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="jadwal-selesai">{t('master.jadwal.jamSelesai')}</Label>
            <Input id="jadwal-selesai" placeholder="12:00" {...register('jam_selesai')} />
            {errors.jam_selesai && (
              <p className="text-sm text-destructive">
                {t(errors.jam_selesai.message ?? '', { defaultValue: errors.jam_selesai.message })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="jadwal-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="jadwal-active">{t('system.common.active')}</Label>
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
