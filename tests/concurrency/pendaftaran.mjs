/**
 * Script uji konkurensi pendaftaran kunjungan rawat jalan (Skenario D.1 — poin 3.5).
 * Mengirim 10 request POST /transaction/pendaftaran secara bersamaan (Promise.all):
 * 1. 10 request bersamaan untuk 1 pasien yang sama -> tepat 1 sukses (201), 9 ditolak (409).
 * 2. 10 request bersamaan untuk 10 pasien berbeda -> 10 sukses (201) dengan nomor antrean 1..10 tanpa ganda.
 *
 * Cara menjalankan: node tests/concurrency/pendaftaran.mjs
 */

const BASE_URL = process.env.YII_URL ?? 'http://localhost:8080';
const PARALLEL_COUNT = 10;

async function api(method, path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function main() {
  const loginRes = await api('POST', '/system/auth/login', {
    username: 'admin',
    password: process.env.SEED_PASSWORD ?? 'simrs123',
  });
  if (loginRes.status !== 200) {
    throw new Error(`Login gagal: ${loginRes.status}`);
  }
  const token = loginRes.body.data.token;

  // Senin berikutnya (hari = 1) agar tanggal kunjungan tidak pernah lampau.
  const senin = new Date();
  senin.setDate(senin.getDate() + ((8 - senin.getDay()) % 7 || 7));
  const tglKunjungan = senin.toLocaleDateString('sv-SE');
  const suffix = Date.now().toString().slice(-6);

  const dokterRes = await api(
    'POST',
    '/master/dokter',
    {
      kode: `DR-C${suffix}`,
      nama: `dr. Concurrency ${suffix}`,
      sip: `SIP/C/${suffix}`,
      jenis_tenaga: 'dokter',
    },
    token,
  );
  const poliRes = await api(
    'POST',
    '/master/poli',
    {
      kode: `POLI-C${suffix}`,
      nama: `Poli Concurrency ${suffix}`,
      tarif_pendaftaran: 25000,
    },
    token,
  );
  const jadwalRes = await api(
    'POST',
    '/master/jadwal-dokter',
    {
      dokter_id: dokterRes.body.data.id,
      poli_id: poliRes.body.data.id,
      hari: 1,
      jam_mulai: '08:00',
      jam_selesai: '16:00',
      kuota: 30,
    },
    token,
  );

  const jadwalId = jadwalRes.body.data.id;

  const pasienIds = [];
  for (let i = 0; i < PARALLEL_COUNT; i += 1) {
    const nik = `3299${suffix}${String(i).padStart(6, '0')}`;
    const pRes = await api(
      'POST',
      '/master/pasien',
      {
        nik,
        nama: `Pasien Paralel ${i + 1}`,
        tgl_lahir: '1990-01-01',
        jenis_kelamin: 'L',
      },
      token,
    );
    pasienIds.push(pRes.body.data.id);
  }

  // Skenario 1: 10 request bersamaan untuk pasien yang sama
  const samePatientResults = await Promise.all(
    Array.from({ length: PARALLEL_COUNT }, () =>
      api(
        'POST',
        '/transaction/pendaftaran',
        {
          pasien_id: pasienIds[0],
          jadwal_id: jadwalId,
          tgl_kunjungan: tglKunjungan,
        },
        token,
      ),
    ),
  );

  const createdSame = samePatientResults.filter((r) => r.status === 201);
  const conflictSame = samePatientResults.filter((r) => r.status === 409);

  console.log(
    `[D.1 Pasien Sama] 201 Created = ${createdSame.length}, 409 Conflict = ${conflictSame.length}`,
  );
  if (createdSame.length !== 1 || conflictSame.length !== PARALLEL_COUNT - 1) {
    throw new Error(
      `Ekspektasi 1 sukses (201) dan ${PARALLEL_COUNT - 1} konflik (409), tetapi hasil: ${samePatientResults.map((r) => r.status).join(', ')}`,
    );
  }

  // Batalkan kunjungan pertama agar seluruh 10 pasien bisa diuji mengambil antrean bersamaan
  await api(
    'PUT',
    `/transaction/antrean/${createdSame[0].body.data.id}/status`,
    { status: 'batal' },
    token,
  );

  // Skenario 2: 10 request bersamaan untuk 10 pasien berbeda pada jadwal yang sama
  const multiPatientResults = await Promise.all(
    pasienIds.map((pasienId) =>
      api(
        'POST',
        '/transaction/pendaftaran',
        {
          pasien_id: pasienId,
          jadwal_id: jadwalId,
          tgl_kunjungan: tglKunjungan,
        },
        token,
      ),
    ),
  );

  const allCreated = multiPatientResults.every((r) => r.status === 201);
  if (!allCreated) {
    throw new Error(
      `Sebagian pendaftaran paralel gagal: ${multiPatientResults.map((r) => r.status).join(', ')}`,
    );
  }

  const queueNumbers = multiPatientResults.map((r) => r.body.data.no_antrean).sort((a, b) => a - b);
  const uniqueQueueNumbers = new Set(queueNumbers);

  console.log(`[D.1 Nomor Antrean Paralel] no_antrean = [${queueNumbers.join(', ')}]`);
  if (uniqueQueueNumbers.size !== PARALLEL_COUNT) {
    throw new Error(`Ditemukan nomor antrean ganda: ${queueNumbers.join(', ')}`);
  }

  console.log(
    'Uji konkurensi D.1 LULUS: hanya 1 kunjungan aktif per pasien dan nomor antrean tidak ganda.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
