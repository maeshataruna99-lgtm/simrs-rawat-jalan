/**
 * Pemanggilan endpoint worklist, pemeriksaan, diagnosis, dan riwayat rekam medis di backend Yii.
 *
 * Dipakai di: WorklistPage, PemeriksaanPage, RiwayatMedisPage, RiwayatMedisList.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { toPage, yiiApi, type ApiResponse } from '@/lib/api-client';
import type { PasienItem } from '@/modules/master/pasien/pasien.types';
import type { KunjunganItem } from '@/modules/transaction/pendaftaran/pendaftaran.types';
import type {
  DiagnosisItem,
  DiagnosisPayload,
  PemeriksaanData,
  PemeriksaanDetail,
  RiwayatMedisItem,
} from './pemeriksaan.types';

/**
 * Pasien hari ini yang menunggu atau sedang diperiksa (dokter hanya melihat pasiennya sendiri).
 *
 * Dipakai di: WorklistPage.
 */
export async function worklist(params: {
  tanggal_dari?: string;
  tanggal_sampai?: string;
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<KunjunganItem>> {
  const { data } = await yiiApi.get<ApiResponse<KunjunganItem[]>>(
    '/transaction/pemeriksaan/worklist',
    { params: { ...params, q: params.q || undefined } },
  );
  return toPage(data);
}

/**
 * Data kunjungan, hasil pemeriksaan, dan diagnosis untuk form pemeriksaan.
 *
 * Dipakai di: PemeriksaanPage.
 */
export async function detailPemeriksaan(kunjunganId: number): Promise<PemeriksaanDetail> {
  const { data } = await yiiApi.get<ApiResponse<PemeriksaanDetail>>(
    `/transaction/pemeriksaan/${kunjunganId}`,
  );
  return data.data;
}

/**
 * Menyimpan anamnesis, tanda vital, dan pemeriksaan fisik; status kunjungan menjadi diperiksa.
 *
 * Dipakai di: PemeriksaanPage.
 */
export async function simpanPemeriksaan(
  kunjunganId: number,
  payload: PemeriksaanData,
): Promise<PemeriksaanData> {
  const { data } = await yiiApi.put<ApiResponse<PemeriksaanData>>(
    `/transaction/pemeriksaan/${kunjunganId}`,
    payload,
  );
  return data.data;
}

/**
 * Mengganti seluruh diagnosis kunjungan (tepat satu utama, sekunder boleh banyak).
 *
 * Dipakai di: PemeriksaanPage.
 */
export async function simpanDiagnosis(
  kunjunganId: number,
  diagnosis: DiagnosisPayload[],
): Promise<DiagnosisItem[]> {
  const { data } = await yiiApi.put<ApiResponse<DiagnosisItem[]>>(
    `/transaction/diagnosis/${kunjunganId}`,
    { diagnosis },
  );
  return data.data;
}

/**
 * Riwayat rekam medis seorang pasien per kunjungan.
 *
 * Dipakai di: RiwayatMedisList.
 */
export async function riwayatMedis(pasienId: number): Promise<RiwayatMedisItem[]> {
  const { data } = await yiiApi.get<ApiResponse<RiwayatMedisItem[]>>(
    `/transaction/riwayat-medis/${pasienId}`,
  );
  return data.data;
}

/**
 * Mencari pasien berdasarkan nomor RM, NIK, atau nama untuk halaman riwayat rekam medis.
 *
 * Dipakai di: RiwayatMedisPage.
 */
export async function cariPasienRiwayat(q: string): Promise<PasienItem[]> {
  const { data } = await yiiApi.get<ApiResponse<PasienItem[]>>(
    '/transaction/riwayat-medis/cari-pasien',
    { params: { q } },
  );
  return data.data;
}
