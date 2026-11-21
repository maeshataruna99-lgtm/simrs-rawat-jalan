/**
 * Klien HTTP modul dashboard ke service Node (/api/dashboard/*).
 *
 * Dipakai di: DashboardPage.tsx, tests/dashboard.test.tsx.
 */
import { nodeApi, type ApiResponse } from '@/lib/api-client';
import type {
  DashboardDetailRow,
  DashboardMeta,
  DashboardSummary,
  DetailJenis,
  KunjunganPerPoliItem,
  ObatUsageItem,
  PembayaranReport,
  PendapatanReport,
  PeriodeFilter,
  TindakanTerbanyakItem,
} from './dashboard.types';

/**
 * Mengambil ringkasan utama dashboard (kunjungan, tindakan, pendapatan, status invoice).
 *
 * Dipakai di: DashboardPage.tsx.
 */
export async function getSummary(periode: PeriodeFilter): Promise<DashboardSummary> {
  const { data } = await nodeApi.get<ApiResponse<DashboardSummary>>('/api/dashboard/summary', {
    params: periode,
  });
  return data.data;
}

/**
 * Mengambil jumlah kunjungan per poli pada periode terpilih.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export async function getKunjunganPerPoli(periode: PeriodeFilter): Promise<KunjunganPerPoliItem[]> {
  const { data } = await nodeApi.get<ApiResponse<KunjunganPerPoliItem[]>>(
    '/api/dashboard/kunjungan-per-poli',
    { params: periode },
  );
  return data.data;
}

/**
 * Mengambil daftar tindakan medis terbanyak pada periode terpilih.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export async function getTindakan(periode: PeriodeFilter): Promise<TindakanTerbanyakItem[]> {
  const { data } = await nodeApi.get<ApiResponse<TindakanTerbanyakItem[]>>(
    '/api/dashboard/tindakan',
    { params: periode },
  );
  return data.data;
}

/**
 * Mengambil laporan pendapatan per hari dan per sumber biaya pada periode terpilih.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export async function getPendapatan(periode: PeriodeFilter): Promise<PendapatanReport> {
  const { data } = await nodeApi.get<ApiResponse<PendapatanReport>>('/api/dashboard/pendapatan', {
    params: periode,
  });
  return data.data;
}

/**
 * Mengambil rekap penggunaan obat terbanyak pada periode terpilih.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export async function getObat(periode: PeriodeFilter): Promise<ObatUsageItem[]> {
  const { data } = await nodeApi.get<ApiResponse<ObatUsageItem[]>>('/api/dashboard/obat', {
    params: periode,
  });
  return data.data;
}

/**
 * Mengambil ringkasan status dan metode pembayaran pada periode terpilih.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export async function getPembayaran(periode: PeriodeFilter): Promise<PembayaranReport> {
  const { data } = await nodeApi.get<ApiResponse<PembayaranReport>>('/api/dashboard/pembayaran', {
    params: periode,
  });
  return data.data;
}

/**
 * Mengambil rincian tabel dashboard berhalaman berdasarkan jenis laporan dan periode.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export async function getDetail(
  jenis: DetailJenis,
  params: PeriodeFilter & { page?: number; per_page?: number },
): Promise<{ items: DashboardDetailRow[]; meta: DashboardMeta }> {
  const { data } = await nodeApi.get<ApiResponse<DashboardDetailRow[]>>(
    `/api/dashboard/detail/${jenis}`,
    {
      params: {
        from: params.from,
        to: params.to,
        page: params.page ?? 1,
        per_page: params.per_page ?? 10,
      },
    },
  );
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: 10, total: data.data.length },
  };
}
