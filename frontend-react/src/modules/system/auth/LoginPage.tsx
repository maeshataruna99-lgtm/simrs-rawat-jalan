/**
 * Halaman login. Setelah berhasil, user diarahkan ke halaman yang tadi ingin dibuka atau ke beranda.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';
import { AppLocaleToggle } from '@/components/AppLocaleToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const schema = z.object({
  username: z.string().trim().min(1, 'auth.usernameRequired'),
  password: z.string().min(1, 'auth.passwordRequired'),
});

type LoginValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      await login(values.username, values.password);
    } catch (error) {
      const fields = fieldErrors(error);
      (['username', 'password'] as const).forEach((field) => {
        if (fields[field]) setError(field, { message: fields[field][0] });
      });
      if (Object.keys(fields).length === 0) {
        setServerError(errorMessage(error, t('auth.serverUnavailable')));
      }
    }
  };

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-muted px-4">
      <div className="absolute right-4 top-4">
        <AppLocaleToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">{t('app.name')}</CardTitle>
          <CardDescription>{t('auth.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input id="username" autoComplete="username" autoFocus {...register('username')} />
              {errors.username && (
                <p className="text-sm text-destructive">{t(errors.username.message ?? '')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{t(errors.password.message ?? '')}</p>
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
