# Proof Book dan Module Guide

Dokumen utama: [`SIMRS-Module-Guide-and-Proof.pdf`](SIMRS-Module-Guide-and-Proof.pdf) (107 halaman). Sumber HTML-nya: [`module-guide.html`](module-guide.html).

## Isi PDF

1. Fungsi proyek dan peran pengguna.
2. Stack (Poin A), diagram arsitektur, alur komunikasi React, Yii, Node, PostgreSQL, pembagian tanggung jawab Yii dan Node, keputusan teknis.
3. Workflow: diagram alur end-to-end, penjelasan tiap tahap, status tiap entitas, matriks hak akses dari database.
4. Bukti alur satu pasien (38 screenshot) dari pendaftaran sampai lunas, memakai antarmuka sungguhan.
5. Panduan per modul (10 modul): tujuan, hak akses, langkah, endpoint, tabel, aturan, kode, bukti.
6. Database: ERD, constraint, migrasi.
7. Skenario teknis D.1 sampai D.6: masalah, solusi, lokasi kode, dan bukti, termasuk demo outbox saat Yii dimatikan.
8. Pengujian: Postman CLI, Newman, PHPUnit, Vitest, konkurensi, daftar test case.
9. Instalasi dan konfigurasi.
10. Checklist kesesuaian dengan instruksi, butir demi butir (A, B.1 sampai B.9, C, D.1 sampai D.6, E.1 sampai E.10, F, G, catatan penilaian, bonus).
11. Lampiran A: dokumentasi endpoint API Yii dan Node. Lampiran B: library pendukung.

## Cara membuat ulang

Prasyarat: Docker Compose berjalan, Python dengan `playwright`, Postman CLI.

```bash
sh scripts/reset-db.sh                  # hapus semua data, migrasi, seed ulang
python scripts/proof/flow.py            # alur satu pasien lewat UI (screenshots/flow/)
python scripts/proof/extra.py           # CRUD dan validasi master, stok, dashboard per tab, role, bonus (screenshots/extra/)
python scripts/proof/capture.py         # screenshot halaman per role dan bukti terminal
python scripts/proof/d5-outbox.py       # demo D.5: Yii dimatikan, outbox, retry
postman collection run postman/simrs.collection.json -e postman/local.environment.json --env-var "lab_api_key=<LAB_API_KEY>"
python scripts/proof/build-pdf.py       # susun PDF
```

Keluaran mentah ada di [`evidence/`](evidence), gambar di [`screenshots/`](screenshots). Jumlah baris tabel dihitung eksak oleh `scripts/db-counts.sh`.
