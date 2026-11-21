/**
 * Beranda sementara setelah login. Diganti layout dengan sidebar di poin 1.12.
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';

export default function HomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <main className="container space-y-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">{t('app.name')}</h1>
        <p className="text-muted-foreground">
          {t('auth.welcome', { nama: user?.nama, role: user?.role.nama })}
        </p>
      </div>
      <Button variant="outline" onClick={logout}>
        {t('auth.logout')}
      </Button>
    </main>
  );
}
