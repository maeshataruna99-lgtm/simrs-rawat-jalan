# Chatbot Bantuan (Fitur Bonus)

Widget chat bantuan di pojok kanan bawah setiap halaman setelah login (shortcut `Alt+H`, `Escape`
untuk menutup). Chatbot ini **tidak memakai LLM atau API key apa pun**: alur percakapan memakai
router intent deterministik, kategori berbasis izin role yang diprioritaskan sesuai halaman aktif,
lookup live dari API project ini, serta basis pengetahuan lokal dengan toleransi typo dan sinonim.

Pola diadaptasi dari asisten RAG di project lain (widget web + menu bantuan + jawaban ekstraktif).
Bagian LLM, embedding, dan penyimpanan percakapan di server sengaja tidak dibawa.

## Alur

1. User klik tombol **Bantuan** (atau tekan `Alt+H`).
2. User bisa langsung mengetik di kotak input (bot mendeteksi otomatis pola `RM...`, `RJ...`,
   `INV...`, `RSP...`, `LAB...`, perintah singkat seperti `stok obat paracetamol` / `jadwal hari ini`,
   atau pertanyaan FAQ), **atau** memilih kategori yang sudah diurutkan sesuai halaman aktif.
3. Hasil lookup tampil dengan tautan aksi langsung (misal **Cek tagihan** pada pasien, tautan
   pemeriksaan pada kunjungan, dan tautan cetak invoice pada tagihan).
4. User bisa lanjut mengetik, atau klik **Menu** untuk kembali ke daftar kategori (request yang
   masih berjalan otomatis dibatalkan agar respons lama tidak menimpa layar baru).

| Kategori | Input | Sumber jawaban | Izin yang dibutuhkan |
| --- | --- | --- | --- |
| Cari informasi pasien | No. RM / No. Registrasi | `GET /master/pasien?q=` dan `GET /transaction/antrean?q=` (`Promise.allSettled`, tetap tampil parsial bila satu sumber gagal) | `master-pasien` atau `antrean` (read) |
| Cek status tagihan | No. Registrasi / No. RM / No. Invoice | `GET /transaction/invoice?q=` (5 invoice terbaru + link cetak) | `billing` (read) |
| Cek jadwal praktik dokter | Hari (`hari ini`, `Senin`..`Minggu`), nama dokter, atau poli | `GET /master/jadwal-dokter` | `master-jadwal-dokter` (read) |
| Cek stok & harga obat | Nama atau kode obat | `GET /master/obat` (dengan tanda stok habis / menipis) | `master-obat` (read) |
| Cek antrean resep farmasi | No. Resep, nama pasien, No. RM, atau `aktif` | `GET /transaction/farmasi/antrean` | `farmasi` (read) |
| Cek status order laboratorium | No. Order, nama pasien, No. RM, atau `aktif` | `GET /transaction/order-lab` | `laboratorium` (read) |
| Ringkasan operasional hari ini | Otomatis saat dipilih (atau tombol **Muat ulang**) | `GET /api/dashboard/summary` (Node) dan `GET /transaction/invoice/belum-ditagih` | `dashboard` atau `billing` (read) |
| Tanya fitur aplikasi | Pertanyaan bebas | Basis pengetahuan lokal | Semua user |

Kategori yang izinnya tidak dimiliki role tidak ditampilkan. Pengecekan ini hanya di tampilan; backend
Yii dan service Node tetap memeriksa izin menu di setiap endpoint, jadi chatbot tidak membuka data baru
di luar hak role.

## Basis pengetahuan lokal

- Daftar artikel, pencarian, sinonim, fuzzy match, intent router, dan konteks halaman:
  `frontend-react/src/modules/chatbot/knowledge.ts`.
- Isi artikel (judul, kata kunci, jawaban) ada di `src/locales/id.json` dan `en.json` pada kunci
  `chatbot.kb.<id>`, sehingga jawaban mengikuti bahasa aktif.
- Saran topik FAQ otomatis difilter sesuai izin role dan diprioritaskan berdasarkan halaman yang
  sedang dibuka.

### Cara pencarian

`searchKnowledge()` memecah pertanyaan menjadi token huruf kecil, membuang stopword (ID dan EN),
memperluas token melalui kamus sinonim domain rumah sakit (misal `apotek` -> `farmasi/resep`,
`kwitansi/struk` -> `billing/invoice`, `antri` -> `antrean`), lalu memberi skor per artikel: cocok di
kata kunci x3, di judul x2, di isi jawaban x1. Token minimal 4 huruf mendukung kecocokan sebagian dan
toleransi typo (jarak Levenshtein 1–2). Artikel berskor tertinggi ditampilkan beserta tombol
**Buka halaman** (hanya bila user punya izin menu itu) dan dua topik terkait.

### Riwayat sesi & reaktivitas bahasa

Pesan disimpan sebagai payload JSON terstruktur (bukan `ReactNode` mentah) dan disinkronkan ke
`sessionStorage` per user (`simrs.chatbot.v1.<userId>`, maksimal 30 pesan). Dampaknya:

- Mengganti bahasa ID <-> EN langsung memperbarui bahasa seluruh riwayat chat yang sudah tampil.
- Percakapan bertahan saat pindah halaman atau reload tab, dan otomatis dibersihkan saat logout.

### Menambah topik FAQ

1. Tambah entri di `KNOWLEDGE_ARTICLES` (`id`, `path`, `menu`).
2. Tambah `chatbot.kb.<id>.title`, `.keywords`, dan `.answer` di `id.json` dan `en.json`. Kunci kedua
   file wajib identik (dicek `tests/i18n.test.tsx`).

## Berkas terkait

- `frontend-react/src/modules/chatbot/ChatbotWidget.tsx`: UI, shortcut keyboard, auto-scroll/focus, dan alur percakapan.
- `frontend-react/src/modules/chatbot/knowledge.ts`: daftar artikel, pencarian fuzzy+sinonim, intent router, dan konteks halaman.
- `frontend-react/src/modules/chatbot/lookups.ts`: handler lookup data live (`Promise.allSettled` untuk sumber gabungan).
- `frontend-react/src/modules/chatbot/chatbot.types.ts`: struktur payload pesan serializable.
- `frontend-react/src/modules/chatbot/chatbot.storage.ts`: penyimpanan `sessionStorage` per user.
- `frontend-react/src/components/layout/AppLayout.tsx`: tempat widget dipasang.
- `frontend-react/tests/chatbot.test.tsx`: uji pencarian fuzzy/sinonim, intent router, filter izin, lookup, race guard, partial error, aksi lanjutan, ganti bahasa, dan persistensi sesi.

## Batasan

- Pencarian berbasis kecocokan kata, sinonim, dan jarak edit—bukan pemahaman semantik penuh seperti LLM.
- Riwayat percakapan hanya tersimpan di `sessionStorage` per tab browser, tidak disimpan di database server.
