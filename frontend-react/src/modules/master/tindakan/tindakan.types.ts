/**
 * Tipe data master tindakan medis (/master/tindakan).
 */

export interface TindakanItem {
  id: number;
  kode: string;
  nama: string;
  tarif: number;
  poli_id: number | null;
  is_active: boolean;
  poli: { id: number; kode: string; nama: string } | null;
}

export interface TindakanPayload {
  kode: string;
  nama: string;
  tarif: number;
  poli_id?: number | null;
  is_active: boolean;
}
