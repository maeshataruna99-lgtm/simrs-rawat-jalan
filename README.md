# SIMRS Rawat Jalan

Sistem Informasi Manajemen Rumah Sakit (SIMRS) Rawat Jalan terintegrasi yang mencakup manajemen hak akses berbasis menu, master data, pendaftaran dan antrean, rekam medis elektronik (EMR), tindakan medis, farmasi dan mutasi stok, pemeriksaan laboratorium dengan integrasi outbox, billing/pembayaran bertahap, serta dashboard laporan read-only.

## Stack Teknologi

- **Frontend (`frontend-react/`)**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, i18next
- **Backend Utama (`backend-yii/`)**: PHP 8.3, Yii2 REST API — pemilik seluruh business logic, satu-satunya penulis data transaksi, dan pemilik migrasi database
- **Service Pendukung (`service-node/`)**: Node.js, Express 5, TypeScript, Zod, `pg` — integrasi hasil lab eksternal (pola outbox + retry) dan API dashboard agregasi read-only (`simrs_readonly`)
- **Database (`database/`)**: PostgreSQL 16 (constraint pengaman D.1–D.6 + index optimasi dashboard)
- **Orkestrasi**: Docker Compose

## Struktur Repository

```text
├── backend-yii/         # REST API utama (Yii2), migrasi, seeder, unit test PHPUnit
├── service-node/        # Integrasi lab (outbox) & API dashboard read-only, OpenAPI, test Vitest
├── frontend-react/      # Aplikasi web SPA per role, halaman cetak CSS print, test Vitest
├── database/            # ERD (erd.md), schema.sql, skrip init PostgreSQL (test DB & user read-only)
├── docs/                # Arsitektur, Yii vs Node, skenario teknis D.1–D.6, performance, API, test case, screenshots
├── postman/             # Postman collection, environment lokal, dan hasil run Newman
├── tests/concurrency/   # Skrip uji paralel D.1 (pendaftaran), D.2 (stok obat), D.3 & D.4 (pembayaran & revisi)
└── docker-compose.yml
```

## Instalasi & Menjalankan Secara Lokal

Prasyarat: Docker Desktop / Docker Engine dengan Docker Compose.

```bash
# 1. Clone repository dan masuk ke direktori
git clone https://github.com/maeshataruna99-lgtm/simrs-rawat-jalan.git
cd simrs-rawat-jalan

# 2. Salin konfigurasi lingkungan (edit nilai JWT_SECRET / LAB_API_KEYS bila perlu)
cp .env.example .env

# 3. Jalankan seluruh layanan (PostgreSQL, Yii, Node, React)
docker compose up -d --build

# 4. Jalankan migrasi dan isi data awal + data dummy end-to-end 30 hari
docker compose exec -T yii php yii migrate --interactive=0
docker compose exec -T yii php yii seed

# 5. Bersihkan schema cache Yii setelah migrasi (lihat docs/performance.md bagian 6)
docker compose exec -T yii php yii cache/flush-schema db --interactive=0
```

> Untuk environment Windows PowerShell pada langkah 2 gunakan `Copy-Item .env.example .env`.

### Alamat Layanan Lokal

| Layanan | URL | Keterangan |
|---|---|---|
| Frontend React | `http://localhost:5173` | Aplikasi utama seluruh role |
| Backend Yii2 | `http://localhost:8080` | REST API utama (`/health`, `/system/*`, `/master/*`, `/transaction/*`) |
| Service Node.js | `http://localhost:3000` | Integrasi lab (`/api/lab/*`) & dashboard (`/api/dashboard/*`) |
| PostgreSQL | `localhost:5432` | Database `simrs` (dev) dan `simrs_test` (test) |

## Konfigurasi Lingkungan (`.env`)

Seluruh variabel contoh tersedia di [`.env.example`](.env.example):

- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` — koneksi utama PostgreSQL (dipakai Yii dan outbox Node).
- `DB_READONLY_USER`, `DB_READONLY_PASSWORD` — koneksi read-only (`simrs_readonly`, hanya `SELECT`) untuk query dashboard Node.
- `JWT_SECRET` (minimal 32 karakter), `JWT_TTL` — secret penandatanganan JWT HS256 bersama antara Yii dan Node.
- `LAB_API_KEYS` — daftar API key sistem/alat lab eksternal (header `X-Api-Key`), dipisah koma.
- `LAB_YII_USERNAME`, `LAB_YII_PASSWORD` — kredensial akun layanan yang dipakai Node saat meneruskan hasil lab ke Yii.
- `CORS_ORIGIN` — origin frontend yang diizinkan (`http://localhost:5173`).
- `SEED_PASSWORD` — password awal akun dummy dari `php yii seed` (bawaan `simrs123`).

## Akun Dummy

Semua akun hasil `php yii seed` memakai password bawaan **`simrs123`**:

| Username | Role | Akses Utama |
|---|---|---|
| `admin` | Administrator | Akses penuh sistem, master data, seluruh transaksi, dan dashboard |
| `pendaftaran` | Petugas Pendaftaran | Master pasien, pendaftaran kunjungan, antrean poli, dashboard |
| `dokter` | Dokter (`DR001` — dr. Budi Santoso) | Worklist & pemeriksaan pasien miliknya, diagnosis ICD-10, tindakan, resep, order lab, riwayat medis, dashboard |
| `farmasi` | Petugas Farmasi | Master obat & mutasi stok, antrean & penyerahan resep, dashboard |
| `laboratorium` | Petugas Laboratorium | Master pemeriksaan lab, worklist & input hasil lab, dashboard |
| `kasir` | Kasir | Billing, penerbitan invoice, pembayaran bertahap/lunas, cetak invoice/kwitansi, dashboard |

## Pengujian, Lint, dan Build

```bash
# Backend Yii2 (migrasi simrs_test + PHPUnit + PHP-CS-Fixer)
docker compose exec -T yii composer test
docker compose exec -T yii composer lint

# Service Node.js (Vitest wajib di container agar terhubung ke PostgreSQL Docker)
docker compose exec -T node npm test
cd service-node && npm run lint && npm run check-types

# Frontend React (Vitest, ESLint, Vite build, Prettier)
cd frontend-react && npx vitest run && npm run lint && npm run build && npx prettier --check .

# Uji konkurensi skenario teknis D.1 – D.4
node tests/concurrency/pendaftaran.mjs
node tests/concurrency/stok-obat.mjs
node tests/concurrency/pembayaran.mjs

# Uji end-to-end API dengan Newman (ganti lab_api_key sesuai LAB_API_KEYS di .env)
npx newman run postman/simrs.collection.json -e postman/local.environment.json --env-var "lab_api_key=<LAB_API_KEY>"
```

## Dokumentasi Lengkap

- **ERD & Skema Database**: [`database/erd.md`](database/erd.md), [`database/schema.sql`](database/schema.sql)
- **Arsitektur & Alur Komunikasi**: [`docs/architecture.md`](docs/architecture.md)
- **Pembagian Tanggung Jawab Yii vs Node**: [`docs/yii-vs-node.md`](docs/yii-vs-node.md)
- **Analisis & Bukti Skenario Teknis (D.1–D.6)**: [`docs/technical-scenarios.md`](docs/technical-scenarios.md)
- **Optimasi Query Dashboard (`EXPLAIN ANALYZE`) dan latensi API (pagination, OPcache, schema cache)**: [`docs/performance.md`](docs/performance.md)
- **Dokumentasi API**: [`docs/api/yii.md`](docs/api/yii.md), [`docs/api/node.md`](docs/api/node.md), [`service-node/openapi.yaml`](service-node/openapi.yaml) (juga disajikan di `http://localhost:3000/openapi.yaml`)
- **Postman & Hasil Newman**: [`postman/simrs.collection.json`](postman/simrs.collection.json), [`postman/local.environment.json`](postman/local.environment.json), [`postman/newman-report.txt`](postman/newman-report.txt)
- **Daftar Test Case & Galeri Screenshot**: [`docs/test-cases.md`](docs/test-cases.md), [`docs/screenshots/README.md`](docs/screenshots/README.md)
- **Chatbot Bantuan (bonus, tanpa LLM)**: [`docs/chatbot.md`](docs/chatbot.md)
- **Aturan Kontribusi & Roadmap**: [`CONTRIBUTING.md`](CONTRIBUTING.md), [`ROADMAP.md`](ROADMAP.md)
