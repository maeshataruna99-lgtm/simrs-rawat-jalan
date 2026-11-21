/**
 * Tipe data modul dashboard dan laporan dari service Node (/api/dashboard/*).
 *
 * Dipakai di: dashboard.api.ts, DashboardCharts.tsx, DashboardPage.tsx.
 */

export type PenjaminType = 'umum' | 'bpjs' | 'asuransi';

export interface PeriodeFilter {
  from: string;
  to: string;
  dokter_id?: number;
  penjamin?: PenjaminType;
}

export interface DashboardFilterOptions {
  dokter: Array<{ id: number; kode: string; nama: string }>;
  penjamin: PenjaminType[];
}

export interface DashboardSummary {
  periode: PeriodeFilter;
  total_kunjungan: number;
  total_tindakan: number;
  total_pendapatan: number;
  total_tagihan: number;
  invoice_per_status: {
    belum_dibayar: number;
    dibayar_sebagian: number;
    lunas: number;
  };
}

export interface KunjunganPerPoliItem {
  poli_id: number;
  kode: string;
  nama: string;
  jumlah_kunjungan: number;
}

export interface TindakanTerbanyakItem {
  tindakan_id: number;
  kode: string;
  nama: string;
  jumlah_kali: number;
  total_qty: number;
  total_nilai: number;
}

export interface PendapatanReport {
  periode: PeriodeFilter;
  per_hari: Array<{
    tanggal: string;
    jumlah_transaksi: number;
    total_pendapatan: number;
  }>;
  per_sumber: Array<{
    sumber: string;
    total_nilai: number;
  }>;
}

export interface ObatUsageItem {
  obat_id: number;
  kode: string;
  nama: string;
  satuan: string;
  total_jumlah: number;
  total_nilai: number;
}

export interface PembayaranReport {
  periode: PeriodeFilter;
  per_status: Array<{
    status: string;
    jumlah_invoice: number;
    total_tagihan: number;
    total_bayar: number;
  }>;
  per_metode: Array<{
    metode: string;
    jumlah_transaksi: number;
    total_bayar: number;
  }>;
}

export type DetailJenis = 'kunjungan' | 'tindakan' | 'pendapatan' | 'obat' | 'pembayaran';

export interface DashboardDetailRow {
  id: number;
  [key: string]: string | number | null | undefined;
}

export interface DashboardMeta {
  page: number;
  per_page: number;
  total: number;
}
