/**
 * Tipe data master role (/system/role).
 */

export interface RoleItem {
  id: number;
  kode: string;
  nama: string;
  keterangan: string | null;
}

export interface RolePayload {
  kode: string;
  nama: string;
  keterangan?: string | null;
}
