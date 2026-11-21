/**
 * Pemanggilan endpoint pendaftaran kunjungan, antrean poli, dan riwayat kunjungan di backend Yii.
 *
 * Dipakai di: PendaftaranPage, AntreanPage.
 */
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { PasienItem } from '@/modules/master/pasien/pasien.types';
import type { DaftarKunjunganPayload, KunjunganItem, KunjunganStatus } from './pendaftaran.types';

/**
 * Mencari pasien aktif berdasarkan nomor RM, NIK, atau nama untuk loket pendaftaran.
 *
 * Dipakai di: PendaftaranPage.
 */
export async function cariPasienPendaftaran(q: string): Promise<PasienItem[]> {
  const { data } = await yiiApi.get<ApiResponse<PasienItem[]>>(
    '/transaction/pendaftaran/cari-pasien',
    { params: { q } },
  );
  return data.data;
}

/**
 * Mendaftarkan kunjungan baru sesuai jadwal dokter dan menerbitkan nomor antrean.
 *
 * Dipakai di: PendaftaranPage.
 */
export async function daftarKunjungan(payload: DaftarKunjunganPayload): Promise<KunjunganItem> {
  const { data } = await yiiApi.post<ApiResponse<KunjunganItem>>(
    '/transaction/pendaftaran',
    payload,
  );
  return data.data;
}

/**
 * Mengambil daftar antrean kunjungan berdasarkan filter poli, tanggal, status, atau kata kunci.
 *
 * Dipakai di: AntreanPage.
 */
export async function listAntrean(params: {
  poli_id?: number | '';
  tanggal?: string;
  status?: KunjunganStatus | '';
  q?: string;
}): Promise<KunjunganItem[]> {
  const query = {
    poli_id: params.poli_id || undefined,
    tanggal: params.tanggal || undefined,
    status: params.status || undefined,
    q: params.q || undefined,
  };
  const { data } = await yiiApi.get<ApiResponse<KunjunganItem[]>>('/transaction/antrean', {
    params: query,
  });
  return data.data;
}

/**
 * Mengubah status antrean kunjungan (menunggu -> diperiksa -> selesai / batal).
 *
 * Dipakai di: AntreanPage.
 */
export async function ubahStatusAntrean(
  id: number,
  status: KunjunganStatus,
): Promise<KunjunganItem> {
  const { data } = await yiiApi.put<ApiResponse<KunjunganItem>>(
    `/transaction/antrean/${id}/status`,
    { status },
  );
  return data.data;
}

/**
 * Mengambil riwayat seluruh kunjungan seorang pasien.
 *
 * Dipakai di: PendaftaranPage.
 */
export async function riwayatKunjunganPasien(pasienId: number): Promise<KunjunganItem[]> {
  const { data } = await yiiApi.get<ApiResponse<KunjunganItem[]>>(
    `/transaction/riwayat-kunjungan/${pasienId}`,
  );
  return data.data;
}
