/**
 * Utilitas pohon menu dari profil user.
 */
import type { MenuItem, MenuModuleGroup } from '@/modules/system/auth/auth.types';

export interface MenuLocation {
  module: MenuModuleGroup;
  trail: MenuItem[];
}

/**
 * Mencari modul dan jejak menu (induk sampai menu aktif) untuk sebuah path.
 * Path anak seperti /master/pasien/5 tetap cocok dengan menu /master/pasien.
 *
 * Dipakai di: components/layout/AppHeader.tsx (breadcrumb), AppSidebar.tsx (menu aktif).
 */
export function findMenuByPath(modules: MenuModuleGroup[], pathname: string): MenuLocation | null {
  for (const module of modules) {
    const trail = findTrail(module.menus, pathname);
    if (trail) {
      return { module, trail };
    }
  }
  return null;
}

/** Apakah path halaman berada di bawah path menu. */
export function isPathActive(menuPath: string | null, pathname: string): boolean {
  if (!menuPath) return false;
  return pathname === menuPath || pathname.startsWith(`${menuPath}/`);
}

function findTrail(menus: MenuItem[], pathname: string): MenuItem[] | null {
  for (const menu of menus) {
    if (isPathActive(menu.path, pathname)) {
      return [menu];
    }
    const child = findTrail(menu.children, pathname);
    if (child) {
      return [menu, ...child];
    }
  }
  return null;
}
