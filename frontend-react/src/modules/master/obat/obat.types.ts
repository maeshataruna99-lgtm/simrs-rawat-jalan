/**
 * Tipe data master obat dan riwayat mutasi stok (/master/obat).
 */

export interface ObatItem {
  id: number;
  kode: string;
  nama: string;
  satuan: string;
  harga: number;
  stok: number;
  is_active: boolean;
}

export interface ObatPayload {
  kode: string;
  nama: string;
  satuan: string;
  harga: number;
  is_active: boolean;
}

export interface SesuaikanStokPayload {
  stok_baru: number;
  referensi?: string;
}

export interface StokMutasiItem {
  id: number;
  obat_id: number;
  jenis: 'masuk' | 'keluar' | 'penyesuaian';
  qty: number;
  stok_sebelum: number;
  stok_sesudah: number;
  referensi: string | null;
  created_at: string;
  petugas: string | null;
}
