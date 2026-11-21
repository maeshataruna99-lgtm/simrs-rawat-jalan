/**
 * Tipe data master jadwal praktik dokter (/master/jadwal-dokter).
 */

export interface JadwalDokterItem {
  id: number;
  dokter_id: number;
  poli_id: number;
  hari: number;
  hari_nama: string | null;
  jam_mulai: string;
  jam_selesai: string;
  kuota: number;
  is_active: boolean;
  dokter: { id: number; kode: string; nama: string; spesialis: string | null } | null;
  poli: { id: number; kode: string; nama: string } | null;
}

export interface JadwalDokterPayload {
  dokter_id: number;
  poli_id: number;
  hari: number;
  jam_mulai: string;
  jam_selesai: string;
  kuota: number;
  is_active: boolean;
}
