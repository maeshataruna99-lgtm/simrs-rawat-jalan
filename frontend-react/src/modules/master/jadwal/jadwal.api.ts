/**
 * Pemanggilan endpoint CRUD master jadwal praktik dokter di backend Yii (/master/jadwal-dokter).
 *
 * Dipakai di: JadwalDokterPage, JadwalDokterForm, PendaftaranPage.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { JadwalDokterItem, JadwalDokterPayload } from './jadwal.types';

/**
 * Mengambil daftar jadwal praktik dokter berhalaman dari server.
 *
 * Dipakai di: JadwalDokterPage, PendaftaranPage.
 */
export async function listJadwalDokter(params: {
  q?: string;
  dokter_id?: number;
  poli_id?: number;
  hari?: number;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<JadwalDokterItem>> {
  const { data } = await yiiApi.get<ApiResponse<JadwalDokterItem[]>>('/master/jadwal-dokter', {
    params,
  });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambahkan jadwal praktik dokter baru.
 *
 * Dipakai di: JadwalDokterForm.
 */
export async function createJadwalDokter(payload: JadwalDokterPayload): Promise<JadwalDokterItem> {
  const { data } = await yiiApi.post<ApiResponse<JadwalDokterItem>>(
    '/master/jadwal-dokter',
    payload,
  );
  return data.data;
}

/**
 * Memperbarui jadwal praktik dokter berdasarkan ID.
 *
 * Dipakai di: JadwalDokterForm.
 */
export async function updateJadwalDokter(
  id: number,
  payload: JadwalDokterPayload,
): Promise<JadwalDokterItem> {
  const { data } = await yiiApi.put<ApiResponse<JadwalDokterItem>>(
    `/master/jadwal-dokter/${id}`,
    payload,
  );
  return data.data;
}

/**
 * Menghapus jadwal praktik dokter (soft delete).
 *
 * Dipakai di: JadwalDokterPage.
 */
export async function deleteJadwalDokter(id: number): Promise<void> {
  await yiiApi.delete(`/master/jadwal-dokter/${id}`);
}
