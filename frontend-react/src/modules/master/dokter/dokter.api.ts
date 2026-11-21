/**
 * Pemanggilan endpoint CRUD master dokter dan tenaga medis di backend Yii (/master/dokter).
 *
 * Dipakai di: DokterPage, DokterForm, JadwalDokterPage, JadwalDokterForm, UserForm.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { DokterItem, DokterPayload, JenisTenaga } from './dokter.types';

/**
 * Mengambil daftar dokter dan tenaga medis berhalaman dari server.
 *
 * Dipakai di: DokterPage, JadwalDokterPage, JadwalDokterForm, UserForm.
 */
export async function listDokter(params: {
  q?: string;
  jenis_tenaga?: JenisTenaga | '';
  spesialis?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<DokterItem>> {
  const query = {
    ...params,
    jenis_tenaga: params.jenis_tenaga || undefined,
    spesialis: params.spesialis || undefined,
  };
  const { data } = await yiiApi.get<ApiResponse<DokterItem[]>>('/master/dokter', { params: query });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambahkan data dokter atau tenaga medis baru.
 *
 * Dipakai di: DokterForm.
 */
export async function createDokter(payload: DokterPayload): Promise<DokterItem> {
  const { data } = await yiiApi.post<ApiResponse<DokterItem>>('/master/dokter', payload);
  return data.data;
}

/**
 * Memperbarui data dokter atau tenaga medis berdasarkan ID.
 *
 * Dipakai di: DokterForm.
 */
export async function updateDokter(id: number, payload: DokterPayload): Promise<DokterItem> {
  const { data } = await yiiApi.put<ApiResponse<DokterItem>>(`/master/dokter/${id}`, payload);
  return data.data;
}

/**
 * Menghapus data dokter atau tenaga medis (soft delete).
 *
 * Dipakai di: DokterPage.
 */
export async function deleteDokter(id: number): Promise<void> {
  await yiiApi.delete(`/master/dokter/${id}`);
}
