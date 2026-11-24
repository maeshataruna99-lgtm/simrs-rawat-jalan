# Proof Book dan Module Guide

Dokumen utama: [`SIMRS-Module-Guide-and-Proof.pdf`](SIMRS-Module-Guide-and-Proof.pdf) (92 halaman). Sumber HTML-nya: [`module-guide.html`](module-guide.html).

## Isi PDF

Urutan dan judul mengikuti dokumen instruksi, agar mudah dicari dan dilacak. Daftar isi dan rujukan antarbagian berupa tautan yang bisa diklik.

- **Pendahuluan:** fungsi proyek, peran pengguna, workflow pelayanan (diagram alur, status entitas).
- **A. Instruksi Pengerjaan:** stack dan bukti versi.
- **B. Ruang Lingkup Pengembangan:** B.1 sampai B.9 (judul 1 sampai 9 sesuai instruksi). Tiap bagian memuat butir instruksi verbatim beserta status dan bukti, panduan penggunaan, endpoint, tabel, dan screenshot.
- **C. Pengembangan Backend Services – Node.js:** lima butir C, cara Node.js berkomunikasi dengan Yii dan database, pembagian tanggung jawab.
- **D. Skenario Permasalahan Teknis:** D.1 sampai D.6 dengan pertanyaan instruksi, solusi, lokasi kode, dan bukti.
- **E. Ketentuan Teknis:** E.1 sampai E.10.
- **F. Output Pengerjaan:** 1 Source Code, 2 Database (ERD, migrasi), 3 Dokumentasi Teknis (arsitektur, alur komunikasi, instalasi, keputusan teknis), 4 Hasil Implementasi (alur 38 langkah pendaftaran sampai lunas, invoice, bukti Node), 5 Pengujian (Postman, unit test, test case).
- **G. Ketentuan Pengerjaan:** data dummy, pengumpulan, catatan penilaian, fitur bonus.
- **Lampiran A:** dokumentasi endpoint API. **Lampiran B:** library pendukung. **Lampiran C:** checklist kesesuaian butir demi butir.

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
