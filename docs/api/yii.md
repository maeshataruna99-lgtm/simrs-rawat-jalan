# Dokumentasi API Backend Yii2 (`http://localhost:8080`)

Seluruh endpoint mengembalikan format JSON seragam:

```json
{ "success": true, "message": "OK", "data": {}, "meta": { "page": 1, "per_page": 20, "total": 100 } }
```

```json
{ "success": false, "message": "Validasi gagal.", "errors": { "field": ["Pesan kesalahan"] } }
```

## Autentikasi & Konvensi

- Header wajib (kecuali `/health` dan `/system/auth/login`): `Authorization: Bearer <JWT>`.
- Hak akses diperiksa per `menu:aksi` (`read`, `create`, `update`, `delete`). Gagal izin membalas `403`.
- Kode status: `200` OK, `201` Created, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict (duplikasi / aturan status / kuota / stok / invoice lunas), `422` Unprocessable Entity (validasi field).
- Parameter boolean query dikirim sebagai `1`/`0` atau `true`/`false`.
- Endpoint CRUD standar menyediakan: `GET /x?q=&page=&per_page=`, `GET /x/{id}`, `POST /x`, `PUT /x/{id}`, `DELETE /x/{id}` (soft delete).
- Endpoint daftar berhalaman membalas `meta: { page, per_page, total }`. Nilai `per_page` dibatasi maksimal 100, dengan bawaan 20.
- Filter `tanggal_dari` dan `tanggal_sampai` memakai format `YYYY-MM-DD` dan bersifat inklusif. Tanggal yang tidak valid menghasilkan daftar kosong, bukan error.
- Izin menu `dashboard-keuangan:read` membatasi data pendapatan, tagihan, dan pembayaran di dashboard (dicek oleh service Node). Menu ini tidak tampil di sidebar dan bawaannya hanya diberikan ke role `admin` dan `kasir`.

---

## 1. Kesehatan Sistem

| Method | Path | Izin | Keterangan |
|---|---|---|---|
| `GET` | `/health` | Publik | Status aplikasi dan koneksi database |

---

## 2. Domain Sistem (`/system/*`)

| Method | Path | Izin | Keterangan / Body |
|---|---|---|---|
| `POST` | `/system/auth/login` | Publik | Body: `{ username, password }`. Mengembalikan `{ token, user, modules, permissions }`. |
| `GET` | `/system/auth/me` | Login | Profil user aktif, tree modul/menu, dan matriks izin. |
| `CRUD` | `/system/role` | `system-role:*` | Master role (`kode`, `nama`, `keterangan`). |
| `CRUD` | `/system/user` | `system-user:*` | Manajemen user (`username`, `password`, `nama`, `role_id`, `dokter_id`, `is_active`). |
| `PUT` | `/system/user/{id}/reset-password` | `system-user:update` | Body: `{ password }`. |
| `CRUD` | `/system/module` | `system-module:*` | Master grup modul sidebar (`kode`, `nama`, `icon`, `urutan`, `is_active`). |
| `CRUD` | `/system/menu` | `system-menu:*` | Master menu bertingkat (`parent_id`, `kode`, `nama`, `path`, `icon`, `urutan`, `module_id`). |
| `GET` | `/system/role-access/{roleId}` | `system-role-access:read` | Matriks izin menu untuk satu role. |
| `PUT` | `/system/role-access/{roleId}` | `system-role-access:update` | Simpan perubahan matriks `can_read/create/update/delete`. |

---

## 3. Domain Master Data (`/master/*`)

| Method | Path | Izin | Keterangan / Field Utama |
|---|---|---|---|
| `CRUD` | `/master/pasien` | `master-pasien:*` | `nik` (16 digit unik), `nama`, `tgl_lahir`, `jenis_kelamin` (`L`/`P`), `alamat`, `no_hp`. `no_rm` otomatis. |
| `CRUD` | `/master/dokter` | `master-dokter:*` | `kode`, `nama`, `sip`, `spesialis`, `jenis_tenaga`, `is_active`. |
| `CRUD` | `/master/poli` | `master-poli:*` | `kode`, `nama`, `prefix_antrean` (1 huruf A-Z, unik, mis. `U` untuk kode antrean `U-001`), `tarif_pendaftaran`, `is_active`. |
| `CRUD` | `/master/jadwal-dokter` | `master-jadwal-dokter:*` | `dokter_id`, `poli_id`, `hari` (1=Senin..7=Minggu), `jam_mulai`, `jam_selesai`, `kuota`. Tolak bentrok jadwal. |
| `CRUD` | `/master/tindakan` | `master-tindakan:*` | `kode`, `nama`, `tarif`, `poli_id`, `is_active`. |
| `CRUD` | `/master/obat` | `master-obat:*` | `kode`, `nama`, `satuan`, `harga`, `is_active` (stok diubah via endpoint sesuaikan stok). |
| `POST` | `/master/obat/{id}/sesuaikan-stok` | `master-obat:update` | Body: `{ stok_baru, referensi? }`. Mencatat `t_stok_mutasi`. |
| `GET` | `/master/obat/{id}/mutasi` | `master-obat:read` | Riwayat mutasi masuk/keluar/penyesuaian stok obat. |
| `CRUD` | `/master/pemeriksaan-lab` | `master-pemeriksaan-lab:*` | `kode`, `nama`, `satuan`, `nilai_rujukan`, `tarif`, `is_active`. |
| `CRUD` | `/master/icd10` | `master-icd10:*` | `kode`, `nama`, `is_active`. |

---

## 4. Domain Transaksi (`/transaction/*`)

### Pendaftaran & Antrean

| Method | Path | Izin | Keterangan / Body |
|---|---|---|---|
| `GET` | `/transaction/pendaftaran/cari-pasien?q=` | `pendaftaran:read` | Pencarian cepat pasien (No. RM / NIK / Nama). |
| `POST` | `/transaction/pendaftaran` | `pendaftaran:create` | Body: `{ pasien_id, jadwal_id, tgl_kunjungan, penjamin? }`, dengan `penjamin` berisi `umum` (bawaan), `bpjs`, atau `asuransi`. Pengaman D.1 (kuota & kunjungan/antrean ganda → `409`). |
| `GET` | `/transaction/antrean?poli_id=&status=&tanggal=&tanggal_dari=&tanggal_sampai=&q=&page=&per_page=` | `antrean:read` | Daftar antrean kunjungan berhalaman. Kata kunci `q` mencari no. kunjungan, no. RM, atau nama pasien. Setiap item memuat `kode_antrean` (prefix poli + nomor, mis. `U-001`) dan `penjamin`. |
| `PUT` | `/transaction/antrean/{id}/status` | `antrean:update` | Body: `{ status }`. Transisi sah: `menunggu → diperiksa/batal`, `diperiksa → selesai/batal`. |
| `GET` | `/transaction/riwayat-kunjungan/{pasienId}` | `antrean:read` | Riwayat kunjungan pasien. |

### Pemeriksaan, Diagnosis, dan Tindakan Medis

| Method | Path | Izin | Keterangan / Body |
|---|---|---|---|
| `GET` | `/transaction/pemeriksaan/worklist?tanggal_dari=&tanggal_sampai=&q=&page=&per_page=` | `pemeriksaan:read` | Pasien berstatus menunggu/diperiksa milik dokter login (admin melihat semua), berhalaman. Tanpa rentang tanggal, bawaannya hari ini. |
| `GET` | `/transaction/pemeriksaan/{kunjunganId}` | `pemeriksaan:read` | Detail kunjungan, pemeriksaan, diagnosis, dan tindakan. |
| `PUT` | `/transaction/pemeriksaan/{kunjunganId}` | `pemeriksaan:update` | Simpan anamnesis, tanda vital (`td_sistolik`, `td_diastolik`, `nadi`, `suhu`, `respirasi`, `spo2`), pemeriksaan fisik. |
| `PUT` | `/transaction/diagnosis/{kunjunganId}` | `pemeriksaan:update` | Body: `{ diagnosis: [{ icd10_id, jenis: 'utama'\|'sekunder' }] }`. Wajib tepat 1 utama; perubahan dicatat di `t_audit_log`. |
| `GET` | `/transaction/riwayat-medis/cari-pasien?q=` | `riwayat-medis:read` | Pencarian pasien untuk rekam medis. |
| `GET` | `/transaction/riwayat-medis/{pasienId}` | `riwayat-medis:read` | Riwayat lengkap kunjungan (pemeriksaan, diagnosis, tindakan, resep, hasil lab). |
| `GET` | `/transaction/tindakan/{kunjunganId}` | `pemeriksaan:read` | Daftar tindakan aktif dan batal pada kunjungan. |
| `POST` | `/transaction/tindakan/{kunjunganId}` | `pemeriksaan:create` | Body: `{ tindakan_id, qty }`. Snapshot tarif; otomatis sinkron invoice (tolak `409` bila lunas). |
| `DELETE` | `/transaction/tindakan/item/{id}` | `pemeriksaan:delete` | Batalkan tindakan (status `batal`); void item invoice & hitung ulang total (D.4). |

### Resep & Farmasi

| Method | Path | Izin | Keterangan / Body |
|---|---|---|---|
| `GET` | `/transaction/resep?kunjungan_id=` | `pemeriksaan:read` | Daftar resep pada kunjungan. |
| `POST` | `/transaction/resep` | `pemeriksaan:create` | Body: `{ kunjungan_id, catatan?, items: [{ obat_id, dosis, frekuensi, jumlah }] }`. Validasi stok, snapshot harga, sinkron invoice. |
| `GET` | `/transaction/farmasi/antrean?status=&tanggal=&tanggal_dari=&tanggal_sampai=&q=&page=&per_page=` | `farmasi:read` | Antrean resep berhalaman. `tanggal` memfilter tanggal resep dibuat, sedangkan `tanggal_dari`/`tanggal_sampai` memfilter tanggal kunjungan. |
| `PUT` | `/transaction/farmasi/{resepId}/proses` | `farmasi:update` | Ubah status resep `baru → diproses`. |
| `PUT` | `/transaction/farmasi/{resepId}/serahkan` | `farmasi:update` | Lock `m_obat FOR UPDATE`, kurangi stok, catat mutasi, ubah `diproses → diserahkan` (D.2). |
| `GET` | `/transaction/riwayat-obat/{pasienId}` | `riwayat-medis:read` | Riwayat resep obat pasien. |

### Order & Hasil Laboratorium

| Method | Path | Izin | Keterangan / Body |
|---|---|---|---|
| `GET` | `/transaction/order-lab?status=&tanggal_dari=&tanggal_sampai=&q=&page=&per_page=` | `laboratorium:read` | Worklist order lab berhalaman untuk petugas lab dan service Node. Rentang tanggal memfilter tanggal kunjungan. |
| `GET` | `/transaction/order-lab/per-kunjungan?kunjungan_id=` | `pemeriksaan:read` | Daftar order & hasil lab satu kunjungan untuk dokter. |
| `POST` | `/transaction/order-lab` | `pemeriksaan:create` | Body: `{ kunjungan_id, catatan_klinis?, pemeriksaan_lab_ids: [] }`. Snapshot tarif & sinkron invoice. |
| `PUT` | `/transaction/hasil-lab/{detailId}` | `laboratorium:update` | Header opsional `Idempotency-Key`; Body: `{ hasil }`. Hitung flag otomatis (`normal`/`tinggi`/`rendah`), idempoten (D.5). |

### Billing & Pembayaran

| Method | Path | Izin | Keterangan / Body |
|---|---|---|---|
| `GET` | `/transaction/invoice?status=&tanggal_dari=&tanggal_sampai=&q=&page=&per_page=` | `billing:read` | Daftar invoice berhalaman. Rentang tanggal memfilter tanggal kunjungan. |
| `GET` | `/transaction/invoice/belum-tagih?tanggal=&tanggal_dari=&tanggal_sampai=&q=&page=&per_page=` | `billing:read` | Daftar kunjungan non-batal yang belum dibuatkan invoice, berhalaman. |
| `GET` | `/transaction/invoice/{id}` | `billing:read` | Detail invoice beserta item aktif/void dan daftar pembayaran. |
| `POST` | `/transaction/invoice/{kunjunganId}` | `billing:create` | Membentuk invoice dari 4 sumber biaya (pendaftaran, tindakan, lab, obat). Duplikat ditolak `409`. |
| `GET` | `/transaction/invoice/{id}/audit-log` | `billing:read` | Jejak perubahan tagihan & klinis kunjungan dari `t_audit_log` (D.4). |
| `GET` | `/transaction/pembayaran?invoice_id=&metode=&tanggal_dari=&tanggal_sampai=&q=&page=&per_page=` | `billing:read` | Riwayat pembayaran berhalaman. Rentang tanggal memfilter tanggal bayar (`dibayar_at`). |
| `GET` | `/transaction/pembayaran/{id}` | `billing:read` | Detail satu transaksi pembayaran (untuk cetak kwitansi). |
| `POST` | `/transaction/pembayaran` | `billing:create` | **Header wajib:** `Idempotency-Key`. Body: `{ invoice_id, metode: 'tunai'\|'non_tunai', jumlah, no_referensi? }`. Cicilan bertahap, key sama membalas `200` (D.3). |
