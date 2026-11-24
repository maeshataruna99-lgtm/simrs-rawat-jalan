/**
 * Integrasi sistem laboratorium eksternal: mengambil order dari Yii dan meneruskan hasil ke Yii.
 * Node tidak menulis tabel bisnis; hasil disimpan oleh Yii lewat PUT /transaction/hasil-lab/{detailId}.
 */
import { AppError } from '../../lib/app-error.js';
import { yiiRequest } from '../../lib/yii-client.js';

interface YiiOrderDetail {
  id: number;
  hasil: string | null;
  satuan: string | null;
  nilai_rujukan: string | null;
  flag: string | null;
  pemeriksaan: { kode: string; nama: string } | null;
}

interface YiiOrder {
  id: number;
  no_order: string;
  status: string;
  catatan_klinis: string | null;
  created_at: string;
  pasien: { no_rm: string; nama: string } | null;
  details: YiiOrderDetail[];
}

export interface LabResultInput {
  detail_id: number;
  hasil: string;
  idempotency_key: string;
}

/**
 * Order yang perlu dikerjakan laboratorium (bawaan status diminta dan diproses) dalam format sistem eksternal.
 *
 * Dipakai di: lab.routes.ts (GET /api/lab/orders).
 */
export async function listOrders(status: string) {
  const res = await yiiRequest<YiiOrder[]>(
    'GET',
    // shortcut: maksimal 100 order terlama per panggilan (batas per_page Yii), tambah paging bila antrean lab melebihi itu.
    `/transaction/order-lab?status=${encodeURIComponent(status)}&per_page=100`,
  );
  if (res.status !== 200) {
    throw new AppError(502, 'Gagal mengambil order dari backend Yii.');
  }
  return (res.body.data ?? []).map((o) => ({
    order_id: o.id,
    no_order: o.no_order,
    status: o.status,
    catatan_klinis: o.catatan_klinis,
    dibuat_at: o.created_at,
    pasien: o.pasien,
    pemeriksaan: o.details.map((d) => ({
      detail_id: d.id,
      kode: d.pemeriksaan?.kode ?? null,
      nama: d.pemeriksaan?.nama ?? null,
      satuan: d.satuan,
      nilai_rujukan: d.nilai_rujukan,
      hasil: d.hasil,
    })),
  }));
}

/**
 * Meneruskan satu hasil ke Yii dengan header Idempotency-Key.
 * Error validasi dari Yii (4xx) diteruskan apa adanya; Yii tidak terjangkau melempar YiiUnavailableError.
 *
 * Dipakai di: outbox.ts (deliver).
 */
export async function forwardResult(input: LabResultInput) {
  const res = await yiiRequest<YiiOrderDetail>(
    'PUT',
    `/transaction/hasil-lab/${input.detail_id}`,
    { hasil: input.hasil },
    { 'Idempotency-Key': input.idempotency_key },
  );
  if (res.status !== 200) {
    throw new AppError(
      res.status,
      res.body.message ?? 'Hasil ditolak backend Yii.',
      res.body.errors,
    );
  }
  return res.body.data;
}
