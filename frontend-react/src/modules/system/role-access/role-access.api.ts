/**
 * Pemanggilan endpoint matriks hak akses role di backend Yii (/system/role-access/{roleId}).
 *
 * Dipakai di: RoleAccessPage.
 */
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { RoleAccessItemPayload, RoleAccessMatrix } from './role-access.types';

/**
 * Mengambil matriks hak akses menu × aksi untuk satu role.
 *
 * Dipakai di: RoleAccessPage.
 */
export async function fetchRoleAccess(roleId: number): Promise<RoleAccessMatrix> {
  const { data } = await yiiApi.get<ApiResponse<RoleAccessMatrix>>(`/system/role-access/${roleId}`);
  return data.data;
}

/**
 * Menyimpan seluruh matriks hak akses untuk satu role.
 *
 * Dipakai di: RoleAccessPage.
 */
export async function saveRoleAccess(
  roleId: number,
  access: RoleAccessItemPayload[],
): Promise<RoleAccessMatrix> {
  const { data } = await yiiApi.put<ApiResponse<RoleAccessMatrix>>(
    `/system/role-access/${roleId}`,
    { access },
  );
  return data.data;
}
