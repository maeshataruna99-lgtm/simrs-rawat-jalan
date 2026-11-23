/**
 * Service agregasi read-only untuk API dashboard SIMRS Rawat Jalan (B.8, C.2).
 * Mendukung filter periode plus filter lanjutan per dokter dan per penjamin melalui pool read-only.
 *
 * Dipakai di: modules/dashboard/dashboard.routes.ts, tests/dashboard.test.ts.
 */
import { readDb } from '../../lib/db.js';

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
  periode: { from: string; to: string };
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
  periode: { from: string; to: string };
  basis: {
    per_hari: 'kas_diterima_tanggal_bayar';
    per_sumber: 'tagihan_aktif_tanggal_kunjungan';
  };
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
  periode: { from: string; to: string };
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

export interface DetailResult {
  items: Array<Record<string, unknown>>;
  meta: { page: number; per_page: number; total: number };
}

/**
 * Menghitung rentang periode bawaan (30 hari terakhir) bila parameter from/to tidak dikirim.
 *
 * Dipakai di: dashboard.routes.ts.
 */
export function resolvePeriode(
  from?: string,
  to?: string,
  extra?: { dokter_id?: number; penjamin?: PenjaminType },
): PeriodeFilter {
  const today = new Date();
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const end = to ?? formatDate(today);
  const start =
    from ??
    (() => {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      return formatDate(startDate);
    })();

  return {
    from: start,
    to: end,
    ...(extra?.dokter_id ? { dokter_id: extra.dokter_id } : {}),
    ...(extra?.penjamin ? { penjamin: extra.penjamin } : {}),
  };
}

/** Membentuk potongan kondisi WHERE untuk filter opsional dokter_id dan penjamin pada alias tabel kunjungan. */
function buildKunjunganFilter(filter: PeriodeFilter, alias: string, params: unknown[]): string {
  let sql = '';
  if (filter.dokter_id) {
    params.push(filter.dokter_id);
    sql += ` AND ${alias}.dokter_id = $${params.length}`;
  }
  if (filter.penjamin) {
    params.push(filter.penjamin);
    sql += ` AND ${alias}.penjamin = $${params.length}`;
  }
  return sql;
}

/**
 * Daftar opsi filter lanjutan dashboard (dokter aktif dan kategori penjamin).
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/filters).
 */
export async function getFilterOptions(): Promise<DashboardFilterOptions> {
  const { rows } = await readDb().query<{ id: number; kode: string; nama: string }>(
    `SELECT id, kode, nama FROM m_dokter WHERE deleted_at IS NULL AND is_active = true ORDER BY nama ASC`,
  );
  return {
    dokter: rows.map((r) => ({ id: Number(r.id), kode: r.kode, nama: r.nama })),
    penjamin: ['umum', 'bpjs', 'asuransi'],
  };
}

/**
 * Ringkasan utama dashboard: total kunjungan, total tindakan aktif, pendapatan diterima, total tagihan, dan jumlah invoice per status.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/summary).
 */
export async function getSummary(filter: PeriodeFilter): Promise<DashboardSummary> {
  const pool = readDb();

  const pKj: unknown[] = [filter.from, filter.to];
  const fKj = buildKunjunganFilter(filter, 'k', pKj);

  const pTnd: unknown[] = [filter.from, filter.to];
  const fTnd = buildKunjunganFilter(filter, 'k', pTnd);

  const pPay: unknown[] = [filter.from, filter.to];
  const fPay = buildKunjunganFilter(filter, 'k', pPay);

  const pInv: unknown[] = [filter.from, filter.to];
  const fInv = buildKunjunganFilter(filter, 'k', pInv);

  const [kunjunganRes, tindakanRes, pendapatanRes, invoiceRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM t_kunjungan k
       WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date AND k.status <> 'batal'${fKj}`,
      pKj,
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(t.qty), 0)::text AS total
       FROM t_tindakan t
       JOIN t_kunjungan k ON k.id = t.kunjungan_id
       WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
         AND k.status <> 'batal' AND t.status = 'aktif'${fTnd}`,
      pTnd,
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(b.jumlah), 0)::text AS total
       FROM t_pembayaran b
       JOIN t_invoice i ON i.id = b.invoice_id
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       WHERE b.dibayar_at >= $1::date AND b.dibayar_at < ($2::date + INTERVAL '1 day')
         AND k.status <> 'batal'${fPay}`,
      pPay,
    ),
    pool.query<{ status: string; jumlah: string; total_tagihan: string }>(
      `SELECT i.status, COUNT(*)::text AS jumlah, COALESCE(SUM(i.total), 0)::text AS total_tagihan
       FROM t_invoice i
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
         AND k.status <> 'batal'${fInv}
       GROUP BY i.status`,
      pInv,
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
    periode: { from: filter.from, to: filter.to },
    total_kunjungan: Number(kunjunganRes.rows[0]?.total ?? 0),
    total_tindakan: Number(tindakanRes.rows[0]?.total ?? 0),
    total_pendapatan: Number(pendapatanRes.rows[0]?.total ?? 0),
    total_tagihan: totalTagihan,
    invoice_per_status: perStatus,
  };
}

/**
 * Jumlah kunjungan rawat jalan non-batal per poli pada periode dan filter lanjutan terpilih.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/kunjungan-per-poli).
 */
export async function getKunjunganPerPoli(filter: PeriodeFilter): Promise<KunjunganPerPoliItem[]> {
  const params: unknown[] = [filter.from, filter.to];
  const extra = buildKunjunganFilter(filter, 'k', params);
  const { rows } = await readDb().query<{
    poli_id: number;
    kode: string;
    nama: string;
    jumlah_kunjungan: string;
  }>(
    `SELECT pl.id AS poli_id, pl.kode, pl.nama, COUNT(k.id)::text AS jumlah_kunjungan
     FROM t_kunjungan k
     JOIN m_poli pl ON pl.id = k.poli_id
     WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date AND k.status <> 'batal'${extra}
     GROUP BY pl.id, pl.kode, pl.nama
     ORDER BY COUNT(k.id) DESC, pl.nama ASC`,
    params,
  );

  return rows.map((r) => ({
    poli_id: Number(r.poli_id),
    kode: r.kode,
    nama: r.nama,
    jumlah_kunjungan: Number(r.jumlah_kunjungan),
  }));
}

/**
 * Daftar tindakan medis terbanyak pada periode dan filter lanjutan terpilih.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/tindakan).
 */
export async function getTindakanTerbanyak(
  filter: PeriodeFilter,
  limit = 10,
): Promise<TindakanTerbanyakItem[]> {
  const params: unknown[] = [filter.from, filter.to];
  const extra = buildKunjunganFilter(filter, 'k', params);
  params.push(limit);

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
       AND k.status <> 'batal' AND t.status = 'aktif'${extra}
     GROUP BY mt.id, mt.kode, mt.nama
     ORDER BY SUM(t.qty) DESC, SUM(t.subtotal) DESC, mt.nama ASC
     LIMIT $${params.length}`,
    params,
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
 * Laporan pendapatan:
 * - `per_hari`: kas diterima (t_pembayaran.jumlah) dikelompokkan berdasarkan tanggal pembayaran (`dibayar_at`), hanya untuk kunjungan non-batal.
 * - `per_sumber`: komposisi tagihan aktif (t_invoice_item.subtotal, `is_void = false`) dikelompokkan berdasarkan tanggal kunjungan (`k.tgl_kunjungan`) non-batal.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/pendapatan).
 */
export async function getPendapatan(filter: PeriodeFilter): Promise<PendapatanReport> {
  const pool = readDb();

  const pHari: unknown[] = [filter.from, filter.to];
  const fHari = buildKunjunganFilter(filter, 'k', pHari);

  const pSumber: unknown[] = [filter.from, filter.to];
  const fSumber = buildKunjunganFilter(filter, 'k', pSumber);

  const [perHariRes, perSumberRes] = await Promise.all([
    pool.query<{ tanggal: string; jumlah_transaksi: string; total_pendapatan: string }>(
      `SELECT TO_CHAR(b.dibayar_at::date, 'YYYY-MM-DD') AS tanggal,
              COUNT(*)::text AS jumlah_transaksi,
              COALESCE(SUM(b.jumlah), 0)::text AS total_pendapatan
       FROM t_pembayaran b
       JOIN t_invoice i ON i.id = b.invoice_id
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       WHERE b.dibayar_at >= $1::date AND b.dibayar_at < ($2::date + INTERVAL '1 day')
         AND k.status <> 'batal'${fHari}
       GROUP BY b.dibayar_at::date
       ORDER BY b.dibayar_at::date ASC`,
      pHari,
    ),
    pool.query<{ sumber: string; total_nilai: string }>(
      `SELECT it.sumber, COALESCE(SUM(it.subtotal), 0)::text AS total_nilai
       FROM t_invoice_item it
       JOIN t_invoice i ON i.id = it.invoice_id
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date
         AND k.status <> 'batal' AND it.is_void = false${fSumber}
       GROUP BY it.sumber
       ORDER BY SUM(it.subtotal) DESC`,
      pSumber,
    ),
  ]);

  return {
    periode: { from: filter.from, to: filter.to },
    basis: {
      per_hari: 'kas_diterima_tanggal_bayar',
      per_sumber: 'tagihan_aktif_tanggal_kunjungan',
    },
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
 * Rekap penggunaan obat dari resep non-batal pada periode dan filter lanjutan terpilih.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/obat).
 */
export async function getPenggunaanObat(
  filter: PeriodeFilter,
  limit = 10,
): Promise<ObatUsageItem[]> {
  const params: unknown[] = [filter.from, filter.to];
  const extra = buildKunjunganFilter(filter, 'k', params);
  params.push(limit);

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
       AND k.status <> 'batal' AND r.status <> 'batal'${extra}
     GROUP BY o.id, o.kode, o.nama, o.satuan
     ORDER BY SUM(rd.jumlah) DESC, o.nama ASC
     LIMIT $${params.length}`,
    params,
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
 * Ringkasan status pembayaran invoice dan metode pembayaran pada periode dan filter lanjutan terpilih.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/pembayaran).
 */
export async function getStatusPembayaran(filter: PeriodeFilter): Promise<PembayaranReport> {
  const pool = readDb();

  const pStatus: unknown[] = [filter.from, filter.to];
  const fStatus = buildKunjunganFilter(filter, 'k', pStatus);

  const pMetode: unknown[] = [filter.from, filter.to];
  const fMetode = buildKunjunganFilter(filter, 'k', pMetode);

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
         AND k.status <> 'batal'${fStatus}
       GROUP BY i.status
       ORDER BY i.status ASC`,
      pStatus,
    ),
    pool.query<{ metode: string; jumlah_transaksi: string; total_bayar: string }>(
      `SELECT b.metode,
              COUNT(*)::text AS jumlah_transaksi,
              COALESCE(SUM(b.jumlah), 0)::text AS total_bayar
       FROM t_pembayaran b
       JOIN t_invoice i ON i.id = b.invoice_id
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       WHERE b.dibayar_at >= $1::date AND b.dibayar_at < ($2::date + INTERVAL '1 day')
         AND k.status <> 'batal'${fMetode}
       GROUP BY b.metode
       ORDER BY b.metode ASC`,
      pMetode,
    ),
  ]);

  return {
    periode: { from: filter.from, to: filter.to },
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

/**
 * Mengambil rincian data dashboard berhalaman sesuai jenis laporan, periode, dan filter lanjutan.
 *
 * Dipakai di: dashboard.routes.ts (GET /api/dashboard/detail/:jenis).
 */
export async function getDetail(
  jenis: DetailJenis,
  filter: PeriodeFilter,
  options: { page: number; per_page: number; poli_id?: number; status?: string },
): Promise<DetailResult> {
  const pool = readDb();
  const offset = (options.page - 1) * options.per_page;

  if (jenis === 'kunjungan') {
    const params: unknown[] = [filter.from, filter.to];
    let extra = buildKunjunganFilter(filter, 'k', params);
    if (options.poli_id) {
      params.push(options.poli_id);
      extra += ` AND k.poli_id = $${params.length}`;
    }
    if (options.status) {
      params.push(options.status);
      extra += ` AND k.status = $${params.length}`;
    }
    const where = `WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date AND k.status <> 'batal'${extra}`;
    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM t_kunjungan k ${where}`,
        params,
      ),
      pool.query(
        `SELECT k.id, k.no_kunjungan, TO_CHAR(k.tgl_kunjungan, 'YYYY-MM-DD') AS tgl_kunjungan,
                k.no_antrean, k.status, k.penjamin, p.no_rm, p.nama AS pasien, pl.nama AS poli, d.nama AS dokter
         FROM t_kunjungan k
         JOIN m_pasien p ON p.id = k.pasien_id
         JOIN m_poli pl ON pl.id = k.poli_id
         JOIN m_dokter d ON d.id = k.dokter_id
         ${where}
         ORDER BY k.tgl_kunjungan DESC, k.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, options.per_page, offset],
      ),
    ]);
    return {
      items: rowsRes.rows,
      meta: {
        page: options.page,
        per_page: options.per_page,
        total: Number(countRes.rows[0]?.total ?? 0),
      },
    };
  }

  if (jenis === 'tindakan') {
    const params: unknown[] = [filter.from, filter.to];
    const extra = buildKunjunganFilter(filter, 'k', params);
    const where = `WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date AND k.status <> 'batal' AND t.status = 'aktif'${extra}`;
    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM t_tindakan t JOIN t_kunjungan k ON k.id = t.kunjungan_id ${where}`,
        params,
      ),
      pool.query(
        `SELECT t.id, TO_CHAR(k.tgl_kunjungan, 'YYYY-MM-DD') AS tgl_kunjungan, k.no_kunjungan,
                p.no_rm, p.nama AS pasien, pl.nama AS poli, mt.kode AS kode_tindakan,
                mt.nama AS tindakan, t.qty, t.tarif::float8 AS tarif, t.subtotal::float8 AS subtotal
         FROM t_tindakan t
         JOIN t_kunjungan k ON k.id = t.kunjungan_id
         JOIN m_tindakan mt ON mt.id = t.tindakan_id
         JOIN m_pasien p ON p.id = k.pasien_id
         JOIN m_poli pl ON pl.id = k.poli_id
         ${where}
         ORDER BY k.tgl_kunjungan DESC, t.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, options.per_page, offset],
      ),
    ]);
    return {
      items: rowsRes.rows,
      meta: {
        page: options.page,
        per_page: options.per_page,
        total: Number(countRes.rows[0]?.total ?? 0),
      },
    };
  }

  if (jenis === 'pendapatan') {
    const params: unknown[] = [filter.from, filter.to];
    const extra = buildKunjunganFilter(filter, 'k', params);
    const where = `WHERE b.dibayar_at >= $1::date AND b.dibayar_at < ($2::date + INTERVAL '1 day') AND k.status <> 'batal'${extra}`;
    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM t_pembayaran b
         JOIN t_invoice i ON i.id = b.invoice_id
         JOIN t_kunjungan k ON k.id = i.kunjungan_id
         ${where}`,
        params,
      ),
      pool.query(
        `SELECT b.id, b.no_pembayaran, i.no_invoice, p.no_rm, p.nama AS pasien,
                b.metode, b.no_referensi, b.jumlah::float8 AS jumlah, u.nama AS kasir,
                TO_CHAR(b.dibayar_at, 'YYYY-MM-DD HH24:MI:SS') AS dibayar_at
         FROM t_pembayaran b
         JOIN t_invoice i ON i.id = b.invoice_id
         JOIN t_kunjungan k ON k.id = i.kunjungan_id
         JOIN m_pasien p ON p.id = k.pasien_id
         JOIN m_user u ON u.id = b.kasir_id
         ${where}
         ORDER BY b.dibayar_at DESC, b.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, options.per_page, offset],
      ),
    ]);
    return {
      items: rowsRes.rows,
      meta: {
        page: options.page,
        per_page: options.per_page,
        total: Number(countRes.rows[0]?.total ?? 0),
      },
    };
  }

  if (jenis === 'obat') {
    const params: unknown[] = [filter.from, filter.to];
    const extra = buildKunjunganFilter(filter, 'k', params);
    const where = `WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date AND k.status <> 'batal' AND r.status <> 'batal'${extra}`;
    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM t_resep_detail rd
         JOIN t_resep r ON r.id = rd.resep_id
         JOIN t_kunjungan k ON k.id = r.kunjungan_id
         ${where}`,
        params,
      ),
      pool.query(
        `SELECT rd.id, TO_CHAR(k.tgl_kunjungan, 'YYYY-MM-DD') AS tgl_kunjungan, r.no_resep,
                r.status AS status_resep, p.no_rm, p.nama AS pasien,
                o.kode AS kode_obat, o.nama AS obat, o.satuan, rd.jumlah,
                rd.harga::float8 AS harga, rd.subtotal::float8 AS subtotal
         FROM t_resep_detail rd
         JOIN t_resep r ON r.id = rd.resep_id
         JOIN t_kunjungan k ON k.id = r.kunjungan_id
         JOIN m_obat o ON o.id = rd.obat_id
         JOIN m_pasien p ON p.id = k.pasien_id
         ${where}
         ORDER BY k.tgl_kunjungan DESC, rd.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, options.per_page, offset],
      ),
    ]);
    return {
      items: rowsRes.rows,
      meta: {
        page: options.page,
        per_page: options.per_page,
        total: Number(countRes.rows[0]?.total ?? 0),
      },
    };
  }

  const params: unknown[] = [filter.from, filter.to];
  let extra = buildKunjunganFilter(filter, 'k', params);
  if (options.status) {
    params.push(options.status);
    extra += ` AND i.status = $${params.length}`;
  }
  const where = `WHERE k.tgl_kunjungan >= $1::date AND k.tgl_kunjungan <= $2::date AND k.status <> 'batal'${extra}`;
  const [countRes, rowsRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM t_invoice i JOIN t_kunjungan k ON k.id = i.kunjungan_id ${where}`,
      params,
    ),
    pool.query(
      `SELECT i.id, i.no_invoice, TO_CHAR(k.tgl_kunjungan, 'YYYY-MM-DD') AS tgl_kunjungan,
              k.penjamin, p.no_rm, p.nama AS pasien, pl.nama AS poli,
              i.total::float8 AS total, i.total_bayar::float8 AS total_bayar,
              (i.total - i.total_bayar)::float8 AS sisa_tagihan, i.status
       FROM t_invoice i
       JOIN t_kunjungan k ON k.id = i.kunjungan_id
       JOIN m_pasien p ON p.id = k.pasien_id
       JOIN m_poli pl ON pl.id = k.poli_id
       ${where}
       ORDER BY k.tgl_kunjungan DESC, i.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, options.per_page, offset],
    ),
  ]);
  return {
    items: rowsRes.rows,
    meta: {
      page: options.page,
      per_page: options.per_page,
      total: Number(countRes.rows[0]?.total ?? 0),
    },
  };
}
