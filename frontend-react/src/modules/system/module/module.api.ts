/**
 * Pemanggilan endpoint CRUD master modul di backend Yii (/system/module).
 *
 * Dipakai di: ModulePage, ModuleForm, MenuPage, MenuForm.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { ModuleItem, ModulePayload } from './module.types';

/**
 * Mengambil daftar modul berhalaman dari server.
 *
 * Dipakai di: ModulePage, MenuPage, MenuForm.
 */
export async function listModules(params: {
  q?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<ModuleItem>> {
  const { data } = await yiiApi.get<ApiResponse<ModuleItem[]>>('/system/module', { params });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambah modul baru.
 *
 * Dipakai di: ModuleForm.
 */
export async function createModule(payload: ModulePayload): Promise<ModuleItem> {
  const { data } = await yiiApi.post<ApiResponse<ModuleItem>>('/system/module', payload);
  return data.data;
}

/**
 * Mengubah data modul berdasarkan ID.
 *
 * Dipakai di: ModuleForm.
 */
export async function updateModule(id: number, payload: ModulePayload): Promise<ModuleItem> {
  const { data } = await yiiApi.put<ApiResponse<ModuleItem>>(`/system/module/${id}`, payload);
  return data.data;
}

/**
 * Menghapus modul (soft delete).
 *
 * Dipakai di: ModulePage.
 */
export async function deleteModule(id: number): Promise<void> {
  await yiiApi.delete(`/system/module/${id}`);
}
