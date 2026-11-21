/**
 * Header area konten: tombol buka/tutup sidebar, breadcrumb modul > menu, dan pengganti tema.
 *
 * Dipakai di: components/layout/AppLayout.tsx.
 */
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { AppThemeToggle } from '@/components/AppThemeToggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuthStore } from '@/lib/auth-store';
import { findMenuByPath } from '@/lib/menu';

export function AppHeader() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const modules = useAuthStore((s) => s.user?.modules ?? []);
  const location = findMenuByPath(modules, pathname);

  const crumbs = location
    ? [location.module.nama, ...location.trail.map((menu) => menu.nama)]
    : [t('layout.home')];

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => (
            <Fragment key={`${crumb}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {index === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb}</BreadcrumbPage>
                ) : (
                  <span>{crumb}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <AppThemeToggle />
    </header>
  );
}
