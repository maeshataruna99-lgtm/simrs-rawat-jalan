# Rincian Roadmap

Penjabaran setiap sub-poin `ROADMAP.md`: hasil yang dibuat dan kriteria selesai.
Nomor sub-poin sama dengan `ROADMAP.md`. Satu sub-poin = satu commit.

## Konvensi Umum

| Hal | Ketentuan |
|---|---|
| Port lokal | PostgreSQL `5432`, Yii `8080`, Node `3000`, React `5173` |
| Prefix tabel | `m_` master, `t_` transaksi, tanpa prefix untuk tabel bawaan library |
| Kolom audit | `created_at`, `updated_at`, `created_by`, `updated_by` di setiap tabel |
| Hapus data master | Soft delete (`deleted_at`) agar riwayat transaksi tetap utuh |
| Snapshot harga | Tarif dan harga disalin ke tabel transaksi saat transaksi dibuat |
| URL Yii | `/master/<modul>`, `/transaction/<modul>`, `/system/<modul>` |
| URL Node | `/api/lab/...`, `/api/dashboard/...` |
| Auth | JWT HS256 diterbitkan Yii, secret yang sama diverifikasi Node. Sistem eksternal memakai header `X-Api-Key` |
| Hak akses | Kode menu + aksi (`read`, `create`, `update`, `delete`), contoh `master-pasien:create` |
| Endpoint CRUD standar | `GET /x?q=&page=&per_page=`, `GET /x/{id}`, `POST /x`, `PUT /x/{id}`, `DELETE /x/{id}` |

## Peta Tabel

| Domain | Tabel |
|---|---|
| System | `m_role`, `m_user`, `m_module`, `m_menu`, `m_module_menu`, `m_role_access`, `t_audit_log`, `t_sequence_counter` |
| Master | `m_pasien`, `m_dokter`, `m_poli`, `m_jadwal_dokter`, `m_tindakan`, `m_obat`, `m_pemeriksaan_lab`, `m_icd10` |
| Pelayanan | `t_kunjungan`, `t_kunjungan_status_log`, `t_pemeriksaan`, `t_diagnosis`, `t_tindakan` |
| Farmasi | `t_resep`, `t_resep_detail`, `t_stok_mutasi` |
| Penunjang | `t_order_lab`, `t_order_lab_detail`, `t_integration_outbox` |
| Billing | `t_invoice`, `t_invoice_item`, `t_pembayaran` |

Semua migrasi ditulis di Yii (`backend-yii/migrations`), termasuk tabel yang dipakai Node.

## Estimasi Waktu

| Poin | Estimasi | Poin | Estimasi |
|---|---|---|---|
| 0 Fondasi | 4 jam | 6 Farmasi | 6 jam |
| 1 Auth dan hak akses | 8 jam | 7 Penunjang | 6 jam |
| 2 Master data | 9 jam | 8 Billing | 8 jam |
| 3 Pendaftaran | 5 jam | 9 Dashboard | 4 jam |
| 4 Pemeriksaan | 4 jam | 10 Dokumentasi | 6 jam |
| 5 Tindakan | 2 jam | **Total** | **62 jam** |

Sisa sekitar 10 jam dari 72 jam dipakai untuk cadangan dan bonus.

---

## 0. Fondasi Repository

| No | Hasil | Selesai jika |
|---|---|---|
| 0.1 | `ROADMAP.md` | Semua poin dokumen studi kasus terpetakan |
| 0.2 | `CONTRIBUTING.md` | Aturan commit, struktur, standar kode, dokumentasi tertulis |
| 0.3 | `.editorconfig`, `.gitattributes`, `.gitignore` | File baru otomatis LF, `.env` tidak terlacak |
| 0.4 | `commitlint.config.js`, `.husky/commit-msg` | Pesan commit yang salah ditolak |
| 0.5 | `docker-compose.yml`, `.env.example` | `docker compose up -d` menghasilkan PostgreSQL berstatus healthy |
| 0.6 | `backend-yii/` dari Yii2 basic, struktur `modules/master`, `modules/transaction`, `modules/system`, `common/ApiResponse.php`, `Dockerfile`, service `yii` di compose | `GET /health` mengembalikan `{ "success": true }` dan terhubung ke database |
| 0.7 | `service-node/` Express + TypeScript, `lib/response.ts`, `middleware/error-handler.ts`, ESLint, Vitest, service `node` di compose | `GET /health` berjalan, error tak terduga dibungkus format seragam, `npm run lint` lolos |
| 0.8 | `frontend-react/` Vite + TypeScript, React Router, `lib/api-client.ts` (axios + interceptor token), `react-i18next` dengan `locales/id.json`, ESLint, service `react` di compose | Halaman kosong tampil di `localhost:5173`, teks diambil dari `t()`, lint lolos |
| 0.9 | `.php-cs-fixer.dist.php`, script `composer lint` | Seluruh kode PHP lolos PSR-12 |
| 0.10 | Tailwind CSS v3 + `tailwindcss-animate`, `components.json` shadcn (style `default`, base color `neutral`, CSS variables, ikon `lucide-react`), token warna terang/gelap di `src/styles/tailwind.css`, komponen `src/components/ui/`: button, input, label, textarea, select, checkbox, switch, card, badge, table, dialog, alert-dialog, sheet, dropdown-menu, popover, command, tabs, tooltip, separator, skeleton, sidebar, breadcrumb, pagination, sonner | Halaman contoh menampilkan semua komponen dengan tema yang sama di mode terang dan gelap |

| 0.11 | PHPUnit, `phpunit.xml`, `tests/TestCase.php` (setiap test dibungkus transaksi lalu di-rollback), database `simrs_test` dibuat oleh `database/init/`, script `composer test` (migrasi database test lalu jalankan test) | `composer test` lolos dan memakai database `simrs_test` |

**Standar UI**

| Kebutuhan | Library |
|---|---|
| Komponen dasar | shadcn/ui (Radix UI) di `src/components/ui/`, tidak diubah kecuali tema |
| Tabel data | `@tanstack/react-table` dibungkus `AppDataTable` |
| Form dan validasi | `react-hook-form` + `zod` |
| Notifikasi | `sonner` |
| Grafik dashboard | komponen chart shadcn (Recharts) |
| Ikon | `lucide-react` |

Komponen aplikasi berawalan `App` (contoh `AppDataTable`, `AppSelect`) dan disimpan di `src/components/`. Halaman hanya merakit komponen `App*` dan `ui/*`, tidak membuat gaya sendiri.

## 1. Autentikasi dan Hak Akses — B.9

**Tabel**

| Tabel | Kolom utama |
|---|---|
| `m_role` | `id`, `kode` (unik), `nama` |
| `m_user` | `id`, `username` (unik), `password_hash`, `nama`, `role_id`, `dokter_id` (nullable), `is_active` |
| `m_module` | `id`, `kode` (unik), `nama`, `icon`, `urutan` |
| `m_menu` | `id`, `parent_id`, `kode` (unik), `nama`, `path`, `icon`, `urutan`, `is_active` |
| `m_module_menu` | `module_id`, `menu_id` (unik berpasangan) |
| `m_role_access` | `role_id`, `menu_id`, `can_read`, `can_create`, `can_update`, `can_delete` (PK `role_id`, `menu_id`) |

**Endpoint**

| Method | URL | Keterangan |
|---|---|---|
| POST | `/system/auth/login` | Username + password, balikan JWT |
| GET | `/system/auth/me` | Profil, role, pohon menu, izin per menu |
| CRUD | `/system/module`, `/system/menu`, `/system/user`, `/system/role` | Master sistem |
| GET/PUT | `/system/role-access/{roleId}` | Matriks menu × aksi untuk satu role |

| No | Hasil | Selesai jika |
|---|---|---|
| 1.1 | Migrasi `m_role`, `m_user` | Migrasi naik dan turun tanpa error |
| 1.2 | Migrasi `m_module`, `m_menu`, `m_module_menu`, `m_role_access` | Foreign key dan unique terpasang |
| 1.3 | `system/auth`: login, `JwtAuth` filter, hash password bcrypt | Login benar mendapat token, salah mendapat `401` |
| 1.4 | Seeder 6 role, 1 user per role, modul, menu, hak akses default | Login dengan setiap akun dummy berhasil |
| 1.5 | `common/AccessBehavior.php`: tiap action dipetakan ke kode menu + aksi | User tanpa izin mendapat `403`, test unit untuk izin ada/tidak ada |
| 1.6 | `GET /system/auth/me` | Dokter hanya menerima menu pemeriksaan, kasir hanya billing |
| 1.7 | `middleware/auth.ts` (JWT atau `X-Api-Key`), `middleware/validate.ts` (zod) | Token salah `401`, body tidak valid `422`, ada test |
| 1.8 | CRUD modul dan menu | Menu bertingkat tersimpan, kode menu tidak bisa ganda |
| 1.9 | `GET/PUT /system/role-access/{roleId}` | Perubahan izin langsung berlaku di `/auth/me` |
| 1.10 | Halaman login, `auth-store.ts`, `PermissionGuard` | Halaman tanpa izin dialihkan ke halaman "akses ditolak" |
| 1.11 | `AppLayout`, `AppSidebar` dari pohon menu | Sidebar berbeda untuk setiap role |
| 1.12 | Halaman master modul, menu, hak akses (matriks centang) | Admin bisa mencabut izin dan efeknya terlihat setelah login ulang |

## 2. Master Data — B.1

Setiap master di Yii terdiri dari `Controller`, `Service`, model ActiveRecord, `Search` (filter + paging), dan unit test service.

| Tabel | Kolom utama | Pencegahan duplikasi |
|---|---|---|
| `m_pasien` | `no_rm`, `nik`, `nama`, `tgl_lahir`, `jenis_kelamin`, `alamat`, `no_hp` | `no_rm` unik, `nik` unik |
| `m_dokter` | `kode`, `nama`, `sip`, `spesialis`, `jenis_tenaga` (dokter/perawat/analis/apoteker) | `kode` unik, `sip` unik |
| `m_poli` | `kode`, `nama`, `tarif_pendaftaran` | `kode` unik |
| `m_jadwal_dokter` | `dokter_id`, `poli_id`, `hari`, `jam_mulai`, `jam_selesai`, `kuota` | Tidak boleh tumpang tindih untuk dokter yang sama di hari yang sama |
| `m_tindakan` | `kode`, `nama`, `tarif`, `poli_id` (nullable) | `kode` unik |
| `m_obat` | `kode`, `nama`, `satuan`, `harga`, `stok` (check `stok >= 0`) | `kode` unik |
| `m_pemeriksaan_lab` | `kode`, `nama`, `satuan`, `nilai_rujukan`, `tarif` | `kode` unik |
| `m_icd10` | `kode`, `nama` | `kode` unik |

| No | Hasil | Selesai jika |
|---|---|---|
| 2.1 | Master pasien, nomor RM dari `t_sequence_counter` format `RM000001` | NIK ganda ditolak `409`, cari berdasarkan RM/NIK/nama |
| 2.2 | Master dokter dan tenaga medis | Filter per jenis tenaga dan spesialis |
| 2.3 | Master poli | Tarif pendaftaran wajib angka ≥ 0 |
| 2.4 | Master jadwal dokter | Jadwal bentrok ditolak, test unit untuk kasus bentrok |
| 2.5 | Master tindakan dan tarif | Filter per poli |
| 2.6 | Master obat; stok tidak bisa diubah lewat CRUD, hanya lewat mutasi | Perubahan stok manual tercatat di `t_stok_mutasi` sebagai penyesuaian |
| 2.7 | Master pemeriksaan lab | Tarif dan nilai rujukan tersimpan |
| 2.8 | Seeder ICD-10 (subset diagnosis umum rawat jalan) | Endpoint pencarian ICD-10 dengan `q` |
| 2.9 | `AppDataTable` (sorting, paging server-side, kolom aksi sesuai izin), `AppPaginator`, `AppFilterBar`, `AppFormDialog`, `AppConfirmDialog`, `AppSelect` (combobox dengan pencarian ke API), `AppCurrencyInput`, hook `useCrud` | Dipakai ulang oleh semua halaman master, ada test komponen untuk `AppDataTable` dan `AppSelect` |
| 2.10 | Halaman master pasien | Tambah, ubah, hapus, cari, error validasi tampil di form |
| 2.11 | Halaman master dokter dan poli | Sama seperti 2.10 |
| 2.12 | Halaman jadwal praktik | Pilih dokter dan poli, pesan bentrok tampil |
| 2.13 | Halaman tindakan dan pemeriksaan lab | Sama seperti 2.10 |
| 2.14 | Halaman obat dan stok, termasuk form penyesuaian stok | Riwayat mutasi per obat terlihat |

## 3. Pendaftaran dan Antrean — B.2, D.1

**Tabel**

| Tabel | Kolom utama |
|---|---|
| `t_kunjungan` | `no_kunjungan`, `pasien_id`, `poli_id`, `dokter_id`, `jadwal_id`, `tgl_kunjungan`, `no_antrean`, `status` (menunggu, diperiksa, selesai, batal) |
| `t_kunjungan_status_log` | `kunjungan_id`, `status_lama`, `status_baru`, `user_id`, `waktu` |
| `t_sequence_counter` | `kode`, `periode`, `nilai_terakhir` (PK `kode`, `periode`) |

**Pengaman D.1**

- Partial unique index: satu pasien hanya punya satu kunjungan aktif per poli per tanggal (`WHERE status <> 'batal'`).
- Nomor antrean diambil dari `t_sequence_counter` dengan `SELECT ... FOR UPDATE` di dalam transaksi yang sama dengan insert kunjungan.
- Unique `(poli_id, dokter_id, tgl_kunjungan, no_antrean)` sebagai pengaman terakhir.
- Pelanggaran unique diterjemahkan menjadi `409` dengan pesan yang jelas.

| No | Hasil | Selesai jika |
|---|---|---|
| 3.1 | Migrasi `t_kunjungan`, `t_kunjungan_status_log`, `t_sequence_counter` | Index unik terpasang |
| 3.2 | `GET /transaction/pendaftaran/cari-pasien?q=` | Cari berdasarkan RM, NIK, nama |
| 3.3 | `POST /transaction/pendaftaran` | Ditolak jika di luar jadwal atau kuota penuh; antrean berurutan per dokter per hari |
| 3.4 | `GET /transaction/antrean?poli_id=&tanggal=`, `PUT /transaction/antrean/{id}/status`, `GET /transaction/riwayat-kunjungan/{pasienId}` | Perubahan status tercatat di log |
| 3.5 | Test unit constraint dan script uji paralel `tests/concurrency/pendaftaran.mjs` (10 request bersamaan) | Hanya 1 kunjungan tersimpan, nomor antrean tidak ganda |
| 3.6 | Halaman pendaftaran (cari pasien, pilih poli → dokter sesuai jadwal hari ini) dan halaman antrean | Alur daftar sampai nomor antrean tampil |

## 4. Pemeriksaan dan Rekam Medis Elektronik — B.3

| Tabel | Kolom utama |
|---|---|
| `t_pemeriksaan` | `kunjungan_id` (unik), `keluhan_utama`, `anamnesis`, `td_sistolik`, `td_diastolik`, `nadi`, `suhu`, `respirasi`, `spo2`, `berat_badan`, `tinggi_badan`, `pemeriksaan_fisik`, `dokter_id` |
| `t_diagnosis` | `kunjungan_id`, `icd10_id`, `jenis` (utama/sekunder); partial unique satu diagnosis utama per kunjungan |

| No | Hasil | Selesai jika |
|---|---|---|
| 4.1 | Migrasi `t_pemeriksaan`, `t_diagnosis` | Check range tanda vital terpasang |
| 4.2 | `GET /transaction/pemeriksaan/worklist` | Dokter hanya melihat pasien miliknya hari ini, status menunggu/diperiksa |
| 4.3 | `PUT /transaction/pemeriksaan/{kunjunganId}` | Validasi range tanda vital, status kunjungan menjadi diperiksa |
| 4.4 | `PUT /transaction/diagnosis/{kunjunganId}` | Wajib tepat satu diagnosis utama, sekunder boleh banyak |
| 4.5 | `GET /transaction/riwayat-medis/{pasienId}` | Menampilkan pemeriksaan, diagnosis, tindakan, resep, hasil lab per kunjungan |
| 4.6 | Halaman worklist dokter dan form pemeriksaan bertab (anamnesis, TTV, fisik, diagnosis) | Data tersimpan dan tampil di riwayat |

## 5. Tindakan Medis — B.4

| Tabel | Kolom utama |
|---|---|
| `t_tindakan` | `kunjungan_id`, `tindakan_id`, `qty`, `tarif` (snapshot), `subtotal`, `dokter_id`, `status` (aktif/batal) |

| No | Hasil | Selesai jika |
|---|---|---|
| 5.1 | Migrasi `t_tindakan` | Tarif disalin saat insert |
| 5.2 | `GET/POST /transaction/tindakan/{kunjunganId}`, `DELETE /transaction/tindakan/item/{id}` | Banyak tindakan per kunjungan; perubahan tarif master tidak mengubah transaksi lama |
| 5.3 | Panel tindakan di form pemeriksaan | Pilih dari master, tarif dan subtotal tampil |

## 6. Farmasi dan Resep — B.5, D.2

| Tabel | Kolom utama |
|---|---|
| `t_resep` | `no_resep`, `kunjungan_id`, `dokter_id`, `status` (baru, diproses, diserahkan, batal), `diserahkan_oleh`, `diserahkan_at` |
| `t_resep_detail` | `resep_id`, `obat_id`, `dosis`, `frekuensi`, `jumlah`, `harga` (snapshot), `subtotal` |
| `t_stok_mutasi` | `obat_id`, `jenis` (keluar, masuk, penyesuaian), `qty`, `stok_sebelum`, `stok_sesudah`, `referensi` |

**Pengaman D.2**

- Pengurangan stok: `UPDATE m_obat SET stok = stok - :qty WHERE id = :id AND stok >= :qty`. Jika baris terpengaruh 0, transaksi dibatalkan.
- Check constraint `stok >= 0` sebagai pengaman terakhir.
- Semua detail resep diproses dalam satu transaksi database, gagal satu batal semua.

| No | Hasil | Selesai jika |
|---|---|---|
| 6.1 | Migrasi `t_resep`, `t_resep_detail`, `t_stok_mutasi` | Relasi dan check terpasang |
| 6.2 | `POST /transaction/resep` | Jumlah melebihi stok tersedia ditolak `422` dengan nama obatnya |
| 6.3 | `GET /transaction/farmasi/antrean`, `PUT /transaction/farmasi/{resepId}/proses`, `PUT /transaction/farmasi/{resepId}/serahkan` | Stok berkurang hanya saat diserahkan, mutasi tercatat |
| 6.4 | `GET /transaction/riwayat-obat/{pasienId}` | Daftar obat per kunjungan |
| 6.5 | Script uji paralel `tests/concurrency/stok-obat.mjs` | Dua penyerahan dengan stok cukup untuk satu: satu sukses, satu `409`, stok tidak minus |
| 6.6 | Panel resep di form pemeriksaan | Stok tersedia tampil saat memilih obat |
| 6.7 | Halaman antrean farmasi dan penyerahan | Status berubah baru → diproses → diserahkan |

## 7. Pemeriksaan Penunjang — B.6, C.1, D.5

| Tabel | Kolom utama |
|---|---|
| `t_order_lab` | `no_order`, `kunjungan_id`, `dokter_id`, `status` (diminta, diproses, selesai), `catatan_klinis` |
| `t_order_lab_detail` | `order_id`, `pemeriksaan_lab_id`, `tarif` (snapshot), `hasil`, `satuan`, `nilai_rujukan`, `flag` (normal/tinggi/rendah), `diinput_oleh`, `diinput_at` |
| `t_integration_outbox` | `idempotency_key` (unik), `tujuan`, `payload` (jsonb), `status` (pending, terkirim, gagal), `percobaan`, `retry_berikutnya`, `error_terakhir` |

**Alur integrasi**

```
Sistem lab eksternal --X-Api-Key--> Node POST /api/lab/results
  Node validasi -> simpan ke t_integration_outbox (pending)
  Node kirim ke Yii PUT /transaction/hasil-lab/{detailId} dengan header Idempotency-Key
    sukses -> outbox terkirim
    gagal/timeout -> outbox tetap pending, worker retry dengan backoff
Yii menolak hasil dengan Idempotency-Key yang sudah diproses (balikan data lama, bukan error)
```

`t_integration_outbox` satu-satunya tabel yang ditulis Node. Tabel bisnis tetap hanya ditulis Yii.

| No | Hasil | Selesai jika |
|---|---|---|
| 7.1 | Migrasi `t_order_lab`, `t_order_lab_detail`, `t_integration_outbox` | Relasi terpasang |
| 7.2 | `POST /transaction/order-lab`, `GET /transaction/order-lab?status=`, `PUT /transaction/hasil-lab/{detailId}` (idempoten) | Status order otomatis selesai saat semua hasil terisi |
| 7.3 | Node `GET /api/lab/orders`, `POST /api/lab/results` | Sistem eksternal bisa mengambil order dan mengirim hasil |
| 7.4 | `outbox.worker.ts`, `yii-client.ts` (timeout + retry) | Saat Yii mati, request eksternal tetap `202 Accepted` dan terkirim setelah Yii hidup |
| 7.5 | Test integrasi Node dengan Yii tiruan yang gagal lalu pulih | Hasil tidak hilang dan tidak tercatat dua kali |
| 7.6 | Form order lab di halaman pemeriksaan | Pilih banyak pemeriksaan, tarif tampil |
| 7.7 | Halaman worklist dan input hasil laboratorium | Flag tinggi/rendah dihitung dari nilai rujukan |
| 7.8 | Hasil lab di halaman riwayat kunjungan | Dokter bisa membuka hasil dari kunjungan lama |

## 8. Billing dan Pembayaran — B.7, D.3, D.4

| Tabel | Kolom utama |
|---|---|
| `t_invoice` | `no_invoice`, `kunjungan_id` (unik), `total`, `total_bayar`, `status` (belum_dibayar, dibayar_sebagian, lunas) |
| `t_invoice_item` | `invoice_id`, `sumber` (pendaftaran, tindakan, lab, obat), `referensi_id`, `deskripsi`, `qty`, `harga`, `subtotal`, `is_void`, `alasan_void` |
| `t_pembayaran` | `no_pembayaran`, `invoice_id`, `idempotency_key` (unik), `metode` (tunai, non_tunai), `jumlah`, `no_referensi`, `kasir_id`, `dibayar_at` |
| `t_audit_log` | `tabel`, `record_id`, `aksi`, `data_lama` (jsonb), `data_baru` (jsonb), `user_id`, `waktu` |

**Pengaman D.3 (pembayaran ganda)**

- React membuat `Idempotency-Key` (UUID) saat form pembayaran dibuka dan mengirim ulang key yang sama saat retry.
- Yii menyimpan key di `t_pembayaran` (unik). Key yang sudah ada mengembalikan pembayaran lama dengan `200`, bukan membuat baru.
- Baris invoice dikunci (`FOR UPDATE`) saat pembayaran agar total bayar tidak melebihi sisa tagihan.

**Pengaman D.4 (perubahan setelah billing)**

- Item invoice dibangun dari sumber (`referensi_id`). Saat tindakan, resep, atau order lab berubah, service billing menyinkronkan ulang: item lama di-void dengan alasan, item baru ditambahkan, total dihitung ulang.
- Perubahan yang memengaruhi biaya ditolak `409` jika invoice sudah lunas.
- Perubahan diagnosis tidak memengaruhi biaya, tetapi tetap tercatat di `t_audit_log`.
- Setiap perubahan klinis dan sinkronisasi tagihan tercatat di `t_audit_log` beserta data lama dan baru.

| No | Hasil | Selesai jika |
|---|---|---|
| 8.1 | Migrasi `t_invoice`, `t_invoice_item`, `t_pembayaran`, `t_audit_log` | Unique `idempotency_key` dan `kunjungan_id` terpasang |
| 8.2 | `POST /transaction/invoice/{kunjunganId}`, `GET /transaction/invoice/{id}` | Item dari 4 sumber terkumpul, total benar |
| 8.3 | `POST /transaction/pembayaran` | Cicilan mengubah status sebagian → lunas, bayar melebihi sisa ditolak |
| 8.4 | Header `Idempotency-Key` wajib di pembayaran | Request yang sama dikirim dua kali hanya menghasilkan satu pembayaran |
| 8.5 | `BillingSyncService`, `AuditLogBehavior` | Tindakan dibatalkan setelah invoice dibuat: item void, total turun, jejak di audit log |
| 8.6 | Test unit dan script paralel `tests/concurrency/pembayaran.mjs` | Pembayaran ganda dan revisi tagihan terbukti konsisten |
| 8.7 | Halaman billing (daftar tagihan, rincian, form bayar, riwayat pembayaran) | Kasir bisa membayar sebagian lalu melunasi |
| 8.8 | Halaman cetak invoice dan bukti pembayaran (CSS print) | Bisa dicetak dari browser dengan tata letak rapi |

## 9. Dashboard dan Laporan — B.8, C.2, D.6

**Endpoint Node** (semua menerima `from`, `to`, dan pengguna wajib berizin `dashboard:read`)

| URL | Isi |
|---|---|
| `/api/dashboard/summary` | Jumlah kunjungan, tindakan, pendapatan, invoice per status |
| `/api/dashboard/kunjungan-per-poli` | Jumlah kunjungan per poli |
| `/api/dashboard/tindakan` | Tindakan terbanyak |
| `/api/dashboard/pendapatan` | Pendapatan per hari dan per sumber biaya |
| `/api/dashboard/obat` | Rekap penggunaan obat |
| `/api/dashboard/pembayaran` | Status pembayaran |
| `/api/dashboard/detail/{jenis}` | Rincian data, berhalaman |

| No | Hasil | Selesai jika |
|---|---|---|
| 9.1 | `dashboard.service.ts` dengan SQL agregasi read-only | Semua angka cocok dengan data seed |
| 9.2 | Validasi parameter periode, endpoint detail berhalaman | Periode tidak valid `422` |
| 9.3 | Migrasi index (`t_kunjungan(tgl_kunjungan, poli_id)`, `t_invoice(status)`, `t_pembayaran(dibayar_at)`, dll.), user DB read-only untuk Node, `docs/performance.md` berisi `EXPLAIN ANALYZE` sebelum dan sesudah | Query dashboard memakai index |
| 9.4 | Halaman dashboard: kartu ringkasan, grafik, filter periode, tabel rincian | Angka berubah sesuai filter |

## 10. Dokumentasi dan Pengujian — F

| No | Hasil | Selesai jika |
|---|---|---|
| 10.1 | `database/erd.md` (Mermaid), `database/schema.sql` hasil `pg_dump --schema-only` | ERD sesuai migrasi terakhir |
| 10.2 | Seeder data dummy: 50 pasien, 5 dokter, 4 poli, jadwal seminggu, kunjungan 30 hari | Dashboard dan riwayat punya data bermakna |
| 10.3 | `docs/architecture.md`: diagram dan alur komunikasi | Alur React → Yii/Node → PostgreSQL tergambar |
| 10.4 | `docs/yii-vs-node.md` | Pembagian data dan logic tanpa duplikasi dijelaskan |
| 10.5 | `docs/technical-scenarios.md` | D.1–D.6: masalah, solusi, lokasi kode, bukti test |
| 10.6 | `service-node/openapi.yaml`, `docs/api/yii.md` | Semua endpoint terdokumentasi |
| 10.7 | `postman/simrs.collection.json`, `postman/local.environment.json`, hasil run Newman | Collection berjalan hijau dari login sampai pembayaran |
| 10.8 | `docs/test-cases.md` | Test case fitur utama dengan langkah dan hasil yang diharapkan |
| 10.9 | `docs/screenshots/` | Setiap langkah alur pelayanan dan invoice terdokumentasi |
| 10.10 | `README.md` | Clone sampai aplikasi jalan dengan satu perintah, daftar akun dummy |
| 10.11 | Tag `v1.0-submission` | Tag terdorong ke GitHub |
