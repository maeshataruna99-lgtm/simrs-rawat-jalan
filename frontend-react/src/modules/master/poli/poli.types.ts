/**
 * Tipe data master poli (/master/poli).
 */

export interface PoliItem {
  id: number;
  kode: string;
  nama: string;
  prefix_antrean: string;
  tarif_pendaftaran: number;
  is_active: boolean;
}

export interface PoliPayload {
  kode: string;
  nama: string;
  prefix_antrean: string;
  tarif_pendaftaran: number;
  is_active: boolean;
}
