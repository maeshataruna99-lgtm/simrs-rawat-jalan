/**
 * Pemanggilan endpoint CRUD master tindakan medis di backend Yii (/master/tindakan).
 *
 * Dipakai di: TindakanPage, TindakanForm, PemeriksaanPage.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { TindakanItem, TindakanPayload } from './tindakan.types';

/**
 * Mengambil daftar tindakan medis berhalaman dari server.
 *
 * Dipakai di: TindakanPage, PemeriksaanPage.
 */
export async function listTindakan(params: {
  q?: string;
  poli_id?: number | '';
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<TindakanItem>> {
  const query = {
    ...params,
    poli_id: params.poli_id || undefined,
  };
  const { data } = await yiiApi.get<ApiResponse<TindakanItem[]>>('/master/tindakan', {
    params: query,
  });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambahkan master tindakan medis baru.
 *
 * Dipakai di: TindakanForm.
 */
export async function createTindakan(payload: TindakanPayload): Promise<TindakanItem> {
  const { data } = await yiiApi.post<ApiResponse<TindakanItem>>('/master/tindakan', payload);
  return data.data;
}

/**
 * Memperbarui data tindakan medis berdasarkan ID.
 *
 * Dipakai di: TindakanForm.
 */
export async function updateTindakan(id: number, payload: TindakanPayload): Promise<TindakanItem> {
  const { data } = await yiiApi.put<ApiResponse<TindakanItem>>(`/master/tindakan/${id}`, payload);
  return data.data;
}

/**
 * Menghapus data tindakan medis (soft delete).
 *
 * Dipakai di: TindakanPage.
 */
export async function deleteTindakan(id: number): Promise<void> {
  await yiiApi.delete(`/master/tindakan/${id}`);
}
