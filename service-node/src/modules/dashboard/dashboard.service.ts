/**
 * Service agregasi read-only untuk API dashboard SIMRS Rawat Jalan (B.8, C.2).
 * Seluruh query hanya membaca (SELECT) melalui pool read-only dan memakai filter tanggal sargable agar optimal dengan index.
 *
 * Dipakai di: modules/dashboard/dashboard.routes.ts, tests/dashboard.test.ts.
 */
import { readDb } from '../../lib/db.js';

export interface PeriodeFilter {
  from: string;
  to: string;
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

/**
 * Menghitung rentang periode bawaan (30 hari terakhir) bila parameter from/to tidak dikirim.
 *
 * Dipakai di: dashboard.routes.ts.
 */
export function resolvePeriode(from?: string, to?: string): PeriodeFilter {
  const today = new Date();
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const end = to ?? formatDate(today);
  if (from) {
    return { from, to: end };
  }
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  return { from: formatDate(startDate), to: end };
}

/**
 * Ringkasan utama dashboard: total kunjungan, total tindakan aktif, pendapatan diterima, total tagihan, dan jumlah invoice per status.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/summary).
 */
export async function getSummary(periode: PeriodeFilter): Promise<DashboardSummary> {
  const pool = readDb();
  const [kunjunganRes, tindakanRes, pendapatanRes, invoiceRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM t_kunjungan
       WHERE tgl_kunjungan >= $1::date AND tgl_kunjungan <= $2::date AND status <> 'batal'`,
      [periode.from, periode.to],
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(t.qty), 0)::text AS total
       FROM t_tindakan t
       JOIN t_kunjungan k ON k.id = t.kunjungan_id
       WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
         AND k.status <> 'batal' AND t.status = 'aktif'`,
      [periode.from, periode.to],
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(b.jumlah), 0)::text AS total
       FROM t_pembayaran b
       WHERE b.dibayar_at >= $1::date AND b.dibayar_at < ($2::date + INTERVAL '1 day')`,
      [periode.from, periode.to],
    ),
    pool.query<{ status: string; jumlah: string; total_tagihan: string }>(
      `SELECT i.status, COUNT(*)::text AS jumlah, COALESCE(SUM(i.total), 0)::text AS total_tagihan
       FROM t_invoice i
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
       GROUP BY i.status`,
      [periode.from, periode.to],
    ),
  ]);

  const perStatus = { belum_dibayar: 0, dibayar_sebagian: 0, lunas: 0 };
  let totalTagihan = 0;
  for (const row of invoiceRes.rows) {
    const cnt = Number(row.jumlah);
    totalTagihan += Number(row.total_tagihan);
    if (
      row.status === 'belum_dibayar' ||
      row.status === 'dibayar_sebagian' ||
      row.status === 'lunas'
    ) {
      perStatus[row.status] = cnt;
    }
  }

  return {
    periode,
    total_kunjungan: Number(kunjunganRes.rows[0]?.total ?? 0),
    total_tindakan: Number(tindakanRes.rows[0]?.total ?? 0),
    total_pendapatan: Number(pendapatanRes.rows[0]?.total ?? 0),
    total_tagihan: totalTagihan,
    invoice_per_status: perStatus,
  };
}

/**
 * Jumlah kunjungan rawat jalan non-batal per poli pada periode terpilih.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/kunjungan-per-poli).
 */
export async function getKunjunganPerPoli(periode: PeriodeFilter): Promise<KunjunganPerPoliItem[]> {
  const { rows } = await readDb().query<{
    poli_id: number;
    kode: string;
    nama: string;
    jumlah_kunjungan: string;
  }>(
    `SELECT pl.id AS poli_id, pl.kode, pl.nama, COUNT(k.id)::text AS jumlah_kunjungan
     FROM t_kunjungan k
     JOIN m_poli pl ON pl.id = k.poli_id
     WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date AND k.status <> 'batal'
     GROUP BY pl.id, pl.kode, pl.nama
     ORDER BY COUNT(k.id) DESC, pl.nama ASC`,
    [periode.from, periode.to],
  );

  return rows.map((r) => ({
    poli_id: Number(r.poli_id),
    kode: r.kode,
    nama: r.nama,
    jumlah_kunjungan: Number(r.jumlah_kunjungan),
  }));
}

/**
 * Daftar tindakan medis terbanyak pada periode terpilih.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/tindakan).
 */
export async function getTindakanTerbanyak(
  periode: PeriodeFilter,
  limit = 10,
): Promise<TindakanTerbanyakItem[]> {
  const { rows } = await readDb().query<{
    tindakan_id: number;
    kode: string;
    nama: string;
    jumlah_kali: string;
    total_qty: string;
    total_nilai: string;
  }>(
    `SELECT mt.id AS tindakan_id, mt.kode, mt.nama,
            COUNT(t.id)::text AS jumlah_kali,
            COALESCE(SUM(t.qty), 0)::text AS total_qty,
            COALESCE(SUM(t.subtotal), 0)::text AS total_nilai
     FROM t_tindakan t
     JOIN t_kunjungan k ON k.id = t.kunjungan_id
     JOIN m_tindakan mt ON mt.id = t.tindakan_id
     WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
       AND k.status <> 'batal' AND t.status = 'aktif'
     GROUP BY mt.id, mt.kode, mt.nama
     ORDER BY SUM(t.qty) DESC, SUM(t.subtotal) DESC, mt.nama ASC
     LIMIT $3`,
    [periode.from, periode.to, limit],
  );

  return rows.map((r) => ({
    tindakan_id: Number(r.tindakan_id),
    kode: r.kode,
    nama: r.nama,
    jumlah_kali: Number(r.jumlah_kali),
    total_qty: Number(r.total_qty),
    total_nilai: Number(r.total_nilai),
  }));
}

/**
 * Laporan pendapatan per hari (dari t_pembayaran) dan komposisi tagihan per sumber biaya aktif (dari t_invoice_item).
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/pendapatan).
 */
export async function getPendapatan(periode: PeriodeFilter): Promise<PendapatanReport> {
  const pool = readDb();
  const [perHariRes, perSumberRes] = await Promise.all([
    pool.query<{ tanggal: string; jumlah_transaksi: string; total_pendapatan: string }>(
      `SELECT TO_CHAR(b.dibayar_at::date, 'YYYY-MM-DD') AS tanggal,
              COUNT(*)::text AS jumlah_transaksi,
              COALESCE(SUM(b.jumlah), 0)::text AS total_pendapatan
       FROM t_pembayaran b
       WHERE b.dibayar_at >= $1::date AND b.dibayar_at < ($2::date + INTERVAL '1 day')
       GROUP BY b.dibayar_at::date
       ORDER BY b.dibayar_at::date ASC`,
      [periode.from, periode.to],
    ),
    pool.query<{ sumber: string; total_nilai: string }>(
      `SELECT it.sumber, COALESCE(SUM(it.subtotal), 0)::text AS total_nilai
       FROM t_invoice_item it
       JOIN t_invoice i ON i.id = it.invoice_id
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
         AND it.is_void = false
       GROUP BY it.sumber
       ORDER BY SUM(it.subtotal) DESC`,
      [periode.from, periode.to],
    ),
  ]);

  return {
    periode,
    per_hari: perHariRes.rows.map((r) => ({
      tanggal: r.tanggal,
      jumlah_transaksi: Number(r.jumlah_transaksi),
      total_pendapatan: Number(r.total_pendapatan),
    })),
    per_sumber: perSumberRes.rows.map((r) => ({
      sumber: r.sumber,
      total_nilai: Number(r.total_nilai),
    })),
  };
}

/**
 * Rekap penggunaan obat dari resep non-batal pada periode terpilih.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/obat).
 */
export async function getPenggunaanObat(
  periode: PeriodeFilter,
  limit = 10,
): Promise<ObatUsageItem[]> {
  const { rows } = await readDb().query<{
    obat_id: number;
    kode: string;
    nama: string;
    satuan: string;
    total_jumlah: string;
    total_nilai: string;
  }>(
    `SELECT o.id AS obat_id, o.kode, o.nama, o.satuan,
            COALESCE(SUM(rd.jumlah), 0)::text AS total_jumlah,
            COALESCE(SUM(rd.subtotal), 0)::text AS total_nilai
     FROM t_resep_detail rd
     JOIN t_resep r ON r.id = rd.resep_id
     JOIN t_kunjungan k ON k.id = r.kunjungan_id
     JOIN m_obat o ON o.id = rd.obat_id
     WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
       AND k.status <> 'batal' AND r.status <> 'batal'
     GROUP BY o.id, o.kode, o.nama, o.satuan
     ORDER BY SUM(rd.jumlah) DESC, o.nama ASC
     LIMIT $3`,
    [periode.from, periode.to, limit],
  );

  return rows.map((r) => ({
    obat_id: Number(r.obat_id),
    kode: r.kode,
    nama: r.nama,
    satuan: r.satuan,
    total_jumlah: Number(r.total_jumlah),
    total_nilai: Number(r.total_nilai),
  }));
}

/**
 * Ringkasan status pembayaran invoice dan metode pembayaran pada periode terpilih.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/pembayaran).
 */
export async function getStatusPembayaran(periode: PeriodeFilter): Promise<PembayaranReport> {
  const pool = readDb();
  const [statusRes, metodeRes] = await Promise.all([
    pool.query<{
      status: string;
      jumlah_invoice: string;
      total_tagihan: string;
      total_bayar: string;
    }>(
      `SELECT i.status,
              COUNT(*)::text AS jumlah_invoice,
              COALESCE(SUM(i.total), 0)::text AS total_tagihan,
              COALESCE(SUM(i.total_bayar), 0)::text AS total_bayar
       FROM t_invoice i
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
       GROUP BY i.status
       ORDER BY i.status ASC`,
      [periode.from, periode.to],
    ),
    pool.query<{ metode: string; jumlah_transaksi: string; total_bayar: string }>(
      `SELECT b.metode,
              COUNT(*)::text AS jumlah_transaksi,
              COALESCE(SUM(b.jumlah), 0)::text AS total_bayar
       FROM t_pembayaran b
       WHERE b.dibayar_at >= $1::date AND b.dibayar_at < ($2::date + INTERVAL '1 day')
       GROUP BY b.metode
       ORDER BY b.metode ASC`,
      [periode.from, periode.to],
    ),
  ]);

  return {
    periode,
    per_status: statusRes.rows.map((r) => ({
      status: r.status,
      jumlah_invoice: Number(r.jumlah_invoice),
      total_tagihan: Number(r.total_tagihan),
      total_bayar: Number(r.total_bayar),
    })),
    per_metode: metodeRes.rows.map((r) => ({
      metode: r.metode,
      jumlah_transaksi: Number(r.jumlah_transaksi),
      total_bayar: Number(r.total_bayar),
    })),
  };
}
