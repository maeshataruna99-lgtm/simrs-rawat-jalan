/**
 * Header aplikasi: tombol buka/tutup sidebar, bar pemilihan modul (top bar), pengganti tema, dan breadcrumb.
 * Memilih modul pada top bar mengganti isi menu yang tampil di sidebar.
 *
 * Dipakai di: components/layout/AppLayout.tsx.
 */
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { AppIcon } from '@/components/AppIcon';
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
import { cn } from '@/lib/utils';
import type { MenuModuleGroup } from '@/modules/system/auth/auth.types';

interface Props {
  activeModule: MenuModuleGroup | null;
  onSelectModule: (kode: string) => void;
}

export function AppHeader({ activeModule, onSelectModule }: Props) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const modules = useAuthStore((s) => s.user?.modules ?? []);
  const location = findMenuByPath(modules, pathname);

  const crumbs = location
    ? [location.module.nama, ...location.trail.map((menu) => menu.nama)]
    : activeModule
      ? [t('layout.home'), activeModule.nama]
      : [t('layout.home')];

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-h-14 items-center gap-2 px-4 py-1.5">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-1 h-5 shrink-0" />

        <nav
          aria-label={t('layout.moduleSwitcher')}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
        >
          {modules.map((mod) => {
            const isActive = activeModule?.kode === mod.kode;
            return (
              <button
                key={mod.kode}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelectModule(mod.kode)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 2xl:px-2.5 2xl:text-sm',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <AppIcon icon={mod.icon} className="h-3.5 w-3.5 shrink-0" />
                <span>{mod.nama}</span>
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 pl-1">
          <AppThemeToggle />
        </div>
      </div>

      <div className="flex h-9 items-center border-t bg-muted/30 px-4">
        <Breadcrumb>
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
      </div>
    </header>
  );
}
