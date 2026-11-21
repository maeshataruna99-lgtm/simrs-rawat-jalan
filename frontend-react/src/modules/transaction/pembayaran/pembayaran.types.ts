/**
 * Tipe data modul billing dan pembayaran rawat jalan.
 *
 * Dipakai di: pembayaran.api.ts, BillingPage.tsx, BayarDialog.tsx, InvoiceDetailDialog.tsx.
 */

export type InvoiceStatus = 'belum_dibayar' | 'dibayar_sebagian' | 'lunas';
export type InvoiceItemSumber = 'pendaftaran' | 'tindakan' | 'lab' | 'obat';
export type MetodePembayaran = 'tunai' | 'non_tunai';

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  sumber: InvoiceItemSumber;
  referensi_id: number;
  deskripsi: string;
  qty: number;
  harga: number;
  subtotal: number;
  is_void: boolean;
  alasan_void: string | null;
  created_at: string;
}

export interface PembayaranRingkas {
  id: number;
  no_pembayaran: string;
  invoice_id: number;
  idempotency_key: string;
  metode: MetodePembayaran;
  jumlah: number;
  no_referensi: string | null;
  kasir_id: number;
  dibayar_at: string;
  created_at: string;
  kasir: { id: number; username: string; nama: string } | null;
  invoice?: {
    id: number;
    no_invoice: string;
    kunjungan_id: number;
    total: number;
    total_bayar: number;
    sisa_tagihan: number;
    status: InvoiceStatus;
    kunjungan: { id: number; no_kunjungan: string; tgl_kunjungan: string } | null;
    pasien: { id: number; no_rm: string; nama: string } | null;
    poli: { id: number; nama: string } | null;
    dokter: { id: number; nama: string } | null;
  };
}

export interface Invoice {
  id: number;
  no_invoice: string;
  kunjungan_id: number;
  total: number;
  total_bayar: number;
  sisa_tagihan: number;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string | null;
  kunjungan: {
    id: number;
    no_kunjungan: string;
    tgl_kunjungan: string;
    status: string;
  } | null;
  pasien: {
    id: number;
    no_rm: string;
    nama: string;
    nik: string;
  } | null;
  poli: {
    id: number;
    kode: string;
    nama: string;
  } | null;
  dokter: {
    id: number;
    nama: string;
  } | null;
  items: InvoiceItem[];
  pembayaran: PembayaranRingkas[];
}

export interface KunjunganBelumTagih {
  id: number;
  no_kunjungan: string;
  tgl_kunjungan: string;
  no_antrean: number;
  status: string;
  pasien: { id: number; no_rm: string; nama: string } | null;
  poli: { id: number; kode: string; nama: string; tarif_pendaftaran?: number } | null;
  dokter: { id: number; nama: string } | null;
}

export interface InvoiceAuditLog {
  id: number;
  tabel: string;
  record_id: number;
  aksi: string;
  data_lama: Record<string, unknown> | null;
  data_baru: Record<string, unknown> | null;
  user_id: number | null;
  waktu: string;
}

export interface BayarPayload {
  invoice_id: number;
  metode: MetodePembayaran;
  jumlah: number;
  no_referensi?: string;
}

export interface BayarResult {
  pembayaran: PembayaranRingkas;
  invoice: Invoice;
}

export interface ListMeta {
  page: number;
  per_page: number;
  total: number;
}
