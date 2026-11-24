/**
 * Pemanggilan endpoint order dan hasil laboratorium di backend Yii (/transaction/order-lab, /transaction/hasil-lab).
 *
 * Dipakai di: OrderLabPanel, LaboratoriumPage.
 */
import type { PaginatedResult } from '@/hooks/use-crud';
import { toPage, yiiApi, type ApiResponse } from '@/lib/api-client';

export type OrderLabStatus = 'diminta' | 'diproses' | 'selesai';
export type LabFlag = 'normal' | 'tinggi' | 'rendah';

export interface OrderLabDetailItem {
  id: number;
  pemeriksaan_lab_id: number;
  tarif: number;
  hasil: string | null;
  satuan: string | null;
  nilai_rujukan: string | null;
  flag: LabFlag | null;
  diinput_at: string | null;
  pemeriksaan: { id: number; kode: string; nama: string } | null;
}

export interface OrderLabItem {
  id: number;
  no_order: string;
  kunjungan_id: number;
  status: OrderLabStatus;
  catatan_klinis: string | null;
  created_at: string;
  total: number;
  details: OrderLabDetailItem[];
  dokter: { id: number; nama: string } | null;
  pasien: { id: number; no_rm: string; nama: string } | null;
  poli: { id: number; nama: string } | null;
}

/**
 * Order laboratorium satu kunjungan (untuk dokter).
 *
 * Dipakai di: OrderLabPanel.
 */
export async function orderPerKunjungan(kunjunganId: number): Promise<OrderLabItem[]> {
  const { data } = await yiiApi.get<ApiResponse<OrderLabItem[]>>(
    '/transaction/order-lab/per-kunjungan',
    { params: { kunjungan_id: kunjunganId } },
  );
  return data.data;
}

/**
 * Membuat order laboratorium; tarif disalin dari master saat order dibuat.
 *
 * Dipakai di: OrderLabPanel.
 */
export async function buatOrderLab(payload: {
  kunjungan_id: number;
  catatan_klinis: string;
  pemeriksaan_lab_ids: number[];
}): Promise<OrderLabItem> {
  const { data } = await yiiApi.post<ApiResponse<OrderLabItem>>('/transaction/order-lab', payload);
  return data.data;
}

/**
 * Worklist laboratorium berdasarkan status (dipisah koma).
 *
 * Dipakai di: LaboratoriumPage.
 */
export async function worklistLab(params: {
  status?: string;
  tanggal_dari?: string;
  tanggal_sampai?: string;
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResult<OrderLabItem>> {
  const { data } = await yiiApi.get<ApiResponse<OrderLabItem[]>>('/transaction/order-lab', {
    params: { ...params, q: params.q || undefined },
  });
  return toPage(data);
}

/**
 * Menyimpan hasil satu pemeriksaan; flag dihitung Yii dari nilai rujukan.
 *
 * Dipakai di: LaboratoriumPage.
 */
export async function simpanHasilLab(detailId: number, hasil: string): Promise<OrderLabDetailItem> {
  const { data } = await yiiApi.put<ApiResponse<OrderLabDetailItem>>(
    `/transaction/hasil-lab/${detailId}`,
    { hasil },
  );
  return data.data;
}
