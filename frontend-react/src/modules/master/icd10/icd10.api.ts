/**
 * Pemanggilan endpoint CRUD dan pencarian master ICD-10 di backend Yii (/master/icd10).
 *
 * Dipakai di: Icd10Page, Icd10Form, PemeriksaanPage.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { Icd10Item, Icd10Payload } from './icd10.types';

/**
 * Mengambil daftar ICD-10 berhalaman dari server.
 *
 * Dipakai di: Icd10Page, PemeriksaanPage.
 */
export async function listIcd10(params: {
  q?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<Icd10Item>> {
  const { data } = await yiiApi.get<ApiResponse<Icd10Item[]>>('/master/icd10', { params });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambahkan kode ICD-10 baru.
 *
 * Dipakai di: Icd10Form.
 */
export async function createIcd10(payload: Icd10Payload): Promise<Icd10Item> {
  const { data } = await yiiApi.post<ApiResponse<Icd10Item>>('/master/icd10', payload);
  return data.data;
}

/**
 * Memperbarui data ICD-10 berdasarkan ID.
 *
 * Dipakai di: Icd10Form.
 */
export async function updateIcd10(id: number, payload: Icd10Payload): Promise<Icd10Item> {
  const { data } = await yiiApi.put<ApiResponse<Icd10Item>>(`/master/icd10/${id}`, payload);
  return data.data;
}

/**
 * Menghapus data ICD-10 (soft delete).
 *
 * Dipakai di: Icd10Page.
 */
export async function deleteIcd10(id: number): Promise<void> {
  await yiiApi.delete(`/master/icd10/${id}`);
}
