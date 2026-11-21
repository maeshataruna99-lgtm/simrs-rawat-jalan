/**
 * Pemanggilan endpoint CRUD master obat, penyesuaian stok, dan riwayat mutasi di backend Yii (/master/obat).
 *
 * Dipakai di: ObatPage, ObatForm, StokAdjustDialog, StokMutasiDialog, PemeriksaanPage.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { ObatItem, ObatPayload, SesuaikanStokPayload, StokMutasiItem } from './obat.types';

/**
 * Mengambil daftar obat berhalaman dari server.
 *
 * Dipakai di: ObatPage, PemeriksaanPage.
 */
export async function listObat(params: {
  q?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<ObatItem>> {
  const { data } = await yiiApi.get<ApiResponse<ObatItem[]>>('/master/obat', { params });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: params.per_page ?? 20, total: data.data.length },
  };
}

/**
 * Menambahkan master obat baru (stok awal 0).
 *
 * Dipakai di: ObatForm.
 */
export async function createObat(payload: ObatPayload): Promise<ObatItem> {
  const { data } = await yiiApi.post<ApiResponse<ObatItem>>('/master/obat', payload);
  return data.data;
}

/**
 * Memperbarui data obat berdasarkan ID (tanpa mengubah stok).
 *
 * Dipakai di: ObatForm.
 */
export async function updateObat(id: number, payload: ObatPayload): Promise<ObatItem> {
  const { data } = await yiiApi.put<ApiResponse<ObatItem>>(`/master/obat/${id}`, payload);
  return data.data;
}

/**
 * Menghapus data obat (soft delete).
 *
 * Dipakai di: ObatPage.
 */
export async function deleteObat(id: number): Promise<void> {
  await yiiApi.delete(`/master/obat/${id}`);
}

/**
 * Menyesuaikan stok obat secara manual dan mencatat riwayat mutasi.
 *
 * Dipakai di: StokAdjustDialog.
 */
export async function adjustObatStok(id: number, payload: SesuaikanStokPayload): Promise<ObatItem> {
  const { data } = await yiiApi.post<ApiResponse<ObatItem>>(
    `/master/obat/${id}/sesuaikan-stok`,
    payload,
  );
  return data.data;
}

/**
 * Mengambil riwayat mutasi stok untuk satu obat.
 *
 * Dipakai di: StokMutasiDialog.
 */
export async function listObatMutasi(id: number): Promise<StokMutasiItem[]> {
  const { data } = await yiiApi.get<ApiResponse<StokMutasiItem[]>>(`/master/obat/${id}/mutasi`);
  return data.data;
}
