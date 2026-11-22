# Entity Relationship Diagram (ERD) — SIMRS Rawat Jalan

Skema lengkap PostgreSQL diekspor di [`database/schema.sql`](schema.sql) dan dikelola melalui migrasi Yii2 (`backend-yii/migrations/`). Seluruh 30 tabel bisnis (prefix `m_` untuk master dan `t_` untuk transaksi) memakai kolom audit standar (`created_at`, `updated_at`, `created_by`, `updated_by`), dan tabel master memakai soft delete (`deleted_at`).

## 1. Domain Sistem & Hak Akses

```mermaid
erDiagram
    m_role ||--o{ m_user : "dimiliki"
    m_role ||--o{ m_role_access : "memiliki"
    m_menu ||--o{ m_role_access : "diatur"
    m_menu ||--o{ m_menu : "parent_id"
    m_module ||--o{ m_module_menu : "berisi"
    m_menu ||--o{ m_module_menu : "terdaftar"
    m_dokter |o--o{ m_user : "tertaut"
    m_user |o--o{ t_audit_log : "melakukan"

    m_role {
        int id PK
        varchar kode UK
        varchar nama
        timestamp deleted_at
    }
    m_user {
        int id PK
        varchar username UK
        varchar password_hash
        varchar nama
        int role_id FK
        int dokter_id FK
        boolean is_active
        timestamp deleted_at
    }
    m_module {
        int id PK
        varchar kode UK
        varchar nama
        int urutan
        boolean is_active
    }
    m_menu {
        int id PK
        int parent_id FK
        varchar kode UK
        varchar nama
        varchar path
        int urutan
    }
    m_module_menu {
        int module_id PK,FK
        int menu_id PK,FK
        int urutan
    }
    m_role_access {
        int role_id PK,FK
        int menu_id PK,FK
        boolean can_read
        boolean can_create
        boolean can_update
        boolean can_delete
    }
    t_audit_log {
        int id PK
        varchar tabel
        int record_id
        varchar aksi
        jsonb data_lama
        jsonb data_baru
        int user_id FK
        timestamp waktu
    }
    t_sequence_counter {
        varchar kode PK
        varchar periode PK
        int nilai_terakhir
    }
```

## 2. Domain Master Data & Pelayanan Klinis

```mermaid
erDiagram
    m_dokter ||--o{ m_jadwal_dokter : "praktik"
    m_poli ||--o{ m_jadwal_dokter : "lokasi"
    m_poli |o--o{ m_tindakan : "terkait"

    m_pasien ||--o{ t_kunjungan : "mendaftar"
    m_poli ||--o{ t_kunjungan : "tujuan"
    m_dokter ||--o{ t_kunjungan : "menangani"
    m_jadwal_dokter ||--o{ t_kunjungan : "slot"

    t_kunjungan ||--o{ t_kunjungan_status_log : "riwayat_status"
    t_kunjungan ||--o| t_pemeriksaan : "diperiksa"
    m_dokter ||--o{ t_pemeriksaan : "pemeriksa"
    t_kunjungan ||--o{ t_diagnosis : "didiagnosis"
    m_icd10 ||--o{ t_diagnosis : "kode"
    t_kunjungan ||--o{ t_tindakan : "mendapat"
    m_tindakan ||--o{ t_tindakan : "master"
    m_dokter ||--o{ t_tindakan : "pelaksana"

    m_pasien {
        int id PK
        varchar no_rm UK
        varchar nik UK
        varchar nama
        date tgl_lahir
        char jenis_kelamin
    }
    m_dokter {
        int id PK
        varchar kode UK
        varchar nama
        varchar sip UK
        varchar jenis_tenaga
    }
    m_poli {
        int id PK
        varchar kode UK
        varchar nama
        char prefix_antrean UK
        numeric tarif_pendaftaran
    }
    m_jadwal_dokter {
        int id PK
        int dokter_id FK
        int poli_id FK
        smallint hari
        varchar jam_mulai
        varchar jam_selesai
        int kuota
    }
    m_tindakan {
        int id PK
        varchar kode UK
        varchar nama
        numeric tarif
        int poli_id FK
    }
    m_icd10 {
        int id PK
        varchar kode UK
        varchar nama
    }
    t_kunjungan {
        int id PK
        varchar no_kunjungan UK
        int pasien_id FK
        int poli_id FK
        int dokter_id FK
        int jadwal_id FK
        date tgl_kunjungan
        int no_antrean
        varchar status
    }
    t_kunjungan_status_log {
        int id PK
        int kunjungan_id FK
        varchar status_lama
        varchar status_baru
        int user_id
        timestamp waktu
    }
    t_pemeriksaan {
        int id PK
        int kunjungan_id UK,FK
        int dokter_id FK
        text keluhan_utama
        smallint td_sistolik
        smallint td_diastolik
        smallint nadi
        numeric suhu
    }
    t_diagnosis {
        int id PK
        int kunjungan_id FK
        int icd10_id FK
        varchar jenis
    }
    t_tindakan {
        int id PK
        int kunjungan_id FK
        int tindakan_id FK
        int qty
        numeric tarif
        numeric subtotal
        int dokter_id FK
        varchar status
    }
```

## 3. Domain Farmasi, Penunjang (Lab), dan Billing

```mermaid
erDiagram
    t_kunjungan ||--o{ t_resep : "diresepkan"
    m_dokter ||--o{ t_resep : "peresep"
    m_user |o--o{ t_resep : "diserahkan_oleh"
    t_resep ||--o{ t_resep_detail : "item"
    m_obat ||--o{ t_resep_detail : "obat"
    m_obat ||--o{ t_stok_mutasi : "mutasi"

    t_kunjungan ||--o{ t_order_lab : "order_lab"
    m_dokter ||--o{ t_order_lab : "pengorder"
    t_order_lab ||--o{ t_order_lab_detail : "detail"
    m_pemeriksaan_lab ||--o{ t_order_lab_detail : "jenis_lab"
    m_user |o--o{ t_order_lab_detail : "diinput_oleh"

    t_kunjungan ||--o| t_invoice : "ditagih"
    t_invoice ||--o{ t_invoice_item : "rincian"
    t_invoice ||--o{ t_pembayaran : "dibayar"
    m_user ||--o{ t_pembayaran : "kasir"

    m_obat {
        int id PK
        varchar kode UK
        varchar nama
        varchar satuan
        numeric harga
        int stok
    }
    t_stok_mutasi {
        int id PK
        int obat_id FK
        varchar jenis
        int qty
        int stok_sebelum
        int stok_sesudah
    }
    t_resep {
        int id PK
        varchar no_resep UK
        int kunjungan_id FK
        int dokter_id FK
        varchar status
        int diserahkan_oleh FK
        timestamp diserahkan_at
    }
    t_resep_detail {
        int id PK
        int resep_id FK
        int obat_id FK
        int jumlah
        numeric harga
        numeric subtotal
    }
    m_pemeriksaan_lab {
        int id PK
        varchar kode UK
        varchar nama
        varchar satuan
        varchar nilai_rujukan
        numeric tarif
    }
    t_order_lab {
        int id PK
        varchar no_order UK
        int kunjungan_id FK
        int dokter_id FK
        varchar status
    }
    t_order_lab_detail {
        int id PK
        int order_id FK
        int pemeriksaan_lab_id FK
        numeric tarif
        varchar hasil
        varchar flag
        varchar idempotency_key UK
        int diinput_oleh FK
    }
    t_integration_outbox {
        int id PK
        varchar idempotency_key UK
        varchar tujuan
        jsonb payload
        varchar status
        int percobaan
        timestamp retry_berikutnya
    }
    t_invoice {
        int id PK
        varchar no_invoice UK
        int kunjungan_id UK,FK
        numeric total
        numeric total_bayar
        varchar status
    }
    t_invoice_item {
        int id PK
        int invoice_id FK
        varchar sumber
        int referensi_id
        varchar deskripsi
        int qty
        numeric harga
        numeric subtotal
        boolean is_void
        varchar alasan_void
    }
    t_pembayaran {
        int id PK
        varchar no_pembayaran UK
        int invoice_id FK
        varchar idempotency_key UK
        varchar metode
        numeric jumlah
        varchar no_referensi
        int kasir_id FK
        timestamp dibayar_at
    }
```

## 4. Constraint & Index Pengaman Utama

| Skenario | Tabel | Pengaman di PostgreSQL |
|---|---|---|
| D.1 Pendaftaran & antrean ganda | `t_kunjungan` | Partial unique `uq_t_kunjungan_pasien_poli_tgl_aktif` (`WHERE status <> 'batal'`), unique `uq_t_kunjungan_antrean (poli_id, dokter_id, tgl_kunjungan, no_antrean)` |
| D.2 Stok obat minus | `m_obat`, `t_resep` | `CHECK (stok >= 0)`, `CHECK (status <> 'diserahkan' OR diserahkan_at IS NOT NULL)` |
| D.3 Pembayaran ganda & overpay | `t_pembayaran`, `t_invoice` | Unique `uq_t_pembayaran_idempotency_key`, `CHECK (total_bayar >= 0 AND total_bayar <= total)` |
| D.4 Revisi tagihan | `t_invoice_item`, `t_audit_log` | Partial unique `uq_t_invoice_item_aktif (invoice_id, sumber, referensi_id) WHERE is_void = false`, `CHECK (NOT is_void OR length(trim(alasan_void)) > 0)` |
| D.5 Hasil lab tidak hilang/ganda | `t_order_lab_detail`, `t_integration_outbox` | Unique `uq_t_order_lab_detail_idempotency_key`, unique `uq_t_integration_outbox_idempotency_key`, index antrean `(status, retry_berikutnya)` |
| D.6 Optimasi dashboard | `t_kunjungan`, `t_invoice`, `t_pembayaran`, `t_tindakan`, `t_resep`, `t_invoice_item` | `idx_t_kunjungan_tgl_poli`, `idx_t_invoice_status`, `idx_t_pembayaran_dibayar_at`, `idx_t_tindakan_kunjungan_status`, `idx_t_resep_kunjungan_status`, `idx_t_invoice_item_invoice_sumber_aktif` |
