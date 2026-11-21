/**
 * Pemanggilan endpoint CRUD master pengguna dan reset password di backend Yii (/system/user).
 *
 * Dipakai di: UserPage, UserForm, ResetPasswordDialog.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { CreateUserPayload, UpdateUserPayload, UserItem } from './user.types';

/**
 * Mengambil daftar pengguna berhalaman dari server.
 *
 * Dipakai di: UserPage.
 */
export async function listUsers(params: {
  q?: string;
  role_id?: number;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<UserItem>> {
  const { data } = await yiiApi.get<ApiResponse<UserItem[]>>('/system/user', { params });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Membuat akun pengguna baru beserta password awal.
 *
 * Dipakai di: UserForm.
 */
export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  const { data } = await yiiApi.post<ApiResponse<UserItem>>('/system/user', payload);
  return data.data;
}

/**
 * Mengubah data akun pengguna (tanpa password).
 *
 * Dipakai di: UserForm, UserPage (toggle aktif).
 */
export async function updateUser(id: number, payload: UpdateUserPayload): Promise<UserItem> {
  const { data } = await yiiApi.put<ApiResponse<UserItem>>(`/system/user/${id}`, payload);
  return data.data;
}

/**
 * Mengganti password pengguna oleh administrator.
 *
 * Dipakai di: ResetPasswordDialog.
 */
export async function resetUserPassword(id: number, password: string): Promise<void> {
  await yiiApi.put(`/system/user/${id}/reset-password`, { password });
}

/**
 * Menghapus akun pengguna (soft delete).
 *
 * Dipakai di: UserPage.
 */
export async function deleteUser(id: number): Promise<void> {
  await yiiApi.delete(`/system/user/${id}`);
}
