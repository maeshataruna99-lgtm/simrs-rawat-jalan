/**
 * Klien HTTP modul billing dan pembayaran ke backend Yii (/transaction/invoice dan /transaction/pembayaran).
 *
 * Dipakai di: BillingPage.tsx, BayarDialog.tsx, InvoiceDetailDialog.tsx, tests/transaction-billing.test.tsx.
 */
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type {
  BayarPayload,
  BayarResult,
  Invoice,
  InvoiceAuditLog,
  InvoiceStatus,
  KunjunganBelumTagih,
  ListMeta,
  MetodePembayaran,
  PembayaranRingkas,
} from './pembayaran.types';

/**
 * Mengambil daftar invoice berhalaman dengan filter status dan pencarian.
 *
 * Dipakai di: BillingPage.tsx.
 */
export async function listInvoice(params: {
  status?: InvoiceStatus | '';
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<{ items: Invoice[]; meta: ListMeta }> {
  const { data } = await yiiApi.get<ApiResponse<Invoice[]>>('/transaction/invoice', {
    params: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.q ? { q: params.q } : {}),
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
    },
  });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: 20, total: data.data.length },
  };
}

/**
 * Mengambil detail satu invoice lengkap dengan item dan riwayat pembayarannya.
 *
 * Dipakai di: BillingPage.tsx, InvoiceDetailDialog.tsx.
 */
export async function getInvoice(id: number): Promise<Invoice> {
  const { data } = await yiiApi.get<ApiResponse<Invoice>>(`/transaction/invoice/${id}`);
  return data.data;
}

/**
 * Mengambil daftar kunjungan non-batal yang belum memiliki invoice.
 *
 * Dipakai di: BillingPage.tsx.
 */
export async function listBelumTagih(params?: { q?: string }): Promise<KunjunganBelumTagih[]> {
  const { data } = await yiiApi.get<ApiResponse<KunjunganBelumTagih[]>>(
    '/transaction/invoice/belum-tagih',
    { params: params?.q ? { q: params.q } : undefined },
  );
  return data.data;
}

/**
 * Membentuk invoice baru untuk satu kunjungan dari 4 sumber biaya aktifnya.
 *
 * Dipakai di: BillingPage.tsx.
 */
export async function buatInvoice(kunjunganId: number): Promise<Invoice> {
  const { data } = await yiiApi.post<ApiResponse<Invoice>>(`/transaction/invoice/${kunjunganId}`);
  return data.data;
}

/**
 * Mengambil jejak audit log revisi tagihan dan perubahan klinis untuk satu invoice.
 *
 * Dipakai di: InvoiceDetailDialog.tsx.
 */
export async function getAuditLogInvoice(invoiceId: number): Promise<InvoiceAuditLog[]> {
  const { data } = await yiiApi.get<ApiResponse<InvoiceAuditLog[]>>(
    `/transaction/invoice/${invoiceId}/audit-log`,
  );
  return data.data;
}

/**
 * Mengambil daftar riwayat pembayaran berhalaman dengan filter metode dan pencarian.
 *
 * Dipakai di: BillingPage.tsx.
 */
export async function listPembayaran(params: {
  metode?: MetodePembayaran | '';
  q?: string;
  page?: number;
  per_page?: number;
}): Promise<{ items: PembayaranRingkas[]; meta: ListMeta }> {
  const { data } = await yiiApi.get<ApiResponse<PembayaranRingkas[]>>('/transaction/pembayaran', {
    params: {
      ...(params.metode ? { metode: params.metode } : {}),
      ...(params.q ? { q: params.q } : {}),
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
    },
  });
  return {
    items: data.data,
    meta: data.meta ?? { page: 1, per_page: 20, total: data.data.length },
  };
}

/**
 * Mengambil satu transaksi pembayaran beserta ringkasan invoicenya.
 *
 * Dipakai di: halaman cetak bukti bayar.
 */
export async function getPembayaran(id: number): Promise<PembayaranRingkas> {
  const { data } = await yiiApi.get<ApiResponse<PembayaranRingkas>>(
    `/transaction/pembayaran/${id}`,
  );
  return data.data;
}

/**
 * Menghasilkan UUID v4 untuk header Idempotency-Key setiap sesi form bayar baru (D.3).
 *
 * Dipakai di: BillingPage.tsx.
 */
export function buatIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Mencatat pembayaran invoice dengan header Idempotency-Key untuk mencegah bayar ganda (D.3).
 *
 * Dipakai di: BayarDialog.tsx.
 */
export async function bayarInvoice(
  payload: BayarPayload,
  idempotencyKey: string,
): Promise<BayarResult> {
  const { data } = await yiiApi.post<ApiResponse<BayarResult>>('/transaction/pembayaran', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data.data;
}
