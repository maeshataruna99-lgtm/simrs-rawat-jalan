/**
 * Benchmark latensi endpoint daftar Yii (dipakai untuk bukti D.6 di docs/performance.md).
 * Login sekali, lalu memanggil tiap endpoint berulang dan mencetak tabel median, p95, min, max.
 *
 * Jalankan: node scripts/bench-api.mjs [jumlah_ulang]
 * Env opsional: YII_URL (bawaan http://localhost:8080), BENCH_USER, BENCH_PASS, BENCH_DATE (Y-m-d).
 */
const base = process.env.YII_URL ?? 'http://localhost:8080';
const runs = Number(process.argv[2] ?? 20);
const tanggal = process.env.BENCH_DATE ?? new Date().toLocaleDateString('sv-SE');
const range = `tanggal_dari=${tanggal}&tanggal_sampai=${tanggal}`;

const endpoints = [
  ['Antrean poli', `/transaction/antrean?${range}`],
  ['Worklist pemeriksaan', `/transaction/pemeriksaan/worklist?${range}`],
  ['Worklist laboratorium', `/transaction/order-lab?status=diminta,diproses&${range}`],
  ['Antrean farmasi', `/transaction/farmasi/antrean?${range}`],
  ['Daftar invoice', `/transaction/invoice?${range}`],
  ['Belum ditagih', `/transaction/invoice/belum-tagih?${range}`],
  ['Riwayat pembayaran', `/transaction/pembayaran?${range}`],
  ['Master pasien', '/master/pasien?per_page=20'],
];

const login = await fetch(`${base}/system/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: process.env.BENCH_USER ?? 'admin',
    password: process.env.BENCH_PASS ?? 'simrs123',
  }),
});
const token = (await login.json())?.data?.token;
if (!token) {
  console.error(`Login gagal (HTTP ${login.status}). Cek BENCH_USER / BENCH_PASS.`);
  process.exit(1);
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

console.log(`Benchmark ${base}, ${runs} request per endpoint, tanggal ${tanggal}\n`);
console.log('| Endpoint | Median (ms) | p95 (ms) | Min (ms) | Max (ms) |');
console.log('|---|---:|---:|---:|---:|');
for (const [label, path] of endpoints) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    const res = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
    await res.arrayBuffer();
    if (!res.ok) {
      console.error(`${label}: HTTP ${res.status}`);
      process.exit(1);
    }
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  const r = (v) => Math.round(v);
  console.log(
    `| ${label} | ${r(pct(times, 50))} | ${r(pct(times, 95))} | ${r(times[0])} | ${r(times.at(-1))} |`,
  );
}
