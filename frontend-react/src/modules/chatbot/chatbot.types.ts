/**
 * Struktur data pesan chatbot terstruktur (serializable JSON) agar riwayat chat
 * otomatis mengikuti perubahan bahasa aktif dan dapat disimpan di sessionStorage.
 *
 * Dipakai di: chatbot.storage.ts, lookups.ts, ChatbotWidget.tsx.
 */
import type { DashboardSummary } from '@/modules/dashboard/dashboard.types';
import type { Topic } from './knowledge';

export interface PasienResultRow {
  id: number;
  no_rm: string;
  nama: string;
  jenis_kelamin: string;
  tgl_lahir: string;
}

export interface KunjunganResultRow {
  id: number;
  no_kunjungan: string;
  tgl_kunjungan: string;
  pasien_nama: string | null;
  poli_nama: string | null;
  no_antrean: number;
  status: string;
}

export interface TagihanResultRow {
  id: number;
  no_invoice: string;
  no_kunjungan: string | null;
  pasien_nama: string | null;
  total: number;
  sisa_tagihan: number;
  status: string;
}

export interface JadwalResultRow {
  id: number;
  hari: number;
  hari_nama: string | null;
  jam_mulai: string;
  jam_selesai: string;
  kuota: number;
  dokter_nama: string | null;
  poli_nama: string | null;
}

export interface ObatResultRow {
  id: number;
  kode: string;
  nama: string;
  satuan: string;
  harga: number;
  stok: number;
}

export interface FarmasiResultRow {
  id: number;
  no_resep: string;
  status: string;
  pasien_nama: string | null;
  pasien_no_rm: string | null;
  poli_nama: string | null;
  item_count: number;
}

export interface LabResultRow {
  id: number;
  no_order: string;
  status: string;
  pasien_nama: string | null;
  pasien_no_rm: string | null;
  poli_nama: string | null;
  item_count: number;
}

export type ChatMessagePayload =
  | { kind: 'text'; text: string }
  | { kind: 'articleTitle'; articleId: string }
  | { kind: 'i18n'; key: string; params?: Record<string, string | number> }
  | { kind: 'error'; text: string }
  | { kind: 'article'; articleId: string; relatedIds: string[] }
  | {
      kind: 'pasien';
      pasien: PasienResultRow[];
      kunjungan: KunjunganResultRow[];
      partialErrors: Array<'pasien' | 'kunjungan'>;
    }
  | { kind: 'tagihan'; items: TagihanResultRow[] }
  | { kind: 'jadwal'; items: JadwalResultRow[] }
  | { kind: 'obat'; items: ObatResultRow[] }
  | { kind: 'farmasi'; items: FarmasiResultRow[] }
  | { kind: 'lab'; items: LabResultRow[] }
  | {
      kind: 'ringkasan';
      tanggal: string;
      summary: DashboardSummary | null;
      belumTagihCount: number | null;
      partialErrors: Array<'summary' | 'belumTagih'>;
    };

export interface ChatMessage {
  id: number;
  from: 'bot' | 'user';
  payload: ChatMessagePayload;
}

export interface StoredChatSession {
  topic: Topic | null;
  messages: ChatMessage[];
}
