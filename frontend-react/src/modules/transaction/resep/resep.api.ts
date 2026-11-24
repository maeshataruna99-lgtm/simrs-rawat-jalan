/**
 * Pemanggilan endpoint resep dokter dan pelayanan farmasi di backend Yii (/transaction/resep, /transaction/farmasi).
 *
 * Dipakai di: ResepPanel, FarmasiPage.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { toPage, yiiApi, type ApiResponse } from '@/lib/api-client';

export type ResepStatus = 'baru' | 'diproses' | 'diserahkan' | 'batal';

export interface ResepDetailItem {
  id: number;
  obat_id: number;
  dosis: string;
  frekuensi: string;
  jumlah: number;
  harga: number;
  subtotal: number;
  obat: { id: number; kode: string; nama: string; satuan: string; stok: number } | null;
}

export interface ResepItem {
  id: number;
  no_resep: string;
  kunjungan_id: number;
  status: ResepStatus;
  catatan: string | null;
  diserahkan_at: string | null;
  created_at: string;
  details: ResepDetailItem[];
  total: number;
  dokter: { id: number; nama: string } | null;
  pasien: { id: number; no_rm: string; nama: string } | null;
  poli: { id: number; nama: string } | null;
}

export interface ResepPayload {
  kunjungan_id: number;
  catatan?: string;
  items: { obat_id: number; dosis: string; frekuensi: string; jumlah: number }[];
}

/**
 * Resep satu kunjungan.
 *
 * Dipakai di: ResepPanel.
 */
export async function daftarResep(kunjunganId: number): Promise<ResepItem[]> {
  const { data } = await yiiApi.get<ApiResponse<ResepItem[]>>('/transaction/resep', {
    params: { kunjungan_id: kunjunganId },
  });
  return data.data;
}

/**
 * Membuat resep; jumlah melebihi stok ditolak 422 dengan nama obatnya.
 *
 * Dipakai di: ResepPanel.
 */
export async function buatResep(payload: ResepPayload): Promise<ResepItem> {
  const { data } = await yiiApi.post<ApiResponse<ResepItem>>('/transaction/resep', payload);
  return data.data;
}

/**
 * Antrean resep farmasi, bawaan status baru dan diproses.
 *
 * Dipakai di: FarmasiPage.
 */
export async function antreanFarmasi(params: {
  status?: ResepStatus | '';
  tanggal_dari?: string;
  tanggal_sampai?: string;
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<ResepItem>> {
  const { data } = await yiiApi.get<ApiResponse<ResepItem[]>>('/transaction/farmasi/antrean', {
    params: { ...params, status: params.status || undefined, q: params.q || undefined },
  });
  return toPage(data);
}

/**
 * Memproses resep (baru -> diproses) atau menyerahkan obat (diproses -> diserahkan, stok berkurang).
 *
 * Dipakai di: FarmasiPage.
 */
export async function ubahStatusResep(
  resepId: number,
  aksi: 'proses' | 'serahkan',
): Promise<ResepItem> {
  const { data } = await yiiApi.put<ApiResponse<ResepItem>>(
    `/transaction/farmasi/${resepId}/${aksi}`,
    {},
  );
  return data.data;
}
