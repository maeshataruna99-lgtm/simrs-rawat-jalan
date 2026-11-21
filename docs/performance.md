# Optimasi Query Dashboard dan Pemisahan Hak Akses Read-Only (D.6)

Dokumen ini mencatat strategi index database, isolasi koneksi baca untuk service Node, dan hasil pengukuran `EXPLAIN (ANALYZE, BUFFERS)` sebelum serta sesudah migrasi index (`m261122_010000_create_dashboard_indexes`).

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
