/**
 * Tipe data master dokter dan tenaga medis (/master/dokter).
 */

export type JenisTenaga = 'dokter' | 'perawat' | 'analis' | 'apoteker';

export interface DokterItem {
  id: number;
  kode: string;
  nama: string;
  sip: string;
  spesialis: string | null;
  jenis_tenaga: JenisTenaga;
  is_active: boolean;
}

export interface DokterPayload {
  kode: string;
  nama: string;
  sip: string;
  spesialis?: string | null;
  jenis_tenaga: JenisTenaga;
  is_active: boolean;
}
