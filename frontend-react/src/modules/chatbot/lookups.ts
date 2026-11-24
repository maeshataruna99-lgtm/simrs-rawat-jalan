/**
 * Handler lookup data live untuk chatbot bantuan menggunakan endpoint read-only yang sudah ada.
 * Menggunakan Promise.allSettled pada lookup gabungan agar kegagalan parsial tetap menampilkan
 * sumber data yang berhasil.
 *
 * Dipakai di: ChatbotWidget.tsx.
 */
import { getSummary } from '@/modules/dashboard/dashboard.api';
import { listJadwalDokter } from '@/modules/master/jadwal/jadwal.api';
import { listObat } from '@/modules/master/obat/obat.api';
import { listPasien } from '@/modules/master/pasien/pasien.api';
import { worklistLab } from '@/modules/transaction/lab/lab.api';
import { listBelumTagih, listInvoice } from '@/modules/transaction/pembayaran/pembayaran.api';
import { listAntrean } from '@/modules/transaction/pendaftaran/pendaftaran.api';
import { antreanFarmasi } from '@/modules/transaction/resep/resep.api';
import type { ChatMessagePayload } from './chatbot.types';
import { parseHariQuery } from './knowledge';

export const MAX_ROWS = 5;
export const LOW_STOCK_THRESHOLD = 10;

const SHOW_ACTIVE_KEYWORDS = new Set(['', 'aktif', 'active', 'hari ini', 'today', 'semua', 'all']);

function localTodayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function lookupPasienData(
  q: string,
  perms: { canPasien: boolean; canAntrean: boolean },
): Promise<ChatMessagePayload> {
  const [pasienRes, kunjunganRes] = await Promise.allSettled([
    perms.canPasien
      ? listPasien({ q, per_page: MAX_ROWS }).then((r) => r.items)
      : Promise.resolve(null),
    perms.canAntrean
      ? listAntrean({ q, per_page: MAX_ROWS }).then((r) => r.items)
      : Promise.resolve(null),
  ]);

  const partialErrors: Array<'pasien' | 'kunjungan'> = [];
  let firstError: unknown = null;

  const pasienList =
    pasienRes.status === 'fulfilled'
      ? (pasienRes.value ?? []).map((p) => ({
          id: p.id,
          no_rm: p.no_rm,
          nama: p.nama,
          jenis_kelamin: p.jenis_kelamin,
          tgl_lahir: p.tgl_lahir,
        }))
      : (() => {
          partialErrors.push('pasien');
          firstError = firstError ?? pasienRes.reason;
          return [];
        })();

  const kunjunganList =
    kunjunganRes.status === 'fulfilled'
      ? (kunjunganRes.value ?? []).map((k) => ({
          id: k.id,
          no_kunjungan: k.no_kunjungan,
          tgl_kunjungan: k.tgl_kunjungan,
          pasien_nama: k.pasien?.nama ?? null,
          poli_nama: k.poli?.nama ?? null,
          no_antrean: k.no_antrean,
          status: k.status,
        }))
      : (() => {
          partialErrors.push('kunjungan');
          firstError = firstError ?? kunjunganRes.reason;
          return [];
        })();

  const expectedSources = Number(perms.canPasien) + Number(perms.canAntrean);
  if (expectedSources > 0 && partialErrors.length === expectedSources) {
    throw firstError;
  }

  if (!pasienList.length && !kunjunganList.length && partialErrors.length === 0) {
    return { kind: 'i18n', key: 'chatbot.notFound', params: { q } };
  }

  return {
    kind: 'pasien',
    pasien: pasienList,
    kunjungan: kunjunganList,
    partialErrors,
  };
}

export async function lookupTagihanData(q: string): Promise<ChatMessagePayload> {
  const { items } = await listInvoice({ q, per_page: MAX_ROWS });
  if (!items.length) return { kind: 'i18n', key: 'chatbot.notFound', params: { q } };

  return {
    kind: 'tagihan',
    items: items.map((inv) => ({
      id: inv.id,
      no_invoice: inv.no_invoice,
      no_kunjungan: inv.kunjungan?.no_kunjungan ?? null,
      pasien_nama: inv.pasien?.nama ?? null,
      total: inv.total,
      sisa_tagihan: inv.sisa_tagihan,
      status: inv.status,
    })),
  };
}

export async function lookupJadwalData(q: string): Promise<ChatMessagePayload> {
  const hari = parseHariQuery(q);
  const { items } = await listJadwalDokter(
    hari !== null
      ? { hari, is_active: true, per_page: MAX_ROWS }
      : { q, is_active: true, per_page: MAX_ROWS },
  );
  if (!items.length) return { kind: 'i18n', key: 'chatbot.notFound', params: { q } };

  return {
    kind: 'jadwal',
    items: items.map((j) => ({
      id: j.id,
      hari: j.hari,
      hari_nama: j.hari_nama,
      jam_mulai: j.jam_mulai,
      jam_selesai: j.jam_selesai,
      kuota: j.kuota,
      dokter_nama: j.dokter?.nama ?? null,
      poli_nama: j.poli?.nama ?? null,
    })),
  };
}

export async function lookupObatData(q: string): Promise<ChatMessagePayload> {
  const { items } = await listObat({ q, is_active: true, per_page: MAX_ROWS });
  if (!items.length) return { kind: 'i18n', key: 'chatbot.notFound', params: { q } };

  return {
    kind: 'obat',
    items: items.map((o) => ({
      id: o.id,
      kode: o.kode,
      nama: o.nama,
      satuan: o.satuan,
      harga: o.harga,
      stok: o.stok,
    })),
  };
}

export async function lookupFarmasiData(q: string): Promise<ChatMessagePayload> {
  const { items: rows } = await antreanFarmasi({ status: '', per_page: 100 });
  const norm = q.trim().toLowerCase();
  const filtered = SHOW_ACTIVE_KEYWORDS.has(norm)
    ? rows
    : rows.filter((r) => {
        const hay = [r.no_resep, r.pasien?.nama, r.pasien?.no_rm, r.poli?.nama, r.dokter?.nama]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(norm);
      });

  const sliced = filtered.slice(0, MAX_ROWS);
  if (!sliced.length) return { kind: 'i18n', key: 'chatbot.notFound', params: { q } };

  return {
    kind: 'farmasi',
    items: sliced.map((r) => ({
      id: r.id,
      no_resep: r.no_resep,
      status: r.status,
      pasien_nama: r.pasien?.nama ?? null,
      pasien_no_rm: r.pasien?.no_rm ?? null,
      poli_nama: r.poli?.nama ?? null,
      item_count: r.details.length,
    })),
  };
}

export async function lookupLabData(q: string): Promise<ChatMessagePayload> {
  const norm = q.trim().toLowerCase();
  const showActiveOnly = SHOW_ACTIVE_KEYWORDS.has(norm);
  const { items: rows } = await worklistLab({
    status: showActiveOnly ? 'diminta,diproses' : '',
    per_page: 100,
  });
  const filtered = showActiveOnly
    ? rows
    : rows.filter((o) => {
        const hay = [o.no_order, o.pasien?.nama, o.pasien?.no_rm, o.poli?.nama, o.dokter?.nama]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(norm);
      });

  const sliced = filtered.slice(0, MAX_ROWS);
  if (!sliced.length) return { kind: 'i18n', key: 'chatbot.notFound', params: { q } };

  return {
    kind: 'lab',
    items: sliced.map((o) => ({
      id: o.id,
      no_order: o.no_order,
      status: o.status,
      pasien_nama: o.pasien?.nama ?? null,
      pasien_no_rm: o.pasien?.no_rm ?? null,
      poli_nama: o.poli?.nama ?? null,
      item_count: o.details.length,
    })),
  };
}

export async function lookupRingkasanData(perms: {
  canDashboard: boolean;
  canBilling: boolean;
}): Promise<ChatMessagePayload> {
  const today = localTodayIso();
  const [summaryRes, belumRes] = await Promise.allSettled([
    perms.canDashboard ? getSummary({ from: today, to: today }) : Promise.resolve(null),
    perms.canBilling ? listBelumTagih({ per_page: 1 }) : Promise.resolve(null),
  ]);

  const partialErrors: Array<'summary' | 'belumTagih'> = [];
  let firstError: unknown = null;

  const summary =
    summaryRes.status === 'fulfilled'
      ? summaryRes.value
      : (() => {
          partialErrors.push('summary');
          firstError = firstError ?? summaryRes.reason;
          return null;
        })();

  const belumTagihCount =
    belumRes.status === 'fulfilled'
      ? belumRes.value === null
        ? null
        : belumRes.value.meta.total
      : (() => {
          partialErrors.push('belumTagih');
          firstError = firstError ?? belumRes.reason;
          return null;
        })();

  const expectedSources = Number(perms.canDashboard) + Number(perms.canBilling);
  if (expectedSources > 0 && partialErrors.length === expectedSources) {
    throw firstError;
  }

  return {
    kind: 'ringkasan',
    tanggal: today,
    summary,
    belumTagihCount,
    partialErrors,
  };
}
