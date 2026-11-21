/**
 * Tipe data transaksi pendaftaran kunjungan dan antrean poli (/transaction/pendaftaran, /transaction/antrean).
 */

export type KunjunganStatus = 'menunggu' | 'diperiksa' | 'selesai' | 'batal';

export interface KunjunganStatusLogItem {
  id: number;
  kunjungan_id: number;
  status_lama: KunjunganStatus | null;
  status_baru: KunjunganStatus;
  user_id: number | null;
  waktu: string;
}

export interface KunjunganItem {
  id: number;
  no_kunjungan: string;
  pasien_id: number;
  poli_id: number;
  dokter_id: number;
  jadwal_id: number;
  tgl_kunjungan: string;
  no_antrean: number;
  status: KunjunganStatus;
  pasien: {
    id: number;
    no_rm: string;
    nik: string;
    nama: string;
    tgl_lahir: string;
    jenis_kelamin: 'L' | 'P';
  } | null;
  poli: {
    id: number;
    kode: string;
    nama: string;
    tarif_pendaftaran: number;
  } | null;
  dokter: {
    id: number;
    kode: string;
    nama: string;
    spesialis: string | null;
  } | null;
  status_logs?: KunjunganStatusLogItem[];
}

export interface DaftarKunjunganPayload {
  pasien_id: number;
  jadwal_id: number;
  tgl_kunjungan: string;
}

export interface DisplayAntreanEntry {
  id: number;
  no_antrean: number;
  kode_antrean: string;
  inisial_pasien: string;
  dokter_nama: string;
  status: KunjunganStatus;
}

export interface DisplayAntreanPoli {
  poli_id: number;
  poli_kode: string;
  poli_nama: string;
  sedang_diperiksa: DisplayAntreanEntry[];
  menunggu: DisplayAntreanEntry[];
  total_menunggu: number;
  total_selesai: number;
}

export interface DisplayAntreanResponse {
  tanggal: string;
  updated_at: string;
  poli_list: { id: number; kode: string; nama: string }[];
  poli: DisplayAntreanPoli[];
}
