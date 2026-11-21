/**
 * Beranda setelah login: sapaan dan pintasan ke menu yang boleh dibuka role user.
 * Dashboard statistik ada di menu Dashboard (poin 9.4).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppIcon } from '@/components/AppIcon';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth-store';

export default function HomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const menus = user?.modules.flatMap((module) => module.menus).filter((menu) => menu.path) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('home.greeting', { nama: user?.nama })}</h1>
        <p className="text-muted-foreground">{t('home.role', { role: user?.role.nama })}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menus.map((menu) => (
          <Link key={menu.kode} to={menu.path!} className="group">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="rounded-md bg-muted p-2">
                  <AppIcon icon={menu.icon} className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{menu.nama}</CardTitle>
                  <CardDescription>{menu.path}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
