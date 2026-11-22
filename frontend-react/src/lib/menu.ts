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

export interface FlatMenuEntry {
  kode: string;
  nama: string;
  path: string;
  icon: string | null;
  moduleKode: string;
  moduleNama: string;
}

/**
 * Meratakan seluruh menu ber-path dari setiap modul agar mudah dicari pada pencarian global (Ctrl+K).
 *
 * Dipakai di: components/AppCommandSearch.tsx.
 */
export function flattenModuleMenus(modules: MenuModuleGroup[]): FlatMenuEntry[] {
  const result: FlatMenuEntry[] = [];
  const collect = (items: MenuItem[], mod: MenuModuleGroup) => {
    for (const item of items) {
      if (item.path) {
        result.push({
          kode: item.kode,
          nama: item.nama,
          path: item.path,
          icon: item.icon,
          moduleKode: mod.kode,
          moduleNama: mod.nama,
        });
      }
      if (item.children.length > 0) {
        collect(item.children, mod);
      }
    }
  };
  for (const mod of modules) {
    collect(mod.menus, mod);
  }
  return result;
}
