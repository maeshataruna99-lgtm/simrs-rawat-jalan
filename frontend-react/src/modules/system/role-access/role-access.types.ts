/**
 * Tipe data matriks hak akses role (/system/role-access/{roleId}).
 */

export interface RoleAccessMenuRow {
  id: number;
  parent_id: number | null;
  kode: string;
  nama: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface RoleAccessModuleGroup {
  id: number | null;
  kode: string | null;
  nama: string;
  menus: RoleAccessMenuRow[];
}

export interface RoleAccessMatrix {
  role: { id: number; kode: string; nama: string };
  modules: RoleAccessModuleGroup[];
}

export interface RoleAccessItemPayload {
  menu_id: number;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}
