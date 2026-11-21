/**
 * Script uji konkurensi penyerahan obat (Skenario D.2 — poin 6.5).
 * 1. Dua resep berbeda masing-masing butuh 5 tablet, stok hanya 5, diserahkan bersamaan:
 *    tepat 1 sukses (200), 1 ditolak (409), stok akhir 0 dan hanya 1 mutasi keluar.
 * 2. Resep yang sama diserahkan 5 kali bersamaan: tepat 1 sukses, sisanya 409.
 *
 * Cara menjalankan: node tests/concurrency/stok-obat.mjs (data uji dibuat lewat API di database dev).
 */

const BASE_URL = process.env.YII_URL ?? 'http://localhost:8080';

async function api(method, path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const login = await api('POST', '/system/auth/login', {
    username: 'admin',
    password: process.env.SEED_PASSWORD ?? 'simrs123',
  });
  assert(login.status === 200, `Login gagal: ${login.status}`);
  const token = login.body.data.token;

  const senin = new Date();
  senin.setDate(senin.getDate() + ((8 - senin.getDay()) % 7 || 7));
  const tglKunjungan = senin.toLocaleDateString('sv-SE');
  const sfx = Date.now().toString().slice(-6);

  const dokter = await api(
    'POST',
    '/master/dokter',
    { kode: `DR-S${sfx}`, nama: `dr. Stok ${sfx}`, sip: `SIP/S/${sfx}`, jenis_tenaga: 'dokter' },
    token,
  );
  const poli = await api(
    'POST',
    '/master/poli',
    { kode: `POLI-S${sfx}`, nama: `Poli Stok ${sfx}`, tarif_pendaftaran: 25000 },
    token,
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
    token,
  );
  const obat = await api(
    'POST',
    '/master/obat',
    { kode: `OBT-S${sfx}`, nama: `Obat Stok ${sfx}`, satuan: 'tablet', harga: 1000 },
    token,
  );
  const obatId = obat.body.data.id;
  await api('POST', `/master/obat/${obatId}/sesuaikan-stok`, { stok_baru: 5 }, token);

  async function resepSiapSerah(i, jumlah) {
    const pasien = await api(
      'POST',
      '/master/pasien',
      {
        nik: `3298${sfx}${String(i).padStart(6, '0')}`,
        nama: `Pasien Stok ${i}`,
        tgl_lahir: '1990-01-01',
        jenis_kelamin: 'P',
      },
      token,
    );
    const kunjungan = await api(
      'POST',
      '/transaction/pendaftaran',
      {
        pasien_id: pasien.body.data.id,
        jadwal_id: jadwal.body.data.id,
        tgl_kunjungan: tglKunjungan,
      },
      token,
    );
    const resep = await api(
      'POST',
      '/transaction/resep',
      {
        kunjungan_id: kunjungan.body.data.id,
        items: [{ obat_id: obatId, dosis: '1 tab', frekuensi: '1x1', jumlah }],
      },
      token,
    );
    assert(resep.status === 201, `Resep gagal dibuat: ${JSON.stringify(resep.body)}`);
    await api('PUT', `/transaction/farmasi/${resep.body.data.id}/proses`, {}, token);
    return resep.body.data.id;
  }

  // Skenario 1: dua resep berbeda, stok cukup untuk satu saja.
  const resepIds = [await resepSiapSerah(1, 5), await resepSiapSerah(2, 5)];
  const serah = await Promise.all(
    resepIds.map((id) => api('PUT', `/transaction/farmasi/${id}/serahkan`, {}, token)),
  );
  const statuses = serah.map((r) => r.status).sort();
  const stok = (await api('GET', `/master/obat/${obatId}`, null, token)).body.data.stok;
  const keluar = (await api('GET', `/master/obat/${obatId}/mutasi`, null, token)).body.data.filter(
    (m) => m.jenis === 'keluar',
  );
  console.log(
    `[D.2 Dua Resep] status = [${statuses.join(', ')}], stok akhir = ${stok}, mutasi keluar = ${keluar.length}`,
  );
  assert(statuses.join() === '200,409', `Ekspektasi 200 dan 409, hasil ${statuses.join(', ')}`);
  assert(stok === 0, `Stok akhir seharusnya 0, hasil ${stok}`);
  assert(keluar.length === 1, `Mutasi keluar seharusnya 1, hasil ${keluar.length}`);

  // Skenario 2: resep yang sama diserahkan berkali-kali bersamaan.
  await api('POST', `/master/obat/${obatId}/sesuaikan-stok`, { stok_baru: 10 }, token);
  const resepSama = await resepSiapSerah(3, 2);
  const ulang = await Promise.all(
    Array.from({ length: 5 }, () =>
      api('PUT', `/transaction/farmasi/${resepSama}/serahkan`, {}, token),
    ),
  );
  const sukses = ulang.filter((r) => r.status === 200).length;
  const stokAkhir = (await api('GET', `/master/obat/${obatId}`, null, token)).body.data.stok;
  console.log(`[D.2 Resep Sama] sukses = ${sukses}, stok akhir = ${stokAkhir}`);
  assert(sukses === 1, `Resep yang sama seharusnya diserahkan sekali, hasil ${sukses}`);
  assert(stokAkhir === 8, `Stok akhir seharusnya 8, hasil ${stokAkhir}`);

  console.log('Uji konkurensi D.2 LULUS: stok tidak minus dan obat tidak diserahkan ganda.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
