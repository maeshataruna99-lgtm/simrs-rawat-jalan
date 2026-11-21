/**
 * Dialog form tambah dan ubah master role.
 *
 * Dipakai di: RolePage.
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
import * as roleApi from './role.api';
import type { RoleItem } from './role.types';

const schema = z.object({
  kode: z
    .string()
    .trim()
    .min(1, 'system.role.kodeRequired')
    .regex(/^[a-z0-9-]+$/, 'system.common.kodePattern'),
  nama: z.string().trim().min(1, 'system.role.namaRequired'),
  keterangan: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RoleItem | null;
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui data role.
 *
 * Dipakai di: RolePage.
 */
export function RoleForm({ open, onOpenChange, editing, onSaved }: Props) {
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
          kode: editing.kode,
          nama: editing.nama,
          keterangan: editing.keterangan ?? '',
        }
      : { kode: '', nama: '', keterangan: '' },
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
        keterangan: values.keterangan || null,
      };
      if (editing) {
        await roleApi.updateRole(editing.id, payload);
      } else {
        await roleApi.createRole(payload);
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
      title={editing ? t('system.role.editTitle') : t('system.role.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="role-kode">{t('system.common.kode')}</Label>
          <Input id="role-kode" {...register('kode')} />
          {errors.kode && (
            <p className="text-sm text-destructive">
              {t(errors.kode.message ?? '', { defaultValue: errors.kode.message })}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role-nama">{t('system.common.nama')}</Label>
          <Input id="role-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role-keterangan">{t('system.role.keterangan')}</Label>
          <Textarea id="role-keterangan" {...register('keterangan')} />
          {errors.keterangan && (
            <p className="text-sm text-destructive">
              {t(errors.keterangan.message ?? '', { defaultValue: errors.keterangan.message })}
            </p>
          )}
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
