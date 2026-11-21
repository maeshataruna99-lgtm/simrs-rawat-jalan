/**
 * Tipe data master menu (/system/menu).
 */

export interface SystemMenuItem {
  id: number;
  parent_id: number | null;
  module_id: number | null;
  kode: string;
  nama: string;
  path: string | null;
  icon: string | null;
  urutan: number;
  is_active: boolean;
}

export interface SystemMenuPayload {
  kode: string;
  nama: string;
  module_id: number;
  parent_id?: number | null;
  path?: string | null;
  icon?: string | null;
  urutan: number;
  is_active: boolean;
}
