/**
 * Pemanggilan endpoint CRUD master poli di backend Yii (/master/poli).
 *
 * Dipakai di: PoliPage, PoliForm, JadwalDokterPage, JadwalDokterForm, TindakanPage, TindakanForm.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { PoliItem, PoliPayload } from './poli.types';

/**
 * Mengambil daftar poli berhalaman dari server.
 *
 * Dipakai di: PoliPage, JadwalDokterPage, JadwalDokterForm, TindakanPage, TindakanForm.
 */
export async function listPoli(params: {
  q?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<PoliItem>> {
  const { data } = await yiiApi.get<ApiResponse<PoliItem[]>>('/master/poli', { params });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambahkan poli baru.
 *
 * Dipakai di: PoliForm.
 */
export async function createPoli(payload: PoliPayload): Promise<PoliItem> {
  const { data } = await yiiApi.post<ApiResponse<PoliItem>>('/master/poli', payload);
  return data.data;
}

/**
 * Memperbarui data poli berdasarkan ID.
 *
 * Dipakai di: PoliForm.
 */
export async function updatePoli(id: number, payload: PoliPayload): Promise<PoliItem> {
  const { data } = await yiiApi.put<ApiResponse<PoliItem>>(`/master/poli/${id}`, payload);
  return data.data;
}

/**
 * Menghapus data poli (soft delete).
 *
 * Dipakai di: PoliPage.
 */
export async function deletePoli(id: number): Promise<void> {
  await yiiApi.delete(`/master/poli/${id}`);
}
