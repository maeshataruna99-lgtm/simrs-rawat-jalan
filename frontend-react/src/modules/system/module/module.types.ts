/**
 * Tipe data master modul (/system/module).
 */

export interface ModuleItem {
  id: number;
  kode: string;
  nama: string;
  icon: string | null;
  urutan: number;
  is_active: boolean;
}

export interface ModulePayload {
  kode: string;
  nama: string;
  icon?: string | null;
  urutan: number;
  is_active: boolean;
}
