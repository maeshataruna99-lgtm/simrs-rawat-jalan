# Arsitektur Sistem dan Alur Komunikasi — SIMRS Rawat Jalan

Dokumen ini menggambarkan arsitektur komponen, batas tanggung jawab, protokol autentikasi, dan alur komunikasi end-to-end antara `frontend-react`, `backend-yii`, `service-node`, sistem eksternal laboratorium, dan `PostgreSQL`.

## 1. Diagram Arsitektur Komponen

```mermaid
flowchart LR
    Browser["Pengguna (Browser)"] --> React["frontend-react (Vite + React 19, :5173)"]
    ExtLab["Sistem / Alat Lab Eksternal"] -->|"HTTPS + X-Api-Key"| Node

    React -->|"REST JSON + JWT HS256"| Yii["backend-yii (Yii2 PHP 8.3, :8080)"]
    React -->|"REST JSON + JWT HS256 (read-only)"| Node["service-node (Express + TS, :3000)"]

    Node -->|"Forward hasil lab + JWT akun layanan + Idempotency-Key"| Yii
    Yii -->|"Read/Write (simrs) + Migrasi"| PG[("PostgreSQL 16 (:5432)")]
    Node -->|"Write t_integration_outbox (simrs)"| PG
    Node -->|"SELECT read-only (simrs_readonly)"| PG
```

## 2. Komponen Utama dan Port Lokal

| Komponen | Stack | Port | Tanggung Jawab Inti |
|---|---|---:|---|
| `frontend-react` | React 19, TypeScript, Vite, Tailwind, shadcn/ui, Zustand, i18next | `5173` | Antarmuka pengguna per role, validasi form, pembangkit `Idempotency-Key` pada form bayar, halaman cetak invoice/kwitansi |
| `backend-yii` | PHP 8.3, Yii2 REST API | `8080` | Seluruh business logic, validasi domain, autentikasi & RBAC menu, satu-satunya penulis data transaksi bisnis, pemilik migrasi database |
| `service-node` | Node.js, Express 5, TypeScript, Zod, pg | `3000` | Gateway integrasi hasil lab eksternal dengan pola transactional outbox + retry eksponensial, serta API agregasi dashboard read-only |
| `postgres` | PostgreSQL 16 | `5432` | Penyimpanan utama, pengaman integritas terakhir (unique, partial unique, check constraint, foreign key, row lock `FOR UPDATE`) |

## 3. Alur Autentikasi dan Hak Akses

```mermaid
sequenceDiagram
    participant U as React UI
    participant Y as backend-yii
    participant N as service-node
    participant DB as PostgreSQL

    U->>Y: POST /system/auth/login (username, password)
    Y->>DB: Verifikasi m_user + ambil m_role_access & m_menu
    Y-->>U: 200 { token (JWT HS256), user, modules, permissions }

    U->>Y: Request Master/Transaksi + Authorization: Bearer <JWT>
    Y->>Y: JwtAuth + AccessFilter (cek menu:aksi)
    Y-->>U: 200/201 atau 403

    U->>N: GET /api/dashboard/* + Authorization: Bearer <JWT>
    N->>N: Verifikasi JWT HS256 (secret & issuer sama dengan Yii)
    N->>DB: Cek m_role_access (dashboard:read) via simrs_readonly
    N-->>U: 200 agregasi read-only atau 403
```

## 4. Alur Pelayanan End-to-End (Pendaftaran sampai Billing)

```mermaid
sequenceDiagram
    participant P as Pendaftaran
    participant D as Dokter
    participant L as Lab / Alat Eksternal
    participant F as Farmasi
    participant K as Kasir
    participant Y as backend-yii
    participant N as service-node
    participant DB as PostgreSQL

    P->>Y: POST /transaction/pendaftaran
    Y->>DB: Lock kuota & antrean -> INSERT t_kunjungan (menunggu)

    D->>Y: PUT /transaction/pemeriksaan/{id} & diagnosis & tindakan
    Y->>DB: Simpan t_pemeriksaan, t_diagnosis, t_tindakan (+ t_audit_log)

    D->>Y: POST /transaction/order-lab & POST /transaction/resep
    Y->>DB: INSERT t_order_lab + t_resep (snapshot tarif/harga)

    L->>N: POST /api/lab/results (X-Api-Key + idempotency_key)
    N->>Y: PUT /transaction/hasil-lab/{detailId} (Idempotency-Key)
    alt Yii tidak terjangkau / 5xx
        N->>DB: Simpan ke t_integration_outbox (pending)
        N->>Y: Outbox worker retry eksponensial hingga terkirim
    end

    F->>Y: PUT /transaction/farmasi/{resepId}/proses -> /serahkan
    Y->>DB: Lock m_obat FOR UPDATE -> kurangi stok & catat t_stok_mutasi

    K->>Y: POST /transaction/invoice/{kunjunganId}
    Y->>DB: Kumpulkan 4 sumber (daftar, tindakan, lab, obat) -> t_invoice

    K->>Y: POST /transaction/pembayaran (Idempotency-Key UUID)
    Y->>DB: Lock t_invoice FOR UPDATE -> INSERT t_pembayaran -> update status
```

## 5. Isolasi Koneksi dan Ketahanan

- **Single Writer untuk Data Transaksi**: hanya `backend-yii` yang menulis tabel `m_*` dan `t_*` (kecuali `t_integration_outbox` milik `service-node`).
- **Read-Only Isolation**: `service-node` menggunakan role PostgreSQL `simrs_readonly` untuk seluruh query dashboard sehingga secara struktural mustahil mengubah data transaksi.
- **Idempotensi Lintas Layanan**: pengiriman hasil lab (`t_order_lab_detail.idempotency_key` + `t_integration_outbox.idempotency_key`) dan pembayaran kasir (`t_pembayaran.idempotency_key`) aman terhadap retry jaringan dan klik ganda.
