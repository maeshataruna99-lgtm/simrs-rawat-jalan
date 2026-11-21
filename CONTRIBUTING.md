# Aturan Kontribusi dan Standar Kode

Dokumen ini berlaku untuk seluruh kode di repository: `backend-yii`, `service-node`, `frontend-react`, `database`, dan `docs`.

## 1. Ruang Lingkup

- Fitur yang dikerjakan hanya yang tercantum di dokumen studi kasus dan `ROADMAP.md` poin 0–10.
- Ide di luar itu dicatat di bagian **Bonus** pada `ROADMAP.md` dan dikerjakan setelah fitur inti selesai.
- Satu sub-poin roadmap = satu commit. Checkbox sub-poin dicentang di commit yang sama.

## 2. Pembagian Tanggung Jawab

| Bagian | Tanggung jawab |
|---|---|
| `backend-yii` | Seluruh business logic dan **satu-satunya** yang menulis data transaksi. Pemilik migrasi database. |
| `service-node` | Integrasi pemeriksaan penunjang (meneruskan data ke Yii) dan API dashboard (baca saja). |
| `frontend-react` | Tampilan. Tidak menyimpan aturan bisnis selain validasi form. |
| PostgreSQL | Constraint sebagai pengaman terakhir: unique, foreign key, check. |

Logic yang sama tidak boleh ditulis di dua tempat.

## 3. Struktur Folder

Folder dikelompokkan per domain lalu per modul. Nama modul sama di semua aplikasi.

```
master/<modul>        contoh: master/pasien, master/obat
transaction/<modul>   contoh: transaction/pendaftaran, transaction/pembayaran
system/<modul>        contoh: system/auth, system/user
```

## 4. Pesan Commit

Mengikuti [Conventional Commits](https://www.conventionalcommits.org/) dan divalidasi commitlint.

```
<type>(<scope>): <ringkasan singkat, huruf kecil, tanpa titik>
```

**Type:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, `perf`, `style`.

**Scope:** aplikasi dan modul, dipisah tanda hubung.

| Contoh | Arti |
|---|---|
| `feat(yii-pasien): tambah nomor rekam medis otomatis` | Fitur di Yii, modul pasien |
| `feat(react-pendaftaran): tambah form pendaftaran kunjungan` | Halaman React |
| `feat(node-lab): tambah endpoint kirim hasil laboratorium` | Service Node |
| `feat(db): tambah migrasi tabel kunjungan` | Migrasi |
| `test(yii-pembayaran): uji pembayaran ganda` | Test |
| `chore(repo): tambah konfigurasi commitlint` | Tooling root |

Aturan tambahan:

- Ringkasan maksimal 72 karakter, bahasa Indonesia.
- Body opsional, isinya alasan perubahan, bukan daftar file.
- Tidak menulis atribusi alat, nama generator, atau trailer co-author.

## 5. File yang Tidak Boleh Masuk Repository

- File rahasia: `.env`, kredensial, private key. Sediakan `.env.example`.
- Hasil build dan dependensi: `node_modules/`, `vendor/`, `dist/`, `runtime/`.
- Konfigurasi alat pribadi di mesin lokal. Simpan pola abaikannya di `.git/info/exclude`, bukan di `.gitignore`.
- Komentar watermark, banner generator, atau tanda tangan di dalam kode.

## 6. Standar Kode

| Bagian | Standar | Perintah |
|---|---|---|
| PHP (Yii2) | PSR-12 via PHP-CS-Fixer | `composer lint` |
| TypeScript (Node, React) | ESLint + Prettier | `npm run lint` |

Penamaan:

- PHP: class `PascalCase`, method dan variabel `camelCase`, satu class per file.
- TypeScript: komponen React `PascalCase.tsx`, file lain `kebab-case.ts`, fungsi `camelCase`.
- Database: tabel dan kolom `snake_case`, prefix `m_` untuk master dan `t_` untuk transaksi.

## 7. Dokumentasi di Dalam Kode

Bahasa Indonesia, singkat, menjelaskan **kegunaan**, bukan mengulang isi kode.

**Header file:** satu sampai dua kalimat tentang kegunaan file.

**Fungsi atau method publik:** untuk apa, parameter penting, dan di mana dipakai (`Dipakai di`).

PHP:

```php
/**
 * Service pendaftaran kunjungan rawat jalan.
 */
class PendaftaranService
{
    /**
     * Mendaftarkan kunjungan dan membuat nomor antrean dalam satu transaksi.
     * Counter antrean dikunci per poli per tanggal agar tidak terjadi nomor ganda.
     *
     * @param array $data Data dari form pendaftaran (pasien_id, poli_id, jadwal_id).
     * @return Kunjungan
     *
     * Dipakai di: PendaftaranController::actionCreate
     */
    public function daftar(array $data): Kunjungan
```

TypeScript:

```ts
/**
 * Meneruskan hasil laboratorium dari sistem eksternal ke Yii.
 * Jika Yii tidak dapat diakses, data disimpan ke outbox untuk dikirim ulang.
 *
 * Dipakai di: lab.controller.ts (POST /lab/results), outbox.worker.ts
 */
export async function forwardResult(payload: LabResult): Promise<void> {
```

Aturan:

- `Dipakai di` wajib diperbarui jika pemanggil fungsi berubah.
- Komentar di dalam badan fungsi hanya untuk alasan yang tidak terlihat dari kode, misalnya kenapa memakai row lock.
- Tidak ada kode mati atau kode yang di-comment.

## 8. Format Response API

Yii dan Node memakai format yang sama.

```json
{ "success": true, "message": "Data berhasil disimpan", "data": {}, "meta": { "page": 1, "per_page": 20, "total": 120 } }
```

```json
{ "success": false, "message": "Validasi gagal", "errors": { "nik": ["NIK sudah terdaftar"] } }
```

HTTP status mengikuti makna: `200`, `201`, `400`, `401`, `403`, `404`, `409` (konflik/duplikasi), `422` (validasi), `500`.

## 9. Pengujian

- Proses transaksi penting wajib punya test: pendaftaran, stok obat, pembayaran, revisi tagihan, integrasi laboratorium.
- Setiap endpoint baru ditambahkan ke Postman collection di folder `postman/`.
- Test dijalankan sebelum commit fitur.
