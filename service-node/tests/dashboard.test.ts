/**
 * Uji API dashboard agregasi read-only (/api/dashboard/*) terhadap database simrs_test (poin 9.1).
 */
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closeDb, db } from '../src/lib/db.js';
import { useTestDatabase } from './test-db.js';

const SECRET = 'rahasia-uji-dashboard-minimal-32-karakter!!';
const SFX = `D${Date.now().toString().slice(-6)}`;
const FROM = '2026-08-10';
const TO = '2026-08-11';

interface SeedIds {
  roleAllow: number;
  roleDeny: number;
  menuDash: number;
  userId: number;
  poliA: number;
  poliB: number;
  dokter: number;
  jadwalA: number;
  jadwalB: number;
  pasien1: number;
  pasien2: number;
  tindakan: number;
  obat: number;
  kunjungan1: number;
  kunjungan2: number;
  resep: number;
  invoice1: number;
  invoice2: number;
}

const ids: Partial<SeedIds> = {};

function makeToken(role: string, userId = 1): string {
  return jwt.sign({ sub: userId, role, nama: 'User Uji' }, SECRET, {
    algorithm: 'HS256',
    issuer: 'simrs-backend',
    expiresIn: '1h',
  });
}

beforeAll(async () => {
  useTestDatabase();
  process.env.JWT_SECRET = SECRET;
  const pool = db();

  const roleAllow = await pool.query<{ id: number }>(
    `INSERT INTO m_role (kode, nama) VALUES ($1, 'Role Allow') RETURNING id`,
    [`role_allow_${SFX}`],
  );
  ids.roleAllow = roleAllow.rows[0].id;

  const roleDeny = await pool.query<{ id: number }>(
    `INSERT INTO m_role (kode, nama) VALUES ($1, 'Role Deny') RETURNING id`,
    [`role_deny_${SFX}`],
  );
  ids.roleDeny = roleDeny.rows[0].id;

  // Pastikan menu `dashboard` ada di simrs_test (insert bila belum ada).
  const existingMenu = await pool.query<{ id: number }>(
    `SELECT id FROM m_menu WHERE kode = 'dashboard' AND deleted_at IS NULL LIMIT 1`,
  );
  if (existingMenu.rowCount) {
    ids.menuDash = existingMenu.rows[0].id;
  } else {
    const m = await pool.query<{ id: number }>(
      `INSERT INTO m_menu (kode, nama, path) VALUES ('dashboard', 'Dashboard', '/dashboard') RETURNING id`,
    );
    ids.menuDash = m.rows[0].id;
  }

  await pool.query(
    `INSERT INTO m_role_access (role_id, menu_id, can_read, can_create, can_update, can_delete)
     VALUES ($1, $2, true, false, false, false)`,
    [ids.roleAllow, ids.menuDash],
  );

  const user = await pool.query<{ id: number }>(
    `INSERT INTO m_user (username, password_hash, nama, role_id) VALUES ($1, 'hash', 'Kasir Dash', $2) RETURNING id`,
    [`u_${SFX}`, ids.roleAllow],
  );
  ids.userId = user.rows[0].id;

  const poliA = await pool.query<{ id: number }>(
    `INSERT INTO m_poli (kode, nama, tarif_pendaftaran) VALUES ($1, 'Poli Umum Dash', 25000) RETURNING id`,
    [`PA_${SFX}`],
  );
  ids.poliA = poliA.rows[0].id;

  const poliB = await pool.query<{ id: number }>(
    `INSERT INTO m_poli (kode, nama, tarif_pendaftaran) VALUES ($1, 'Poli Gigi Dash', 30000) RETURNING id`,
    [`PB_${SFX}`],
  );
  ids.poliB = poliB.rows[0].id;

  const dokter = await pool.query<{ id: number }>(
    `INSERT INTO m_dokter (kode, nama, sip, jenis_tenaga) VALUES ($1, 'dr. Dash', $2, 'dokter') RETURNING id`,
    [`DR_${SFX}`, `SIP/${SFX}`],
  );
  ids.dokter = dokter.rows[0].id;

  const jadwalA = await pool.query<{ id: number }>(
    `INSERT INTO m_jadwal_dokter (dokter_id, poli_id, hari, jam_mulai, jam_selesai, kuota)
     VALUES ($1, $2, 1, '08:00', '12:00', 20) RETURNING id`,
    [ids.dokter, ids.poliA],
  );
  ids.jadwalA = jadwalA.rows[0].id;

  const jadwalB = await pool.query<{ id: number }>(
    `INSERT INTO m_jadwal_dokter (dokter_id, poli_id, hari, jam_mulai, jam_selesai, kuota)
     VALUES ($1, $2, 2, '08:00', '12:00', 20) RETURNING id`,
    [ids.dokter, ids.poliB],
  );
  ids.jadwalB = jadwalB.rows[0].id;

  const pasien1 = await pool.query<{ id: number }>(
    `INSERT INTO m_pasien (no_rm, nik, nama, tgl_lahir, jenis_kelamin)
     VALUES ($1, $2, 'Pasien Dash 1', '1990-01-01', 'L') RETURNING id`,
    [`RM1${SFX}`, `3209${SFX.slice(-6)}000001`],
  );
  ids.pasien1 = pasien1.rows[0].id;

  const pasien2 = await pool.query<{ id: number }>(
    `INSERT INTO m_pasien (no_rm, nik, nama, tgl_lahir, jenis_kelamin)
     VALUES ($1, $2, 'Pasien Dash 2', '1992-02-02', 'P') RETURNING id`,
    [`RM2${SFX}`, `3209${SFX.slice(-6)}000002`],
  );
  ids.pasien2 = pasien2.rows[0].id;

  const tindakan = await pool.query<{ id: number }>(
    `INSERT INTO m_tindakan (kode, nama, tarif) VALUES ($1, 'EKG Dash', 50000) RETURNING id`,
    [`TN_${SFX}`],
  );
  ids.tindakan = tindakan.rows[0].id;

  const obat = await pool.query<{ id: number }>(
    `INSERT INTO m_obat (kode, nama, satuan, harga, stok) VALUES ($1, 'Paracetamol Dash', 'tablet', 2000, 100) RETURNING id`,
    [`OB_${SFX}`],
  );
  ids.obat = obat.rows[0].id;

  const k1 = await pool.query<{ id: number }>(
    `INSERT INTO t_kunjungan (no_kunjungan, pasien_id, poli_id, dokter_id, jadwal_id, tgl_kunjungan, no_antrean, status)
     VALUES ($1, $2, $3, $4, $5, $6, 1, 'selesai') RETURNING id`,
    [`KJ1_${SFX}`, ids.pasien1, ids.poliA, ids.dokter, ids.jadwalA, FROM],
  );
  ids.kunjungan1 = k1.rows[0].id;

  const k2 = await pool.query<{ id: number }>(
    `INSERT INTO t_kunjungan (no_kunjungan, pasien_id, poli_id, dokter_id, jadwal_id, tgl_kunjungan, no_antrean, status)
     VALUES ($1, $2, $3, $4, $5, $6, 1, 'selesai') RETURNING id`,
    [`KJ2_${SFX}`, ids.pasien2, ids.poliB, ids.dokter, ids.jadwalB, TO],
  );
  ids.kunjungan2 = k2.rows[0].id;

  // Tindakan aktif: qty 2 @ 50000 = 100000
  const tk = await pool.query<{ id: number }>(
    `INSERT INTO t_tindakan (kunjungan_id, tindakan_id, qty, tarif, subtotal, dokter_id, status)
     VALUES ($1, $2, 2, 50000, 100000, $3, 'aktif') RETURNING id`,
    [ids.kunjungan1, ids.tindakan, ids.dokter],
  );

  // Resep obat: 10 tablet @ 2000 = 20000
  const rsp = await pool.query<{ id: number }>(
    `INSERT INTO t_resep (no_resep, kunjungan_id, dokter_id, status, diserahkan_at)
     VALUES ($1, $2, $3, 'diserahkan', CURRENT_TIMESTAMP) RETURNING id`,
    [`RSP_${SFX}`, ids.kunjungan1, ids.dokter],
  );
  ids.resep = rsp.rows[0].id;
  const rd = await pool.query<{ id: number }>(
    `INSERT INTO t_resep_detail (resep_id, obat_id, dosis, frekuensi, jumlah, harga, subtotal)
     VALUES ($1, $2, '500mg', '3x1', 10, 2000, 20000) RETURNING id`,
    [ids.resep, ids.obat],
  );

  // Invoice 1: total 145.000 (daftar 25k + tindakan 100k + obat 20k), lunas via tunai
  const inv1 = await pool.query<{ id: number }>(
    `INSERT INTO t_invoice (no_invoice, kunjungan_id, total, total_bayar, status)
     VALUES ($1, $2, 145000, 145000, 'lunas') RETURNING id`,
    [`INV1_${SFX}`, ids.kunjungan1],
  );
  ids.invoice1 = inv1.rows[0].id;
  await pool.query(
    `INSERT INTO t_invoice_item (invoice_id, sumber, referensi_id, deskripsi, qty, harga, subtotal, is_void)
     VALUES ($1, 'pendaftaran', $2, 'Daftar', 1, 25000, 25000, false),
            ($1, 'tindakan', $3, 'EKG Dash', 2, 50000, 100000, false),
            ($1, 'obat', $4, 'Paracetamol Dash', 10, 2000, 20000, false)`,
    [ids.invoice1, ids.kunjungan1, tk.rows[0].id, rd.rows[0].id],
  );

  // Invoice 2: total 30.000 (daftar), dibayar_sebagian 15.000 via non_tunai
  const inv2 = await pool.query<{ id: number }>(
    `INSERT INTO t_invoice (no_invoice, kunjungan_id, total, total_bayar, status)
     VALUES ($1, $2, 30000, 15000, 'dibayar_sebagian') RETURNING id`,
    [`INV2_${SFX}`, ids.kunjungan2],
  );
  ids.invoice2 = inv2.rows[0].id;
  await pool.query(
    `INSERT INTO t_invoice_item (invoice_id, sumber, referensi_id, deskripsi, qty, harga, subtotal, is_void)
     VALUES ($1, 'pendaftaran', $2, 'Daftar Gigi', 1, 30000, 30000, false)`,
    [ids.invoice2, ids.kunjungan2],
  );

  await pool.query(
    `INSERT INTO t_pembayaran (no_pembayaran, invoice_id, idempotency_key, metode, jumlah, kasir_id, dibayar_at)
     VALUES ($1, $2, $3, 'tunai', 145000, $4, '2026-08-10 10:00:00'),
            ($5, $6, $7, 'non_tunai', 15000, $4, '2026-08-11 11:00:00')`,
    [
      `PAY1_${SFX}`,
      ids.invoice1,
      `idem1_${SFX}`,
      ids.userId,
      `PAY2_${SFX}`,
      ids.invoice2,
      `idem2_${SFX}`,
    ],
  );
});

afterAll(async () => {
  const pool = db();
  await pool.query(`DELETE FROM t_pembayaran WHERE invoice_id IN ($1, $2)`, [
    ids.invoice1 ?? 0,
    ids.invoice2 ?? 0,
  ]);
  await pool.query(`DELETE FROM t_invoice WHERE id IN ($1, $2)`, [
    ids.invoice1 ?? 0,
    ids.invoice2 ?? 0,
  ]);
  await pool.query(`DELETE FROM t_resep WHERE id = $1`, [ids.resep ?? 0]);
  await pool.query(`DELETE FROM t_tindakan WHERE kunjungan_id IN ($1, $2)`, [
    ids.kunjungan1 ?? 0,
    ids.kunjungan2 ?? 0,
  ]);
  await pool.query(`DELETE FROM t_kunjungan WHERE id IN ($1, $2)`, [
    ids.kunjungan1 ?? 0,
    ids.kunjungan2 ?? 0,
  ]);
  await pool.query(`DELETE FROM m_jadwal_dokter WHERE id IN ($1, $2)`, [
    ids.jadwalA ?? 0,
    ids.jadwalB ?? 0,
  ]);
  await pool.query(`DELETE FROM m_pasien WHERE id IN ($1, $2)`, [
    ids.pasien1 ?? 0,
    ids.pasien2 ?? 0,
  ]);
  await pool.query(`DELETE FROM m_tindakan WHERE id = $1`, [ids.tindakan ?? 0]);
  await pool.query(`DELETE FROM m_obat WHERE id = $1`, [ids.obat ?? 0]);
  await pool.query(`DELETE FROM m_dokter WHERE id = $1`, [ids.dokter ?? 0]);
  await pool.query(`DELETE FROM m_poli WHERE id IN ($1, $2)`, [ids.poliA ?? 0, ids.poliB ?? 0]);
  await pool.query(`DELETE FROM m_user WHERE id = $1`, [ids.userId ?? 0]);
  await pool.query(`DELETE FROM m_role_access WHERE role_id IN ($1, $2)`, [
    ids.roleAllow ?? 0,
    ids.roleDeny ?? 0,
  ]);
  await pool.query(`DELETE FROM m_role WHERE id IN ($1, $2)`, [
    ids.roleAllow ?? 0,
    ids.roleDeny ?? 0,
  ]);
  await closeDb();
});

describe('API Dashboard (poin 9.1)', () => {
  const app = createApp();

  it('menolak 401 tanpa token dan 403 untuk role tanpa izin dashboard:read', async () => {
    const r401 = await request(app).get(`/api/dashboard/summary?from=${FROM}&to=${TO}`);
    expect(r401.status).toBe(401);

    const denyTok = makeToken(`role_deny_${SFX}`, ids.userId);
    const r403 = await request(app)
      .get(`/api/dashboard/summary?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${denyTok}`);
    expect(r403.status).toBe(403);
  });

  it('mengembalikan angka agregasi yang tepat pada keenam endpoint dashboard', async () => {
    const tok = makeToken(`role_allow_${SFX}`, ids.userId);
    const qs = `?from=${FROM}&to=${TO}`;

    const summary = await request(app)
      .get(`/api/dashboard/summary${qs}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(summary.status).toBe(200);
    expect(summary.body.data.total_kunjungan).toBe(2);
    expect(summary.body.data.total_tindakan).toBe(2);
    expect(summary.body.data.total_pendapatan).toBe(160000);
    expect(summary.body.data.total_tagihan).toBe(175000);
    expect(summary.body.data.invoice_per_status).toEqual({
      belum_dibayar: 0,
      dibayar_sebagian: 1,
      lunas: 1,
    });

    const perPoli = await request(app)
      .get(`/api/dashboard/kunjungan-per-poli${qs}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(perPoli.status).toBe(200);
    expect(perPoli.body.data).toHaveLength(2);

    const tindakan = await request(app)
      .get(`/api/dashboard/tindakan${qs}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(tindakan.status).toBe(200);
    expect(tindakan.body.data[0]).toMatchObject({
      nama: 'EKG Dash',
      total_qty: 2,
      total_nilai: 100000,
    });

    const pendapatan = await request(app)
      .get(`/api/dashboard/pendapatan${qs}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(pendapatan.status).toBe(200);
    expect(pendapatan.body.data.per_hari).toEqual([
      { tanggal: FROM, jumlah_transaksi: 1, total_pendapatan: 145000 },
      { tanggal: TO, jumlah_transaksi: 1, total_pendapatan: 15000 },
    ]);
    expect(pendapatan.body.data.per_sumber).toEqual(
      expect.arrayContaining([
        { sumber: 'tindakan', total_nilai: 100000 },
        { sumber: 'pendaftaran', total_nilai: 55000 },
        { sumber: 'obat', total_nilai: 20000 },
      ]),
    );

    const obat = await request(app)
      .get(`/api/dashboard/obat${qs}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(obat.status).toBe(200);
    expect(obat.body.data[0]).toMatchObject({
      nama: 'Paracetamol Dash',
      total_jumlah: 10,
      total_nilai: 20000,
    });

    const pembayaran = await request(app)
      .get(`/api/dashboard/pembayaran${qs}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(pembayaran.status).toBe(200);
    expect(pembayaran.body.data.per_metode).toEqual([
      { metode: 'non_tunai', jumlah_transaksi: 1, total_bayar: 15000 },
      { metode: 'tunai', jumlah_transaksi: 1, total_bayar: 145000 },
    ]);
  });

  it('menolak 422 bila parameter periode tidak valid atau jenis detail tidak dikenal (poin 9.2)', async () => {
    const tok = makeToken(`role_allow_${SFX}`, ids.userId);

    const badFormat = await request(app)
      .get('/api/dashboard/summary?from=2026/08/10&to=2026-08-11')
      .set('Authorization', `Bearer ${tok}`);
    expect(badFormat.status).toBe(422);

    const badCal = await request(app)
      .get('/api/dashboard/summary?from=2026-02-30&to=2026-03-01')
      .set('Authorization', `Bearer ${tok}`);
    expect(badCal.status).toBe(422);

    const reversed = await request(app)
      .get(`/api/dashboard/summary?from=${TO}&to=${FROM}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(reversed.status).toBe(422);

    const tooLong = await request(app)
      .get('/api/dashboard/summary?from=2025-01-01&to=2026-12-31')
      .set('Authorization', `Bearer ${tok}`);
    expect(tooLong.status).toBe(422);

    const badJenis = await request(app)
      .get(`/api/dashboard/detail/tidak-ada?from=${FROM}&to=${TO}`)
      .set('Authorization', `Bearer ${tok}`);
    expect(badJenis.status).toBe(422);
  });

  it('mengembalikan rincian berhalaman untuk kelima jenis detail (poin 9.2)', async () => {
    const tok = makeToken(`role_allow_${SFX}`, ids.userId);

    const kjPage1 = await request(app)
      .get(`/api/dashboard/detail/kunjungan?from=${FROM}&to=${TO}&page=1&per_page=1`)
      .set('Authorization', `Bearer ${tok}`);
    expect(kjPage1.status).toBe(200);
    expect(kjPage1.body.data).toHaveLength(1);
    expect(kjPage1.body.meta).toEqual({ page: 1, per_page: 1, total: 2 });

    for (const [jenis, expectedTotal] of [
      ['tindakan', 1],
      ['pendapatan', 2],
      ['obat', 1],
      ['pembayaran', 2],
    ] as const) {
      const res = await request(app)
        .get(`/api/dashboard/detail/${jenis}?from=${FROM}&to=${TO}`)
        .set('Authorization', `Bearer ${tok}`);
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(expectedTotal);
    }
  });
});
