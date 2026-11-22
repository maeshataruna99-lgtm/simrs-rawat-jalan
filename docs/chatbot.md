# Chatbot Bantuan (Fitur Bonus)

Widget chat bantuan di pojok kanan bawah setiap halaman setelah login. Chatbot ini **tidak memakai LLM
atau API key apa pun**: alur percakapan berbasis kategori yang sudah ditulis, dan jawaban diambil dari
API project ini atau dari basis pengetahuan lokal di frontend.

Pola diadaptasi dari asisten RAG di project lain (widget web + menu bantuan + jawaban ekstraktif).
Bagian LLM, embedding, dan penyimpanan percakapan di server sengaja tidak dibawa.

## Alur

1. User klik tombol **Bantuan**, lalu memilih kategori.
2. Bot meminta input sesuai kategori.
3. Bot menampilkan hasil. User bisa mengetik input lain di kategori yang sama, atau klik **Menu** untuk
   kembali ke daftar kategori.

| Kategori | Input | Sumber jawaban | Izin yang dibutuhkan |
| --- | --- | --- | --- |
| Cari informasi pasien | No. RM / No. Registrasi | `GET /master/pasien?q=` (identitas) dan `GET /transaction/antrean?q=` (5 kunjungan terakhir) | `master-pasien` atau `antrean` (read); tiap sumber hanya dipanggil bila izinnya ada |
| Cek status tagihan | No. Registrasi / No. RM / No. Invoice | `GET /transaction/invoice?q=` (5 invoice terbaru) | `billing` (read) |
| Tanya fitur aplikasi | Pertanyaan bebas | Basis pengetahuan lokal | Semua user |

Kategori yang izinnya tidak dimiliki role tidak ditampilkan. Pengecekan ini hanya di tampilan; backend
Yii tetap memeriksa izin menu di setiap endpoint, jadi chatbot tidak membuka data baru di luar hak role.

## Basis pengetahuan lokal

- Daftar artikel dan halaman tujuannya: `frontend-react/src/modules/chatbot/knowledge.ts`
  (`KNOWLEDGE_ARTICLES`, berisi `id`, `path`, dan kode `menu`).
- Isi artikel (judul, kata kunci, jawaban) ada di `src/locales/id.json` dan `en.json` pada kunci
  `chatbot.kb.<id>`, sehingga jawaban mengikuti bahasa aktif.
- Topik yang tercakup: pendaftaran, data pasien, antrean, layar display antrean, pemeriksaan, riwayat
  medis, farmasi, laboratorium, billing, dashboard, jadwal dokter, obat dan stok, master data lain,
  user/role/hak akses, serta bahasa/tema/pencarian menu.

### Cara pencarian

`searchKnowledge()` memecah pertanyaan menjadi token huruf kecil, membuang stopword (ID dan EN), lalu
memberi skor per artikel: cocok di kata kunci x3, di judul x2, di isi jawaban x1. Token minimal 4 huruf
boleh cocok sebagian (misal "daftar" mengenai "pendaftaran"). Artikel berskor tertinggi ditampilkan
beserta tombol **Buka halaman** (hanya bila user punya izin menu itu), dan dua artikel berikutnya
muncul sebagai topik terkait. Bila tidak ada yang cocok, bot menyarankan kata kunci lain.

### Menambah topik

1. Tambah entri di `KNOWLEDGE_ARTICLES` (`id`, `path`, `menu`).
2. Tambah `chatbot.kb.<id>.title`, `.keywords`, dan `.answer` di `id.json` dan `en.json`. Kunci kedua
   file wajib identik (dicek `tests/i18n.test.tsx`).

## Berkas terkait

- `frontend-react/src/modules/chatbot/ChatbotWidget.tsx`: UI dan alur kategori.
- `frontend-react/src/modules/chatbot/knowledge.ts`: daftar artikel dan pencarian.
- `frontend-react/src/components/layout/AppLayout.tsx`: tempat widget dipasang.
- `frontend-react/tests/chatbot.test.tsx`: uji pencarian, filter kategori per izin, lookup pasien,
  hasil kosong, dan FAQ.

## Batasan

- Pencarian berbasis kecocokan kata, bukan pemahaman makna. Pertanyaan dengan kata yang tidak ada di
  kata kunci/isi artikel tidak akan terjawab.
- Riwayat percakapan tidak disimpan; menutup halaman atau kembali ke menu mengosongkan chat.
- Teks hasil yang sudah tampil tidak ikut berganti saat bahasa diubah; percakapan baru memakai bahasa
  yang aktif.
