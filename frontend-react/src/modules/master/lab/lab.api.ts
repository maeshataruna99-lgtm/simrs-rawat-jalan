/**
 * Pemanggilan endpoint CRUD master pemeriksaan laboratorium di backend Yii (/master/pemeriksaan-lab).
 *
 * Dipakai di: PemeriksaanLabPage, PemeriksaanLabForm, OrderLabPanel.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { PemeriksaanLabItem, PemeriksaanLabPayload } from './lab.types';

/**
 * Mengambil daftar pemeriksaan laboratorium berhalaman dari server.
 *
 * Dipakai di: PemeriksaanLabPage, OrderLabPanel.
 */
export async function listPemeriksaanLab(params: {
  q?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<PemeriksaanLabItem>> {
  const { data } = await yiiApi.get<ApiResponse<PemeriksaanLabItem[]>>('/master/pemeriksaan-lab', {
    params,
  });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambahkan master pemeriksaan laboratorium baru.
 *
 * Dipakai di: PemeriksaanLabForm.
 */
export async function createPemeriksaanLab(
  payload: PemeriksaanLabPayload,
): Promise<PemeriksaanLabItem> {
  const { data } = await yiiApi.post<ApiResponse<PemeriksaanLabItem>>(
    '/master/pemeriksaan-lab',
    payload,
  );
  return data.data;
}

/**
 * Memperbarui data pemeriksaan laboratorium berdasarkan ID.
 *
 * Dipakai di: PemeriksaanLabForm.
 */
export async function updatePemeriksaanLab(
  id: number,
  payload: PemeriksaanLabPayload,
): Promise<PemeriksaanLabItem> {
  const { data } = await yiiApi.put<ApiResponse<PemeriksaanLabItem>>(
    `/master/pemeriksaan-lab/${id}`,
    payload,
  );
  return data.data;
}

/**
 * Menghapus data pemeriksaan laboratorium (soft delete).
 *
 * Dipakai di: PemeriksaanLabPage.
 */
export async function deletePemeriksaanLab(id: number): Promise<void> {
  await yiiApi.delete(`/master/pemeriksaan-lab/${id}`);
}
