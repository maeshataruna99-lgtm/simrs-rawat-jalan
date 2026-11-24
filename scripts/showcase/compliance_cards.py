"""Generator halaman HTML 1600x900 untuk kartu visual pembuktian teknis (Intro Workflow, A, C, D1-D6, E, F1-F5, G)."""
import html

BASE_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1600px; height: 900px; overflow: hidden;
  background: radial-gradient(circle at 12% 10%, #132238 0%, #0b1220 55%, #070d18 100%);
  color: #f8fafc;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
.topbar {
  position: absolute; top: 0; left: 0; right: 0; height: 6px;
  background: linear-gradient(90deg, #0ea5e9 0%, #22d3ee 55%, #10b981 100%);
}
.wrap {
  padding: 64px 72px 118px 72px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.head {
  display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 1px solid rgba(148,163,184,0.20);
  padding-bottom: 16px;
}
.kicker {
  color: #38bdf8; font-size: 16px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; margin-bottom: 6px;
}
h1 { font-size: 38px; font-weight: 700; letter-spacing: -0.02em; color: #f8fafc; line-height: 1.15; }
.subhead { color: #cbd5e1; font-size: 18px; margin-top: 6px; }
.pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(16, 185, 129, 0.16); color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.35);
  padding: 8px 16px; border-radius: 999px; font-size: 15px; font-weight: 700;
}
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; flex: 1; min-height: 0; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; flex: 1; min-height: 0; }
.card {
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.28);
  animation: fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.card-title {
  font-size: 20px; font-weight: 700; color: #f8fafc;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.badge {
  font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 6px;
  background: rgba(14, 165, 233, 0.18); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3);
}
.badge.ok {
  background: rgba(16, 185, 129, 0.18); color: #34d399; border-color: rgba(52,211,153,0.35);
}
.term {
  background: #060b14;
  border: 1px solid rgba(51, 65, 85, 0.75);
  border-radius: 12px;
  padding: 14px 16px;
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 14.5px;
  line-height: 1.52;
  color: #e2e8f0;
  white-space: pre-wrap;
  overflow: hidden;
  flex: 1;
}
.term .g { color: #34d399; font-weight: 700; }
.term .b { color: #38bdf8; font-weight: 700; }
.term .y { color: #fbbf24; }
.term .m { color: #94a3b8; }
ul.chk { list-style: none; display: flex; flex-direction: column; gap: 9px; font-size: 16px; color: #e2e8f0; line-height: 1.4; }
ul.chk li { display: flex; gap: 10px; align-items: flex-start; }
ul.chk li .ic { color: #34d399; font-weight: 800; flex-shrink: 0; }
.tbl { width: 100%; border-collapse: collapse; font-size: 15.5px; }
.tbl th {
  text-align: left; padding: 10px 12px; color: #38bdf8; font-weight: 700;
  border-bottom: 1px solid rgba(148,163,184,0.25); background: rgba(14,165,233,0.08);
}
.tbl td {
  padding: 10px 12px; border-bottom: 1px solid rgba(148,163,184,0.12); color: #e2e8f0;
  vertical-align: top;
}
.metric-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.metric {
  background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56,189,248,0.25);
  border-radius: 14px; padding: 18px 20px;
}
.metric .val { font-size: 32px; font-weight: 800; color: #38bdf8; }
.metric .val.ok { color: #34d399; }
.metric .lbl { font-size: 14px; color: #94a3b8; margin-top: 4px; font-weight: 600; }
.flow-strip {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 18px 16px; background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(56,189,248,0.28); border-radius: 16px;
}
.step-box {
  flex: 1; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(148,163,184,0.22);
  border-radius: 12px; padding: 14px 12px; text-align: center;
}
.step-box .num { font-size: 12px; font-weight: 800; color: #38bdf8; letter-spacing: 0.08em; }
.step-box .nm { font-size: 15px; font-weight: 700; color: #f8fafc; margin-top: 4px; }
.step-box .rl { font-size: 12px; color: #94a3b8; margin-top: 3px; }
.arrow { color: #38bdf8; font-size: 22px; font-weight: 800; flex-shrink: 0; }
"""


def page_shell(body: str) -> str:
    return f"<!doctype html><html lang='id'><head><meta charset='utf-8'><style>{BASE_CSS}</style></head><body><div class='topbar'></div>{body}</body></html>"


def card_intro_workflow(no_rm: str, nama_pasien: str, kode_antrean: str) -> str:
    steps = [
        ("B.1", "Master Data", "Admin • Yii2"),
        ("B.2", "Pendaftaran & Antrean", "Pendaftaran"),
        ("B.3–B.4", "EMR & Tindakan", "Dokter"),
        ("B.5", "Resep & Farmasi", "Apoteker"),
        ("B.6", "Order & Hasil Lab", "Analis • Node"),
        ("B.7", "Billing & Lunas", "Kasir"),
        ("B.8–B.9", "Dashboard & RBAC", "Node • 6 Role"),
    ]
    flow_html = ""
    for i, (code, name, role) in enumerate(steps):
        if i > 0:
            flow_html += "<div class='arrow'>→</div>"
        flow_html += f"<div class='step-box'><div class='num'>{code}</div><div class='nm'>{name}</div><div class='rl'>{role}</div></div>"

    return page_shell(f"""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">REAL CASE TEST — SENIOR PROGRAMMER • PT INOVA MEDIKA SOLUSINDO</div>
          <h1>SIMRS Rawat Jalan Terintegrasi — Video Pembuktian Lengkap</h1>
          <div class="subhead">Struktur Workflow End-to-End, Goal Sistem, dan Verifikasi Rubrik Poin A sampai G + Bonus</div>
        </div>
        <div class="pill">✓ Studi Kasus Live: {html.escape(nama_pasien)} ({html.escape(no_rm)}) • {html.escape(kode_antrean)}</div>
      </div>

      <div class="flow-strip">{flow_html}</div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">Goal & Prinsip Desain Sistem <span class="badge">TUJUAN UTAMA</span></div>
          <ul class="chk">
            <li><span class="ic">✓</span><span><strong>Alur Pelayanan Terintegrasi:</strong> satu kunjungan pasien mengalir utuh dari pendaftaran, antrean, pemeriksaan EMR, tindakan, farmasi, lab, hingga lunas & cetak bukti bayar.</span></li>
            <li><span class="ic">✓</span><span><strong>Integritas Data & Konkurensi:</strong> tahan duplikasi pendaftaran (D.1), anti-minus stok obat (D.2), anti-bayar ganda (D.3), revisi tagihan + audit log (D.4), dan outbox retry (D.5).</span></li>
            <li><span class="ic">✓</span><span><strong>Otorisasi RBAC 6 Role:</strong> pemisahan hak akses ketat untuk Admin, Pendaftaran, Dokter, Farmasi, Laboratorium, dan Kasir.</span></li>
            <li><span class="ic">✓</span><span><strong>Arsitektur Bersih Tanpa Duplikasi Logika:</strong> Yii2 memegang transaksi inti (write), Node.js menangani integrasi penunjang & analitik dashboard (read-only DB).</span></li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">Peta Arsitektur & Cakupan Video <span class="badge ok">A — G + BONUS</span></div>
          <table class="tbl">
            <thead><tr><th>Sesi</th><th>Cakupan Pembuktian</th></tr></thead>
            <tbody>
              <tr><td><strong>A & E</strong></td><td>Stack wajib (React, Yii2, Node.js, PostgreSQL, Postman, Git) & 10 ketentuan teknis</td></tr>
              <tr><td><strong>B.1–B.9</strong></td><td>Demo langsung 9 modul fungsional + anti-duplikasi + stok berkurang + tolak 403</td></tr>
              <tr><td><strong>C</strong></td><td>5 implementasi Node.js services, OpenAPI, dan pembagian tugas Yii2 vs Node.js</td></tr>
              <tr><td><strong>D.1–D.6</strong></td><td>Bukti uji nyata 6 skenario konkurensi, audit log, outbox retry, & performa DB</td></tr>
              <tr><td><strong>F, G & Bonus</strong></td><td>Source, ERD, dokumentasi, 250 test + 45 Newman assertions, & fitur bonus</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    """)


def card_section_a() -> str:
    return page_shell("""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">SESI A — INSTRUKSI PENGERJAAN</div>
          <h1>Verifikasi 6 Teknologi Wajib & Stack Aplikasi Hidup</h1>
          <div class="subhead">Seluruh komponen berjalan terintegrasi dalam Docker Compose lokal dengan versi terverifikasi</div>
        </div>
        <div class="pill">✓ 6/6 Teknologi Terpenuhi</div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">Matriks Komponen & Teknologi <span class="badge ok">SESUAI INSTRUKSI</span></div>
          <table class="tbl">
            <thead><tr><th>Komponen</th><th>Ketentuan</th><th>Implementasi Aktual</th></tr></thead>
            <tbody>
              <tr><td>Frontend Application</td><td>React.js</td><td>React 19.3.1 + TypeScript 6 + Vite 8 + Tailwind</td></tr>
              <tr><td>Backend Utama / SIMRS</td><td>Yii1 / Yii2</td><td>Yii2 2.0.55 + PHP 8.3.37 (Business Logic & Write)</td></tr>
              <tr><td>Backend Services / API</td><td>Node.js</td><td>Node.js v24.22.3 + Express + Zod + OpenAPI 3</td></tr>
              <tr><td>Database</td><td>PostgreSQL</td><td>PostgreSQL 16-alpine (26 migrasi + index performa)</td></tr>
              <tr><td>API Testing</td><td>Postman</td><td>postman/simrs.collection.json (35 req, 45 assertions)</td></tr>
              <tr><td>Version Control</td><td>Git</td><td>Repository Git terstruktur (135 Conventional Commits)</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-title">Bukti Versi & Container Aktif <span class="badge">A-stack-versions.txt</span></div>
          <div class="term"><span class="b">$ docker compose ps</span>
NAME             IMAGE                     STATUS              PORTS
simrs-postgres   postgres:16-alpine        <span class="g">Up (healthy)</span>        5432-&gt;5432/tcp
simrs-yii        simrs-rawat-jalan-yii     <span class="g">Up</span>                  8080-&gt;8080/tcp
simrs-node       simrs-rawat-jalan-node    <span class="g">Up</span>                  3000-&gt;3000/tcp
simrs-react      simrs-rawat-jalan-react   <span class="g">Up</span>                  5173-&gt;5173/tcp

<span class="b">$ docker compose exec yii php -v &amp;&amp; php yii version</span>
PHP 8.3.37 (cli)  |  <span class="g">Yii version 2.0.55</span>

<span class="b">$ docker compose exec node node -v</span>
<span class="g">v24.22.3</span>

<span class="b">$ git rev-list --count HEAD</span>
<span class="g">135 commits</span> (Conventional Commits + Husky commitlint)</div>
        </div>
      </div>
    </div>
    """)


def card_section_c() -> str:
    return page_shell("""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">SESI C — PENGEMBANGAN BACKEND SERVICES (NODE.JS)</div>
          <h1>5 Implementasi Node.js Services & Batas Tanggung Jawab Yii2 vs Node.js</h1>
          <div class="subhead">Pemisahan tanggung jawab tegas mencegah duplikasi business logic dan inkonsistensi data</div>
        </div>
        <div class="pill">✓ 5/5 Implementasi + Arsitektur Bersih</div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">5 Implementasi Minimal Node.js <span class="badge ok">service-node/</span></div>
          <ul class="chk">
            <li><span class="ic">1</span><span><strong>REST API Integrasi Penunjang:</strong> <code>POST /api/lab/results</code> (autentikasi <code>X-Api-Key</code>, idempotency key, outbox &amp; retry otomatis ke Yii2).</span></li>
            <li><span class="ic">2</span><span><strong>API Dashboard &amp; Layanan Pendukung:</strong> <code>GET /api/dashboard/*</code> (kunjungan, poli, tindakan, pendapatan, obat, status pembayaran + filter periode).</span></li>
            <li><span class="ic">3</span><span><strong>Middleware Autentikasi &amp; Validasi:</strong> verifikasi JWT HS256 bersama Yii2, pengecekan role/izin <code>dashboard-keuangan</code>, dan skema validasi <code>Zod</code>.</span></li>
            <li><span class="ic">4</span><span><strong>Error Handling &amp; Response Konsisten:</strong> envelope seragam <code>{success, message, data/errors}</code>; error internal dibalas <code>500</code> tanpa bocor stack trace.</span></li>
            <li><span class="ic">5</span><span><strong>Dokumentasi Endpoint API:</strong> spesifikasi <code>service-node/openapi.yaml</code> dan panduan lengkap di <code>docs/api/node.md</code>.</span></li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">Pembagian Tanggung Jawab Yii2 vs Node.js <span class="badge">docs/yii-vs-node.md</span></div>
          <table class="tbl">
            <thead><tr><th>Aspek</th><th>Backend Utama (Yii2)</th><th>Backend Services (Node.js)</th></tr></thead>
            <tbody>
              <tr><td><strong>Peran Inti</strong></td><td>Sumber kebenaran &amp; seluruh business logic SIMRS</td><td>Gateway integrasi lab eksternal &amp; analitik dashboard</td></tr>
              <tr><td><strong>Akses DB</strong></td><td>Read-Write penuh (<code>simrs</code> user, migrasi &amp; transaksi ACID)</td><td>Dashboard memakai <code>simrs_readonly</code> (dilarang tulis tabel transaksi)</td></tr>
              <tr><td><strong>Alur Write</strong></td><td>Semua mutasi kunjungan, stok obat, hasil lab, billing</td><td>Meneruskan hasil lab ke Yii2 via REST API + outbox retry</td></tr>
              <tr><td><strong>Autentikasi</strong></td><td>Penerbit JWT (<code>POST /system/auth/login</code>) &amp; RBAC</td><td>Verifikasi JWT yang sama + <code>X-Api-Key</code> untuk sistem lab</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    """)


def card_section_d12() -> str:
    return page_shell("""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">SESI D — SKENARIO PERMASALAHAN TEKNIS (D.1 &amp; D.2)</div>
          <h1>Penanganan Duplikasi Pendaftaran &amp; Konkurensi Stok Obat</h1>
          <div class="subhead">Dibuktikan dengan skrip uji konkurensi paralel nyata terhadap PostgreSQL dan API Yii2</div>
        </div>
        <div class="pill">✓ D.1 &amp; D.2 LULUS Uji Paralel</div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">D.1 — Duplikasi Pendaftaran <span class="badge ok">tests/concurrency/pendaftaran.mjs</span></div>
          <ul class="chk">
            <li><span class="ic">✓</span><span><strong>Partial Unique Index DB:</strong> <code>uq_t_kunjungan_pasien_poli_tgl_aktif</code> (<code>WHERE status &lt;&gt; 'batal'</code>) menolak kunjungan ganda di level PostgreSQL.</span></li>
            <li><span class="ic">✓</span><span><strong>Atomic Sequence Lock:</strong> nomor antrean dibangkitkan lewat row-lock <code>t_sequence_counter</code> + unique index <code>uq_t_kunjungan_antrean</code>.</span></li>
          </ul>
          <div class="term"><span class="b">$ node tests/concurrency/pendaftaran.mjs</span>
<span class="m"># 10 petugas mendaftarkan pasien sama bersamaan:</span>
[D.1 Pasien Sama] <span class="g">201 Created = 1</span>, <span class="y">409 Conflict = 9</span>

<span class="m"># 10 pasien berbeda mendaftar paralel ke poli sama:</span>
[D.1 Nomor Antrean Paralel] no_antrean = <span class="g">[2, 3, 4, 5, 6, 7, 8, 9, 10, 11]</span>

<span class="g">Uji konkurensi D.1 LULUS: hanya 1 kunjungan aktif per pasien
dan nomor antrean tidak ganda.</span></div>
        </div>
        <div class="card">
          <div class="card-title">D.2 — Konkurensi Stok Obat <span class="badge ok">tests/concurrency/stok-obat.mjs</span></div>
          <ul class="chk">
            <li><span class="ic">✓</span><span><strong>Pessimistic Row Lock:</strong> <code>SELECT ... FOR UPDATE</code> pada baris <code>m_obat</code> &amp; <code>t_resep</code> di dalam transaksi DB.</span></li>
            <li><span class="ic">✓</span><span><strong>DB Check Constraint:</strong> validasi stok mencukupi sebelum potong + pencatatan mutasi di <code>t_stok_mutasi</code>; stok mustahil minus.</span></li>
          </ul>
          <div class="term"><span class="b">$ node tests/concurrency/stok-obat.mjs</span>
<span class="m"># 2 resep berbeda berebut stok tersisa hanya untuk 1 transaksi:</span>
[D.2 Dua Resep] status = <span class="g">[200, 409]</span>, stok akhir = <span class="g">0</span>, mutasi keluar = <span class="g">1</span>

<span class="m"># 2 petugas menyerahkan resep yang sama secara paralel:</span>
[D.2 Resep Sama] <span class="g">sukses = 1</span>, stok akhir = <span class="g">8</span>

<span class="g">Uji konkurensi D.2 LULUS: stok tidak minus dan obat tidak
diserahkan ganda.</span></div>
        </div>
      </div>
    </div>
    """)


def card_section_d34() -> str:
    return page_shell("""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">SESI D — SKENARIO PERMASALAHAN TEKNIS (D.3 &amp; D.4)</div>
          <h1>Pencegahan Pembayaran Ganda &amp; Konsistensi Perubahan Pasca-Billing</h1>
          <div class="subhead">Idempotency-Key mencegah retry ganda; validasi kasir + item void + audit log menjaga konsistensi tagihan</div>
        </div>
        <div class="pill">✓ D.3 &amp; D.4 LULUS Uji Paralel &amp; Audit</div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">D.3 — Pembayaran Ganda (Retry Jaringan) <span class="badge ok">Idempotency-Key</span></div>
          <ul class="chk">
            <li><span class="ic">✓</span><span><strong>Header <code>Idempotency-Key</code>:</strong> dibangkitkan per dialog bayar &amp; dijaga unique constraint di <code>t_pembayaran</code>. Retry mengembalikan respons asli tanpa dobel catat.</span></li>
            <li><span class="ic">✓</span><span><strong>Row Lock Invoice:</strong> mencegah race condition over-payment saat 2 kasir membayar sisa tagihan bersamaan.</span></li>
          </ul>
          <div class="term"><span class="b">$ node tests/concurrency/pembayaran.mjs</span>
<span class="m"># 5 retry paralel dengan Idempotency-Key yang sama:</span>
[D.3 Idempotency Paralel] status = [200, 200, 200, 200, 201],
  <span class="g">unik no_pembayaran = 1</span>, total_bayar = <span class="g">40000</span>

<span class="m"># 5 pembayaran paralel berbeda memperebutkan sisa tagihan:</span>
[D.3 Race Sisa Tagihan] status = <span class="g">[201, 409, 409, 409, 409]</span>,
  total_bayar = <span class="g">100000</span>, status_invoice = <span class="g">lunas</span></div>
        </div>
        <div class="card">
          <div class="card-title">D.4 — Perubahan Data Pemeriksaan Pasca-Billing <span class="badge ok">Void + Audit Log</span></div>
          <ul class="chk">
            <li><span class="ic">✓</span><span><strong>Status Kunci Validasi &amp; Lunas:</strong> perubahan ditolak (<code>409</code>) saat kunjungan <code>Valid</code> atau <code>Lunas</code>; kasir dapat membuka <code>Unvalid</code> untuk revisi terkontrol.</span></li>
            <li><span class="ic">✓</span><span><strong>Void Item + Re-sync + Jejak Audit:</strong> item dibatalkan ditandai <code>void</code>, total dihitung ulang, semua perubahan terekam di <code>t_audit_log</code>.</span></li>
          </ul>
          <div class="term"><span class="m"># Pengujian revisi pasca-billing &amp; audit trail:</span>
[D.4 Validasi] batal tindakan saat valid = <span class="y">409</span>, setelah Unvalid dibuka
[D.4 Revisi Tagihan] total <span class="b">100000 -&gt; 25000</span>, <span class="g">item void = 1</span>
[D.4 Lunas] status kunjungan = <span class="g">selesai</span>, diagnosis = <span class="y">409</span>, unvalid = <span class="y">409</span>
[D.4 Audit Log] <span class="g">jumlah = 6</span>, daftar =
  [t_diagnosis:update, t_invoice:sync, t_tindakan:update,
   t_invoice:insert, t_tindakan:insert]

<span class="g">Uji D.3 &amp; D.4 LULUS: tidak ganda &amp; revisi tagihan konsisten.</span></div>
        </div>
      </div>
    </div>
    """)


def card_section_d56() -> str:
    return page_shell("""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">SESI D — SKENARIO PERMASALAHAN TEKNIS (D.5 &amp; D.6)</div>
          <h1>Ketahanan Gangguan Integrasi (Outbox) &amp; Optimasi Performa Aplikasi</h1>
          <div class="subhead">Data lab tetap aman saat Yii2 tidak dapat diakses; query terindeks mengeksekusi dalam 0.136 ms</div>
        </div>
        <div class="pill">✓ D.5 &amp; D.6 Terbukti Nyata</div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">D.5 — Gangguan Integrasi API <span class="badge ok">Outbox + Retry Worker</span></div>
          <ul class="chk">
            <li><span class="ic">✓</span><span><strong>Transactional Outbox:</strong> saat Yii2 mati/5xx, Node.js menyimpan hasil lab ke tabel outbox &amp; merespons <code>HTTP 202 Accepted</code>.</span></li>
            <li><span class="ic">✓</span><span><strong>Idempotent Auto-Retry:</strong> worker mengirim ulang saat Yii2 pulih, dijamin terkirim tepat 1x tanpa kehilangan data.</span></li>
          </ul>
          <div class="term"><span class="b"># Simulasi gangguan nyata (D5-outbox-retry.txt):</span>
$ docker stop simrs-yii
$ POST :3000/api/lab/results (X-Api-Key) {"detail_id":27,"hasil":"14.1"}
<span class="y">HTTP 202 Accepted</span>  -&gt; tersimpan di outbox (status: tertunda)

$ docker start simrs-yii  <span class="m"># layanan pulih</span>
-&gt; Worker retry mengirim hasil tepat sekali: <span class="g">status: "terkirim"</span>
-&gt; Retry ulang idempotency_key sama: <span class="g">baris_outbox = 1</span> (anti-duplikat)</div>
        </div>
        <div class="card">
          <div class="card-title">D.6 — Optimasi Performa Aplikasi <span class="badge ok">Composite Indexes + Pagination</span></div>
          <ul class="chk">
            <li><span class="ic">✓</span><span><strong>Indeks PostgreSQL Terarah:</strong> <code>idx_t_invoice_status</code>, <code>idx_t_kunjungan_tgl_poli</code>, <code>idx_t_kunjungan_dokter_penjamin</code>, plus eager-loading &amp; paginasi server.</span></li>
          </ul>
          <div class="term"><span class="b">$ EXPLAIN (ANALYZE, BUFFERS) -- invoice belum dibayar</span>
<span class="g">Index Scan using idx_t_invoice_status on t_invoice</span>
  Index Cond: ((status)::text = 'belum_dibayar'::text)
  Buffers: shared hit=3  |  <span class="g">Execution Time: 0.136 ms</span>

<span class="b">$ node scripts/bench-api.mjs 20</span> <span class="m">(20 req/endpoint)</span>
Endpoint                Median    p95
Antrean poli            <span class="g">241 ms</span>    297 ms
Worklist pemeriksaan    <span class="g">238 ms</span>    316 ms
Worklist laboratorium   <span class="g">206 ms</span>    245 ms
Antrean farmasi         <span class="g">211 ms</span>    304 ms</div>
        </div>
      </div>
    </div>
    """)


def card_section_e() -> str:
    return page_shell("""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">SESI E — KETENTUAN TEKNIS (E.1 — E.10)</div>
          <h1>Verifikasi Kepatuhan 10 Ketentuan Teknis Arsitektur</h1>
          <div class="subhead">Seluruh poin E.1 hingga E.10 terpenuhi tanpa pengecualian di codebase dan infrastruktur</div>
        </div>
        <div class="pill">✓ 10/10 Ketentuan Terpenuhi</div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">Ketentuan E.1 — E.5 <span class="badge ok">LULUS</span></div>
          <ul class="chk">
            <li><span class="ic">E.1</span><span><strong>Yii2 Backend Utama:</strong> seluruh modul master, transaksi, RBAC, dan business logic inti berada di <code>backend-yii/</code>.</span></li>
            <li><span class="ic">E.2</span><span><strong>React.js Frontend:</strong> SPA modular TypeScript + Tailwind + shadcn/ui di <code>frontend-react/</code>.</span></li>
            <li><span class="ic">E.3</span><span><strong>Node.js Services:</strong> REST API penunjang lab &amp; analitik dashboard di <code>service-node/</code>.</span></li>
            <li><span class="ic">E.4</span><span><strong>PostgreSQL Utama:</strong> skema relasional ACID, constraint unik, foreign key, dan composite index.</span></li>
            <li><span class="ic">E.5</span><span><strong>Komunikasi REST API:</strong> seluruh komunikasi React ↔ Yii2 ↔ Node.js menggunakan JSON REST API terstandar.</span></li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">Ketentuan E.6 — E.10 <span class="badge ok">LULUS</span></div>
          <ul class="chk">
            <li><span class="ic">E.6</span><span><strong>Auth, Otorisasi &amp; Validasi:</strong> JWT HS256, RBAC 6 role di tiap aksi backend/frontend, validasi Yii2 &amp; Zod.</span></li>
            <li><span class="ic">E.7</span><span><strong>Pengujian API Postman:</strong> koleksi <code>postman/simrs.collection.json</code> + lingkungan &amp; laporan Newman.</span></li>
            <li><span class="ic">E.8</span><span><strong>Git Source Control:</strong> 135 commit rapi dengan konvensi Conventional Commits + Husky guard.</span></li>
            <li><span class="ic">E.9</span><span><strong>Library Pendukung Relevan:</strong> Radix/shadcn UI, Recharts, Zod, jsPDF, SheetJS, Vitest, PHPUnit.</span></li>
            <li><span class="ic">E.10</span><span><strong>Pemisahan Yii2 vs Node.js:</strong> terdokumentasi di <code>docs/yii-vs-node.md</code> — nol duplikasi business logic.</span></li>
          </ul>
        </div>
      </div>
    </div>
    """)


def card_section_f14_g() -> str:
    return page_shell("""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">SESI F (F.1–F.4) &amp; SESI G — OUTPUT PENGERJAAN &amp; DATA DUMMY</div>
          <h1>Kelengkapan Artefak Deliverable &amp; Data Dummy Siap Evaluasi</h1>
          <div class="subhead">Seluruh artefak sumber, database, dokumentasi, dan bukti hasil tersedia lengkap dalam repository</div>
        </div>
        <div class="pill">✓ F.1–F.4 &amp; G Lengkap</div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">F.1 Source Code &amp; F.2 Database <span class="badge ok">TERSTRUKTUR</span></div>
          <ul class="chk">
            <li><span class="ic">F.1</span><span><strong>3 Service + Git Repo:</strong> <code>backend-yii/</code>, <code>frontend-react/</code>, <code>service-node/</code> dalam 1 repository Git (135 commits).</span></li>
            <li><span class="ic">F.2</span><span><strong>Schema &amp; ERD:</strong> <code>database/schema.sql</code>, <code>database/erd.md</code> (relasi penuh antartabel), dan 26 file migrasi di <code>backend-yii/migrations/</code>.</span></li>
            <li><span class="ic">F.2</span><span><strong>Init Scripts:</strong> <code>database/init/</code> otomatis menyiapkan DB test &amp; user <code>simrs_readonly</code>.</span></li>
            <li><span class="ic">G</span><span><strong>Data Dummy Pengujian:</strong> <code>SystemSeeder</code> (6 role/user), <code>Icd10Seeder</code>, dan <code>DummySeeder</code> (50 pasien, 60 kunjungan historis, master dokter/obat/lab) via <code>scripts/reset-db.sh</code>.</span></li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title">F.3 Dokumentasi Teknis &amp; F.4 Hasil Implementasi <span class="badge ok">LENGKAP</span></div>
          <ul class="chk">
            <li><span class="ic">F.3</span><span><strong>Arsitektur &amp; Keputusan Teknis:</strong> <code>docs/architecture.md</code>, <code>docs/yii-vs-node.md</code>, <code>docs/technical-scenarios.md</code>, <code>docs/performance.md</code>.</span></li>
            <li><span class="ic">F.3</span><span><strong>API &amp; Instalasi:</strong> <code>docs/api/yii.md</code>, <code>docs/api/node.md</code>, <code>service-node/openapi.yaml</code>, dan <code>README.md</code> (1-command Docker setup).</span></li>
            <li><span class="ic">F.4</span><span><strong>Bukti Implementasi:</strong> buku bukti PDF <code>docs/proof-book/SIMRS-Module-Guide-and-Proof.pdf</code>, galeri screenshot tiap modul, bukti alur lunas, cetak invoice/struk, dan bukti Node.js services.</span></li>
          </ul>
        </div>
      </div>
    </div>
    """)


def card_section_f5() -> str:
    return page_shell("""
    <div class="wrap">
      <div class="head">
        <div>
          <div class="kicker">SESI F.5 — PENGUJIAN OTOMATIS &amp; API TESTING</div>
          <h1>250 Unit/Integration Tests &amp; 45 Assertions Postman/Newman — 0 Gagal</h1>
          <div class="subhead">Seluruh lapisan backend Yii2, service Node.js, frontend React, dan koleksi API Postman teruji otomatis</div>
        </div>
        <div class="pill">✓ 100% PASS (0 Failed)</div>
      </div>

      <div class="metric-row">
        <div class="metric"><div class="val ok">134 / 446</div><div class="lbl">Yii2 PHPUnit (Tests / Assertions)</div></div>
        <div class="metric"><div class="val ok">38 Passed</div><div class="lbl">Node.js Vitest (6 Test Files)</div></div>
        <div class="metric"><div class="val ok">78 Passed</div><div class="lbl">React Vitest (22 Test Files)</div></div>
        <div class="metric"><div class="val ok">35 / 45</div><div class="lbl">Postman Newman (Req / Assertions)</div></div>
      </div>

      <div class="grid2">
        <div class="card">
          <div class="card-title">Unit &amp; Integration Tests <span class="badge ok">PHPUnit + Vitest</span></div>
          <div class="term"><span class="b">$ docker compose exec yii vendor/bin/phpunit</span>
PHPUnit 12.5.45  |  PHP 8.3.37
............................................................... 134 / 134
<span class="g">OK (134 tests, 446 assertions)</span>

<span class="b">$ docker compose exec node npm test</span>  (Vitest v5.1.1)
✓ dashboard.test.ts (7)   ✓ lab-integration.test.ts (3, D.5)
✓ lab.test.ts (9)         ✓ auth.test.ts (12)   ✓ validate + app (7)
<span class="g">Test Files 6 passed (6) | Tests 38 passed (38)</span>

<span class="b">$ npm --prefix frontend-react test</span>  (Vitest v5.1.1)
<span class="g">Test Files 22 passed (22) | Tests 78 passed (78)</span></div>
        </div>
        <div class="card">
          <div class="card-title">API Testing Postman / Newman &amp; Test Cases <span class="badge ok">docs/test-cases.md</span></div>
          <div class="term"><span class="b">$ newman run postman/simrs.collection.json -e postman/local.environment.json</span>
SIMRS Rawat Jalan — Alur End-to-End
  1. Health &amp; Autentikasi (JWT)          <span class="g">✓ PASS</span>
  2. Master Data CRUD &amp; Validasi         <span class="g">✓ PASS</span>
  3. Pendaftaran, Antrean, EMR, Lab      <span class="g">✓ PASS</span>
  4. Farmasi, Billing, Pembayaran Lunas  <span class="g">✓ PASS</span>
  5. Node.js Dashboard &amp; Lab Outbox      <span class="g">✓ PASS</span>

┌────────────────────┬──────────┬────────┐
│ requests           │       35 │      <span class="g">0</span> │
│ test-scripts       │       35 │      <span class="g">0</span> │
│ assertions         │       45 │      <span class="g">0</span> │
└────────────────────┴──────────┴────────┘
avg response time: <span class="g">471ms</span>  |  doc: <span class="b">docs/test-cases.md</span></div>
        </div>
      </div>
    </div>
    """)
