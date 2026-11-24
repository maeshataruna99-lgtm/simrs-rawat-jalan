/**
 * Script uji konkurensi pembayaran ganda dan revisi tagihan (Skenario D.3 dan D.4 — poin 8.6).
 * 1. D.3 Idempotency-Key sama dikirim 5 kali paralel: tepat 1 kali dibuat (201), 4 sisanya 200 dengan no_pembayaran sama.
 * 2. D.3 5 pembayaran paralel berbeda untuk sisa tagihan penuh: tepat 1 sukses (201), 4 ditolak (409), total_bayar tidak melebihi total.
 * 3. D.4 Revisi tagihan: invoice mengunci kunjungan (valid); setelah kasir Unvalid, batal tindakan mem-void item,
 *    menurunkan total, dan tercatat di audit log; Valid lagi lalu lunas menyelesaikan kunjungan dan menolak semua perubahan (409).
 *
 * Cara menjalankan: node tests/concurrency/pembayaran.mjs
 */
import crypto from 'node:crypto';

import { freePrefix } from './free-prefix.mjs';

const BASE_URL = process.env.YII_URL ?? 'http://localhost:8080';

async function api(method, path, body, token, extraHeaders = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: body !== null && body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const password = process.env.SEED_PASSWORD ?? 'simrs123';
  const adminLogin = await api('POST', '/system/auth/login', { username: 'admin', password });
  const kasirLogin = await api('POST', '/system/auth/login', { username: 'kasir', password });
  assert(adminLogin.status === 200 && kasirLogin.status === 200, 'Login admin/kasir gagal');
  const adminToken = adminLogin.body.data.token;
  const kasirToken = kasirLogin.body.data.token;

  const senin = new Date();
  senin.setDate(senin.getDate() + ((8 - senin.getDay()) % 7 || 7));
  const tglKunjungan = senin.toLocaleDateString('sv-SE');
  const sfx = Date.now().toString().slice(-6);

  const poli = await api(
    'POST',
    '/master/poli',
    { kode: `POLI-P${sfx}`, nama: `Poli Bayar ${sfx}`, tarif_pendaftaran: 25000, prefix_antrean: await freePrefix(api, adminToken) },
    adminToken,
  );
  const dokter = await api(
    'POST',
    '/master/dokter',
    { kode: `DR-P${sfx}`, nama: `dr. Bayar ${sfx}`, sip: `SIP/P/${sfx}`, jenis_tenaga: 'dokter' },
    adminToken,
  );
  const jadwal = await api(
    'POST',
    '/master/jadwal-dokter',
    {
      dokter_id: dokter.body.data.id,
      poli_id: poli.body.data.id,
      hari: 1,
      jam_mulai: '08:00',
      jam_selesai: '16:00',
      kuota: 30,
    },
    adminToken,
  );
  const tindakan = await api(
    'POST',
    '/master/tindakan',
    { kode: `TND-P${sfx}`, nama: `Tindakan Bayar ${sfx}`, tarif: 75000 },
    adminToken,
  );
  const icd1 = await api(
    'POST',
    '/master/icd10',
    { kode: `Z86.${sfx.slice(-2)}A`, nama: 'Diagnosis Awal Uji' },
    adminToken,
  );
  const icd2 = await api(
    'POST',
    '/master/icd10',
    { kode: `Z86.${sfx.slice(-2)}B`, nama: 'Diagnosis Revisi Uji' },
    adminToken,
  );

  async function buatInvoiceDenganTindakan(idx) {
    const pasien = await api(
      'POST',
      '/master/pasien',
      {
        nik: `3286${sfx}${String(idx).padStart(6, '0')}`,
        nama: `Pasien Bayar ${sfx}-${idx}`,
        tgl_lahir: '1990-01-01',
        jenis_kelamin: 'L',
      },
      adminToken,
    );
    const kunjungan = await api(
      'POST',
      '/transaction/pendaftaran',
      {
        pasien_id: pasien.body.data.id,
        jadwal_id: jadwal.body.data.id,
        tgl_kunjungan: tglKunjungan,
      },
      adminToken,
    );
    const tk = await api(
      'POST',
      `/transaction/tindakan/${kunjungan.body.data.id}`,
      { tindakan_id: tindakan.body.data.id, qty: 1 },
      adminToken,
    );
    const inv = await api('POST', `/transaction/invoice/${kunjungan.body.data.id}`, {}, kasirToken);
    assert(inv.status === 201, `Gagal buat invoice: ${JSON.stringify(inv.body)}`);
    return {
      kunjunganId: kunjungan.body.data.id,
      tindakanItemId: tk.body.data.id,
      invoiceId: inv.body.data.id,
    };
  }

  // Skenario 1 (D.3): 5 request paralel dengan Idempotency-Key yang sama untuk cicilan 40.000.
  const k1 = await buatInvoiceDenganTindakan(1);
  const sameKey = crypto.randomUUID();
  const retryRes = await Promise.all(
    Array.from({ length: 5 }, () =>
      api(
        'POST',
        '/transaction/pembayaran',
        { invoice_id: k1.invoiceId, metode: 'tunai', jumlah: 40000 },
        kasirToken,
        { 'Idempotency-Key': sameKey },
      ),
    ),
  );
  const retryStatuses = retryRes.map((r) => r.status).sort();
  const noPembayaranSet = new Set(retryRes.map((r) => r.body.data?.pembayaran?.no_pembayaran));
  const invAfter1 = (await api('GET', `/transaction/invoice/${k1.invoiceId}`, null, kasirToken))
    .body.data;
  console.log(
    `[D.3 Idempotency Paralel] status = [${retryStatuses.join(', ')}], unik no_pembayaran = ${noPembayaranSet.size}, total_bayar = ${invAfter1.total_bayar}`,
  );
  assert(
    retryStatuses.filter((s) => s === 201).length === 1 &&
      retryStatuses.filter((s) => s === 200).length === 4,
    `Ekspektasi satu 201 dan empat 200, hasil [${retryStatuses.join(', ')}]`,
  );
  assert(noPembayaranSet.size === 1, 'Semua respons harus mengembalikan no_pembayaran yang sama');
  assert(
    invAfter1.total_bayar === 40000,
    `total_bayar seharusnya 40000, hasil ${invAfter1.total_bayar}`,
  );
  assert(
    invAfter1.pembayaran.length === 1,
    `Jumlah pembayaran seharusnya 1, hasil ${invAfter1.pembayaran.length}`,
  );

  // Skenario 2 (D.3): 5 request paralel dengan Idempotency-Key berbeda masing-masing membayar sisa penuh 60.000.
  const raceRes = await Promise.all(
    Array.from({ length: 5 }, () =>
      api(
        'POST',
        '/transaction/pembayaran',
        {
          invoice_id: k1.invoiceId,
          metode: 'non_tunai',
          jumlah: 60000,
          no_referensi: `TRF-${sfx}`,
        },
        kasirToken,
        { 'Idempotency-Key': crypto.randomUUID() },
      ),
    ),
  );
  const raceStatuses = raceRes.map((r) => r.status).sort();
  const invAfter2 = (await api('GET', `/transaction/invoice/${k1.invoiceId}`, null, kasirToken))
    .body.data;
  console.log(
    `[D.3 Race Sisa Tagihan] status = [${raceStatuses.join(', ')}], total_bayar = ${invAfter2.total_bayar}, status_invoice = ${invAfter2.status}`,
  );
  assert(
    raceStatuses.filter((s) => s === 201).length === 1 &&
      raceStatuses.filter((s) => s === 409).length === 4,
    `Ekspektasi satu 201 dan empat 409, hasil [${raceStatuses.join(', ')}]`,
  );
  assert(
    invAfter2.total_bayar === 100000,
    `total_bayar seharusnya 100000, hasil ${invAfter2.total_bayar}`,
  );
  assert(invAfter2.status === 'lunas', `Status seharusnya lunas, hasil ${invAfter2.status}`);
  assert(
    invAfter2.pembayaran.length === 2,
    `Jumlah pembayaran seharusnya 2, hasil ${invAfter2.pembayaran.length}`,
  );

  // Skenario 3 (D.4): Invoice = kunjungan valid (terkunci). Revisi hanya setelah kasir Unvalid,
  // lalu Valid lagi; invoice lunas menyelesaikan kunjungan dan menolak semua perubahan.
  const k2 = await buatInvoiceDenganTindakan(2);
  const batalSaatValid = await api(
    'DELETE',
    `/transaction/tindakan/item/${k2.tindakanItemId}`,
    null,
    adminToken,
  );
  assert(
    batalSaatValid.status === 409,
    `Batal tindakan saat kunjungan valid harus 409, hasil ${batalSaatValid.status}`,
  );
  const unvalid = await api('PUT', `/transaction/invoice/${k2.invoiceId}/unvalid`, {}, kasirToken);
  assert(
    unvalid.status === 200 && unvalid.body.data.kunjungan.is_valid === false,
    `Gagal unvalid kunjungan: ${unvalid.status}`,
  );
  console.log('[D.4 Validasi] batal tindakan saat valid = 409, setelah Unvalid dibuka');

  const batalRes = await api(
    'DELETE',
    `/transaction/tindakan/item/${k2.tindakanItemId}`,
    null,
    adminToken,
  );
  assert(batalRes.status === 200, `Gagal membatalkan tindakan: ${batalRes.status}`);

  const invRevisi = (await api('GET', `/transaction/invoice/${k2.invoiceId}`, null, kasirToken))
    .body.data;
  const voidItems = invRevisi.items.filter((i) => i.is_void);
  console.log(
    `[D.4 Revisi Tagihan] total 100000 -> ${invRevisi.total}, item void = ${voidItems.length}`,
  );
  assert(
    invRevisi.total === 25000,
    `Total setelah batal tindakan seharusnya 25000, hasil ${invRevisi.total}`,
  );
  assert(
    voidItems.length === 1 && Boolean(voidItems[0].alasan_void),
    'Item lama harus di-void dengan alasan',
  );

  // Diagnosis diubah selama kunjungan belum valid: diizinkan dan tercatat di audit log.
  const diag1 = await api(
    'PUT',
    `/transaction/diagnosis/${k2.kunjunganId}`,
    { diagnosis: [{ icd10_id: icd1.body.data.id, jenis: 'utama' }] },
    adminToken,
  );
  const diag2 = await api(
    'PUT',
    `/transaction/diagnosis/${k2.kunjunganId}`,
    { diagnosis: [{ icd10_id: icd2.body.data.id, jenis: 'utama' }] },
    adminToken,
  );
  assert(diag1.status === 200 && diag2.status === 200, 'Diagnosis saat belum valid harus boleh');

  const validLagi = await api('PUT', `/transaction/invoice/${k2.invoiceId}/valid`, {}, kasirToken);
  assert(
    validLagi.status === 200 && validLagi.body.data.kunjungan.is_valid === true,
    `Gagal validasi ulang: ${validLagi.status}`,
  );

  // Lunasi 25.000: kunjungan otomatis selesai, lalu semua perubahan ditolak 409.
  const lunasi = await api(
    'POST',
    '/transaction/pembayaran',
    { invoice_id: k2.invoiceId, metode: 'tunai', jumlah: 25000 },
    kasirToken,
    { 'Idempotency-Key': crypto.randomUUID() },
  );
  assert(
    lunasi.status === 201 && lunasi.body.data.invoice.status === 'lunas',
    'Gagal melunasi invoice 2',
  );

  const tambahSaatLunas = await api(
    'POST',
    `/transaction/tindakan/${k2.kunjunganId}`,
    { tindakan_id: tindakan.body.data.id, qty: 1 },
    adminToken,
  );
  assert(
    tambahSaatLunas.status === 409,
    `Tambah tindakan saat lunas harus 409, hasil ${tambahSaatLunas.status}`,
  );

  const diagSaatLunas = await api(
    'PUT',
    `/transaction/diagnosis/${k2.kunjunganId}`,
    { diagnosis: [{ icd10_id: icd1.body.data.id, jenis: 'utama' }] },
    adminToken,
  );
  const unvalidSaatLunas = await api('PUT', `/transaction/invoice/${k2.invoiceId}/unvalid`, {}, kasirToken);
  const invLunas = (await api('GET', `/transaction/invoice/${k2.invoiceId}`, null, kasirToken)).body.data;
  console.log(
    `[D.4 Lunas] status kunjungan = ${invLunas.kunjungan.status}, diagnosis = ${diagSaatLunas.status}, unvalid = ${unvalidSaatLunas.status}`,
  );
  assert(invLunas.kunjungan.status === 'selesai', 'Kunjungan harus otomatis selesai saat lunas');
  assert(
    diagSaatLunas.status === 409 && unvalidSaatLunas.status === 409,
    'Diagnosis dan Unvalid setelah lunas harus ditolak 409',
  );

  const auditRes = await api(
    'GET',
    `/transaction/invoice/${k2.invoiceId}/audit-log`,
    null,
    kasirToken,
  );
  const auditPairs = auditRes.body.data.map((a) => `${a.tabel}:${a.aksi}`);
  console.log(`[D.4 Audit Log] jumlah = ${auditPairs.length}, daftar = [${auditPairs.join(', ')}]`);
  assert(auditPairs.includes('t_invoice:sync'), 'Audit log harus mencatat sinkronisasi t_invoice');
  assert(
    auditPairs.includes('t_tindakan:update'),
    'Audit log harus mencatat pembatalan t_tindakan',
  );
  assert(
    auditPairs.includes('t_diagnosis:update'),
    'Audit log harus mencatat perubahan t_diagnosis',
  );

  console.log(
    'Uji konkurensi D.3 & D.4 LULUS: pembayaran tidak ganda dan revisi tagihan konsisten.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
