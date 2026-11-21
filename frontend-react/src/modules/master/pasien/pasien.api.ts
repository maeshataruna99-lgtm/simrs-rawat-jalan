/**
 * Pemanggilan endpoint CRUD master pasien di backend Yii (/master/pasien).
 *
 * Dipakai di: PasienPage, PasienForm, PendaftaranPage.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { JenisKelamin, PasienItem, PasienPayload } from './pasien.types';

/**
 * Mengambil daftar pasien berhalaman dari server (pencarian RM/NIK/nama).
 *
 * Dipakai di: PasienPage, PendaftaranPage.
 */
export async function listPasien(params: {
  q?: string;
  jenis_kelamin?: JenisKelamin | '';
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<PasienItem>> {
  const query = {
    ...params,
    jenis_kelamin: params.jenis_kelamin || undefined,
  };
  const { data } = await yiiApi.get<ApiResponse<PasienItem[]>>('/master/pasien', { params: query });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Mendaftarkan pasien baru (nomor RM diterbitkan otomatis oleh server).
 *
 * Dipakai di: PasienForm.
 */
export async function createPasien(payload: PasienPayload): Promise<PasienItem> {
  const { data } = await yiiApi.post<ApiResponse<PasienItem>>('/master/pasien', payload);
  return data.data;
}

/**
 * Memperbarui data pasien berdasarkan ID.
 *
 * Dipakai di: PasienForm.
 */
export async function updatePasien(id: number, payload: PasienPayload): Promise<PasienItem> {
  const { data } = await yiiApi.put<ApiResponse<PasienItem>>(`/master/pasien/${id}`, payload);
  return data.data;
}

/**
 * Menghapus data pasien (soft delete).
 *
 * Dipakai di: PasienPage.
 */
export async function deletePasien(id: number): Promise<void> {
  await yiiApi.delete(`/master/pasien/${id}`);
}
