# Dokumentasi API Service Node.js (`http://localhost:3000`)

Service Node.js menangani integrasi laboratorium dengan sistem eksternal dan data dashboard. Semua
business logic transaksi tetap ada di Yii. Node hanya meneruskan hasil lab ke Yii lewat REST, dan
untuk dashboard membaca database memakai role read-only `simrs_readonly`.

Semua endpoint membalas dengan format yang sama seperti Yii:

```json
{ "success": true, "message": "OK", "data": {}, "meta": { "page": 1, "per_page": 20, "total": 100 } }
```

```json
{ "success": false, "message": "Validasi gagal.", "errors": { "field": ["Pesan kesalahan"] } }
```

## Autentikasi & Konvensi

- **Integrasi lab (`/api/lab/*`):** kirim header `X-Api-Key: <salah satu nilai LAB_API_KEYS>`.
  Key yang salah atau tidak ada dibalas `401` dengan pesan
  "API key tidak valid atau tidak dikirim (header X-Api-Key).".
- **Dashboard (`/api/dashboard/*`):** kirim header `Authorization: Bearer <JWT dari Yii>`. Secret dan
  issuer JWT sama dengan Yii. Selain itu, role pengguna harus punya izin `dashboard:read` di
  `m_role_access`. Izin yang tidak ada dibalas `403`.
- **Kode status:**

  | Kode | Arti |
  |---|---|
  | `200` | OK |
  | `202` | Accepted: hasil lab tersimpan di outbox dan akan dikirim ulang |
  | `400` | Body bukan JSON yang valid |
  | `401` | Tidak terautentikasi |
  | `403` | Tidak punya izin |
  | `404` | Data atau route tidak ditemukan |
  | `409` | Idempotency-Key bentrok |
  | `422` | Validasi gagal |
  | `500` | Kesalahan tak terduga; detailnya hanya dicatat di log server |

- **Format tanggal:** `YYYY-MM-DD`. Panjang periode dashboard maksimal 366 hari.

---

## 1. Kesehatan Sistem

| Method | Path | Izin | Keterangan |
|---|---|---|---|
| `GET` | `/health` | Publik | `{ service: "service-node" }` |

---

## 2. Integrasi Laboratorium (`/api/lab`)

| Method | Path | Izin | Keterangan |
|---|---|---|---|
| `GET` | `/api/lab/orders?status=diminta,diproses` | API key | Daftar order lab beserta pasien dan detail pemeriksaan. `status` diisi satu atau beberapa nilai `diminta`, `diproses`, `selesai` dipisah koma (bawaan `diminta,diproses`). |
| `POST` | `/api/lab/results` | API key | Body: `{ detail_id, hasil, idempotency_key }`. Hasil disimpan dulu ke outbox (`t_integration_outbox`), lalu diteruskan ke Yii `PUT /transaction/hasil-lab/{detail_id}`. |

### `POST /api/lab/results`

Aturan field:
- `detail_id` adalah bilangan bulat positif.
- `hasil` berisi 1–100 karakter.
- `idempotency_key` berisi 8–100 karakter.

Respons yang mungkin:

| Status | Kondisi |
|---|---|
| `200` | Hasil diterima Yii dan order diperbarui. |
| `202` | Yii sedang tidak dapat diakses. Hasil aman di outbox dan worker mengirim ulang otomatis (backoff 5 s, 10 s, 20 s, … sampai 300 s). |
| `404` / `422` | Ditolak Yii, misalnya detail tidak ditemukan atau order sudah selesai. Baris outbox ditandai `gagal`. |
| `409` | `idempotency_key` yang sama sudah pernah dipakai dengan `detail_id` atau `hasil` yang berbeda. |

Kalau request dengan key dan isi yang sama dikirim ulang, data tidak tercatat dua kali. Pengamannya ada dua:
- Node memakai unique `idempotency_key` di outbox.
- Yii memakai unique `idempotency_key` di `t_order_lab_detail`.

---

## 3. Dashboard (`/api/dashboard`)

Semua endpoint di bawah wajib JWT dan izin `dashboard:read`.

Parameter periode yang bisa dipakai di setiap endpoint (opsional):

| Parameter | Isi |
|---|---|
| `from` | Tanggal awal, `YYYY-MM-DD` |
| `to` | Tanggal akhir, `YYYY-MM-DD` |
| `dokter_id` | ID dokter |
| `penjamin` | `umum`, `bpjs`, atau `asuransi` |

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/api/dashboard/filters` | Pilihan filter dokter dan penjamin. |
| `GET` | `/api/dashboard/summary` | Ringkasan: jumlah kunjungan, jumlah tindakan, pendapatan, total tagihan, dan status invoice. |
| `GET` | `/api/dashboard/kunjungan-per-poli` | Jumlah kunjungan per poli. |
| `GET` | `/api/dashboard/tindakan` | Rekap tindakan medis. |
| `GET` | `/api/dashboard/pendapatan` | Ringkasan pendapatan per periode. |
| `GET` | `/api/dashboard/obat` | Rekap penggunaan obat. |
| `GET` | `/api/dashboard/pembayaran` | Rekap status dan metode pembayaran. |
| `GET` | `/api/dashboard/detail/{jenis}` | Rincian data berhalaman. `jenis` bisa `kunjungan`, `tindakan`, `pendapatan`, `obat`, atau `pembayaran`. Parameter tambahan: `page`, `per_page` (maks 100), `poli_id`, `status`. |

Contoh request:

```
GET /api/dashboard/summary?from=2026-11-01&to=2026-11-22
Authorization: Bearer <JWT>
```

Koleksi Postman untuk semua endpoint ini ada di `postman/simrs.collection.json`.
