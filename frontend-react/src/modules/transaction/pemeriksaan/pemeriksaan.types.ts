/**
 * Tipe data pemeriksaan dokter, diagnosis ICD-10, dan riwayat rekam medis
 * (/transaction/pemeriksaan, /transaction/diagnosis, /transaction/riwayat-medis).
 */
import type { KunjunganItem } from '@/modules/transaction/pendaftaran/pendaftaran.types';
import type { TindakanKunjunganItem } from '@/modules/transaction/tindakan/tindakan.api';

export interface PemeriksaanData {
  keluhan_utama: string | null;
  anamnesis: string | null;
  td_sistolik: number | null;
  td_diastolik: number | null;
  nadi: number | null;
  suhu: number | null;
  respirasi: number | null;
  spo2: number | null;
  berat_badan: number | null;
  tinggi_badan: number | null;
  pemeriksaan_fisik: string | null;
}

export type DiagnosisJenis = 'utama' | 'sekunder';

export interface DiagnosisItem {
  id: number;
  kunjungan_id: number;
  icd10_id: number;
  jenis: DiagnosisJenis;
  icd10: { id: number; kode: string; nama: string } | null;
}

export interface DiagnosisPayload {
  icd10_id: number;
  jenis: DiagnosisJenis;
}

export interface PemeriksaanDetail {
  kunjungan: KunjunganItem;
  pemeriksaan: PemeriksaanData | null;
  diagnosis: DiagnosisItem[];
}

export interface RiwayatMedisItem {
  kunjungan: Pick<
    KunjunganItem,
    'id' | 'no_kunjungan' | 'tgl_kunjungan' | 'status' | 'poli' | 'dokter'
  >;
  pemeriksaan: PemeriksaanData | null;
  diagnosis: DiagnosisItem[];
  tindakan: TindakanKunjunganItem[];
}
