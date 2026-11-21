/**
 * Tipe data master pemeriksaan laboratorium (/master/pemeriksaan-lab).
 */

export interface PemeriksaanLabItem {
  id: number;
  kode: string;
  nama: string;
  satuan: string | null;
  nilai_rujukan: string | null;
  tarif: number;
  is_active: boolean;
}

export interface PemeriksaanLabPayload {
  kode: string;
  nama: string;
  satuan?: string | null;
  nilai_rujukan?: string | null;
  tarif: number;
  is_active: boolean;
}
