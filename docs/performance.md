# Optimasi Performa: Query Dashboard, Hak Akses Read-Only, dan Latensi API (D.6)

Dokumen ini mencatat strategi index database, isolasi koneksi baca untuk service Node, hasil pengukuran `EXPLAIN (ANALYZE, BUFFERS)` sebelum serta sesudah migrasi index (`m261122_010000_create_dashboard_indexes`), serta optimasi latensi API Yii lewat pagination, OPcache, dan schema cache (bagian 6).

## 1. Daftar Index Dashboard

Migrasi: `backend-yii/migrations/m261122_010000_create_dashboard_indexes.php`

| Index | Tabel & Kolom | Tujuan |
|---|---|---|
| `idx_t_kunjungan_tgl_poli` | `t_kunjungan (tgl_kunjungan, poli_id)` | Filter periode kunjungan dan agregasi kunjungan per poli |
| `idx_t_invoice_status` | `t_invoice (status)` | Filter status tagihan (`belum_dibayar`, `dibayar_sebagian`, `lunas`) |
| `idx_t_pembayaran_dibayar_at` | `t_pembayaran (dibayar_at)` | Filter rentang waktu pembayaran dan grafik pendapatan per hari |
| `idx_t_tindakan_kunjungan_status` | `t_tindakan (kunjungan_id, status)` | Join tindakan aktif per kunjungan |
| `idx_t_resep_kunjungan_status` | `t_resep (kunjungan_id, status)` | Join resep non-batal per kunjungan |
| `idx_t_invoice_item_invoice_sumber_aktif` | `t_invoice_item (invoice_id, sumber) WHERE is_void = false` | Komposisi tagihan per sumber biaya (item aktif saja) |

Seluruh query di `service-node/src/modules/dashboard/dashboard.service.ts` memakai predikat tanggal **sargable** (`dibayar_at >= $1::date AND dibayar_at < ($2::date + INTERVAL '1 day')`), bukan membungkus kolom dengan fungsi `DATE(dibayar_at)`, agar planner PostgreSQL dapat memakai B-Tree index secara langsung.

## 2. User Database Read-Only untuk Node

Skrip inisialisasi: `database/init/02-create-readonly-user.sql`

- Role PostgreSQL `simrs_readonly` hanya diberi izin `CONNECT`, `USAGE ON SCHEMA public`, `SELECT ON ALL TABLES IN SCHEMA public`, dan `ALTER DEFAULT PRIVILEGES ... GRANT SELECT`.
- `service-node/src/lib/db.ts` menyediakan pool terpisah `readDb()` yang terhubung menggunakan `DB_READONLY_USER` / `DB_READONLY_PASSWORD` khusus untuk query dashboard dan cek hak akses.
- Verifikasi isolasi izin dengan `psql -U simrs_readonly -d simrs`:
  - `SELECT COUNT(*) FROM t_kunjungan;` → berhasil.
  - `DELETE FROM t_invoice WHERE id = -1;` → ditolak dengan `ERROR: permission denied for table t_invoice`.

## 3. Metodologi Pengukuran `EXPLAIN (ANALYZE, BUFFERS)`

- Database uji: `simrs_test` (PostgreSQL 16).
- Volume data sintetis: 15.000 baris `t_kunjungan` tersebar merata pada 365 hari (4 poli), 15.000 baris `t_tindakan` aktif, 15.000 baris `t_invoice` (2% `belum_dibayar`, 2% `dibayar_sebagian`, 96% `lunas`), dan 14.700 baris `t_pembayaran`.
- `ANALYZE` dijalankan sebelum pengukuran awal dan tepat setelah migrasi index diterapkan.
- Rentang filter uji: periode 7 hari (`2025-11-01` s/d `2025-11-07`).

## 4. Ringkasan Perbandingan Sebelum dan Sesudah Index

| Query | Plan Sebelum | Waktu Sebelum | Plan Sesudah | Waktu Sesudah | Perbaikan |
|---|---|---:|---|---:|---|
| Q1. Kunjungan per poli (7 hari) | `Bitmap Index Scan` pada `uq_t_kunjungan_antrean` (84 index buffers) | 2.734 ms | `Bitmap Index Scan` pada `idx_t_kunjungan_tgl_poli` (8 index buffers) | 1.090 ms | 2,5× lebih cepat |
| Q2. Pendapatan per hari (7 hari) | `Seq Scan on t_pembayaran` (14.417 baris dibuang, 199 buffers) | 9.991 ms | `Bitmap Index Scan` pada `idx_t_pembayaran_dibayar_at` (54 buffers) | 1.495 ms | 6,7× lebih cepat |
| Q3. Invoice `belum_dibayar` | `Seq Scan on t_invoice` (14.700 baris dibuang) | 6.843 ms | `Index Scan using idx_t_invoice_status` (0 baris dibuang) | 0.635 ms | 10,8× lebih cepat |
| Q4. Tindakan terbanyak (7 hari) | `Seq Scan on t_kunjungan` (3.850 ms, 171 buffers) + Hash Join | 22.915 ms | `Bitmap Index Scan` pada `idx_t_kunjungan_tgl_poli` (0.449 ms, 47 buffers) + Hash Join | 20.838 ms | Scan kunjungan 8,6× lebih cepat; total buffers 342 → 218 |

> Catatan Q4: Pada 15.000 baris `t_tindakan` (164 halaman, seluruhnya `aktif`), planner PostgreSQL memilih Hash Join atas `t_tindakan` setelah memfilter `t_kunjungan` lewat `idx_t_kunjungan_tgl_poli`. Pada volume lebih besar atau selektivitas lebih tinggi, `idx_t_tindakan_kunjungan_status` tersedia untuk Nested Loop index lookup.

## 5. Bukti Output `EXPLAIN (ANALYZE, BUFFERS)`

### Q1 — Kunjungan per Poli (7 hari)

**Sebelum index:**

```text
Sort  (cost=274.64..274.65 rows=1 width=308) (actual time=2.442..2.445 rows=4 loops=1)
  Buffers: shared hit=263
  ->  HashAggregate  (cost=274.62..274.63 rows=1 width=308) (actual time=2.264..2.267 rows=4 loops=1)
        ->  Nested Loop  (cost=131.18..273.06 rows=313 width=304) (actual time=0.361..2.134 rows=287 loops=1)
              ->  Seq Scan on m_poli pl  (cost=0.00..1.00 rows=1 width=300) (actual time=0.016..0.020 rows=4 loops=1)
              ->  Bitmap Heap Scan on t_kunjungan k  (cost=131.18..271.28 rows=78 width=8) (actual time=0.329..0.492 rows=72 loops=4)
                    ->  Bitmap Index Scan on uq_t_kunjungan_antrean  (cost=0.00..131.16 rows=78 width=0) (actual time=0.313..0.313 rows=72 loops=4)
                          Buffers: shared hit=84
Execution Time: 2.734 ms
```

**Sesudah index:**

```text
Sort  (cost=151.68..151.69 rows=1 width=308) (actual time=0.874..0.875 rows=4 loops=1)
  Buffers: shared hit=185 read=2
  ->  HashAggregate  (cost=151.66..151.67 rows=1 width=308) (actual time=0.768..0.770 rows=4 loops=1)
        ->  Nested Loop  (cost=8.22..150.10 rows=313 width=304) (actual time=0.115..0.685 rows=287 loops=1)
              ->  Seq Scan on m_poli pl  (cost=0.00..1.00 rows=1 width=300) (actual time=0.015..0.017 rows=4 loops=1)
              ->  Bitmap Heap Scan on t_kunjungan k  (cost=8.22..148.32 rows=78 width=8) (actual time=0.050..0.142 rows=72 loops=4)
                    ->  Bitmap Index Scan on idx_t_kunjungan_tgl_poli  (cost=0.00..8.20 rows=78 width=0) (actual time=0.039..0.039 rows=72 loops=4)
                          Index Cond: ((tgl_kunjungan >= '2025-11-01'::date) AND (tgl_kunjungan <= '2025-11-07'::date) AND (poli_id = pl.id))
                          Buffers: shared hit=6 read=2
Execution Time: 1.090 ms
```

### Q2 — Pendapatan per Hari (7 hari)

**Sebelum index:**

```text
Sort  (cost=431.33..431.82 rows=198 width=76) (actual time=9.004..9.007 rows=7 loops=1)
  Buffers: shared hit=199
  ->  HashAggregate  (cost=419.32..423.78 rows=198 width=76) (actual time=8.843..8.872 rows=7 loops=1)
        ->  Seq Scan on t_pembayaran b  (cost=0.00..417.20 rows=282 width=17) (actual time=1.012..7.651 rows=283 loops=1)
              Filter: ((dibayar_at >= '2025-11-01'::date) AND (dibayar_at < '2025-11-08 00:00:00'::timestamp without time zone))
              Rows Removed by Filter: 14417
              Buffers: shared hit=196
Execution Time: 9.991 ms
```

**Sesudah index:**

```text
Sort  (cost=232.06..232.56 rows=198 width=76) (actual time=1.122..1.124 rows=7 loops=1)
  Buffers: shared hit=51 read=3
  ->  HashAggregate  (cost=220.05..224.51 rows=198 width=76) (actual time=0.998..1.008 rows=7 loops=1)
        ->  Bitmap Heap Scan on t_pembayaran b  (cost=7.18..217.94 rows=282 width=17) (actual time=0.326..0.741 rows=283 loops=1)
              Heap Blocks: exact=45
              Buffers: shared hit=48 read=3
              ->  Bitmap Index Scan on idx_t_pembayaran_dibayar_at  (cost=0.00..7.11 rows=282 width=0) (actual time=0.254..0.255 rows=283 loops=1)
                    Index Cond: ((dibayar_at >= '2025-11-01'::date) AND (dibayar_at < '2025-11-08 00:00:00'::timestamp without time zone))
                    Buffers: shared hit=3 read=3
Execution Time: 1.495 ms
```

### Q3 — Invoice Belum Dibayar

**Sebelum index:**

```text
Seq Scan on t_invoice i  (cost=0.00..344.50 rows=300 width=24) (actual time=0.038..6.577 rows=300 loops=1)
  Filter: ((status)::text = 'belum_dibayar'::text)
  Rows Removed by Filter: 14700
  Buffers: shared hit=157
Execution Time: 6.843 ms
```

**Sesudah index:**

```text
Index Scan using idx_t_invoice_status on t_invoice i  (cost=0.29..107.19 rows=300 width=24) (actual time=0.068..0.515 rows=300 loops=1)
  Index Cond: ((status)::text = 'belum_dibayar'::text)
  Buffers: shared hit=157 read=2
Execution Time: 0.635 ms
```

### Q4 — Tindakan Terbanyak (7 hari)

**Sebelum index:**

```text
Limit  (cost=839.18..839.20 rows=10 width=362) (actual time=22.448..22.453 rows=2 loops=1)
  Buffers: shared hit=342
  ->  ... -> Hash Join (t.kunjungan_id = k.id)
        ->  Seq Scan on t_tindakan t (actual time=0.056..12.338 rows=15000 loops=1)
        ->  Hash -> Seq Scan on t_kunjungan k (actual time=0.154..3.850 rows=287 loops=1)
              Rows Removed by Filter: 14713
              Buffers: shared hit=171
Execution Time: 22.915 ms
```

**Sesudah index:**

```text
Limit  (cost=592.82..592.85 rows=10 width=362) (actual time=20.459..20.465 rows=2 loops=1)
  Buffers: shared hit=218
  ->  ... -> Hash Join (t.kunjungan_id = k.id)
        ->  Seq Scan on t_tindakan t (actual time=0.017..12.543 rows=15000 loops=1)
        ->  Hash -> Bitmap Heap Scan on t_kunjungan k (actual time=0.056..0.449 rows=287 loops=1)
              Heap Blocks: exact=45
              Buffers: shared hit=47
              ->  Bitmap Index Scan on idx_t_kunjungan_tgl_poli (actual time=0.038..0.038 rows=287 loops=1)
                    Buffers: shared hit=2
Execution Time: 20.838 ms
```

## 6. Latensi API Yii: Pagination, OPcache, Realpath Cache, dan Schema Cache

Bagian ini mencatat optimasi sisi aplikasi untuk endpoint daftar transaksi Yii, beserta perbandingan latensi sebelum dan sesudah.

### 6.1 Pagination dan Filter Rentang Tanggal di Server

Endpoint daftar transaksi sebelumnya mengembalikan seluruh baris sekaligus. Sekarang semuanya memakai helper `backend-yii/common/ListQuery.php`:

- `ListQuery::paginate()` menerapkan `LIMIT/OFFSET` dan mengembalikan `meta {page, per_page, total}`. `per_page` dibatasi maksimal 100.
- `ListQuery::rentangTanggal()` menerapkan `tanggal_dari` dan `tanggal_sampai`. Kolom `date` memakai `>= dari AND <= sampai`. Kolom `timestamp` memakai `>= dari AND < sampai + 1 hari` agar tetap sargable (lihat bagian 1). Tanggal tidak valid menghasilkan daftar kosong, bukan error database.
- Frontend mengirim rentang hari ini secara bawaan, dan pengguna dapat memilih 10, 20, 50, atau 100 baris per halaman.

| Endpoint | Filter tanggal | Kata kunci (`q`) |
|---|---|---|
| `GET /transaction/antrean` | `t_kunjungan.tgl_kunjungan` | no. kunjungan, no. RM, nama pasien |
| `GET /transaction/pemeriksaan/worklist` | `t_kunjungan.tgl_kunjungan` (bawaan hari ini) | no. kunjungan, no. RM, nama pasien |
| `GET /transaction/order-lab` | tanggal kunjungan | no. order, no. RM, nama pasien |
| `GET /transaction/farmasi/antrean` | tanggal kunjungan | no. resep, no. RM, nama pasien |
| `GET /transaction/invoice` | tanggal kunjungan | no. invoice, no. kunjungan, no. RM, nama pasien |
| `GET /transaction/invoice/belum-tagih` | tanggal kunjungan | no. kunjungan, no. RM, nama pasien |
| `GET /transaction/pembayaran` | `t_pembayaran.dibayar_at` (timestamp, sargable) | no. pembayaran, no. invoice, no. RM, nama pasien |

### 6.2 Diagnosis Latensi di Lingkungan Docker

Gejala: endpoint daftar butuh 0,4–3,4 detik secara acak, termasuk endpoint dengan hasil kosong. Pengukuran di dalam container `simrs-yii`:

| Pengukuran | Hasil |
|---|---|
| Query data `belum-tagih` (8 query) | ~40 ms |
| Query skema tabel ke `pg_catalog` per request (tanpa schema cache) | 10 query, 150–190 ms |
| Koneksi PDO ke PostgreSQL (termasuk DNS) | 25–33 ms |
| `GET /health` (bootstrap Yii, tanpa DB dan auth) | ~80 ms |
| Baca 300 file PHP dari bind mount `./backend-yii` (9p dari drive Windows) | 6.949 ms (~23 ms per file) |
| Baca 300 file yang sama dari filesystem container | 18 ms |

Kesimpulan: query database bukan penyebab. Penyebabnya ada tiga:

1. `php -S` berjalan sebagai SAPI CLI dengan `opcache.enable_cli=0`, sehingga file PHP tidak di-cache antar request.
2. Schema cache Yii tidak aktif, sehingga setiap request menjalankan ~10 query skema.
3. Akses file pada bind mount Windows (9p) lambat. Ini juga berlaku untuk file cache di `runtime/` dan untuk pengecekan timestamp OPcache.

### 6.3 Perubahan Konfigurasi

| Perubahan | Lokasi | Efek |
|---|---|---|
| OPcache untuk CLI (`opcache.enable_cli=1`) | `backend-yii/docker/php-performance.ini`, disalin oleh `backend-yii/Dockerfile` | File PHP di-compile sekali lalu disimpan di shared memory |
| `opcache.revalidate_freq=60` (env `PHP_OPCACHE_REVALIDATE_FREQ`) | file ini yang sama + `ENV` di Dockerfile | Timestamp file dicek ulang tiap 60 detik, bukan tiap 2 detik |
| `realpath_cache_size=4096K`, `realpath_cache_ttl=600` | file ini yang sama | Autoloader tidak mengulang `stat` path ke filesystem |
| Schema cache (`enableSchemaCache`, durasi 3600 detik) | `backend-yii/config/web.php`, `backend-yii/config/console.php` | 10 query skema per request menjadi 0. Dimatikan saat `YII_ENV=test` |
| `FileCache` di `sys_get_temp_dir()` | file konfigurasi yang sama | File cache berada di filesystem container, bukan di bind mount |

Kontribusi tiap lapisan pada endpoint `belum-tagih` (20 request):

| Tahap | Median | p95 |
|---|---:|---:|
| Baseline | 440 ms | 3.147 ms |
| + OPcache, realpath cache, schema cache di `runtime/` (revalidate 2 detik) | 514 ms | 1.670 ms |
| + file cache dipindah ke filesystem container | 254 ms | 1.185 ms |
| + `revalidate_freq` 60 detik (konfigurasi akhir) | 242 ms | 315 ms |

Uji terkontrol untuk `revalidate_freq` (dua server pada container yang sama, 40 request `belum-tagih`, jeda 100 ms):

| `opcache.revalidate_freq` | Median | p95 | Max |
|---|---:|---:|---:|
| 2 detik | 246 ms | 1.599 ms | 1.919 ms |
| 60 detik | 236 ms | 296 ms | 354 ms |

### 6.4 Hasil Sebelum dan Sesudah

Diukur dengan `node scripts/bench-api.mjs 20` (20 request berurutan per endpoint, login sebagai `admin`, rentang tanggal hari ini, data seed). Lingkungan: Docker Desktop di Windows 11, kode di-mount dari drive C:.

| Endpoint | Median sebelum | Median sesudah | p95 sebelum | p95 sesudah |
|---|---:|---:|---:|---:|
| Antrean poli | 1.484 ms | 225 ms | 3.170 ms | 363 ms |
| Worklist pemeriksaan | 500 ms | 236 ms | 3.168 ms | 264 ms |
| Worklist laboratorium | 551 ms | 272 ms | 3.175 ms | 374 ms |
| Antrean farmasi | 546 ms | 262 ms | 2.056 ms | 331 ms |
| Daftar invoice | 286 ms | 214 ms | 1.468 ms | 304 ms |
| Belum ditagih | 440 ms | 242 ms | 3.147 ms | 315 ms |
| Riwayat pembayaran | 278 ms | 220 ms | 2.969 ms | 334 ms |
| Master pasien | 322 ms | 185 ms | 1.380 ms | 232 ms |

Ringkasnya, p95 turun dari 1,4–3,2 detik menjadi 0,23–0,37 detik, dan median turun 1,3–6,6 kali. Efek samping: suite PHPUnit backend turun dari ~68 detik menjadi ~58 detik karena OPcache juga aktif di CLI.

### 6.5 Konsekuensi dan Cara Mengulang

- **Perubahan kode Yii baru berlaku paling lambat 60 detik.** Untuk pengembangan aktif, set `PHP_OPCACHE_REVALIDATE_FREQ` lebih kecil di bagian `environment` service `yii`, atau jalankan `docker compose restart yii`.
- **Setelah migrasi, bersihkan schema cache:** `docker compose exec -T yii php yii cache/flush-schema db --interactive=0`. Migrasi berbasis DDL builder ikut menyegarkan cache, tetapi migrasi SQL mentah tidak.
- **Mengulang pengukuran:** `node scripts/bench-api.mjs 20`. Env opsional: `YII_URL`, `BENCH_USER`, `BENCH_PASS`, `BENCH_DATE`.
- Angka di atas mencerminkan lingkungan Docker di Windows. Di Linux atau dengan kode di filesystem WSL, latensi baseline jauh lebih kecil, tetapi OPcache dan schema cache tetap mengurangi kerja per request.

### 6.6 Menghilangkan Query N+1 pada Daftar Billing

Jumlah query dihitung lewat profiling Yii (`enableProfiling`) untuk satu halaman berisi 20 baris, dengan schema cache aktif:

| Endpoint | Sebelum | Sesudah | Penyebab | Perbaikan |
|---|---:|---:|---|---|
| `GET /transaction/invoice/belum-tagih` | 25 (20× `t_kunjungan_status_log`) | 6 | `Kunjungan::fields()` menyertakan `status_logs`, tetapi relasi tidak di-eager-load | `->with(['statusLogs'])` di `InvoiceService::kunjunganBelumTagih()` |
| `GET /transaction/invoice` | 21 (13× `t_pembayaran`) | 9 | Field `total_bayar_saat_itu` menjalankan satu `SUM` per pembayaran | `Invoice::fields()` menghitung running sum dari relasi `pembayarans` yang sudah dimuat |
| `GET /transaction/pembayaran` | 28 (22× `t_pembayaran`) | 8 | Sama seperti di atas | Subquery `SUM(jumlah)` per baris di SELECT (`PembayaranService::daftar()`), memakai `idx_t_pembayaran_invoice_id` |

Endpoint daftar lain (antrean, worklist, laboratorium, farmasi) sudah memakai eager loading, dengan 6–8 query per halaman berapa pun jumlah barisnya. Endpoint detail pembayaran (cetak bukti bayar) tetap memakai query `SUM` cadangan karena hanya memuat satu baris. Kebenaran nilai akumulasi diuji di `PembayaranServiceTest::testPembayaranBertahapMengubahStatusSebagianKeLunas`.
