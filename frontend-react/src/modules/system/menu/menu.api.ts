/**
 * Pemanggilan endpoint CRUD master menu di backend Yii (/system/menu).
 *
 * Dipakai di: MenuPage, MenuForm.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { SystemMenuItem, SystemMenuPayload } from './menu.types';

/**
 * Mengambil daftar menu berhalaman dari server.
 *
 * Dipakai di: MenuPage, MenuForm.
 */
export async function listMenus(params: {
  q?: string;
  module_id?: number;
  parent_id?: number;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<SystemMenuItem>> {
  const { data } = await yiiApi.get<ApiResponse<SystemMenuItem[]>>('/system/menu', { params });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambah menu baru.
 *
 * Dipakai di: MenuForm.
 */
export async function createMenu(payload: SystemMenuPayload): Promise<SystemMenuItem> {
  const { data } = await yiiApi.post<ApiResponse<SystemMenuItem>>('/system/menu', payload);
  return data.data;
}

/**
 * Mengubah data menu berdasarkan ID.
 *
 * Dipakai di: MenuForm.
 */
export async function updateMenu(id: number, payload: SystemMenuPayload): Promise<SystemMenuItem> {
  const { data } = await yiiApi.put<ApiResponse<SystemMenuItem>>(`/system/menu/${id}`, payload);
  return data.data;
}

/**
 * Menghapus menu (soft delete).
 *
 * Dipakai di: MenuPage.
 */
export async function deleteMenu(id: number): Promise<void> {
  await yiiApi.delete(`/system/menu/${id}`);
}
