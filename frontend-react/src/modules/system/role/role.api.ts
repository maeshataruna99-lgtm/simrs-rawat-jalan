/**
 * Pemanggilan endpoint CRUD master role di backend Yii (/system/role).
 *
 * Dipakai di: RolePage, RoleForm, UserPage, UserForm, RoleAccessPage.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { RoleItem, RolePayload } from './role.types';

/**
 * Mengambil daftar role berhalaman dari server.
 *
 * Dipakai di: RolePage, UserPage, UserForm, RoleAccessPage.
 */
export async function listRoles(params: {
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<RoleItem>> {
  const { data } = await yiiApi.get<ApiResponse<RoleItem[]>>('/system/role', { params });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambah role baru.
 *
 * Dipakai di: RoleForm.
 */
export async function createRole(payload: RolePayload): Promise<RoleItem> {
  const { data } = await yiiApi.post<ApiResponse<RoleItem>>('/system/role', payload);
  return data.data;
}

/**
 * Mengubah data role berdasarkan ID.
 *
 * Dipakai di: RoleForm.
 */
export async function updateRole(id: number, payload: RolePayload): Promise<RoleItem> {
  const { data } = await yiiApi.put<ApiResponse<RoleItem>>(`/system/role/${id}`, payload);
  return data.data;
}

/**
 * Menghapus role (soft delete).
 *
 * Dipakai di: RolePage.
 */
export async function deleteRole(id: number): Promise<void> {
  await yiiApi.delete(`/system/role/${id}`);
}
