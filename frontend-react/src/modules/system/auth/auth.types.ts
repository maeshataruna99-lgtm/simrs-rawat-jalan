/**
 * Tipe data autentikasi, mengikuti respons /system/auth/login dan /system/auth/me di backend Yii.
 */

export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

export type MenuPermission = Record<PermissionAction, boolean>;

export interface MenuItem {
  kode: string;
  nama: string;
  path: string | null;
  icon: string | null;
  children: MenuItem[];
}

export interface MenuModuleGroup {
  kode: string;
  nama: string;
  icon: string | null;
  menus: MenuItem[];
}

export interface UserProfile {
  id: number;
  username: string;
  nama: string;
  dokter_id: number | null;
  role: { id: number; kode: string; nama: string };
  modules: MenuModuleGroup[];
  permissions: Record<string, MenuPermission>;
}

export interface LoginResult {
  token: string;
  expires_at: number;
  user: UserProfile;
}
