/**
 * Sidebar aplikasi: di bawah header identitas SIMRS Rawat Jalan terdapat tombol pemilih modul
 * (hider) yang saat diklik menampilkan daftar ikon dan nama modul. Sidebar hanya menampilkan
 * menu dari modul yang sedang aktif.
 *
 * Dipakai di: components/layout/AppLayout.tsx.
 */
import { Check, ChevronDown, Hospital, LayoutGrid, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';
import { AppIcon } from '@/components/AppIcon';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/lib/auth-store';
import { isPathActive } from '@/lib/menu';
import { cn } from '@/lib/utils';
import type { MenuItem, MenuModuleGroup } from '@/modules/system/auth/auth.types';

const ACTIVE_CLASS =
  'data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground';

interface Props {
  activeModule: MenuModuleGroup | null;
  onSelectModule: (kode: string) => void;
}

export function AppSidebar({ activeModule, onSelectModule }: Props) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const modules = user?.modules ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader className="gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Hospital className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">{t('app.name')}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {t('app.shortTagline')}
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {activeModule && (
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                type="button"
                aria-label={t('layout.moduleSwitcher')}
                aria-expanded={pickerOpen}
                tooltip={t('layout.moduleSwitcher')}
                onClick={() => setPickerOpen((prev) => !prev)}
                className="border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
                  <AppIcon icon={activeModule.icon} className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                    {t('layout.activeModule')}
                  </span>
                  <span className="truncate text-sm font-semibold">{activeModule.nama}</span>
                </div>
                <LayoutGrid className="size-3.5 text-sidebar-foreground/60" />
                <ChevronDown
                  className={cn(
                    'size-4 text-sidebar-foreground/70 transition-transform duration-200',
                    pickerOpen && 'rotate-180',
                  )}
                />
              </SidebarMenuButton>

              {pickerOpen && (
                <div
                  role="region"
                  aria-label={t('layout.moduleList')}
                  className="mt-1.5 space-y-0.5 rounded-lg border border-sidebar-border bg-sidebar-accent/25 p-1.5 group-data-[collapsible=icon]:hidden"
                >
                  {modules.map((mod) => {
                    const isSelected = mod.kode === activeModule.kode;
                    return (
                      <button
                        key={mod.kode}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          onSelectModule(mod.kode);
                          setPickerOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors',
                          isSelected
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                      >
                        <AppIcon icon={mod.icon} className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{mod.nama}</span>
                        {isSelected && <Check className="size-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {activeModule && (
          <SidebarGroup key={activeModule.kode}>
            <SidebarGroupLabel>{activeModule.nama}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activeModule.menus.map((menu) => (
                  <MenuEntry key={menu.kode} menu={menu} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm group-data-[collapsible=icon]:hidden">
              <div className="grid flex-1 leading-tight">
                <span className="truncate font-medium">{user?.nama}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {user?.role.nama}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip={t('auth.logout')}>
              <LogOut />
              <span>{t('auth.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Satu menu; menu dengan anak ditampilkan sebagai sub-menu. */
function MenuEntry({ menu, pathname }: { menu: MenuItem; pathname: string }) {
  if (menu.children.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isPathActive(menu.path, pathname)}
          tooltip={menu.nama}
          className={ACTIVE_CLASS}
        >
          <NavLink to={menu.path ?? '#'}>
            <AppIcon icon={menu.icon} />
            <span>{menu.nama}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={menu.nama}>
        <AppIcon icon={menu.icon} />
        <span>{menu.nama}</span>
      </SidebarMenuButton>
      <SidebarMenuSub>
        {menu.children.map((child) => (
          <SidebarMenuSubItem key={child.kode}>
            <SidebarMenuSubButton
              asChild
              isActive={isPathActive(child.path, pathname)}
              className={ACTIVE_CLASS}
            >
              <NavLink to={child.path ?? '#'}>{child.nama}</NavLink>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </SidebarMenuSub>
    </SidebarMenuItem>
  );
}
