# Pembagian Tanggung Jawab Backend Yii2 dan Service Node.js (C, E.10)

Dokumen ini menjelaskan batas tegas tanggung jawab, kepemilikan data, pencegahan duplikasi business logic, serta cara kedua layanan bekerja sama di atas satu database PostgreSQL.

## 1. Prinsip Utama: Single Source of Truth

1. **Satu pemilik business logic & satu penulis transaksi (`backend-yii`)**: seluruh aturan klinis, validasi domain, transisi status, mutasi stok, pembentukan tagihan, pembayaran, dan migrasi skema database hanya ada di `backend-yii`.
2. **Service pendukung khusus integrasi & analitik read-only (`service-node`)**: Node tidak pernah menduplikasi aturan bisnis Yii maupun menulis langsung ke tabel transaksi bisnis (`t_kunjungan`, `t_tindakan`, `t_resep`, `t_order_lab`, `t_invoice`, `t_pembayaran`, `m_*`).
3. **Database sebagai pengaman integritas terakhir (`PostgreSQL`)**: constraint `UNIQUE`, `CHECK`, `FOREIGN KEY`, dan hak akses role `simrs_readonly` memastikan batas tersebut tetap terjaga meskipun terjadi kegagalan di lapisan aplikasi.

## 2. Matriks Pembagian Tanggung Jawab

| Aspek | `backend-yii` (PHP / Yii2) | `service-node` (Node.js / Express) |
|---|---|---|
| **Migrasi Database** | Pemilik tunggal seluruh migrasi (`backend-yii/migrations/`), termasuk tabel `t_integration_outbox` dan index dashboard | Tidak mengelola migrasi |
| **Autentikasi & RBAC** | Penerbit JWT HS256 (`JwtService`), manajemen user, role, modul, menu, dan `m_role_access` | Memverifikasi JWT dengan secret & issuer yang sama (`simrs-backend`), memeriksa izin `dashboard:read` secara read-only di `m_role_access`; menerima `X-Api-Key` untuk sistem eksternal |
| **Master Data** | CRUD lengkap + soft delete (`m_pasien`, `m_dokter`, `m_poli`, `m_jadwal_dokter`, `m_tindakan`, `m_obat`, `m_pemeriksaan_lab`, `m_icd10`) | Read-only untuk join nama poli/tindakan/obat di laporan dashboard |
| **Pelayanan & Transaksi** | Pendaftaran, antrean, pemeriksaan, diagnosis, tindakan, resep, penyerahan farmasi, order & hasil lab, billing, pembayaran, revisi tagihan, audit log | Tidak menulis tabel transaksi bisnis apa pun |
| **Integrasi Penunjang (Lab)** | Menyediakan endpoint target idempoten `PUT /transaction/hasil-lab/{detailId}` (hitung flag normal/tinggi/rendah, update status order) | Menerima push dari alat/sistem eksternal (`POST /api/lab/results`), memvalidasi payload (Zod), meneruskan ke Yii, dan menampung gagal kirim di `t_integration_outbox` untuk retry eksponensial |
| **Dashboard & Laporan** | Tidak menanggung beban query agregasi analitik berat | Menyediakan 7 endpoint agregasi & detail berhalaman (`/api/dashboard/*`) memakai koneksi PostgreSQL `simrs_readonly` |

## 3. Kepemilikan Tabel (Read vs Write)

| Kelompok Tabel | `backend-yii` | `service-node` |
|---|---|---|
| `m_*` (Master & Sistem) | Read / Write | Read-only (`simrs_readonly`) |
| `t_kunjungan`, `t_kunjungan_status_log`, `t_pemeriksaan`, `t_diagnosis`, `t_tindakan` | Read / Write | Read-only (`simrs_readonly`) |
| `t_resep`, `t_resep_detail`, `t_stok_mutasi` | Read / Write | Read-only (`simrs_readonly`) |
| `t_order_lab`, `t_order_lab_detail` | Read / Write | Read via Yii / `simrs_readonly`; perubahan hasil wajib lewat HTTP ke Yii |
| `t_invoice`, `t_invoice_item`, `t_pembayaran`, `t_audit_log`, `t_sequence_counter` | Read / Write | Read-only (`simrs_readonly`) |
| `t_integration_outbox` | Hanya definisi migrasi | Read / Write (pemilik antrean retry integrasi) |

## 4. Bagaimana Duplikasi Logic Dicegah

1. **Perhitungan flag lab & status order selesai**: hanya ada di `OrderLabService::simpanHasil()` dan `OrderLabService::hitungFlag()` di Yii. Node hanya memvalidasi bentuk payload masuk dan meneruskannya ke Yii lewat `PUT /transaction/hasil-lab/{detailId}` dengan header `Idempotency-Key`.
2. **Perhitungan tagihan & revisi billing**: hanya ada di `InvoiceService` dan `BillingSyncService` di Yii. Node hanya menjumlahkan kolom snapshot (`t_pembayaran.jumlah`, `t_invoice.total`, `t_invoice_item.subtotal WHERE is_void = false`) yang sudah dihitung dan dikunci Yii.
3. **Kontrak respons & validasi seragam**: kedua layanan memakai format JSON seragam `{ success, message, data, meta?, errors? }` dan kode status HTTP yang sama (`200`, `201`, `401`, `403`, `404`, `409`, `422`), sehingga `frontend-react` cukup memakai satu pola penangan respons (`api-client.ts`).
4. **Isolasi kredensial DB**: query dashboard Node berjalan lewat `readDb()` dengan user `simrs_readonly` yang hanya memiliki hak `SELECT`.

## 5. Kapan Fitur Baru Masuk ke Yii vs Node

- **Masuk ke `backend-yii`**: setiap fitur yang membuat atau mengubah entitas bisnis, membutuhkan transaksi ACID lintas tabel, penomoran dokumen, perubahan status klinis, atau pencatatan audit log.
- **Masuk ke `service-node`**: integrasi asinkron dengan sistem eksternal (webhook/outbox/retry), atau endpoint analitik/pelaporan read-only yang memanfaatkan index PostgreSQL secara langsung.
