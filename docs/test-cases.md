# Daftar Test Case Fitur Utama — SIMRS Rawat Jalan

Dokumen ini memuat skenario pengujian fungsional dan teknis (B.1–B.9, C.1–C.2, D.1–D.6) beserta langkah pengujian, hasil yang diharapkan, dan acuan test otomatisnya.

## Ringkasan Cakupan Test Otomatis

| Lapisan | Perintah | Status Terakhir |
|---|---|---|
| Backend Yii2 (PHPUnit) | `docker compose exec -T yii composer test` | 134 tests, 446 assertions lulus (termasuk `DummySeederTest`) |
| Service Node.js (Vitest) | `docker compose exec -T node npm test` | 6 files, 38 tests lulus (auth, validate, lab, outbox, dashboard) |
| Frontend React (Vitest) | `cd frontend-react && npx vitest run` | 22 files, 78 tests lulus |
| Konkurensi (Node scripts) | `node tests/concurrency/{pendaftaran,stok-obat,pembayaran}.mjs` | D.1, D.2, D.3, D.4 lulus |
| End-to-End API (Newman) | `npx newman run postman/simrs.collection.json -e postman/local.environment.json` | 35 requests, 45 assertions, 0 failed |

---

## 1. Autentikasi & Hak Akses (B.9)

| ID | Skenario | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| TC-AUTH-01 | Login dengan akun valid | Buka `/login`, masukkan `admin` / `simrs123`, klik Masuk | Status `200`, JWT diterima, sidebar menampilkan modul & menu sesuai role | Lulus |
| TC-AUTH-02 | Login dengan password salah | Kirim `POST /system/auth/login` dengan password salah | Status `401`, pesan kredensial salah, token tidak diberikan | Lulus |
| TC-AUTH-03 | Akses endpoint tanpa token | Kirim `GET /master/pasien` tanpa header `Authorization` | Status `401` | Lulus |
| TC-AUTH-04 | Cek RBAC menu (403) | Login sebagai `kasir`, akses `GET /system/user` atau `POST /transaction/tindakan/{id}` | Status `403`, pesan tidak memiliki akses | Lulus |
| TC-AUTH-05 | Ubah matriks hak akses role | Login `admin`, buka `/system/role-access`, ubah izin role dan simpan | Perubahan tersimpan di `m_role_access` dan langsung berlaku pada request berikutnya | Lulus |

## 2. Master Data (B.1)

| ID | Skenario | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| TC-MST-01 | Tambah pasien & No. RM otomatis | Buka `/master/pasien`, isi NIK 16 digit unik dan data diri, simpan | Status `201`, `no_rm` terbentuk otomatis (`RM000xxx`); NIK duplikat ditolak `422` | Lulus |
| TC-MST-02 | Soft delete master data | Hapus data dokter/poli/obat yang tidak dipakai | `deleted_at` terisi, tidak muncul di daftar aktif, data transaksi lama tetap utuh | Lulus |
| TC-MST-03 | Validasi bentrok jadwal dokter | Buat jadwal dokter pada hari dan rentang jam yang bertabrakan untuk dokter sama | Ditolak `422` / `409` dengan pesan jadwal bentrok | Lulus |
| TC-MST-04 | Penyesuaian stok obat & mutasi | Buka `/master/obat`, klik Sesuaikan Stok, ubah stok | Stok berubah dan tercatat baris baru di `t_stok_mutasi` | Lulus |

## 3. Pendaftaran & Antrean (B.2, D.1)

| ID | Skenario | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| TC-REG-01 | Pendaftaran kunjungan normal | Login `pendaftaran`, pilih pasien & jadwal hari aktif, simpan | Status `201`, `no_kunjungan` dan `no_antrean` berurutan, status `menunggu` | Lulus |
| TC-REG-02 | Tolak tanggal kunjungan lampau | Kirim `POST /transaction/pendaftaran` dengan `tgl_kunjungan` kemarin | Ditolak `422` | Lulus |
| TC-REG-03 | Pendaftaran ganda & kuota paralel (D.1) | Jalankan `node tests/concurrency/pendaftaran.mjs` | Pasien sama di poli & tanggal sama hanya 1 sukses (`409` untuk duplikat); kuota tidak terlampaui dan nomor antrean unik | Lulus |
| TC-REG-04 | Transisi status antrean | Ubah `menunggu → diperiksa`; coba pilih `selesai` manual atau ubah setelah `batal` | Transisi valid `200` + tercatat di `t_kunjungan_status_log`; `selesai` manual dan transisi tidak sah ditolak. Kunjungan baru `selesai` saat invoicenya lunas | Lulus |

## 4. Pemeriksaan, Rekam Medis, & Tindakan (B.3, B.4)

| ID | Skenario | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| TC-EMR-01 | Worklist dokter terisolasi | Login `dokter` (`DR001`), buka `/transaction/pemeriksaan` | Hanya menampilkan kunjungan milik `DR001`; akses kunjungan dokter lain ditolak `403` | Lulus |
| TC-EMR-02 | Simpan pemeriksaan & tanda vital | Isi keluhan utama dan tanda vital (`td_sistolik > td_diastolik`), simpan | Tersimpan `200`; bila `td_diastolik >= td_sistolik` ditolak `422` | Lulus |
| TC-EMR-03 | Simpan diagnosis ICD-10 | Pilih tepat 1 diagnosis utama + opsional sekunder, simpan | Tersimpan `200`; tanpa diagnosis utama atau > 1 utama ditolak `422` | Lulus |
| TC-EMR-04 | Tambah & batal tindakan medis | Tambah tindakan (qty 2), lalu batalkan tindakan | Tarif disalin sebagai snapshot; pembatalan mengubah status ke `batal` tanpa hapus baris fisik | Lulus |

## 5. Farmasi & Resep (B.5, D.2)

| ID | Skenario | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| TC-FAR-01 | Buat resep & validasi stok | Dokter membuat resep dengan jumlah melebihi stok tersedia | Ditolak `422` dengan pesan stok tidak cukup | Lulus |
| TC-FAR-02 | Proses dan serahkan obat | Login `farmasi`, klik Proses lalu Serahkan pada resep | Status `baru → diproses → diserahkan`, stok obat berkurang, tercatat di `t_stok_mutasi` | Lulus |
| TC-FAR-03 | Penyerahan obat paralel (D.2) | Jalankan `node tests/concurrency/stok-obat.mjs` (2 resep butuh 5, stok 5) | Tepat 1 sukses (`200`), 1 ditolak (`409`), stok akhir `0` (tidak minus), 1 mutasi keluar | Lulus |

## 6. Pemeriksaan Penunjang & Integrasi Node (B.6, C.1, D.5)

| ID | Skenario | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| TC-LAB-01 | Order lab & input hasil + flag otomatis | Dokter buat order lab, petugas lab input hasil di `/transaction/laboratorium` | Flag `normal`/`tinggi`/`rendah` dihitung otomatis, status order menjadi `selesai`, hasil tampil di riwayat medis | Lulus |
| TC-LAB-02 | Push hasil lab via Node (`X-Api-Key`) | Kirim `POST /api/lab/results` ke Node dengan `X-Api-Key` dan `idempotency_key` | Node meneruskan ke Yii (`200`); key sama dikirim ulang tetap aman tanpa duplikasi | Lulus |
| TC-LAB-03 | Ketahanan outbox saat Yii gagal (D.5) | Simulasikan Yii 503/mati saat `POST /api/lab/results`, lalu hidupkan kembali dan jalankan worker | Node balas `202` + simpan di `t_integration_outbox` (`pending`); worker retry sampai `terkirim` | Lulus |

## 7. Billing, Pembayaran, & Revisi Tagihan (B.7, D.3, D.4)

| ID | Skenario | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| TC-BIL-01 | Pembentukan invoice 4 sumber | Login `kasir`, buat invoice pada kunjungan yang punya daftar + tindakan + lab + obat | Status `201`, 4 sumber biaya terkumpul, `total` = jumlah seluruh subtotal | Lulus |
| TC-BIL-02 | Pembayaran bertahap hingga lunas | Bayar sebagian Tunai (`40.000`), cek status, lalu lunasi sisa Non-Tunai (`60.000`) | Status berubah `belum_dibayar → dibayar_sebagian → lunas`; bayar melebihi sisa ditolak `422` | Lulus |
| TC-BIL-03 | Pencegahan pembayaran ganda (D.3) | Jalankan `node tests/concurrency/pembayaran.mjs` (5 paralel key sama & 5 paralel key beda) | Key sama: 1×`201`, 4×`200`, 1 `no_pembayaran`; key beda melebihi sisa: 1×`201`, 4×`409`, `total_bayar == total` | Lulus |
| TC-BIL-04 | Revisi tagihan & audit log (D.4) | Batalkan tindakan setelah invoice dibuat (ditolak), tekan Unvalid lalu batalkan lagi; Valid, lunasi, lalu coba ubah diagnosis/tindakan | Saat valid ditolak `409`; setelah Unvalid item lama `is_void = true` dengan `alasan_void`, total turun, tercatat di `t_audit_log`; setelah lunas kunjungan `selesai` dan semua perubahan maupun Unvalid ditolak `409` | Lulus |
| TC-BIL-06 | Catatan kasir sebelum invoice/Valid | Klik Buat Invoice untuk kunjungan dengan order lab belum selesai atau resep belum diserahkan | Dialog menampilkan peringatan merah per transaksi; kasir tetap bisa menekan "Tetap Lanjutkan"; tanpa peringatan dialog menyatakan semua order selesai | Lulus |
| TC-BIL-07 | Pasien lunas hanya tampil di billing | Lunasi invoice lalu buka Antrean, Laboratorium, dan Farmasi | Kunjungan selesai tidak muncul di antrean, worklist lab, dan antrean farmasi, tetapi tetap ada di Daftar Tagihan | Lulus |
| TC-BIL-05 | Cetak invoice dan bukti pembayaran | Buka `/transaction/billing/invoice/:id/cetak` & `/transaction/billing/pembayaran/:id/cetak` | Tata letak rapi dengan `.print-sheet`, sidebar/header/tombol tersembunyi via `print:hidden` | Lulus |

## 8. Dashboard & Laporan (B.8, C.2, D.6)

| ID | Skenario | Langkah | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| TC-DSH-01 | Akses dashboard & validasi periode | Buka `/dashboard`, ganti filter periode `from`/`to`, uji `from > to` ke API | Kartu KPI, grafik, dan tabel rincian berubah sesuai periode; periode invalid dibalas `422` | Lulus |
| TC-DSH-02 | Isolasi read-only & index (D.6) | Uji `DELETE` dengan user `simrs_readonly`; jalankan `EXPLAIN ANALYZE` sebelum & sesudah migrasi index | `DELETE` ditolak `permission denied`; query memakai `idx_t_kunjungan_tgl_poli`, `idx_t_pembayaran_dibayar_at`, `idx_t_invoice_status` | Lulus |
