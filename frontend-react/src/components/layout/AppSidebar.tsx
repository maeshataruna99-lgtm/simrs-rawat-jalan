/**
 * Sidebar aplikasi: dibangun dari pohon menu profil user (/system/auth/me),
 * sehingga setiap role hanya melihat menu yang boleh dibukanya.
 *
 * Dipakai di: components/layout/AppLayout.tsx.
 */
import { Hospital, LogOut } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/lib/auth-store';
import { isPathActive } from '@/lib/menu';
import type { MenuItem } from '@/modules/system/auth/auth.types';

const ACTIVE_CLASS =
  'data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground';

export function AppSidebar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
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
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {user?.modules.map((module) => (
          <SidebarGroup key={module.kode}>
            <SidebarGroupLabel>{module.nama}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {module.menus.map((menu) => (
                  <MenuEntry key={menu.kode} menu={menu} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
