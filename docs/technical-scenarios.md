# Analisis dan Bukti Skenario Teknis (D.1 – D.6)

Dokumen ini merangkum enam skenario teknis kritis (konkurensi, konsistensi data, idempotensi, integrasi tahan gagal, dan optimasi query), lengkap dengan akar masalah, mekanisme pengaman lintas lapisan, lokasi kode, serta bukti pengujian.

---

## D.1 — Pendaftaran Ganda dan Balapan Nomor Antrean

### Masalah
Dua petugas atau dua klik paralel mendaftarkan pasien yang sama pada poli dan tanggal yang sama, atau banyak pasien mendaftar bersamaan ke jadwal dokter dengan kuota terbatas, sehingga berisiko menimbulkan kunjungan ganda, nomor antrean ganda, atau melewati kuota.

### Solusi Berlapis
1. **Row lock counter & jadwal**: transaksi pendaftaran mengunci jadwal dokter (`FOR UPDATE`) untuk memverifikasi kuota serta menaikkan counter antrean/nomor kunjungan secara atomik lewat `SequenceService` (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`).
2. **Pengaman PostgreSQL**:
   - Partial unique index `uq_t_kunjungan_pasien_poli_tgl_aktif` pada `(pasien_id, poli_id, tgl_kunjungan) WHERE status <> 'batal'` menolak pendaftaran aktif ganda (tetap mengizinkan daftar ulang bila kunjungan sebelumnya dibatalkan).
   - Unique index `uq_t_kunjungan_antrean` pada `(poli_id, dokter_id, tgl_kunjungan, no_antrean)` menolak nomor antrean kembar.
3. **Respons API**: pelanggaran keunikan/kuota dibalas `409 Conflict`.

### Lokasi Kode
- Migrasi: `backend-yii/migrations/m261121_123000_create_t_kunjungan_and_status_log_tables.php`
- Service: `backend-yii/modules/transaction/pendaftaran/PendaftaranService.php`, `backend-yii/common/SequenceService.php`
- Test: `backend-yii/tests/unit/transaction/pendaftaran/PendaftaranServiceTest.php`, `tests/concurrency/pendaftaran.mjs`

### Bukti Uji
- `PendaftaranServiceTest` memverifikasi pendaftaran ganda (409), kuota penuh (409), dan daftar ulang setelah batal (201).
- `node tests/concurrency/pendaftaran.mjs` menjalankan pendaftaran paralel pada pasien sama dan pada kuota terbatas: tepat 1 sukses untuk pasien sama dan jumlah sukses tidak pernah melebihi kuota tanpa nomor antrean ganda.

---

## D.2 — Balapan Stok Obat saat Penyerahan Farmasi

### Masalah
Dua resep yang membutuhkan obat yang sama (atau satu resep yang diklik "Serahkan" dua kali bersamaan) dieksekusi paralel ketika stok hanya cukup untuk satu resep, berisiko menyebabkan stok minus atau mutasi keluar tercatat ganda.

### Solusi Berlapis
1. **Row lock terurut (`FOR UPDATE`)**: `FarmasiService::serahkan()` mengunci baris `t_resep` (`FOR UPDATE`) dan mengunci semua baris `m_obat` yang terlibat secara terurut berdasarkan `id ASC` (`FOR UPDATE`) untuk mencegah deadlock.
2. **Validasi status & stok di dalam transaksi**: memastikan resep berstatus `diproses`, stok cukup untuk seluruh item, lalu mengurangi stok dan mencatat `t_stok_mutasi` (`jenis = 'keluar'`) secara atomik.
3. **Pengaman PostgreSQL**: constraint `CHECK (stok >= 0)` pada `m_obat`, `CHECK (stok_sesudah >= 0)` pada `t_stok_mutasi`, dan `CHECK (status <> 'diserahkan' OR diserahkan_at IS NOT NULL)` pada `t_resep`.

### Lokasi Kode
- Migrasi: `backend-yii/migrations/m261121_114000_create_m_obat_and_t_stok_mutasi_tables.php`, `backend-yii/migrations/m261121_150000_create_t_resep_tables.php`
- Service: `backend-yii/modules/transaction/resep/FarmasiService.php`
- Test: `backend-yii/tests/unit/transaction/resep/ResepServiceTest.php`, `tests/concurrency/stok-obat.mjs`

### Bukti Uji
- `node tests/concurrency/stok-obat.mjs`:
  - Dua resep masing-masing butuh 5 tablet saat stok 5 diserahkan bersamaan → status `[200, 409]`, stok akhir `0`, tepat 1 mutasi keluar.
  - Resep sama diserahkan 5 kali bersamaan → tepat 1 sukses (`200`), 4 ditolak (`409`), stok berkurang sekali.

---

## D.3 — Pencegahan Pembayaran Ganda dan Overpayment

### Masalah
Kasir menekan tombol bayar dua kali, koneksi timeout sehingga klien melakukan retry, atau dua kasir memproses pembayaran paralel untuk tagihan yang sama, berisiko menimbulkan pembayaran ganda atau `total_bayar > total`.

### Solusi Berlapis
1. **Idempotency-Key dari klien**: `BillingPage.tsx` / `BayarDialog.tsx` membuat satu UUID `Idempotency-Key` saat dialog bayar dibuka dan mengirim ulang key yang sama pada setiap retry (`pembayaran.api.ts`).
2. **Validasi & lock di Yii**: `PembayaranService::bayar()` mewajibkan header `Idempotency-Key` (`422` bila kosong), mengunci baris `t_invoice` dengan `SELECT ... FOR UPDATE`, memeriksa ulang keberadaan `idempotency_key` setelah lock (serta menangkap `IntegrityException` sebagai pengaman terakhir). Key yang sama pada invoice yang sama mengembalikan pembayaran lama dengan HTTP `200`, bukan membuat baris baru; key sama untuk invoice berbeda ditolak `409`.
3. **Pengaman PostgreSQL**: unique index `uq_t_pembayaran_idempotency_key` dan `CHECK (total_bayar >= 0 AND total_bayar <= total)` pada `t_invoice`.

### Lokasi Kode
- Migrasi: `backend-yii/migrations/m261121_170000_create_billing_and_audit_tables.php`
- Service & UI: `backend-yii/modules/transaction/pembayaran/PembayaranService.php`, `frontend-react/src/modules/transaction/pembayaran/BayarDialog.tsx`
- Test: `backend-yii/tests/unit/transaction/pembayaran/PembayaranServiceTest.php`, `tests/concurrency/pembayaran.mjs`, `frontend-react/tests/transaction-billing.test.tsx`

### Bukti Uji
- `node tests/concurrency/pembayaran.mjs`:
  - `[D.3 Idempotency Paralel]` 5 request paralel dengan key sama: `status = [200, 200, 200, 200, 201]`, `unik no_pembayaran = 1`, `total_bayar = 40000`, jumlah baris pembayaran = `1`.
  - `[D.3 Race Sisa Tagihan]` 5 request paralel dengan key berbeda untuk sisa penuh `60000`: `status = [201, 409, 409, 409, 409]`, `total_bayar = 100000`, `status_invoice = lunas`.
- `transaction-billing.test.tsx` memverifikasi retry setelah error jaringan mengirim `Idempotency-Key` yang identik.

---

## D.4 — Revisi Tagihan dan Audit Log saat Diagnosis atau Tindakan Berubah

### Masalah
Dokter membatalkan atau menambah tindakan, resep, atau order lab setelah invoice sudah diterbitkan, atau mengubah diagnosis setelah tagihan lunas. Tanpa mekanisme revisi yang terkontrol, tagihan menjadi tidak sinkron atau histori keuangan hilang.

### Solusi Berlapis
1. **Item berbasis sumber & void**: setiap baris `t_invoice_item` menyimpan `(sumber, referensi_id)` dengan partial unique index `uq_t_invoice_item_aktif WHERE is_void = false`. Saat tindakan/resep/lab berubah, `BillingSyncService::sinkronkan()` mengunci `t_invoice` (`FOR UPDATE`), menandai item lama `is_void = true` disertai `alasan_void` (wajib non-kosong lewat check constraint `chk_t_invoice_item_void`), menambahkan item baru, dan menghitung ulang `total` serta `status`.
2. **Proteksi invoice lunas & overpay**: perubahan biaya ditolak `409` bila invoice sudah `lunas`, atau bila revisi membuat `total < total_bayar` (transaksi di-rollback utuh).
3. **Audit log menyeluruh**: `AuditLogBehavior` (terpasang pada `Pemeriksaan`, `TindakanKunjungan`, `Invoice`, `InvoiceItem`) serta `AuditLog::catat()` pada `BillingSyncService::sinkronkan()` dan `PemeriksaanService::simpanDiagnosis()` mencatat `data_lama` & `data_baru` (JSONB) di `t_audit_log`. Perubahan diagnosis tetap diizinkan setelah lunas karena tidak mengubah biaya, namun tetap terekam di `t_audit_log`.

### Lokasi Kode
- Migrasi: `backend-yii/migrations/m261121_170000_create_billing_and_audit_tables.php`
- Service & Behavior: `backend-yii/common/AuditLog.php`, `backend-yii/common/AuditLogBehavior.php`, `backend-yii/modules/transaction/pembayaran/BillingSyncService.php`
- Hook: `TindakanKunjunganService.php`, `ResepService.php`, `OrderLabService.php`, `PemeriksaanService.php`
- Test: `backend-yii/tests/unit/transaction/pembayaran/BillingSyncServiceTest.php`, `tests/concurrency/pembayaran.mjs`

### Bukti Uji
- `BillingSyncServiceTest` (6 test): verifikasi void item + penurunan total, penambahan tindakan/resep/lab pasca-invoice, pelunasan otomatis saat total turun menyamai `total_bayar`, rollback `409` bila total < `total_bayar`, penolakan `409` saat lunas, dan audit log perubahan diagnosis.
- `node tests/concurrency/pembayaran.mjs`:
  - `[D.4 Revisi Tagihan]` `total 100000 -> 25000, item void = 1`
  - `[D.4 Audit Log]` `jumlah = 6, daftar = [t_diagnosis:update, t_diagnosis:update, t_invoice:sync, t_tindakan:update, t_invoice:insert, t_tindakan:insert]`

---

## D.5 — Integrasi Hasil Lab Tahan Gagal (Outbox + Idempotensi)

### Masalah
Alat/sistem lab eksternal mengirim hasil ke `service-node` saat `backend-yii` sedang tidak dapat diakses atau mengembalikan 5xx, atau mengirim payload yang sama berulang kali (retry). Hasil tidak boleh hilang dan tidak boleh terproses ganda.

### Solusi Berlapis
1. **Transactional Outbox di Node**: `POST /api/lab/results` meneruskan payload ke Yii (`PUT /transaction/hasil-lab/{detailId}`) membawa header `Idempotency-Key`. Bila Yii gagal/timeout/5xx, Node menyimpan pesan ke `t_integration_outbox` (`status = 'pending'`, `idempotency_key` unik) dan merespons `202 Accepted`.
2. **Worker retry eksponensial**: `outbox.worker.ts` secara periodik memproses baris jatuh tempo (`FOR UPDATE SKIP LOCKED`), menaikkan `percobaan` dan menjadwalkan `retry_berikutnya` secara eksponensial hingga terkirim (`terkirim`) atau mencapai batas gagal (`gagal`).
3. **Idempotensi di Yii**: `OrderLabService::simpanHasil()` menyimpan `idempotency_key` unik di `t_order_lab_detail`; pengiriman ulang key sama langsung mengembalikan hasil lama (`200`) tanpa menimpa atau menggandakan proses.

### Lokasi Kode
- Migrasi: `backend-yii/migrations/m261121_160000_create_t_order_lab_and_outbox_tables.php`
- Node: `service-node/src/modules/lab/lab.service.ts`, `outbox.ts`, `outbox.worker.ts`
- Yii: `backend-yii/modules/transaction/lab/OrderLabService.php`
- Test: `service-node/tests/lab.test.ts`, `service-node/tests/lab-integration.test.ts`, `backend-yii/tests/unit/transaction/lab/OrderLabServiceTest.php`

### Bukti Uji
- `docker compose exec -T node npm test`: `lab.test.ts` dan `lab-integration.test.ts` memverifikasi saat Yii down pesan masuk outbox (`pending`), saat Yii hidup kembali worker mengirim hingga `terkirim`, dan pengiriman ulang `idempotency_key` sama tidak membuat hasil ganda.

---

## D.6 — Optimasi Query Dashboard dan Isolasi Read-Only

### Masalah
Query agregasi dashboard (kunjungan per poli, pendapatan per hari, status pembayaran, tindakan terbanyak) berpotensi melakukan `Seq Scan` pada tabel transaksi besar dan berisiko membebani atau memodifikasi data transaksi bila memakai akun tulis yang sama.

### Solusi Berlapis
1. **Index komposit & partial index**: migrasi `m261122_010000_create_dashboard_indexes.php` menambahkan 6 index strategis (`idx_t_kunjungan_tgl_poli`, `idx_t_invoice_status`, `idx_t_pembayaran_dibayar_at`, `idx_t_tindakan_kunjungan_status`, `idx_t_resep_kunjungan_status`, `idx_t_invoice_item_invoice_sumber_aktif`).
2. **Predikat tanggal sargable**: seluruh query dashboard menghindari pembungkusan kolom tanggal dengan fungsi (`dibayar_at >= $1::date AND dibayar_at < ($2::date + INTERVAL '1 day')`).
3. **Role DB read-only**: `database/init/02-create-readonly-user.sql` membuat role `simrs_readonly` (hanya `SELECT`) yang dipakai oleh `readDb()` di `service-node/src/lib/db.ts`.

### Lokasi Kode & Bukti Uji
- Migrasi & SQL: `backend-yii/migrations/m261122_010000_create_dashboard_indexes.php`, `database/init/02-create-readonly-user.sql`
- Bukti lengkap `EXPLAIN (ANALYZE, BUFFERS)` sebelum vs sesudah pada 15.000 baris sintetis: [`docs/performance.md`](performance.md) (Q1 2,5× lebih cepat, Q2 6,7× lebih cepat, Q3 10,8× lebih cepat, Q4 scan kunjungan 8,6× lebih cepat).
