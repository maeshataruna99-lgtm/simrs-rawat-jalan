/**
 * Pemanggilan endpoint tindakan medis per kunjungan di backend Yii (/transaction/tindakan).
 *
 * Dipakai di: TindakanPanel.
 */
import { yiiApi, type ApiResponse } from '@/lib/api-client';

export interface TindakanKunjunganItem {
  id: number;
  kunjungan_id: number;
  tindakan_id: number;
  qty: number;
  tarif: number;
  subtotal: number;
  status: 'aktif' | 'batal';
  tindakan: { id: number; kode: string; nama: string } | null;
}

/**
 * Daftar tindakan satu kunjungan beserta total tindakan aktif.
 *
 * Dipakai di: TindakanPanel.
 */
export async function daftarTindakan(
  kunjunganId: number,
): Promise<{ items: TindakanKunjunganItem[]; total: number }> {
  const { data } = await yiiApi.get<ApiResponse<{ items: TindakanKunjunganItem[]; total: number }>>(
    `/transaction/tindakan/${kunjunganId}`,
  );
  return data.data;
}

/**
 * Menambahkan tindakan ke kunjungan; tarif diambil dari master saat ini.
 *
 * Dipakai di: TindakanPanel.
 */
export async function tambahTindakan(
  kunjunganId: number,
  payload: { tindakan_id: number; qty: number },
): Promise<TindakanKunjunganItem> {
  const { data } = await yiiApi.post<ApiResponse<TindakanKunjunganItem>>(
    `/transaction/tindakan/${kunjunganId}`,
    payload,
  );
  return data.data;
}

/**
 * Membatalkan satu tindakan kunjungan.
 *
 * Dipakai di: TindakanPanel.
 */
export async function batalTindakan(itemId: number): Promise<TindakanKunjunganItem> {
  const { data } = await yiiApi.delete<ApiResponse<TindakanKunjunganItem>>(
    `/transaction/tindakan/item/${itemId}`,
  );
  return data.data;
}
