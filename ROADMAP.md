# Roadmap SIMRS Rawat Jalan

Rencana pengerjaan studi kasus **Sistem Pelayanan Rawat Jalan Terintegrasi**.
Setiap sub-poin dikerjakan dan di-commit terpisah. Checkbox dicentang pada commit yang sama dengan pekerjaannya.

## Tujuan Akhir

Alur pelayanan rawat jalan berjalan utuh dari **pendaftaran sampai pembayaran lunas**, dengan:

- Backend utama Yii2 sebagai pemilik business logic dan penulisan data.
- Frontend React.js untuk seluruh role.
- Backend services Node.js untuk integrasi pemeriksaan penunjang dan dashboard.
- PostgreSQL sebagai database utama.
- Bukti penanganan 6 skenario teknis (bagian D), dokumentasi, dan pengujian (bagian F).

Referensi kode di setiap poin: `B.x` ruang lingkup, `C.x` backend services, `D.x` skenario teknis, `F.x` output.

---

## 0. Fondasi Repository

- [x] 0.1 Roadmap pengerjaan
- [x] 0.2 Aturan kontribusi dan standar kode (`CONTRIBUTING.md`)
- [x] 0.3 Konfigurasi editor dan git (`.editorconfig`, `.gitattributes`, `.gitignore`)
- [x] 0.4 Commitlint dan husky untuk validasi pesan commit
- [ ] 0.5 Docker Compose: PostgreSQL, Yii, Node, React
- [ ] 0.6 Skeleton `backend-yii` (Yii2, modul `master`, `transaction`, `system`, format response API)
- [ ] 0.7 Skeleton `service-node` (Express + TypeScript, ESLint, format response, error handler) — C.4
- [ ] 0.8 Skeleton `frontend-react` (Vite + TypeScript, ESLint, router, API client)
- [ ] 0.9 Standar kode PHP (PHP-CS-Fixer PSR-12)

## 1. Autentikasi dan Hak Akses — B.9

- [ ] 1.1 Migrasi tabel user dan RBAC
- [ ] 1.2 Login dan penerbitan JWT di Yii
- [ ] 1.3 Enam role (Administrator, Pendaftaran, Dokter, Farmasi, Laboratorium, Kasir) dan seed user dummy
- [ ] 1.4 Pembatasan akses endpoint Yii per role
- [ ] 1.5 Middleware Node untuk verifikasi JWT dan validasi request — C.3
- [ ] 1.6 Halaman login, penyimpanan sesi, dan `RoleGuard` di React
- [ ] 1.7 Layout dan sidebar menu sesuai role

## 2. Master Data — B.1

Setiap master: migrasi, model, service, controller, validasi, pencegahan duplikasi, pencarian/filter, unit test.

- [ ] 2.1 Master pasien dan nomor rekam medis otomatis
- [ ] 2.2 Master dokter dan tenaga medis
- [ ] 2.3 Master poli / unit pelayanan
- [ ] 2.4 Master jadwal praktik dokter (cegah jadwal bentrok)
- [ ] 2.5 Master tindakan medis dan tarif
- [ ] 2.6 Master obat, stok, dan harga
- [ ] 2.7 Master pemeriksaan laboratorium dan tarif
- [ ] 2.8 Master ICD-10 (seed data)
- [ ] 2.9 Komponen React bersama: tabel, filter, form, dialog konfirmasi
- [ ] 2.10 Halaman master pasien
- [ ] 2.11 Halaman master dokter dan poli
- [ ] 2.12 Halaman master jadwal praktik
- [ ] 2.13 Halaman master tindakan dan pemeriksaan laboratorium
- [ ] 2.14 Halaman master obat dan stok

## 3. Pendaftaran dan Antrean — B.2, D.1

- [ ] 3.1 Migrasi kunjungan dan antrean (unique constraint kunjungan aktif)
- [ ] 3.2 Pencarian pasien berdasarkan nomor RM atau identitas
- [ ] 3.3 Pendaftaran kunjungan sesuai jadwal praktik dan nomor antrean otomatis (row lock pada counter)
- [ ] 3.4 Status antrean dan riwayat kunjungan pasien
- [ ] 3.5 Test pendaftaran bersamaan tidak menghasilkan kunjungan atau antrean ganda — D.1
- [ ] 3.6 Halaman pendaftaran dan antrean

## 4. Pemeriksaan dan Rekam Medis Elektronik — B.3

- [ ] 4.1 Migrasi pemeriksaan, tanda vital, dan diagnosis
- [ ] 4.2 Worklist pasien menunggu pemeriksaan
- [ ] 4.3 Simpan anamnesis, keluhan, tanda vital, dan pemeriksaan fisik
- [ ] 4.4 Diagnosis utama dan sekunder (ICD-10)
- [ ] 4.5 Riwayat rekam medis pasien
- [ ] 4.6 Halaman worklist dokter dan form pemeriksaan

## 5. Tindakan Medis — B.4

- [ ] 5.1 Migrasi transaksi tindakan (snapshot tarif saat tindakan diberikan)
- [ ] 5.2 Input lebih dari satu tindakan per kunjungan sebagai komponen tagihan
- [ ] 5.3 Panel tindakan di halaman pemeriksaan

## 6. Farmasi dan Resep — B.5, D.2

- [ ] 6.1 Migrasi resep, detail resep, dan mutasi stok (constraint stok tidak minus)
- [ ] 6.2 Pembuatan resep oleh dokter dengan validasi ketersediaan stok
- [ ] 6.3 Proses resep dan penyerahan obat dengan pengurangan stok atomik
- [ ] 6.4 Riwayat penggunaan obat pasien
- [ ] 6.5 Test dua penyerahan bersamaan tidak membuat stok minus — D.2
- [ ] 6.6 Panel resep di halaman pemeriksaan
- [ ] 6.7 Halaman antrean dan penyerahan farmasi

## 7. Pemeriksaan Penunjang — B.6, C.1, D.5

- [ ] 7.1 Migrasi order laboratorium, hasil, dan outbox integrasi
- [ ] 7.2 Endpoint Yii untuk order dan hasil laboratorium
- [ ] 7.3 REST API Node untuk integrasi laboratorium (daftar order, kirim hasil)
- [ ] 7.4 Outbox dan retry di Node ketika Yii tidak dapat diakses — D.5
- [ ] 7.5 Test integrasi: hasil tidak hilang atau ganda saat Yii gagal
- [ ] 7.6 Form order laboratorium oleh dokter
- [ ] 7.7 Halaman worklist dan input hasil laboratorium
- [ ] 7.8 Hasil laboratorium di riwayat kunjungan

## 8. Billing dan Pembayaran — B.7, D.3, D.4

- [ ] 8.1 Migrasi invoice, item invoice, pembayaran (idempotency key unik), dan audit log
- [ ] 8.2 Pembentukan invoice dari pendaftaran, tindakan, laboratorium, dan obat
- [ ] 8.3 Pembayaran tunai/non-tunai (simulasi), bertahap, dengan status belum dibayar/sebagian/lunas
- [ ] 8.4 Pencegahan pembayaran ganda dengan idempotency key — D.3
- [ ] 8.5 Revisi tagihan dan audit log ketika diagnosis atau tindakan berubah — D.4
- [ ] 8.6 Test pembayaran ganda dan revisi tagihan
- [ ] 8.7 Halaman billing, pembayaran, dan riwayat pembayaran
- [ ] 8.8 Invoice dan bukti pembayaran yang dapat dicetak

## 9. Dashboard dan Laporan — B.8, C.2, D.6

- [ ] 9.1 API dashboard Node: kunjungan, kunjungan per poli, tindakan, pendapatan, penggunaan obat, status pembayaran
- [ ] 9.2 Filter periode dan rincian data
- [ ] 9.3 Index database dan bukti optimasi query (`EXPLAIN ANALYZE`) — D.6
- [ ] 9.4 Halaman dashboard

## 10. Dokumentasi dan Pengujian — F

- [ ] 10.1 ERD dan `database/schema.sql`
- [ ] 10.2 Seed data dummy untuk alur end-to-end
- [ ] 10.3 Diagram arsitektur dan alur komunikasi React, Yii, Node, PostgreSQL
- [ ] 10.4 Pembagian tanggung jawab Yii dan Node — C, E.10
- [ ] 10.5 Analisis dan bukti skenario teknis D.1 sampai D.6
- [ ] 10.6 Dokumentasi endpoint API — C.5
- [ ] 10.7 Postman collection, environment, dan hasil pengujian
- [ ] 10.8 Daftar test case fitur utama
- [ ] 10.9 Screenshot alur pendaftaran sampai pembayaran dan bukti invoice
- [ ] 10.10 README: instalasi, konfigurasi, dan akun dummy
- [ ] 10.11 Tag rilis `v1.0-submission`

---

## Bonus (setelah poin 0–10 selesai)

Dikerjakan hanya jika waktu tersisa, tidak mengubah fitur inti.

- [ ] Export PDF invoice dan laporan
- [ ] Export laporan ke Excel
- [ ] Filter laporan lanjutan (per dokter, per penjamin)
- [ ] Penyempurnaan UI (tema, responsif, empty state)
- [ ] CI GitHub Actions untuk lint dan test
- [ ] Layar display antrean
