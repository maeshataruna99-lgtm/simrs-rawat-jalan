/**
 * Dialog reset password pengguna oleh administrator (PUT /system/user/{id}/reset-password).
 *
 * Dipakai di: UserPage.
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
import { errorMessage, fieldErrors } from '@/lib/api-client';
import * as userApi from './user.api';
import type { UserItem } from './user.types';

const schema = z.object({
  password: z.string().min(8, 'system.user.passwordMin'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  target: UserItem | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Menampilkan dialog penggantian password akun pengguna.
 *
 * Dipakai di: UserPage.
 */
export function ResetPasswordDialog({ target, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setServerError(null);
    reset({ password: '' });
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: FormValues) => {
    if (!target) return;
    setServerError(null);
    try {
      await userApi.resetUserPassword(target.id, values.password);
      toast.success(t('system.user.resetPasswordSuccess'));
      handleOpenChange(false);
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields.password?.[0]) {
        setError('password', { message: fields.password[0] });
      } else {
        setServerError(errorMessage(err, t('common.saveFailed')));
      }
    }
  };

  return (
    <AppFormDialog
      open={Boolean(target)}
      onOpenChange={handleOpenChange}
      title={t('system.user.resetPasswordTitle')}
      description={t('system.user.resetPasswordDescription', { username: target?.username ?? '' })}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="reset-password">{t('system.user.newPassword')}</Label>
          <Input
            id="reset-password"
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
