/**
 * Dialog form tambah (dengan password) dan ubah (tanpa password) master pengguna.
 *
 * Dipakai di: UserPage.
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
import type { RoleItem } from '@/modules/system/role/role.types';
import * as userApi from './user.api';
import type { UserItem } from './user.types';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const baseSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'system.user.usernameMin')
    .regex(/^[a-z0-9._-]+$/, 'system.user.usernamePattern'),
  nama: z.string().trim().min(1, 'system.user.namaRequired'),
  role_id: z.number().int().min(1, 'system.user.roleRequired'),
  password: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof baseSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: UserItem | null;
  roles: RoleItem[];
  onSaved: () => void;
}

/**
 * Menampilkan form tambah atau ubah akun pengguna.
 * Input password hanya dirender saat membuat pengguna baru (`editing === null`).
 *
 * Dipakai di: UserPage.
 */
export function UserForm({ open, onOpenChange, editing, roles, onSaved }: Props) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = baseSchema.superRefine((val, ctx) => {
    if (!editing && (!val.password || val.password.length < 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'system.user.passwordMin',
      });
    }
  });

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
          username: editing.username,
          nama: editing.nama,
          role_id: editing.role_id,
          password: '',
          is_active: editing.is_active,
        }
      : {
          username: '',
          nama: '',
          role_id: roles[0]?.id ?? 0,
          password: '',
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
        await userApi.updateUser(editing.id, {
          username: values.username,
          nama: values.nama,
          role_id: values.role_id,
          is_active: values.is_active,
        });
      } else {
        await userApi.createUser({
          username: values.username,
          nama: values.nama,
          role_id: values.role_id,
          password: values.password ?? '',
          is_active: values.is_active,
        });
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
      title={editing ? t('system.user.editTitle') : t('system.user.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="user-username">{t('auth.username')}</Label>
          <Input id="user-username" {...register('username')} />
          {errors.username && (
            <p className="text-sm text-destructive">
              {t(errors.username.message ?? '', { defaultValue: errors.username.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-nama">{t('system.common.nama')}</Label>
          <Input id="user-nama" {...register('nama')} />
          {errors.nama && (
            <p className="text-sm text-destructive">
              {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-role">{t('system.user.role')}</Label>
          <select
            id="user-role"
            className={selectClassName}
            {...register('role_id', { valueAsNumber: true })}
          >
            <option value={0}>{t('system.user.chooseRole')}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.nama}
              </option>
            ))}
          </select>
          {errors.role_id && (
            <p className="text-sm text-destructive">
              {t(errors.role_id.message ?? '', { defaultValue: errors.role_id.message })}
            </p>
          )}
        </div>

        {!editing && (
          <div className="space-y-2">
            <Label htmlFor="user-password">{t('auth.password')}</Label>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {t(errors.password.message ?? '', { defaultValue: errors.password.message })}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="user-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="user-active">{t('system.common.active')}</Label>
          {errors.is_active && (
            <p className="text-sm text-destructive">
              {t(errors.is_active.message ?? '', { defaultValue: errors.is_active.message })}
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
