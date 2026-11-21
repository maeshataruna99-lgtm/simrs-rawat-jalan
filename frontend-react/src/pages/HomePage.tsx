/**
 * Beranda setelah login: sapaan dan pintasan responsif ke menu yang boleh dibuka role user.
 * Dashboard statistik ada di menu Dashboard (poin 9.4).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AppEmptyState } from '@/components/AppEmptyState';
import { AppIcon } from '@/components/AppIcon';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth-store';
import { flattenModuleMenus } from '@/lib/menu';

export default function HomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const menus = flattenModuleMenus(user?.modules ?? []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('home.greeting', { nama: user?.nama })}
        </h1>
        <p className="text-sm text-muted-foreground">{t('home.role', { role: user?.role.nama })}</p>
      </div>

      {menus.length === 0 ? (
        <AppEmptyState title={t('common.emptyData')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Link key={menu.kode} to={menu.path} className="group block">
              <Card className="h-full transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-primary/60 group-hover:shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <AppIcon icon={menu.icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="truncate text-base">{menu.nama}</CardTitle>
                      <Badge
                        variant="secondary"
                        className="hidden shrink-0 text-[10px] sm:inline-flex"
                      >
                        {menu.moduleNama}
                      </Badge>
                    </div>
                    <CardDescription className="truncate font-mono text-xs">
                      {menu.path}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
