<div align="center">

# 🏥 SIMRS Rawat Jalan

**Sistem Informasi Manajemen Rumah Sakit untuk pelayanan rawat jalan terintegrasi**
Pendaftaran → Antrean → Pemeriksaan → Tindakan → Farmasi → Laboratorium → Billing → Pembayaran

</div>

<br>

## 📑 Daftar Isi

1. [Gambaran Umum](#-gambaran-umum)
2. [Stack Teknologi](#-stack-teknologi)
3. [Struktur Repository](#-struktur-repository)
4. [Prasyarat](#-prasyarat)
5. [Memulai dari Nol (Laptop Baru)](#-memulai-dari-nol-laptop-baru)
6. [Alamat Layanan dan Akun Dummy](#-alamat-layanan-dan-akun-dummy)
7. [Database: Migrasi, Seed, dan Reset](#-database-migrasi-seed-dan-reset)
8. [Konfigurasi Lingkungan (`.env`)](#-konfigurasi-lingkungan-env)
9. [Panduan Developer Harian](#-panduan-developer-harian)
10. [Pengujian, Lint, dan Build](#-pengujian-lint-dan-build)
11. [Troubleshooting](#-troubleshooting)
12. [Dokumentasi Lengkap](#-dokumentasi-lengkap)

---

<br>

## 🩺 Gambaran Umum

Aplikasi ini mengelola perjalanan pasien rawat jalan dalam satu alur terintegrasi, dengan hak akses sesuai tanggung jawab tiap petugas.

| | Fitur |
|---|---|
| 🔐 | Login JWT dan hak akses per menu untuk 6 role |
| 🗃️ | Master data: pasien dan No. RM, dokter, poli, jadwal, tindakan dan tarif, obat dan stok, laboratorium, ICD-10 |
| 🧾 | Pendaftaran kunjungan dan antrean otomatis |
| 🩻 | Rekam medis elektronik: anamnesis, tanda vital, diagnosis, tindakan, resep, order lab |
| 💊 | Farmasi dengan validasi stok dan mutasi stok |
| 🧪 | Laboratorium dengan integrasi sistem eksternal (outbox dan retry) |
| 💳 | Billing dari 4 sumber biaya, pembayaran tunai dan non-tunai bertahap, cetak invoice dan bukti bayar |
| 📊 | Dashboard laporan read-only dengan filter periode dan export |

<br>

---

<br>

## 🧰 Stack Teknologi

| Lapisan | Teknologi |
|---|---|
| 🖥️ Frontend (`frontend-react/`) | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, i18next |
| ⚙️ Backend utama (`backend-yii/`) | PHP 8.3, Yii2 REST API. Pemilik seluruh business logic, satu-satunya penulis data transaksi, dan pemilik migrasi |
| 🔌 Service pendukung (`service-node/`) | Node.js, Express 5, TypeScript, Zod, `pg`. Integrasi hasil lab (outbox + retry) dan API dashboard read-only (`simrs_readonly`) |
| 🗄️ Database (`database/`) | PostgreSQL 16 (constraint pengaman D.1–D.6 dan index dashboard) |
| 🐳 Orkestrasi | Docker Compose |

<br>

---

<br>

## 🗂️ Struktur Repository

```text
├── backend-yii/         # REST API utama (Yii2), migrasi, seeder, unit test PHPUnit
├── service-node/        # Integrasi lab (outbox) dan API dashboard read-only, OpenAPI, test Vitest
├── frontend-react/      # Aplikasi web SPA per role, halaman cetak, test Vitest
├── database/            # ERD (erd.md), schema.sql, skrip init PostgreSQL
├── docs/                # Arsitektur, Yii vs Node, skenario D.1–D.6, performa, API, test case, proof book
├── postman/             # Postman collection, environment lokal, hasil run
├── tests/concurrency/   # Uji paralel D.1 (pendaftaran), D.2 (stok), D.3 dan D.4 (pembayaran, revisi)
├── scripts/             # reset-db.sh, db-counts.sh, bench-api.mjs, scripts/proof/ (pembuat proof book)
└── docker-compose.yml
```

<br>

---

<br>

## ✅ Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| 🐳 Docker Desktop atau Docker Engine + Compose | Wajib. Menjalankan seluruh layanan |
| 🌿 Git | Wajib |
| 🟢 Node.js 24 + npm | Hanya untuk lint, test, dan hook commit di luar Docker |
| 🐚 Git Bash atau WSL | Untuk skrip `scripts/*.sh` di Windows (PowerShell tidak punya `sh`; ada perintah setara di bawah) |

Port berikut harus kosong: `5432`, `8080`, `3000`, `5173`.

<br>

---

<br>

## 🚀 Memulai dari Nol (Laptop Baru)

> ⚠️ **Penting:** `docker compose up` **tidak** menjalankan migrasi dan seed otomatis, dan folder `vendor/` PHP **tidak** ikut di repository. Langkah 4 sampai 6 wajib dijalankan manual pada instalasi pertama.

**1️⃣ Clone dan masuk ke direktori**

```bash
git clone https://github.com/maeshataruna99-lgtm/simrs-rawat-jalan.git
cd simrs-rawat-jalan
```

**2️⃣ Salin konfigurasi lingkungan**

```bash
cp .env.example .env
```

PowerShell: `Copy-Item .env.example .env`. Ubah `JWT_SECRET` (minimal 32 karakter) dan `LAB_API_KEYS` bila perlu.

**3️⃣ Build dan jalankan semua layanan**

```bash
docker compose up -d --build
```

PostgreSQL otomatis membuat database `simrs`, `simrs_test`, dan user read-only `simrs_readonly` saat volume pertama kali dibuat.

**4️⃣ Pasang dependensi PHP (Composer)**

```bash
docker compose exec -T yii composer install --no-interaction
```

**5️⃣ Jalankan migrasi database**

```bash
docker compose exec -T yii php yii migrate --interactive=0
```

**6️⃣ Isi data awal dan data dummy**

```bash
docker compose exec -T yii php yii seed
docker compose exec -T yii php yii cache/flush-schema db --interactive=0
```

**7️⃣ Verifikasi**

```bash
docker compose ps
```

Buka `http://localhost:8080/health` (Yii) dan `http://localhost:3000/health` (Node), lalu `http://localhost:5173` dan login sebagai `admin`. Semua kontainer harus berstatus `Up`, PostgreSQL `healthy`.

<br>

---

<br>

## 🌐 Alamat Layanan dan Akun Dummy

### 🔗 Layanan lokal

| Layanan | URL | Keterangan |
|---|---|---|
| 🖥️ Frontend React | `http://localhost:5173` | Aplikasi utama seluruh role |
| ⚙️ Backend Yii2 | `http://localhost:8080` | REST API (`/health`, `/system/*`, `/master/*`, `/transaction/*`) |
| 🔌 Service Node.js | `http://localhost:3000` | `/api/lab/*`, `/api/dashboard/*`, `/openapi.yaml` |
| 🗄️ PostgreSQL | `localhost:5432` | Database `simrs` (dev) dan `simrs_test` (test) |

### 👥 Akun dummy

Hasil `php yii seed`. Password semua akun: **`simrs123`** (hanya untuk pengembangan).

| Username | Role | Akses utama |
|---|---|---|
| `admin` | Administrator | Akses penuh sistem, master, transaksi, dashboard |
| `pendaftaran` | Petugas Pendaftaran | Master pasien, pendaftaran, antrean, dashboard |
| `dokter` | Dokter (`DR001` dr. Budi Santoso) | Worklist dan pemeriksaan pasien miliknya, diagnosis, tindakan, resep, order lab, riwayat medis |
| `farmasi` | Petugas Farmasi | Master obat dan stok, antrean dan penyerahan resep |
| `laboratorium` | Petugas Laboratorium | Master pemeriksaan lab, worklist dan input hasil |
| `kasir` | Kasir | Billing, invoice, pembayaran, cetak invoice dan kwitansi |

<br>

---

<br>

## 🗄️ Database: Migrasi, Seed, dan Reset

Semua perintah dijalankan dari root repository. Migrasi hanya dikelola oleh Yii (`backend-yii/migrations/`).

### 🧱 Migrasi

| Tujuan | Perintah |
|---|---|
| Terapkan migrasi baru | `docker compose exec -T yii php yii migrate --interactive=0` |
| Lihat riwayat migrasi | `docker compose exec -T yii php yii migrate/history` |
| Batalkan 1 migrasi terakhir | `docker compose exec -T yii php yii migrate/down 1 --interactive=0` |
| Bersihkan schema cache (**wajib** setelah migrasi) | `docker compose exec -T yii php yii cache/flush-schema db --interactive=0` |

### 🌱 Seed

| Tujuan | Perintah |
|---|---|
| Semua seeder berurutan | `docker compose exec -T yii php yii seed` |
| Role, modul, menu, hak akses, akun dummy | `docker compose exec -T yii php yii seed/system` |
| Master diagnosis ICD-10 | `docker compose exec -T yii php yii seed/icd10` |
| Data dummy ujung ke ujung (50 pasien, 5 dokter, 4 poli, jadwal seminggu, kunjungan 30 hari) | `docker compose exec -T yii php yii seed/dummy` |

> ℹ️ Seeder **idempoten**: dijalankan ulang tidak menggandakan data yang sudah ada (jumlah baris tetap sama pada uji ulang). Namun seed **tidak** menghapus atau mengembalikan data yang sudah berubah. Untuk kondisi bersih, gunakan reset di bawah.

### ♻️ Reset data dan seed ulang

Menghapus **seluruh isi tabel aplikasi** (kecuali tabel `migration`), memulai ulang ID dari 1, lalu seed ulang. Skema, index, dan hak user read-only tetap utuh.

> 🛑 Destruktif. Hanya untuk lingkungan pengembangan atau pengujian.

**Opsi A, satu perintah (Git Bash / WSL / Linux / macOS)**

```bash
sh scripts/reset-db.sh
```

Skrip ini mengasumsikan kontainer `simrs-postgres` dan user/database `simrs` (bawaan `docker-compose.yml`).

**Opsi B, PowerShell (tanpa `sh`)**

```powershell
@'
DO $$ DECLARE t text; BEGIN SELECT string_agg(quote_ident(table_name), ',') INTO t FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'migration'; EXECUTE 'TRUNCATE ' || t || ' RESTART IDENTITY CASCADE'; END $$;
'@ | docker compose exec -T postgres psql -U simrs -d simrs -v ON_ERROR_STOP=1
docker compose exec -T yii php yii migrate --interactive=0
docker compose exec -T yii php yii seed
docker compose exec -T yii php yii cache/flush-schema db --interactive=0
```

**Opsi C, bersih total (hapus volume database)**

Menghapus database beserta user read-only, lalu membuatnya ulang dari nol. Pakai bila skema rusak.

```bash
docker compose down -v
docker compose up -d --build
docker compose exec -T yii composer install --no-interaction
docker compose exec -T yii php yii migrate --interactive=0
docker compose exec -T yii php yii seed
docker compose exec -T yii php yii cache/flush-schema db --interactive=0
```

### 🔎 Cek isi database

```bash
sh scripts/db-counts.sh      # jumlah baris eksak seluruh tabel
```

Setelah reset dan seed, hasil yang diharapkan: `m_pasien` 50, `t_kunjungan` 60, `m_user` 6, `m_role` 6.

<br>

---

<br>

## ⚙️ Konfigurasi Lingkungan (`.env`)

Contoh lengkap ada di [`.env.example`](.env.example). `.env` tidak boleh di-commit.

| Variabel | Fungsi |
|---|---|
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | Koneksi utama PostgreSQL (Yii dan outbox Node) |
| `DB_READONLY_USER`, `DB_READONLY_PASSWORD` | Koneksi read-only `simrs_readonly` untuk query dashboard Node |
| `JWT_SECRET` | Secret JWT HS256 bersama Yii dan Node (minimal 32 karakter) |
| `JWT_TTL` | Masa berlaku token dalam detik |
| `LAB_API_KEYS` | API key sistem lab eksternal (header `X-Api-Key`), pisahkan dengan koma |
| `LAB_YII_USERNAME`, `LAB_YII_PASSWORD` | Akun layanan yang dipakai Node untuk meneruskan hasil lab ke Yii |
| `CORS_ORIGIN` | Origin frontend yang diizinkan (`http://localhost:5173`) |
| `SEED_PASSWORD` | Password awal akun dummy dari `php yii seed` |

<br>

---

<br>

## 🧑‍💻 Panduan Developer Harian

### ▶️ Menjalankan dan menghentikan

| Tujuan | Perintah |
|---|---|
| Jalankan semua layanan | `docker compose up -d` |
| Hentikan (data tetap) | `docker compose stop` |
| Hentikan dan hapus kontainer (data tetap) | `docker compose down` |
| Lihat status | `docker compose ps` |
| Lihat log satu layanan | `docker compose logs -f yii` (atau `node`, `react`, `postgres`) |
| Restart satu layanan | `docker compose restart yii` |
| Masuk ke shell kontainer | `docker compose exec yii bash` |
| Masuk ke psql | `docker compose exec postgres psql -U simrs -d simrs` |

### 🔥 Hot reload

Kode di-mount dari host, jadi perubahan langsung terbaca:

- **React:** Vite memuat ulang otomatis.
- **Node:** `tsx watch` memuat ulang otomatis (polling aktif untuk Windows).
- **Yii (PHP):** OPcache memeriksa file setiap 60 detik. Bila perubahan belum terlihat, jalankan `docker compose restart yii`.

### 🪝 Hook commit

Pesan commit divalidasi commitlint (Conventional Commits). Aktifkan hook sekali di root:

```bash
npm install
```

Aturan yang sering menggagalkan commit: **header maksimal 72 karakter** dan **subjek huruf kecil** (tulis `pdf`, bukan `PDF`). Contoh: `feat(billing): validasi kasir mengunci kunjungan`. Aturan lengkap ada di [`CONTRIBUTING.md`](CONTRIBUTING.md).

### 🔁 Setelah `git pull`

```bash
docker compose up -d --build
docker compose exec -T yii composer install --no-interaction
docker compose exec -T yii php yii migrate --interactive=0
docker compose exec -T yii php yii cache/flush-schema db --interactive=0
```

### 🧾 Membuat ulang proof book

Lihat [`docs/proof-book/README.md`](docs/proof-book/README.md). Ringkasnya: `sh scripts/reset-db.sh`, lalu `python scripts/proof/flow.py`, `capture.py`, `d5-outbox.py`, dan `build-pdf.py`.

<br>

---

<br>

## 🧪 Pengujian, Lint, dan Build

| Lapisan | Perintah |
|---|---|
| 🐘 Backend Yii (migrasi `simrs_test`, PHPUnit) | `docker compose exec -T yii composer test` |
| 🐘 Backend Yii (PHP-CS-Fixer) | `docker compose exec -T yii composer lint` |
| 🟢 Service Node (**wajib** di kontainer agar terhubung ke PostgreSQL) | `docker compose exec -T node npm test` |
| 🟢 Service Node (lint dan tipe) | `cd service-node && npm run lint && npm run check-types` |
| ⚛️ Frontend (test) | `cd frontend-react && npx vitest run` |
| ⚛️ Frontend (lint, build, format) | `cd frontend-react && npm run lint && npm run build && npx prettier --check .` |
| ⚡ Konkurensi D.1 sampai D.4 | `node tests/concurrency/pendaftaran.mjs`, `stok-obat.mjs`, `pembayaran.mjs` |
| 📮 API end-to-end (Postman CLI) | `postman collection run postman/simrs.collection.json -e postman/local.environment.json --env-var "lab_api_key=<LAB_API_KEY>"` |
| 📮 API end-to-end (Newman) | `npx newman run postman/simrs.collection.json -e postman/local.environment.json --env-var "lab_api_key=<LAB_API_KEY>"` |

Ganti `<LAB_API_KEY>` dengan salah satu nilai `LAB_API_KEYS` di `.env`. Hasil terakhir: PHPUnit 134 test, Vitest Node 38, Vitest React 78, koleksi Postman 35 request dan 45 assertion tanpa kegagalan.

<br>

---

<br>

## 🛠️ Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Kontainer `yii` error `vendor/autoload.php` tidak ditemukan | Dependensi PHP belum dipasang | `docker compose exec -T yii composer install --no-interaction` |
| API 500 atau error "table ... does not exist" | Migrasi belum dijalankan | `php yii migrate --interactive=0` lalu `cache/flush-schema` |
| Login gagal atau akun tidak ada | Seed belum dijalankan | `php yii seed` |
| Error kolom tidak dikenal setelah migrasi | Schema cache Yii lama | `php yii cache/flush-schema db --interactive=0` |
| Dashboard Node error `permission denied` | Volume database lama dibuat sebelum user read-only ada | `docker compose exec -T postgres psql -U simrs -d simrs -f /docker-entrypoint-initdb.d/02-create-readonly-user.sql` (di Git Bash Windows awali dengan `MSYS_NO_PATHCONV=1`) |
| Port sudah dipakai (5432, 8080, 3000, 5173) | Layanan lain memakai port yang sama | Hentikan layanan itu, atau ubah pemetaan port di `docker-compose.yml` |
| Perubahan PHP belum terlihat | OPcache menunggu 60 detik | `docker compose restart yii` |
| `sh` tidak dikenali di PowerShell | PowerShell tidak punya `sh` | Pakai Git Bash/WSL, atau perintah PowerShell pada bagian reset |
| `npm test` Node gagal terhubung ke database | Test dijalankan di luar Docker | Jalankan `docker compose exec -T node npm test` |
| Kondisi data kacau saat uji | Sisa data uji | Reset: `sh scripts/reset-db.sh` |

<br>

---

<br>

## 📚 Dokumentasi Lengkap

| 📄 Dokumen | Isi |
|---|---|
| [`docs/proof-book/`](docs/proof-book/README.md) | **Proof book dan panduan modul (PDF)** |
| [`database/erd.md`](database/erd.md), [`database/schema.sql`](database/schema.sql) | ERD dan skema database |
| [`docs/architecture.md`](docs/architecture.md) | Arsitektur dan alur komunikasi |
| [`docs/yii-vs-node.md`](docs/yii-vs-node.md) | Pembagian tanggung jawab Yii dan Node |
| [`docs/technical-scenarios.md`](docs/technical-scenarios.md) | Analisis dan bukti skenario D.1–D.6 |
| [`docs/performance.md`](docs/performance.md) | Optimasi query dashboard dan latensi API |
| [`docs/api/yii.md`](docs/api/yii.md), [`docs/api/node.md`](docs/api/node.md), [`service-node/openapi.yaml`](service-node/openapi.yaml) | Dokumentasi API |
| [`postman/`](postman) | Collection, environment, dan hasil run |
| [`docs/test-cases.md`](docs/test-cases.md), [`docs/screenshots/README.md`](docs/screenshots/README.md) | Daftar test case dan galeri screenshot |
| [`docs/chatbot.md`](docs/chatbot.md) | Chatbot bantuan (bonus, tanpa LLM) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md), [`ROADMAP.md`](ROADMAP.md) | Aturan kontribusi dan roadmap |
