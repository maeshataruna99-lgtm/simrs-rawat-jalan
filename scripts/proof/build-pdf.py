"""Bangun PDF "Module Guide and Proof" dari screenshot, evidence, dan data DB di docs/proof-book.
Jalankan setelah reset-db.sh, flow.py, capture.py, d5-outbox.py: python scripts/proof/build-pdf.py"""
import html, json, os, re, subprocess
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PB = os.path.join(ROOT, "docs", "proof-book")
OUT_HTML = os.path.join(PB, "module-guide.html")
OUT_PDF = os.environ.get("PDF_OUT") or os.path.join(PB, "SIMRS-Module-Guide-and-Proof.pdf")
e = html.escape


def q(sql):
    r = subprocess.run(["docker", "exec", "simrs-postgres", "psql", "-U", "simrs", "-d", "simrs", "-At", "-F", "|", "-c", sql], capture_output=True, text=True, encoding="utf-8")
    return [l.split("|") for l in r.stdout.strip().splitlines() if l]


def C(s): return f"<code>{e(s)}</code>"
def md(s):
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s))


def img(path, caption, kind="app"):
    return f'<figure class="{kind}"><img src="{path}"><figcaption>{e(caption)}</figcaption></figure>'


def S(name, caption, kind="app"): return img(f"screenshots/{name}.png", caption, kind)
def F(name, caption): return img(f"screenshots/flow/{name}.png", caption, "app")
def T(name, caption): return img(f"screenshots/T-{name}.png", caption, "term")


def table(head, rows, cls=""):
    th = "".join(f"<th>{e(h)}</th>" for h in head)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="{cls}"><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


def ul(items): return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"
def ol(items): return "<ol>" + "".join(f"<li>{i}</li>" for i in items) + "</ol>"


def X(name, caption, kind="app"): return img(f"screenshots/extra/{name}.png", caption, kind)


def md_html(text):
    """Konversi markdown sederhana (daftar, tabel, kode, paragraf) ke HTML; judul # diabaikan, ## jadi h3, ### jadi h4."""
    out, items, ltype = [], [], None

    def flush():
        nonlocal items, ltype
        if items:
            tag = ltype or "ul"
            body = "".join(f"<li>{t}" + ("<ul>" + "".join(f"<li>{x}</li>" for x in subs) + "</ul>" if subs else "") + "</li>" for t, subs in items)
            out.append(f"<{tag}>{body}</{tag}>")
        items, ltype = [], None

    lines = text.splitlines(); i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```"):
            flush(); j = i + 1; buf = []
            while j < len(lines) and not lines[j].startswith("```"):
                buf.append(lines[j]); j += 1
            out.append(f"<pre><code>{e(chr(10).join(buf))}</code></pre>"); i = j + 1; continue
        if ln.startswith("|"):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i]); i += 1
            cells = [[c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", r.strip().strip("|"))] for r in rows if not re.match(r"^\|[-| :]+\|$", r.strip())]
            if cells:
                out.append(table([c.replace("`", "") for c in cells[0]], [[md(c) for c in r] for r in cells[1:]], "small"))
            continue
        m_num = re.match(r"^(\d+)\. (.*)", ln); m_bul = re.match(r"^(\s*)- (.*)", ln)
        if m_num:
            if ltype not in (None, "ol"): flush()
            ltype = "ol"; items.append((md(m_num.group(2)), []))
        elif m_bul:
            if len(m_bul.group(1)) >= 2 and items:
                items[-1][1].append(md(m_bul.group(2)))
            else:
                if ltype not in (None, "ul"): flush()
                ltype = "ul"; items.append((md(m_bul.group(2)), []))
        elif ln.startswith("#"):
            flush()
            if ln.startswith("###"): out.append(f"<h4>{md(ln.lstrip('# '))}</h4>")
            elif ln.startswith("##"): out.append(f"<h3>{md(ln.lstrip('# '))}</h3>")
        elif ln.strip() in ("", "---"):
            flush() if not ln.strip() and False else None
        elif ln.startswith(" ") and items:
            items[-1] = (items[-1][0] + " " + md(ln.strip()), items[-1][1])
        else:
            flush(); out.append(f"<p>{md(ln)}</p>")
        i += 1
    flush()
    return "".join(out)


ts_txt = open(os.path.join(ROOT, "docs", "technical-scenarios.md"), encoding="utf-8").read()


def dscen(n, evidence):
    m = re.search(rf"## D\.{n} — ([^\n]+)\n(.*?)(?=\n---\n|\n## D\.|\Z)", ts_txt, re.S)
    html_ = f"<h3>D.{n} {e(m.group(1))}</h3>"
    for part in re.split(r"^### ", m.group(2), flags=re.M)[1:]:
        name, _, txt = part.partition("\n")
        html_ += f"<h4>{e(name)}</h4>" + md_html(txt)
    return html_ + evidence


def chapter(title, body, page_break=True):
    m = re.match(r"(\d+)\.", title)
    cid = f"bab-{m.group(1)}" if m else ("bab-e" if title.startswith("E.") else ("peta" if title.startswith("Peta") else "lampiran-" + title.split()[1].rstrip(".").lower() if title.startswith("Lampiran") else ""))
    return f'<section class="chapter" id="{cid}"><h2>{e(title)}</h2>{body}</section>'


def role_grid():
    nama = {"admin": "Administrator", "pendaftaran": "Petugas Pendaftaran", "dokter": "Dokter", "farmasi": "Petugas Farmasi", "laboratorium": "Petugas Laboratorium", "kasir": "Kasir"}
    cells = "".join(f'<figure><img src="screenshots/extra/role-{k}.png"><figcaption>{v}</figcaption></figure>' for k, v in nama.items())
    return f'<p class="note">Menu setelah login berbeda untuk tiap role:</p><div class="rolegrid">{cells}</div>'


DESC = {"firebase/php-jwt": "JWT HS256", "yiisoft/yii2": "framework backend", "friendsofphp/php-cs-fixer": "lint gaya kode PHP", "phpunit/phpunit": "unit test PHP",
        "axios": "HTTP client", "react-router": "routing", "react-hook-form": "form dan validasi", "@hookform/resolvers": "penghubung form dengan zod", "zod": "validasi skema", "zustand": "state global",
        "recharts": "grafik dashboard", "i18next": "terjemahan ID/EN", "react-i18next": "terjemahan di React", "sonner": "notifikasi toast", "cmdk": "combobox dan pencarian menu",
        "lucide-react": "ikon", "clsx": "util class", "tailwind-merge": "util class Tailwind", "tailwindcss-animate": "animasi Tailwind", "class-variance-authority": "varian komponen",
        "express": "web framework Node", "pg": "driver PostgreSQL", "jsonwebtoken": "verifikasi JWT", "vitest": "test runner", "supertest": "test HTTP", "tsx": "jalankan TypeScript",
        "typescript": "bahasa dan pemeriksa tipe", "eslint": "lint", "prettier": "format kode", "jsdom": "DOM untuk test", "vite": "bundler dan dev server", "tailwindcss": "styling utilitas",
        "@testing-library/react": "test komponen", "@vitejs/plugin-react": "plugin React untuk Vite"}


def pkg_table(path, sections):
    j = json.load(open(os.path.join(ROOT, path), encoding="utf-8"))
    rows = []
    for sec in sections:
        for k, v in j.get(sec, {}).items():
            if k == "php" or k.startswith("bower-asset") or k.startswith("@types/"): continue
            kind = "runtime" if sec in ("dependencies", "require") else "pengembangan"
            desc = DESC.get(k) or ("komponen UI aksesibel (Radix)" if k.startswith("@radix-ui") else "pendukung")
            rows.append([C(k), e(v), kind, e(desc)])
    return table(["Paket", "Versi", "Jenis", "Fungsi"], rows, "small")


def api_doc(path):
    txt = open(os.path.join(ROOT, path), encoding="utf-8").read()
    return md_html(txt)


struktur = table(["Lapisan", "Pola folder", "Tanggung jawab"], [
    ["backend-yii", "<code>modules/&lt;domain&gt;/&lt;fitur&gt;/</code>: <code>*Controller</code>, <code>*Service</code>, model ActiveRecord", "Controller hanya HTTP dan otorisasi; Service memegang logika bisnis dan transaksi; Model memegang relasi dan aturan data. Test unit per Service di <code>tests/unit/</code>."],
    ["backend-yii/common", "<code>BaseApiController</code>, <code>CrudController</code>, <code>CrudService</code>, <code>ApiResponse</code>, <code>JwtService</code>, <code>AccessFilter</code>, <code>ListQuery</code>, <code>SequenceService</code>, <code>AuditLogBehavior</code>", "Dasar yang dipakai ulang semua modul: CRUD generik, format respons seragam, JWT, RBAC, paginasi, penomoran atomik, audit log."],
    ["service-node", "<code>src/modules/&lt;fitur&gt;/</code> (routes, service, outbox), <code>src/middleware/</code>, <code>src/lib/</code>", "Middleware <code>auth</code>, <code>validate</code>, <code>error-handler</code>; <code>lib</code> berisi koneksi database, klien Yii, dan format respons."],
    ["frontend-react", "<code>src/modules/&lt;domain&gt;/&lt;fitur&gt;/</code> (Page, Dialog, <code>*.api.ts</code>, <code>*.types.ts</code>), <code>components/</code>, <code>lib/</code>, <code>routes/</code>", "Komponen reusable <code>App*</code> dan shadcn/ui; <code>api-client</code> satu pintu ke REST; <code>RequireAuth</code> dan <code>PermissionGuard</code> untuk akses."],
    ["database", "<code>migrations/</code> (26 file), <code>seeds/</code>, <code>database/init/</code>", "Migrasi dan seed hanya dari Yii; skrip init membuat database test dan user read-only."],
    ["Konvensi", "Conventional Commits (commitlint, husky), ESLint, Prettier, PHP-CS-Fixer, CI GitHub Actions", "Satu sub-poin roadmap satu commit; CI menjalankan lint, test, dan build tiga lapisan."]])

pustaka = ("<h3>B.1 Backend Yii (composer.json)</h3>" + pkg_table("backend-yii/composer.json", ["require", "require-dev"])
           + "<h3>B.2 Service Node.js (package.json)</h3>" + pkg_table("service-node/package.json", ["dependencies", "devDependencies"])
           + "<h3>B.3 Frontend React (package.json)</h3>" + pkg_table("frontend-react/package.json", ["dependencies", "devDependencies"]))


# ---------- data hidup dari database ----------
pasien = q("select p.nama,p.no_rm,k.no_kunjungan,k.no_antrean,pl.prefix_antrean from t_kunjungan k join m_pasien p on p.id=k.pasien_id join m_poli pl on pl.id=k.poli_id where p.no_rm='RM000041' order by k.id desc limit 1")[0]
nama_px, rm_px, no_kunj, no_antr, prefix = pasien
antrean_txt = f"{prefix}-{int(no_antr):03d}"
inv = q(f"select i.no_invoice,i.total,i.total_bayar,i.status from t_invoice i join t_kunjungan k on k.id=i.kunjungan_id where k.no_kunjungan='{no_kunj}'")[0]
no_inv, total_inv = inv[0], int(float(inv[1]))
bayar = q(f"select b.no_pembayaran,b.metode,b.jumlah,coalesce(b.no_referensi,'-') from t_pembayaran b join t_invoice i on i.id=b.invoice_id where i.no_invoice='{no_inv}' order by b.id")
rp = lambda n: "Rp " + f"{int(float(n)):,}".replace(",", ".")

roles = q("select kode,nama from m_role order by id")
menus = q("select id,nama from m_menu where is_active order by urutan,id")
akses = {(r[0], r[1]): r[2] for r in q("select ra.role_id,ra.menu_id,(case when can_read then 'R' else '' end)||(case when can_create then 'C' else '' end)||(case when can_update then 'U' else '' end)||(case when can_delete then 'D' else '' end) from m_role_access ra")}
role_ids = [r[0] for r in q("select id from m_role order by id")]
rbac_rows = [[e(m[1])] + [akses.get((rid, m[0]), "") or "-" for rid in role_ids] for m in menus]
rbac = table(["Menu"] + [r[1].replace("Petugas ", "") for r in roles], rbac_rows, "rbac")

# ---------- ERD dari database/erd.md ----------
erd_txt = open(os.path.join(ROOT, "database", "erd.md"), encoding="utf-8").read()
CARD = {"||": "1", "|o": "0..1", "o|": "0..1", "}o": "0..*", "o{": "0..*", "}|": "1..*", "|{": "1..*"}


def erd_sections():
    out = []
    for title, body in re.findall(r"## (\d\. [^\n]+)\n(.*?)(?=\n## |\Z)", erd_txt, re.S):
        m = re.search(r"```mermaid\nerDiagram\n(.*?)```", body, re.S)
        if not m:
            continue
        code = m.group(1)
        ents = re.findall(r"^\s{4}(\w+) \{\n(.*?)^\s{4}\}", code, re.S | re.M)
        cards = ""
        for name, rows in ents:
            lines = ""
            for row in rows.strip().splitlines():
                p = row.split()
                key = p[2] if len(p) > 2 and p[2] in ("PK", "FK", "UK") else ""
                lines += f'<div class="col"><span>{e(p[1])}</span><i>{e(p[0])}</i><b class="{key}">{key}</b></div>'
            cards += f'<div class="ent"><div class="entname">{e(name)}</div>{lines}</div>'
        rels = re.findall(r'^\s{4}(\w+) (\S\S)--(\S\S) (\w+)\s*:\s*"([^"]*)"', code, re.M)
        rt = table(["Induk", "Kardinalitas", "Anak", "Keterangan"], [[C(a), f"{CARD.get(l, l)} : {CARD.get(r_, r_)}", C(b), e(lab)] for a, l, r_, b, lab in rels], "small")
        out.append(f'<h3>{e(title)}</h3><div class="entgrid">{cards}</div><h4>Relasi</h4>{rt}')
    return "".join(out)


constraint_rows = []
for line in erd_txt.split("## 4.")[1].splitlines():
    if line.startswith("|") and not line.startswith("|---") and "Skenario" not in line:
        c = [x.strip() for x in line.strip("|").split("|")]
        if len(c) == 3:
            constraint_rows.append([md(c[0]), md(c[1]), md(c[2])])

# ---------- SVG ----------
BASE = "font-family:'Segoe UI',Arial,sans-serif"
COL = {"blue": ("#dbeafe", "#1d4ed8"), "green": ("#dcfce7", "#15803d"), "orange": ("#ffedd5", "#c2410c"), "purple": ("#f3e8ff", "#7e22ce"),
       "teal": ("#ccfbf1", "#0f766e"), "grey": ("#f1f5f9", "#475569"), "amber": ("#fef3c7", "#b45309")}


def box(x, y, w, h, lines, c="grey", dashed=False):
    f, s = COL[c]
    t = "".join(f'<text x="{x + w / 2}" y="{y + 17 + i * 14}" text-anchor="middle" font-size="{11.5 if i == 0 else 10}" font-weight="{700 if i == 0 else 400}" fill="#111">{e(l)}</text>' for i, l in enumerate(lines))
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{f}" stroke="{s}" stroke-width="1.4"{" stroke-dasharray=\"5 3\"" if dashed else ""}/>{t}'


def arrow(pts, dashed=False, label=None, lx=0, ly=0):
    d = "M" + " L".join(f"{x},{y}" for x, y in pts)
    lab = f'<text x="{lx}" y="{ly}" font-size="9" fill="#444" text-anchor="middle">{e(label)}</text>' if label else ""
    return f'<path d="{d}" fill="none" stroke="#475569" stroke-width="1.4" marker-end="url(#ah)"{" stroke-dasharray=\"5 3\"" if dashed else ""}/>{lab}'


DEFS = '<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#475569"/></marker></defs>'

arch_svg = f'''<svg viewBox="0 0 780 440" style="{BASE};width:100%">{DEFS}
{box(300, 8, 180, 40, ["Pengguna (browser)", "6 role"], "grey")}
{box(250, 85, 280, 56, ["frontend-react", "React 19 · TypeScript · Vite · :5173"], "blue")}
{box(600, 85, 170, 56, ["Sistem / alat lab", "eksternal"], "grey", True)}
{box(30, 215, 300, 84, ["backend-yii (Yii 2.0.55, PHP 8.3, :8080)", "Business logic · satu-satunya penulis data transaksi", "Penerbit JWT · RBAC · migrasi database", "Seed · audit log · idempotensi pembayaran"], "green")}
{box(450, 215, 310, 84, ["service-node (Express 5, TypeScript, :3000)", "Integrasi lab: outbox + retry", "API dashboard read-only (simrs_readonly)", "Verifikasi JWT · X-Api-Key · validasi Zod"], "purple")}
{box(240, 365, 300, 66, ["PostgreSQL 16 (:5432)", "user simrs (baca/tulis) · simrs_readonly (SELECT)", "30 tabel · constraint · index"], "teal")}
{arrow([(390, 48), (390, 85)])}
{arrow([(340, 141), (200, 215)], label="REST + JWT", lx=240, ly=170)}
{arrow([(440, 141), (600, 215)], label="REST + JWT (dashboard)", lx=560, ly=170)}
{arrow([(685, 141), (685, 215)], dashed=True, label="HTTPS + X-Api-Key", lx=732, ly=190)}
{arrow([(450, 262), (330, 262)], label="forward hasil lab", lx=390, ly=252)}
{arrow([(180, 299), (300, 365)], label="baca/tulis + migrasi", lx=190, ly=340)}
{arrow([(600, 299), (480, 365)], label="outbox + SELECT read-only", lx=600, ly=340)}
</svg>'''

flow_svg = f'''<svg viewBox="0 0 800 960" style="{BASE};width:100%">{DEFS}
{box(265, 8, 270, 62, ["1. Pendaftaran kunjungan", "Cari pasien (RM / NIK / nama) atau Pasien Baru", "Pilih poli, dokter, jadwal, penjamin"], "blue")}
{box(265, 95, 270, 44, ["2. Nomor antrean otomatis", "Status kunjungan: menunggu"], "grey")}
{box(265, 164, 270, 44, ["3. Panggil / Periksa", "Status kunjungan: diperiksa"], "blue")}
{box(265, 233, 270, 62, ["4. Pemeriksaan dan rekam medis", "Anamnesis · tanda vital · pemeriksaan fisik", "Diagnosis utama + sekunder (ICD-10)"], "green")}
{box(15, 335, 230, 62, ["5a. Tindakan medis", "Pilih dari master, tarif tampil", "Jumlah lebih dari satu"], "green")}
{box(285, 335, 230, 62, ["5b. Resep obat", "Dosis · frekuensi · jumlah", "Validasi stok saat dibuat"], "green")}
{box(555, 335, 230, 62, ["5c. Order laboratorium", "Pilih pemeriksaan dari master", "Catatan klinis"], "green")}
{box(285, 435, 230, 62, ["6b. Farmasi", "Proses lalu Serahkan", "Stok berkurang + mutasi stok"], "orange")}
{box(555, 435, 230, 62, ["6c. Laboratorium", "Input hasil, flag otomatis", "normal / tinggi / rendah"], "purple")}
{box(555, 525, 230, 50, ["Alternatif: sistem lab eksternal", "POST /api/lab/results via Node", "outbox + retry ke Yii"], "purple", True)}
{box(265, 615, 270, 76, ["7. Kasir: Buat Invoice dan Valid", "Catatan peringatan (lab / resep belum tuntas)", "4 sumber biaya: pendaftaran, tindakan,", "pemeriksaan penunjang, obat"], "teal")}
{box(15, 625, 215, 62, ["Revisi data klinis", "Unvalid → dokter ubah →", "tagihan sinkron (item lama void)", "→ Valid lagi"], "amber", True)}
{box(265, 725, 270, 62, ["8. Pembayaran", "Tunai / non-tunai, bertahap", "belum dibayar → dibayar sebagian → lunas"], "teal")}
{box(265, 820, 270, 44, ["9. Cetak invoice dan bukti bayar", "Cetak atau Export PDF"], "teal")}
{box(265, 892, 270, 56, ["10. Kunjungan selesai (otomatis saat lunas)", "Riwayat medis dan riwayat pembayaran tersimpan"], "grey")}
{box(580, 892, 205, 56, ["Dashboard dan laporan", "Service Node, hanya membaca"], "purple", True)}
{arrow([(400, 70), (400, 95)])}
{arrow([(400, 139), (400, 164)])}
{arrow([(400, 208), (400, 233)])}
{arrow([(400, 295), (400, 315), (130, 315), (130, 335)])}
{arrow([(400, 295), (400, 335)])}
{arrow([(400, 295), (400, 315), (670, 315), (670, 335)])}
{arrow([(400, 397), (400, 435)])}
{arrow([(670, 397), (670, 435)])}
{arrow([(670, 525), (670, 497)], dashed=True)}
{arrow([(130, 397), (130, 600), (265, 650)])}
{arrow([(400, 497), (400, 615)])}
{arrow([(670, 497), (670, 505), (790, 505), (790, 653), (535, 653)])}
{arrow([(265, 690), (230, 690)], dashed=True)}
{arrow([(400, 691), (400, 725)])}
{arrow([(400, 787), (400, 820)])}
{arrow([(400, 864), (400, 892)])}
{arrow([(535, 920), (580, 920)], dashed=True)}
</svg>'''


def chips(*states, lbl):
    parts = []
    for i, s_ in enumerate(states):
        parts.append(f'<span class="chip">{e(s_)}</span>')
        if i < len(states) - 1:
            parts.append('<span class="arr">→</span>')
    return f'<div class="sm"><div class="smlbl">{e(lbl)}</div>{"".join(parts)}</div>'


states = (chips("menunggu", "diperiksa", "selesai (otomatis saat lunas)", lbl="Kunjungan / antrean") + '<div class="smnote">Batal dapat dipilih dari menunggu atau diperiksa. Status selesai tidak dipilih manual.</div>'
          + chips("baru", "diproses", "diserahkan", lbl="Resep") + chips("diminta", "diproses", "selesai", lbl="Order laboratorium")
          + chips("belum_dibayar", "dibayar_sebagian", "lunas", lbl="Invoice") + chips("Valid (terkunci)", "Unvalid (terbuka)", "Valid", lbl="Validasi kasir"))

# ---------- modul ----------
def module(no, title, poin, tujuan, role, langkah, endpoint, tabel, aturan, kode, bukti):
    return f"""<section class="module" id="m-{no.replace('.', '-')}"><h2>{e(no)}. {e(title)} <span class="tag">{e(poin)}</span></h2>
<h3>Tujuan</h3><p>{tujuan}</p><h3>Pengguna dan hak akses</h3><p>{role}</p>
<h3>Cara memakai</h3>{ol(langkah)}<h3>Endpoint utama</h3>{table(["Method", "Path", "Fungsi"], endpoint)}
<h3>Tabel database</h3><p>{tabel}</p><h3>Aturan dan validasi</h3>{ul(aturan)}<h3>Lokasi kode</h3><p>{kode}</p>
<h3>Bukti</h3>{bukti}</section>"""


mods = []
mods.append(module("5.1", "Autentikasi dan Hak Akses", "Poin B.9",
    "Membatasi setiap pengguna pada fitur sesuai kewenangannya. Yii menerbitkan JWT HS256; Yii, Node, dan React memeriksanya.",
    "Enam role: Administrator, Petugas Pendaftaran, Dokter, Petugas Farmasi, Petugas Laboratorium, Kasir. Hak akses per menu terdiri dari baca (R), tambah (C), ubah (U), dan hapus (D). Matriks nyata dari database ada pada bab 3.5.",
    ["Buka <code>http://localhost:5173/login</code>, isi <code>Username</code> dan <code>Password</code>, klik <b>Masuk</b>.", "Sidebar hanya memuat modul dan menu yang diizinkan untuk role itu.",
     "Administrator membuka modul Sistem, menu <b>Hak Akses Role</b>, mengubah izin per role, lalu menyimpan.", "Membuka halaman tanpa izin menampilkan <b>Akses ditolak</b>; API membalas 403."],
    [["POST", C("/system/auth/login"), "Login; mengembalikan token, user, modul, izin"], ["GET", C("/system/auth/me"), "Profil dan matriks izin"],
     ["CRUD", C("/system/user"), "Kelola pengguna, reset password"], ["GET/PUT", C("/system/role-access/{roleId}"), "Baca dan simpan matriks izin"]],
    "<code>m_role</code>, <code>m_user</code>, <code>m_module</code>, <code>m_menu</code>, <code>m_module_menu</code>, <code>m_role_access</code>, <code>t_audit_log</code>.",
    ["Password disimpan sebagai hash (<code>password_hash</code>); token punya masa berlaku (<code>JWT_TTL</code>).", "Otorisasi diputuskan di Yii; React hanya menyembunyikan menu.", "Secret JWT minimal 32 karakter, dipakai bersama Yii dan Node."],
    "<code>backend-yii/modules/system/</code>, <code>frontend-react/src/modules/system/</code>, <code>frontend-react/src/routes/</code>.",
    S("B9-login", "Halaman login") + S("M-user", "Manajemen pengguna (6 akun, satu per role)") + S("M-role-access", "Matriks hak akses per role") + S("RBAC-ditolak-billing", "Role Pendaftaran membuka /transaction/billing: Akses ditolak") + role_grid()))

mods.append(module("5.2", "Pengelolaan Master Data", "Poin B.1",
    "Menyimpan data dasar SIMRS: pasien dan No. RM, dokter, poli, jadwal praktik, tindakan dan tarif, obat dengan stok dan harga, master pemeriksaan lab, dan ICD-10.",
    "Administrator mengelola semua master. Role lain memakai master lewat modul kerjanya.",
    ["Login sebagai <code>admin</code>, pilih modul <b>Master Data</b>, lalu menu yang dibutuhkan.", "Ketik pada kotak pencarian (No. RM, NIK, atau nama) untuk memfilter; klik judul kolom untuk mengurutkan.",
     "Klik <b>Tambah Pasien</b> (atau Tambah Obat, dan seterusnya), isi form, simpan. Klik <b>Ubah</b> atau <b>Hapus</b> pada baris.", "Pada Obat dan Stok: <b>Sesuaikan Stok</b> mengubah stok dan <b>Riwayat Mutasi</b> menampilkan mutasi masuk, keluar, dan penyesuaian."],
    [["CRUD", C("/master/pasien"), "NIK 16 digit unik; No. RM otomatis"], ["CRUD", C("/master/dokter"), "Kode, nama, SIP, spesialis"], ["CRUD", C("/master/poli"), "Kode, nama, prefix antrean, tarif pendaftaran"],
     ["CRUD", C("/master/jadwal-dokter"), "Dokter, poli, hari, jam, kuota; jadwal bentrok ditolak"], ["CRUD", C("/master/tindakan"), "Kode, nama, tarif"], ["CRUD", C("/master/obat"), "Kode, nama, satuan, harga, stok"],
     ["POST", C("/master/obat/{id}/sesuaikan-stok"), "Penyesuaian stok tercatat di mutasi"]],
    "<code>m_pasien</code>, <code>m_dokter</code>, <code>m_poli</code>, <code>m_jadwal_dokter</code>, <code>m_tindakan</code>, <code>m_obat</code>, <code>t_stok_mutasi</code>, <code>m_pemeriksaan_lab</code>, <code>m_icd10</code>.",
    ["Duplikasi: <code>no_rm</code> dan <code>nik</code> memakai unique index aktif; NIK ganda ditolak 422 (TC-MST-01).", "Hapus bersifat soft delete (<code>deleted_at</code>); data transaksi lama tetap utuh (TC-MST-02).", "Jadwal dokter yang bentrok ditolak (TC-MST-03)."],
    "<code>backend-yii/modules/master/</code>, <code>frontend-react/src/modules/master/</code>.",
    '<p class="note">Bukti 1: data ada di PostgreSQL (query langsung setelah seed).</p>' + T("B1-master-data", "Hasil query ke database simrs") + '<p class="note">Bukti 2: data yang sama tampil di aplikasi.</p>'
    + S("B1-pasien", "Master Pasien: 50 data, pencarian, Ubah, Hapus") + S("B1-dokter", "Master Dokter") + S("B1-poli", "Master Poli") + S("B1-jadwal", "Jadwal praktik")
    + S("B1-tindakan", "Tindakan dan tarif") + S("B1-obat", "Obat, stok, harga") + S("B1-lab", "Master pemeriksaan laboratorium") + S("B1-icd10", "Master ICD-10")
    + '<p class="note">Bukti 3: tambah, ubah, hapus, validasi input, dan pencegahan duplikasi pada Master Pasien.</p>'
    + X("m1-validasi-form-kosong", "Validasi input: form kosong menampilkan pesan tiap kolom wajib") + X("m2-nik-duplikat-ditolak", "Pencegahan duplikasi: NIK yang sudah terdaftar ditolak (\"NIK sudah terdaftar.\")")
    + X("m3-pasien-ditambah-no-rm-otomatis", "Tambah: pasien tersimpan dan No. RM terbentuk otomatis (RM000051)") + X("m4-pasien-diubah", "Ubah: nama pasien berubah") + X("m5-konfirmasi-hapus", "Hapus: dialog konfirmasi") + X("m6-pasien-dihapus", "Hapus: data tidak lagi tampil (soft delete)")))

mods.append(module("5.3", "Pendaftaran dan Antrean", "Poin B.2",
    "Mendaftarkan kunjungan, memilih poli dan dokter sesuai jadwal praktik, membuat nomor antrean otomatis, menampilkan status antrean, dan menyimpan riwayat kunjungan.",
    "Petugas Pendaftaran dan Administrator.",
    ["Buka <b>Pendaftaran Kunjungan</b>. Ketik No. RM, NIK, atau nama pada kolom pencarian; klik pasien pada hasil. Pasien belum terdaftar: klik <b>Pasien Baru</b>.",
     "Pilih <b>Tanggal Kunjungan</b>, <b>Poli</b>, <b>Jadwal Dokter</b> (menampilkan dokter, jam praktik, kuota), dan <b>Penjamin</b>.", "Klik <b>Daftarkan Kunjungan</b>. Tiket antrean (nomor kunjungan dan nomor antrean) tampil dan riwayat kunjungan pasien bertambah.",
     "Buka <b>Antrean Poli</b> untuk memantau, memfilter, dan mengubah status. <b>Panggil / Periksa</b> mengubah status menjadi diperiksa; <b>Batalkan</b> membatalkan. <b>Layar Display</b> membuka tampilan antrean publik."],
    [["GET", C("/transaction/pendaftaran/cari-pasien?q="), "Cari pasien"], ["POST", C("/transaction/pendaftaran"), "Daftarkan; 409 bila duplikat atau kuota habis"], ["GET", C("/transaction/antrean"), "Antrean berhalaman, filter poli, status, tanggal"],
     ["PUT", C("/transaction/antrean/{id}/status"), "Ubah status antrean"], ["GET", C("/transaction/riwayat-kunjungan/{pasienId}"), "Riwayat kunjungan"]],
    "<code>t_kunjungan</code>, <code>t_kunjungan_status_log</code>, <code>t_sequence_counter</code>.",
    ["Satu pasien tidak bisa punya dua kunjungan aktif pada poli dan tanggal yang sama (409).", "Tanggal kunjungan lampau ditolak 422 (TC-REG-02).", "Nomor antrean dibuat atomik; dua petugas bersamaan tidak menghasilkan nomor kembar (D.1).", "Setiap perubahan status tercatat di <code>t_kunjungan_status_log</code>."],
    "<code>backend-yii/modules/transaction/pendaftaran/</code>, <code>.../antrean/</code>.",
    F("01-cari-pasien", f"Pencarian pasien dengan No. RM {rm_px}") + F("03-pendaftaran-berhasil", f"Tiket antrean setelah pendaftaran; riwayat kunjungan menampilkan kunjungan baru ({no_kunj})") + F("04-antrean-status-menunggu", "Antrean Poli: status Menunggu")))

mods.append(module("5.4", "Pemeriksaan dan Rekam Medis Elektronik", "Poin B.3",
    "Dokter mencatat anamnesis, tanda vital, pemeriksaan fisik, serta diagnosis utama dan sekunder (ICD-10). Hasil masuk riwayat rekam medis pasien.",
    "Dokter melihat pasien miliknya sendiri; Administrator melihat semua.",
    ["Login sebagai <code>dokter</code>, buka <b>Pemeriksaan Pasien</b>. Cari pasien (nomor kunjungan, nama, atau No. RM), klik <b>Periksa</b>.",
     "Halaman pemeriksaan memiliki tab <b>Anamnesis</b>, <b>Tanda Vital</b>, <b>Pemeriksaan Fisik</b>, <b>Diagnosis</b>, <b>Tindakan</b>, <b>Resep</b>, <b>Laboratorium</b>, dan <b>Riwayat</b>.",
     "Isi keluhan utama dan anamnesis; isi tanda vital (tekanan darah, nadi, suhu, respirasi, SpO2, berat dan tinggi badan); isi pemeriksaan fisik; klik <b>Simpan Pemeriksaan</b>.",
     "Tab Diagnosis: klik <b>Tambah diagnosis ICD-10...</b>, pilih kode. Pilihan pertama menjadi Utama, berikutnya sekunder. Klik <b>Simpan Diagnosis</b>.", "Menu <b>Riwayat Rekam Medis</b> menampilkan seluruh kunjungan pasien."],
    [["GET", C("/transaction/pemeriksaan/worklist"), "Pasien menunggu milik dokter login"], ["GET/PUT", C("/transaction/pemeriksaan/{kunjunganId}"), "Baca dan simpan pemeriksaan"], ["PUT", C("/transaction/diagnosis/{kunjunganId}"), "Simpan diagnosis"],
     ["GET", C("/transaction/riwayat-medis/{pasienId}"), "Riwayat lengkap rekam medis"]],
    "<code>t_pemeriksaan</code>, <code>t_diagnosis</code>, <code>m_icd10</code>.",
    ["Worklist hanya berisi kunjungan milik dokter login; kunjungan dokter lain ditolak 403 (TC-EMR-01).", "Tekanan diastolik harus lebih kecil dari sistolik (422, TC-EMR-02).", "Diagnosis wajib tepat satu utama (422, TC-EMR-03).", "Kunjungan yang sudah divalidasi kasir menolak perubahan (409); perubahan lain tercatat di audit log."],
    "<code>backend-yii/modules/transaction/pemeriksaan/</code>, <code>frontend-react/src/modules/transaction/pemeriksaan/</code>.",
    F("06-worklist-dokter", "Worklist dokter") + F("07-anamnesis", "Tab Anamnesis") + F("08-tanda-vital", "Tab Tanda Vital") + F("10-diagnosis-utama-sekunder", "Tab Diagnosis: satu utama, satu sekunder") + F("37-riwayat-medis-pasien", "Riwayat Rekam Medis: pemeriksaan, tindakan, resep, hasil lab, diagnosis")))

mods.append(module("5.5", "Tindakan Medis", "Poin B.4",
    "Dokter memilih tindakan dari master, tarif tampil otomatis, boleh lebih dari satu tindakan per kunjungan, dan setiap tindakan menjadi komponen tagihan.",
    "Dokter dan Administrator.",
    ["Pada halaman pemeriksaan, buka tab <b>Tindakan</b>.", "Klik <b>Pilih tindakan medis...</b>; daftar menampilkan kode, nama, dan tarif. Pilih satu, atur <b>Jumlah</b>, klik <b>Tambah</b>.", "Ulangi untuk tindakan lain. Tindakan dapat dibatalkan; tagihan dihitung ulang."],
    [["GET", C("/transaction/tindakan/{kunjunganId}"), "Daftar tindakan"], ["POST", C("/transaction/tindakan/{kunjunganId}"), "Tambah tindakan (snapshot tarif)"], ["DELETE", C("/transaction/tindakan/item/{id}"), "Batalkan tindakan; item invoice di-void"]],
    "<code>t_tindakan</code>, <code>m_tindakan</code>, <code>t_invoice_item</code>.",
    ["Tarif disalin saat tindakan dicatat (snapshot); perubahan tarif master tidak mengubah tagihan lama (TC-EMR-04).", "Pembatalan mengubah status ke batal tanpa menghapus baris fisik."],
    "<code>backend-yii/modules/transaction/tindakan/</code>.",
    F("11-pilih-tindakan-dan-tarif", "Daftar tindakan master dengan tarif") + F("12-dua-tindakan-tercatat", "Dua tindakan tercatat pada satu kunjungan")))

mods.append(module("5.6", "Farmasi dan Resep Obat", "Poin B.5",
    "Dokter membuat resep (obat, dosis, frekuensi, jumlah) dengan validasi stok. Petugas farmasi memproses dan menyerahkan obat; stok berkurang setelah penyerahan; riwayat penggunaan obat tersimpan.",
    "Dokter membuat resep; Petugas Farmasi memproses dan menyerahkan; Administrator melihat semua.",
    ["Dokter: tab <b>Resep</b>, klik <b>Tambah obat ke resep...</b> (daftar menampilkan stok dan harga), isi <b>Dosis</b>, <b>Frekuensi</b>, <b>Jumlah</b>, dan catatan, klik <b>Simpan Resep</b>.",
     "Petugas farmasi: menu <b>Pelayanan Resep</b>. Cari resep; klik <b>Proses</b> (baru menjadi diproses), lalu <b>Serahkan</b> (diproses menjadi diserahkan).", "Filter status memuat Baru dan diproses, Baru, Diproses, Diserahkan. Stok obat dan mutasinya dapat diperiksa di Master Data, Obat dan Stok."],
    [["POST", C("/transaction/resep"), "Buat resep, validasi stok"], ["GET", C("/transaction/farmasi/antrean"), "Antrean resep berhalaman"], ["PUT", C("/transaction/farmasi/{resepId}/proses"), "Ubah ke diproses"],
     ["PUT", C("/transaction/farmasi/{resepId}/serahkan"), "Serahkan, kurangi stok, catat mutasi"], ["GET", C("/transaction/riwayat-obat/{pasienId}"), "Riwayat obat pasien"]],
    "<code>t_resep</code>, <code>t_resep_detail</code>, <code>m_obat</code>, <code>t_stok_mutasi</code>.",
    ["Jumlah melebihi stok ditolak 422 saat resep dibuat (TC-FAR-01).", "Penyerahan mengunci baris resep dan obat (<code>FOR UPDATE</code>, urut id) dan <code>CHECK (stok &gt;= 0)</code> menjaga stok tidak minus (D.2).", "Resep yang sudah diserahkan tidak bisa diserahkan lagi."],
    "<code>backend-yii/modules/transaction/resep/</code>, <code>.../farmasi/</code>.",
    F("13-pilih-obat-dan-stok", "Daftar obat dengan stok dan harga") + F("15-resep-tersimpan", "Resep tersimpan, status Baru, total Rp 15.000") + F("22-resep-diproses", "Farmasi: status Diproses, tombol Serahkan")
    + F("23-resep-diserahkan", "Filter Diserahkan: resep selesai diserahkan") + F("24-stok-obat-berkurang", "Stok Paracetamol turun dari 500 menjadi 490 setelah penyerahan 10 tablet")
    + X("r1-resep-melebihi-stok-ditolak", "Validasi stok: jumlah 99999 ditolak dengan pesan stok tidak cukup")
    + X("o1-riwayat-mutasi-stok", "Riwayat mutasi stok: tiap penyerahan tercatat sebagai mutasi keluar dengan stok sebelum dan sesudah (baris atas berasal dari resep uji lain sehingga stok saat gambar ini 460)")))

mods.append(module("5.7", "Pemeriksaan Penunjang (Laboratorium)", "Poin B.6, C",
    "Dokter membuat order laboratorium, petugas lab melihat daftar dan menginput hasil, dan dokter membaca hasil di riwayat kunjungan. Sistem eksternal memakai API Node untuk membaca order dan mengirim hasil.",
    "Dokter membuat order; Petugas Laboratorium menginput hasil; sistem eksternal memakai header X-Api-Key.",
    ["Dokter: tab <b>Laboratorium</b>, centang pemeriksaan (tarif tampil), isi <b>Catatan klinis</b>, klik <b>Kirim Order</b>.", "Petugas lab: menu <b>Pemeriksaan Laboratorium</b>. Klik baris \"N pemeriksaan\" untuk membuka rincian, isi kolom <b>Hasil</b> tiap pemeriksaan, klik tombol simpan di sampingnya.",
     "Flag dihitung otomatis dari nilai rujukan. Setelah seluruh hasil terisi status order menjadi Selesai (pilih filter status Selesai untuk melihatnya).", "Dokter melihat hasil pada <b>Riwayat Rekam Medis</b>. Sistem eksternal memakai <code>GET /api/lab/orders</code> dan <code>POST /api/lab/results</code> pada service Node."],
    [["POST", C("/transaction/order-lab"), "Buat order lab"], ["GET", C("/transaction/order-lab"), "Worklist petugas lab"], ["PUT", C("/transaction/hasil-lab/{detailId}"), "Input hasil (Idempotency-Key)"],
     ["GET", C("/api/lab/orders (Node)"), "Order untuk sistem eksternal"], ["POST", C("/api/lab/results (Node)"), "Terima hasil, outbox, teruskan ke Yii"]],
    "<code>t_order_lab</code>, <code>t_order_lab_detail</code>, <code>m_pemeriksaan_lab</code>, <code>t_integration_outbox</code>.",
    ["Flag normal, tinggi, atau rendah dihitung di Yii (<code>OrderLabService</code>), bukan di Node (TC-LAB-01).", "Bila Yii tidak terjangkau, Node membalas 202 dan menyimpan hasil di outbox, lalu worker mengulang pengiriman (D.5, TC-LAB-03).", "Kunci idempotensi yang sama tidak menggandakan hasil."],
    "<code>backend-yii/modules/transaction/lab/</code>, <code>service-node/src/modules/lab/</code>.",
    F("16-order-lab-dipilih", "Dokter memilih Hemoglobin dan Leukosit, total tarif tampil") + F("17-order-lab-terkirim", "Order terkirim ke laboratorium") + F("18-worklist-lab", "Worklist petugas laboratorium: order berstatus Diminta")
    + F("19-hasil-pertama-tersimpan", "Hasil pertama tersimpan") + F("20-lab-selesai-dengan-flag", "Order Selesai: Leukosit 12500 diberi flag Tinggi terhadap rujukan 4000 sampai 10000")))

mods.append(module("5.8", "Billing dan Pembayaran", "Poin B.7",
    "Menggabungkan biaya pendaftaran, tindakan, pemeriksaan penunjang, dan obat dalam satu tagihan. Mendukung pembayaran tunai dan non-tunai (simulasi), bertahap, tiga status pembayaran, riwayat pembayaran, serta cetak invoice dan bukti bayar.",
    "Kasir dan Administrator.",
    ["Login sebagai <code>kasir</code>, buka <b>Tagihan dan Pembayaran</b>. Tiga tab: <b>Daftar Tagihan</b>, <b>Belum Ditagih</b>, <b>Riwayat Pembayaran</b>.", "Tab Belum Ditagih: cari pasien, klik <b>Buat Invoice</b>. Dialog <b>Buat Invoice dan Validasi Kunjungan</b> menampilkan catatan peringatan (misalnya lab belum selesai); konfirmasi untuk melanjutkan. Kunjungan menjadi Valid sehingga dokter tidak dapat menambah order.",
     "Tab Daftar Tagihan: <b>Detail</b> menampilkan rincian biaya per sumber dan audit log; <b>Cetak</b> membuka invoice; <b>Bayar</b> membuka dialog <b>Catat Pembayaran</b>.", "Pilih <b>Metode Pembayaran</b> (Tunai atau Non-Tunai), isi <b>Jumlah Bayar</b> (boleh sebagian, atau klik <b>Lunasi sisa</b>), isi <b>No. Referensi</b> bila non-tunai, klik <b>Proses Pembayaran</b>.",
     "Revisi: tombol <b>Unvalid</b> membuka kunci agar dokter dapat mengubah data; tagihan tersinkron otomatis, lalu kasir menekan Valid lagi.", "Tab Riwayat Pembayaran: tombol <b>Bukti Bayar</b> membuka kwitansi. Halaman cetak memiliki <b>Cetak</b> dan <b>Export PDF</b>."],
    [["POST", C("/transaction/invoice/{kunjunganId}"), "Bentuk invoice dari 4 sumber biaya"], ["GET", C("/transaction/invoice/{id}"), "Detail invoice, item, pembayaran"], ["PUT", C("/transaction/invoice/{id}/valid | unvalid"), "Kunci atau buka kunci kunjungan"],
     ["POST", C("/transaction/pembayaran"), "Catat pembayaran; header Idempotency-Key wajib"], ["GET", C("/transaction/pembayaran"), "Riwayat pembayaran"], ["GET", C("/transaction/invoice/{id}/audit-log"), "Jejak perubahan tagihan"]],
    "<code>t_invoice</code>, <code>t_invoice_item</code>, <code>t_pembayaran</code>, <code>t_audit_log</code>.",
    ["Pembayaran melebihi sisa tagihan ditolak (TC-BIL-02).", "Pembayaran ganda dicegah dengan <code>Idempotency-Key</code> unik, lock invoice, dan <code>CHECK (total_bayar &lt;= total)</code> (D.3).", "Item tagihan yang berubah ditandai void dengan alasan; total dihitung ulang (D.4).", "Saat lunas, kunjungan otomatis selesai dan hanya tampil di billing (TC-BIL-07)."],
    "<code>backend-yii/modules/transaction/billing/</code>, <code>frontend-react/src/modules/transaction/pembayaran/</code>.",
    F("25-belum-ditagih", "Tab Belum Ditagih") + F("26-dialog-buat-invoice-peringatan", "Dialog Buat Invoice dan Validasi Kunjungan") + F("28-detail-invoice-4-sumber", f"Detail invoice {no_inv}: enam item dari empat sumber biaya, total {rp(total_inv)}, audit log")
    + F("29-dialog-bayar", "Dialog Catat Pembayaran") + F("33-status-lunas", "Status Lunas setelah dua pembayaran") + F("34-riwayat-pembayaran", "Riwayat pembayaran: tunai lalu non-tunai dengan nomor referensi")
    + F("35-bukti-bayar-cetak", "Bukti pembayaran cetak") + F("36-invoice-cetak-lunas", "Invoice cetak: rincian, total, riwayat pembayaran, kolom tanda tangan")))

mods.append(module("5.9", "Dashboard dan Laporan", "Poin B.8",
    "Menampilkan jumlah kunjungan, kunjungan per poli, jumlah tindakan, ringkasan pendapatan, rekap obat, dan status pembayaran, dengan filter periode dan rincian data.",
    "Semua role melihat dashboard. Data keuangan (pendapatan, tagihan) hanya untuk role dengan izin menu <b>Data Keuangan Dashboard</b>.",
    ["Buka <b>Dashboard</b>.", "Pilih periode lewat <b>Hari Ini</b>, <b>7 Hari</b>, <b>30 Hari</b>, <b>Bulan Ini</b>, atau isi tanggal dari dan sampai, pilih dokter dan penjamin, klik <b>Terapkan</b>.", "Tab rincian: <b>Kunjungan</b>, <b>Tindakan</b>, <b>Pendapatan</b>, <b>Obat</b>, <b>Tagihan</b> (tabel berhalaman). <b>Export PDF</b> dan <b>Export Excel</b> mengunduh laporan."],
    [["GET", C("/api/dashboard/summary"), "Ringkasan periode"], ["GET", C("/api/dashboard/kunjungan-per-poli"), "Kunjungan per poli"], ["GET", C("/api/dashboard/tindakan"), "Rekap tindakan"], ["GET", C("/api/dashboard/obat"), "Rekap penggunaan obat"],
     ["GET", C("/api/dashboard/pendapatan | pembayaran"), "Keuangan (butuh izin, tanpa izin 403)"], ["GET", C("/api/dashboard/detail/{jenis}"), "Rincian berhalaman"]],
    "Membaca tabel transaksi lewat user database read-only <code>simrs_readonly</code>.",
    ["Node tidak menulis data; semua penulisan lewat Yii.", "Periode terbalik ditolak 422 oleh validasi Zod (TC-DSH-01).", "Index khusus dashboard mempercepat agregasi (D.6)."],
    "<code>service-node/src/modules/dashboard/</code>, <code>frontend-react/src/modules/dashboard/</code>.",
    F("39-dashboard-hari-ini", "Dashboard periode Hari Ini: kartu ringkasan, kunjungan per poli, pendapatan, status pembayaran") + X("d0-dashboard-filter-7-hari", "Filter periode 7 Hari")
    + X("d-rincian-kunjungan", "Rincian Kunjungan") + X("d-rincian-tindakan", "Rincian Tindakan medis") + X("d-rincian-pendapatan", "Rincian Pendapatan") + X("d-rincian-obat", "Rekap penggunaan Obat") + X("d-rincian-pembayaran", "Rincian Tagihan dan status pembayaran")))

mods.append(module("5.10", "Backend Services Node.js", "Poin C",
    "Menyediakan REST API pendukung: integrasi hasil lab untuk sistem eksternal dan API agregasi dashboard. Node bukan pemilik business logic transaksi.",
    "Dashboard memakai JWT dari Yii; integrasi lab memakai header <code>X-Api-Key</code>.",
    ["Jalankan <code>docker compose up -d</code>; service di <code>http://localhost:3000</code>.", "Ambil JWT dari <code>POST /system/auth/login</code> pada Yii, kirim sebagai <code>Authorization: Bearer</code> ke <code>/api/dashboard/*</code>.", "Dokumentasi: <code>/openapi.yaml</code> dan <code>docs/api/node.md</code>."],
    [["GET", C("/health"), "Status service"], ["GET", C("/api/lab/orders"), "Daftar order lab"], ["POST", C("/api/lab/results"), "Kirim hasil lab"], ["GET", C("/api/dashboard/*"), "API dashboard read-only"]],
    "Membaca lewat <code>simrs_readonly</code>; menulis hanya <code>t_integration_outbox</code>.",
    ["Middleware: verifikasi JWT, verifikasi API key, validasi Zod, penanganan error.", "Format respons seragam: <code>success</code>, <code>message</code>, <code>data</code> atau <code>errors</code>.", "Pembagian tanggung jawab dengan Yii: bab 2.4."],
    "<code>service-node/src/</code>.",
    T("C-node-service", "Panggilan HTTP nyata ke service Node: 200, 401 tanpa token, 401 tanpa API key, 422 validasi, dan status kontainer")))


mods.append(module("5.11", "Fitur Tambahan (Bonus)", "Catatan penilaian",
    "Fitur di luar syarat minimal yang meningkatkan kegunaan dan kerapihan aplikasi.",
    "Sesuai fitur: dashboard dan cetak untuk semua role berizin; layar display antrean terbuka tanpa login.",
    ["<b>Export PDF dan Excel:</b> tombol pada Dashboard dan pada halaman cetak invoice dan bukti bayar.", "<b>Filter laporan:</b> periode cepat (Hari Ini, 7 Hari, 30 Hari, Bulan Ini), rentang tanggal, dokter, dan penjamin.",
     "<b>Layar display antrean:</b> buka <code>/display-antrean</code> (atau tombol Layar Display di Antrean Poli); nama pasien disamarkan.", "<b>Chatbot bantuan:</b> tombol <b>Bantuan</b> di pojok kanan bawah; menjawab panduan penggunaan tanpa LLM.",
     "<b>Tema dan bahasa:</b> tombol tema terang atau gelap dan tombol bahasa ID/EN pada header; <b>Ctrl K</b> membuka pencarian menu."],
    [["GET", C("/api/dashboard/*"), "Sumber data laporan dan export"], ["GET", C("/transaction/antrean/display"), "Data layar display antrean"]],
    "-",
    ["UI konsisten memakai komponen shadcn/ui dan komponen reusable <code>App*</code>.", "Chatbot memakai basis pengetahuan lokal (<code>docs/chatbot.md</code>)."],
    "<code>frontend-react/src/lib/export-pdf.ts</code>, <code>export-excel.ts</code>, <code>frontend-react/src/modules/chatbot/</code>, <code>frontend-react/src/modules/transaction/antrean/DisplayAntreanPage.tsx</code>.",
    X("b1-layar-display-antrean", "Layar display antrean publik") + X("b2-chatbot-bantuan", "Chatbot bantuan") + X("b3-tema-gelap", "Tema gelap pada Dashboard") + F("36-invoice-cetak-lunas", "Tombol Cetak dan Export PDF pada invoice")))

# ---------- bab 4: alur satu pasien ----------
tahap = [
    ("4.1 Pendaftaran dan antrean", "Petugas pendaftaran mencari pasien, memilih poli dan jadwal dokter, mendaftarkan kunjungan, lalu memanggil pasien.",
     [("01-cari-pasien", f"Mencari pasien dengan No. RM {rm_px}"), ("02-pilih-poli-dokter-jadwal", "Memilih tanggal, poli, jadwal dokter (dokter, jam praktik, kuota), dan penjamin"), ("03-pendaftaran-berhasil", f"Tiket antrean {antrean_txt} untuk {nama_px}, kunjungan {no_kunj}; riwayat kunjungan bertambah"),
      ("04-antrean-status-menunggu", "Antrean Poli: status Menunggu"), ("05-antrean-status-diperiksa", "Setelah Panggil / Periksa: status Diperiksa")]),
    ("4.2 Pemeriksaan dan rekam medis", "Dokter membuka pasien dari worklist dan mengisi anamnesis, tanda vital, pemeriksaan fisik, dan diagnosis.",
     [("06-worklist-dokter", "Worklist dokter"), ("07-anamnesis", "Keluhan utama dan anamnesis"), ("08-tanda-vital", "Tanda vital"), ("09-pemeriksaan-fisik-tersimpan", "Pemeriksaan fisik tersimpan"), ("10-diagnosis-utama-sekunder", "Diagnosis utama J06.9 dan sekunder J00")]),
    ("4.3 Tindakan medis", "Dokter menambah dua tindakan dari master; tarif otomatis menjadi komponen tagihan.",
     [("11-pilih-tindakan-dan-tarif", "Daftar tindakan master beserta tarif"), ("12-dua-tindakan-tercatat", "Konsultasi Dokter Umum (Rp 50.000) dan Nebulizer (Rp 55.000) tercatat")]),
    ("4.4 Resep obat", "Dokter membuat resep Paracetamol; sistem menampilkan stok saat memilih dan menghitung total.",
     [("13-pilih-obat-dan-stok", "Daftar obat dengan stok dan harga"), ("14-resep-diisi", "Dosis, frekuensi, jumlah, catatan"), ("15-resep-tersimpan", "Resep tersimpan, status Baru")]),
    ("4.5 Order dan hasil laboratorium", "Dokter memesan Hemoglobin dan Leukosit; petugas laboratorium menginput hasil dan sistem memberi flag.",
     [("16-order-lab-dipilih", "Dokter memilih pemeriksaan"), ("17-order-lab-terkirim", "Order terkirim"), ("18-worklist-lab", "Worklist laboratorium"), ("19-hasil-pertama-tersimpan", "Hasil pertama tersimpan"), ("20-lab-selesai-dengan-flag", "Order Selesai; Leukosit bertanda Tinggi")]),
    ("4.6 Farmasi", "Petugas farmasi memproses lalu menyerahkan resep; stok obat berkurang.",
     [("21-antrean-resep-baru", "Antrean resep: status Baru"), ("22-resep-diproses", "Status Diproses"), ("23-resep-diserahkan", "Status Diserahkan"), ("24-stok-obat-berkurang", "Stok Paracetamol 490 (sebelumnya 500)")]),
    ("4.7 Invoice", "Kasir membentuk invoice yang menggabungkan empat sumber biaya dan mengunci kunjungan.",
     [("25-belum-ditagih", "Kunjungan muncul di Belum Ditagih"), ("26-dialog-buat-invoice-peringatan", "Dialog validasi kunjungan; semua order sudah selesai"), ("27-invoice-terbentuk-belum-dibayar", "Invoice terbentuk, status Belum Dibayar"), ("28-detail-invoice-4-sumber", f"Rincian biaya: total {rp(total_inv)}")]),
    ("4.8 Pembayaran bertahap", f"Kasir membayar sebagian secara tunai, lalu melunasi sisanya secara non-tunai. Ada {len(bayar)} pembayaran: " + "; ".join(f"{b[0]} {b[1]} {rp(b[2])}" for b in bayar) + ".",
     [("29-dialog-bayar", "Dialog Catat Pembayaran"), ("30-bayar-sebagian-tunai", "Pembayaran tunai Rp 100.000"), ("31-status-dibayar-sebagian", "Status Dibayar Sebagian"), ("32-bayar-sisa-non-tunai", "Lunasi sisa, non-tunai, nomor referensi QRIS"), ("33-status-lunas", "Status Lunas"), ("34-riwayat-pembayaran", "Riwayat pembayaran")]),
    ("4.9 Invoice dan bukti pembayaran", "Dokumen cetak (tombol Cetak dan Export PDF).",
     [("35-bukti-bayar-cetak", "Bukti pembayaran"), ("36-invoice-cetak-lunas", "Invoice berstatus Lunas")]),
    ("4.10 Hasil akhir", "Riwayat medis menyatukan seluruh hasil. Kunjungan berstatus Selesai otomatis setelah lunas.",
     [("37-riwayat-medis-pasien", "Riwayat rekam medis pasien"), ("38-kunjungan-selesai-setelah-lunas", "Antrean tidak lagi menampilkan kunjungan yang sudah lunas"), ("39-dashboard-hari-ini", "Dashboard memuat kunjungan, tindakan, dan pendapatan hari ini")]),
]
bab4 = "".join(f'<section class="part"><h3 class="h3big">{e(t)}</h3><p>{e(n)}</p>' + "".join(F(f, c) for f, c in shots) + "</section>" for t, n, shots in tahap)

# ---------- bab lain ----------
decisions = table(["Keputusan", "Alasan", "Lokasi / bukti"], [
    ["Yii sebagai satu-satunya penulis data transaksi", "Aturan bisnis, transaksi lintas tabel, dan migrasi hanya di satu tempat, sehingga tidak ada duplikasi logic.", "<code>docs/yii-vs-node.md</code>"],
    ["Node hanya integrasi dan dashboard read-only (<code>simrs_readonly</code>)", "Mustahil mengubah data transaksi dari Node; query laporan berat tidak membebani Yii.", "Bab 2.4, D.6"],
    ["JWT HS256 diterbitkan Yii, diverifikasi Node", "Satu login untuk dua layanan tanpa menyimpan sesi.", "Bab 2.2"],
    ["Outbox transaksional untuk hasil lab", "Hasil tidak hilang saat Yii tidak terjangkau; retry berjeda bertambah.", "D.5, <code>t_integration_outbox</code>"],
    ["<code>Idempotency-Key</code> pada pembayaran dan hasil lab", "Retry jaringan atau klik ganda tidak menggandakan data.", "D.3, D.5"],
    ["Constraint PostgreSQL sebagai pengaman terakhir", "Unique, check, dan foreign key menjaga data walau lapisan aplikasi gagal.", "Bab 6.3"],
    ["Snapshot tarif dan harga saat transaksi", "Perubahan master tidak mengubah tagihan lama.", "Bab 5.5, 5.6"],
    ["Valid / Unvalid oleh kasir dan item tagihan void", "Perubahan klinis setelah billing tetap konsisten dan dapat ditelusuri.", "D.4, <code>t_audit_log</code>"],
    ["Soft delete pada master", "Riwayat transaksi tetap utuh walau master dihapus.", "<code>deleted_at</code>"],
    ["Paginasi server, index, OPcache", "Respons tetap cepat saat data bertambah.", "D.6"],
    ["Docker Compose", "Instalasi seragam di mesin evaluator.", "Bab 9"]])

yvn = table(["Aspek", "backend-yii", "service-node"], [
    ["Migrasi database", "Pemilik tunggal (<code>backend-yii/migrations/</code>)", "Tidak mengelola migrasi"],
    ["Autentikasi dan RBAC", "Menerbitkan JWT, kelola user, role, menu, hak akses", "Memverifikasi JWT, memeriksa izin dashboard, menerima X-Api-Key"],
    ["Master data", "CRUD lengkap dan soft delete", "Hanya membaca untuk join laporan"],
    ["Transaksi pelayanan", "Pendaftaran, EMR, tindakan, resep, farmasi, lab, billing, pembayaran, audit log", "Tidak menulis tabel transaksi"],
    ["Integrasi lab", "Endpoint idempoten <code>PUT /transaction/hasil-lab/{id}</code>, hitung flag", "Menerima push eksternal, validasi, forward ke Yii, outbox, retry"],
    ["Dashboard", "Tidak menanggung agregasi berat", "7 endpoint agregasi lewat <code>simrs_readonly</code>"]])

diag_flow = f"""<p>Urutan nyata satu kunjungan, dari pendaftaran sampai pembayaran:</p>{ol([
    "React mengirim <code>POST /transaction/pendaftaran</code> ke Yii; Yii mengunci jadwal dan nomor antrean, lalu menulis <code>t_kunjungan</code> ke PostgreSQL.",
    "Dokter menyimpan pemeriksaan, diagnosis, tindakan, resep, dan order lab lewat Yii; Yii menyalin tarif dan harga dan mencatat audit log.",
    "Hasil lab diinput petugas lewat Yii, atau dikirim sistem eksternal ke Node (<code>POST /api/lab/results</code>); Node meneruskan ke Yii dan memakai outbox bila Yii gagal.",
    "Farmasi memproses resep lewat Yii; Yii mengunci obat, mengurangi stok, dan mencatat mutasi.",
    "Kasir membentuk invoice dan mencatat pembayaran lewat Yii dengan <code>Idempotency-Key</code>.",
    "Dashboard di React memanggil Node; Node membaca PostgreSQL sebagai <code>simrs_readonly</code> dan mengembalikan agregasi."])}"""

install = f"""{ol(["<code>git clone https://github.com/maeshataruna99-lgtm/simrs-rawat-jalan</code> lalu masuk ke direktorinya.", "Salin konfigurasi: <code>cp .env.example .env</code> (PowerShell: <code>Copy-Item .env.example .env</code>); ubah <code>JWT_SECRET</code> (minimal 32 karakter) dan <code>LAB_API_KEYS</code> bila perlu.",
    "<code>docker compose up -d --build</code> menjalankan PostgreSQL, Yii, Node, dan React.", "<code>docker compose exec -T yii php yii migrate --interactive=0</code> lalu <code>docker compose exec -T yii php yii seed</code>.", "<code>docker compose exec -T yii php yii cache/flush-schema db --interactive=0</code>.",
    "Atau satu langkah reset dan seed ulang: <code>sh scripts/reset-db.sh</code> (hanya untuk lingkungan dev)."])}
{table(["Layanan", "URL"], [["Frontend React", "http://localhost:5173"], ["Backend Yii2", "http://localhost:8080"], ["Service Node.js", "http://localhost:3000 (dokumen OpenAPI di /openapi.yaml)"], ["PostgreSQL", "localhost:5432 (database simrs dan simrs_test)"]])}
<h4>Akun dummy (hasil seed, password <code>simrs123</code>)</h4>{table(["Username", "Role"], [["admin", "Administrator"], ["pendaftaran", "Petugas Pendaftaran"], ["dokter", "Dokter (DR001 dr. Budi Santoso)"], ["farmasi", "Petugas Farmasi"], ["laboratorium", "Petugas Laboratorium"], ["kasir", "Kasir"]])}"""

tc_text = open(os.path.join(ROOT, "docs", "test-cases.md"), encoding="utf-8").read()
tc_rows = []
for line in tc_text.splitlines():
    c = [x.strip() for x in line.strip().strip("|").split("|")]
    if line.startswith("| TC-") and len(c) >= 5:
        tc_rows.append([e(c[0]), md(c[1]), md(c[3]), c[4] if c[4] else "Lulus"])
testcases = table(["ID", "Skenario", "Hasil yang diharapkan", "Status"], tc_rows, "small")

perf_table = table(["Query dashboard", "Sebelum index", "Sesudah index", "Perbaikan"], [
    ["Kunjungan per poli (7 hari)", "2,734 ms", "1,090 ms", "2,5x"], ["Pendapatan per hari (7 hari)", "9,991 ms (Seq Scan)", "1,495 ms (Index Scan)", "6,7x"],
    ["Invoice belum dibayar", "6,843 ms (Seq Scan)", "0,635 ms (Index Scan)", "10,8x"], ["Tindakan terbanyak (7 hari)", "scan kunjungan 3,850 ms", "scan kunjungan 0,449 ms", "8,6x pada scan"]])
perf_api = table(["Endpoint Yii", "Median sebelum", "Median sesudah", "p95 sebelum", "p95 sesudah"], [
    ["Antrean poli", "1.484 ms", "225 ms", "3.170 ms", "363 ms"], ["Worklist pemeriksaan", "500 ms", "236 ms", "3.168 ms", "264 ms"], ["Worklist laboratorium", "551 ms", "272 ms", "3.175 ms", "374 ms"],
    ["Antrean farmasi", "546 ms", "262 ms", "2.056 ms", "331 ms"], ["Daftar invoice", "286 ms", "214 ms", "1.468 ms", "304 ms"], ["Master pasien", "322 ms", "185 ms", "1.380 ms", "232 ms"]])


bab7 = chapter("7. Skenario teknis D.1 sampai D.6", "<p>Instruksi D meminta analisis dan implementasi penanganan tiap kondisi. Setiap skenario berikut memuat masalah, solusi berlapis, lokasi kode, dan bukti. Sumber: <code>docs/technical-scenarios.md</code>.</p>"
    + dscen(1, T("konkurensi-pendaftaran", "Bukti D.1: 10 pendaftaran paralel pasien sama, 1 sukses dan 9 ditolak 409; nomor antrean unik"))
    + dscen(2, T("konkurensi-stok-obat", "Bukti D.2: dua resep berebut stok, satu sukses, satu 409, stok akhir 0") + X("r1-resep-melebihi-stok-ditolak", "Validasi stok di UI saat membuat resep"))
    + dscen(3, T("konkurensi-pembayaran", "Bukti D.3 dan D.4: lima percobaan key sama hanya mencatat satu pembayaran; revisi tagihan dan audit log"))
    + dscen(4, F("28-detail-invoice-4-sumber", "Rincian invoice dan audit log perubahan pada dialog Detail"))
    + dscen(5, T("D5-outbox-retry", "Bukti D.5: Yii dimatikan, hasil lab masuk outbox (pending), lalu terkirim otomatis setelah Yii hidup; kirim ulang key yang sama dijawab 200 tanpa duplikasi"))
    + dscen(6, "<h4>Hasil pengukuran</h4><p>EXPLAIN (ANALYZE, BUFFERS) pada data besar, dari <code>docs/performance.md</code>:</p>" + perf_table + "<p>Latensi API Yii sebelum dan sesudah optimasi:</p>" + perf_api
            + T("D6-performa", "Bukti D.6: benchmark API, daftar index aktif, dan EXPLAIN memakai index")))




checklist = table(["Butir instruksi", "Status", "Lokasi bukti"], [
    ["A. Stack: React, Yii, Node.js, PostgreSQL, Postman, Git", "Terpenuhi", "Bab 2.1"],
    ["B.1 Master data (CRUD, cari, validasi, cegah duplikasi)", "Terpenuhi", "Bab 5.2"],
    ["B.2 Pendaftaran dan antrean", "Terpenuhi", "Bab 4.1, 5.3"], ["B.3 Pemeriksaan dan rekam medis", "Terpenuhi", "Bab 4.2, 5.4"], ["B.4 Tindakan medis", "Terpenuhi", "Bab 4.3, 5.5"],
    ["B.5 Farmasi dan resep", "Terpenuhi", "Bab 4.4, 4.6, 5.6"], ["B.6 Pemeriksaan penunjang dan API Node", "Terpenuhi", "Bab 4.5, 5.7, 5.10"],
    ["B.7 Billing, pembayaran bertahap, invoice dan bukti bayar", "Terpenuhi", "Bab 4.7 sampai 4.9, 5.8"], ["B.8 Dashboard dan laporan dari API Node", "Terpenuhi", "Bab 5.9"], ["B.9 Autentikasi dan otorisasi 6 role", "Terpenuhi", "Bab 3.5, 5.1"],
    ["C. Backend services Node.js (REST, middleware, error, dokumentasi, penjelasan komunikasi)", "Terpenuhi", "Bab 2.2 sampai 2.4, 5.10"], ["D.1 sampai D.6 skenario teknis", "Terpenuhi (bukti uji dan implementasi)", "Bab 7"],
    ["F.2 Skema, ERD, migrasi", "Terpenuhi", "Bab 6; <code>database/</code>, <code>backend-yii/migrations/</code>"], ["F.3 Diagram arsitektur, alur komunikasi, endpoint, instalasi, keputusan teknis", "Terpenuhi", "Bab 2, 9; <code>docs/api/</code>"],
    ["F.4 Screenshot, bukti alur pendaftaran sampai pembayaran, invoice, bukti Node", "Terpenuhi", "Bab 4, 5.10"], ["F.5 Test case, bukti Postman, unit dan integration test", "Terpenuhi", "Bab 8"],
    ["Bonus: export PDF dan Excel, filter laporan, UI rapi", "Ada", "Bab 5.8, 5.9"]])

def row(sec, butir, lokasi, status="Terpenuhi"): return [e(sec), butir, status, lokasi]


kes_rows = [
    row("A", "Aplikasi SIMRS rawat jalan dari pendaftaran sampai pembayaran, alur terintegrasi, data terstruktur, hak akses per tanggung jawab", "Bab 1, 3, 4"),
    row("A", "Frontend React.js; backend utama Yii1/Yii2; backend services Node.js; database PostgreSQL; Postman; Git", "Bab 2.1"),
    row("B.1", "Data pasien dan No. RM; dokter dan tenaga medis; poli; jadwal praktik; tindakan dan tarif; obat, stok, harga", "Bab 5.2"),
    row("B.1", "Tambah, lihat, ubah, hapus; pencarian dan filter; validasi input; pencegahan duplikasi", "Bab 5.2 (bukti 3)"),
    row("B.2", "Cari pasien berdasarkan No. RM atau identitas; daftarkan kunjungan; pilih poli dan dokter sesuai jadwal", "Bab 4.1, 5.3"),
    row("B.2", "Nomor antrean otomatis; status antrean; riwayat kunjungan pasien", "Bab 4.1, 5.3"),
    row("B.3", "Daftar pasien menunggu; anamnesis dan keluhan; tanda vital; pemeriksaan fisik; diagnosis utama dan sekunder; simpan ke riwayat rekam medis", "Bab 4.2, 5.4"),
    row("B.4", "Pilih tindakan dari master dengan tarif; lebih dari satu tindakan per kunjungan; tindakan menjadi komponen tagihan", "Bab 4.3, 5.5"),
    row("B.5", "Resep (obat, dosis, frekuensi, jumlah); validasi stok; proses dan serahkan obat; stok berkurang setelah penyerahan; riwayat penggunaan obat", "Bab 4.4, 4.6, 5.6"),
    row("B.6", "Permintaan lab oleh dokter; daftar permintaan untuk petugas lab; input hasil; hasil dapat dibaca dokter lewat riwayat kunjungan", "Bab 4.5, 5.7"),
    row("B.6", "Layanan API untuk komunikasi atau integrasi data pemeriksaan penunjang", "Bab 5.7, 5.10, Lampiran A"),
    row("B.7", "Tagihan gabungan: biaya pendaftaran, tindakan, penunjang, obat; total otomatis; rincian biaya", "Bab 4.7, 5.8"),
    row("B.7", "Pembayaran tunai dan non-tunai (simulasi); status belum dibayar, dibayar sebagian, lunas; pembayaran bertahap; riwayat pembayaran", "Bab 4.8, 5.8"),
    row("B.7", "Cegah pembayaran ganda; invoice dan bukti pembayaran dapat dicetak", "Bab 4.9, 7 (D.3)"),
    row("B.8", "Dashboard: jumlah kunjungan, per poli, tindakan, pendapatan, rekap obat, status pembayaran; filter periode; rincian data; data dari API backend", "Bab 4.10, 5.9"),
    row("B.9", "Autentikasi dan otorisasi untuk Administrator, Petugas Pendaftaran, Dokter, Petugas Farmasi, Petugas Laboratorium, Kasir", "Bab 3.5, 5.1"),
    row("C.1", "REST API untuk komunikasi dengan layanan pemeriksaan penunjang atau sistem eksternal", "Bab 5.7, 5.10, Lampiran A"),
    row("C.2", "API untuk kebutuhan dashboard atau layanan pendukung", "Bab 5.9, 5.10, Lampiran A"),
    row("C.3", "Middleware validasi request dan autentikasi", "Bab 5.10, 2.6"),
    row("C.4", "Error handling dan format respons konsisten", "Bab 2.4, 5.10"),
    row("C.5", "Dokumentasi endpoint API", "Lampiran A; <code>service-node/openapi.yaml</code>"),
    row("C", "Penjelasan komunikasi Node dengan Yii dan database; pembagian tanggung jawab data dan business logic", "Bab 2.2 sampai 2.4"),
    row("D.1", "Duplikasi pendaftaran: cegah kunjungan dan nomor antrean ganda", "Bab 7 (D.1)"),
    row("D.2", "Konkurensi stok obat: stok tidak minus", "Bab 7 (D.2)"),
    row("D.3", "Pembayaran ganda saat gangguan jaringan", "Bab 7 (D.3)"),
    row("D.4", "Perubahan diagnosis atau tindakan setelah billing; tagihan konsisten dan riwayat perubahan dapat ditelusuri", "Bab 7 (D.4)"),
    row("D.5", "Gangguan integrasi: tanpa kehilangan atau ketidaksesuaian data", "Bab 7 (D.5)"),
    row("D.6", "Performa: optimasi query, pengambilan data, respons API", "Bab 7 (D.6)"),
    row("E.1", "Yii1 atau Yii2 untuk backend utama dan business logic", "Bab 2.1 (Yii 2.0.55)"),
    row("E.2", "React.js untuk frontend", "Bab 2.1, seluruh screenshot"),
    row("E.3", "Node.js untuk backend services dan API pendukung", "Bab 2.1, 5.10"),
    row("E.4", "PostgreSQL sebagai database utama", "Bab 2.1, 6"),
    row("E.5", "Komunikasi antarbagian melalui REST API", "Bab 2.2, 2.3, Lampiran A"),
    row("E.6", "Autentikasi, otorisasi, dan validasi data", "Bab 3.5, 5.1, aturan validasi tiap modul"),
    row("E.7", "Postman untuk pengujian API", "Bab 8.2"),
    row("E.8", "Git untuk pengelolaan source code", "Repo publik GitHub: github.com/maeshataruna99-lgtm/simrs-rawat-jalan"),
    row("E.9", "Library atau package pendukung yang relevan", "Lampiran B"),
    row("E.10", "Penjelasan pembagian tanggung jawab Yii dan Node.js (tanpa duplikasi logic dan inkonsistensi data)", "Bab 2.4"),
    row("F.1", "Source code Yii, React, Node.js, repository Git yang dapat diakses", "Bab 2.6; repo publik GitHub"),
    row("F.2", "Skema dan relasi tabel; ERD; file migrasi atau SQL instalasi", "Bab 6; <code>database/schema.sql</code>, <code>backend-yii/migrations/</code>"),
    row("F.3", "Diagram arsitektur; alur komunikasi React, Yii, Node, PostgreSQL; dokumentasi endpoint; petunjuk instalasi; keputusan teknis", "Bab 2, 9, Lampiran A"),
    row("F.4", "Screenshot aplikasi; bukti alur pendaftaran sampai pembayaran; bukti invoice atau struk; bukti backend Node.js", "Bab 4, 5, 5.10"),
    row("F.5", "Test case fitur utama; bukti Postman; unit atau integration test transaksi penting", "Bab 8"),
    row("G", "Data dummy untuk pengujian", "Hasil <code>php yii seed</code> (bab 9)"),
    row("Catatan", "Alur sistem dan logika pemrograman", "Bab 3, 4, 7"),
    row("Catatan", "Kerapihan struktur kode", "Bab 2.6"),
    row("Catatan", "Prinsip CRUD dan autentikasi", "Bab 5.1, 5.2"),
    row("Bonus", "Export PDF, filter laporan, UI rapi", "Bab 5.11")]
checklist_full = table(["Butir", "Persyaratan instruksi", "Status", "Lokasi bukti"], kes_rows, "small")
bab10 = chapter("10. Kesesuaian dengan instruksi Real Case Test", checklist_full + "<h3>Catatan</h3>" + ul([
    "Postman dijalankan lewat Postman CLI dan Newman (baris perintah); collection dan environment dapat diimpor ke aplikasi Postman.",
    "Bukti D.1 sampai D.4 berupa skrip konkurensi yang memanggil API; bukti D.5 berupa demonstrasi langsung dengan mematikan Yii.",
    "Seluruh data berupa data dummy hasil seed.", "Pengumpulan (G): kirim ke inovamedika.career@gmail.com dengan subjek <code>Senior Programmer_Pengumpulan Real Case Test_&lt;Nama Lengkap&gt;</code>.",
    "Diagram arsitektur dan workflow digambar sebagai SVG; ERD digambar dari <code>database/erd.md</code>."]))
lampiran = (chapter("Lampiran A. Dokumentasi endpoint API", "<p>Kutipan lengkap <code>docs/api/yii.md</code> dan <code>docs/api/node.md</code>. Spesifikasi OpenAPI service Node: <code>service-node/openapi.yaml</code> (juga di <code>http://localhost:3000/openapi.yaml</code>).</p><h3>A.1 Backend Yii2</h3>" + api_doc("docs/api/yii.md") + "<h3>A.2 Service Node.js</h3>" + api_doc("docs/api/node.md"))
            + chapter("Lampiran B. Library dan package pendukung (E.9)", pustaka))

stack = table(["Komponen", "Syarat soal", "Yang dipakai", "Bukti"], [
    ["Frontend", "React.js", "React 19.3, TypeScript 6, Vite 8, Tailwind CSS 3, shadcn/ui, Zustand", "<code>frontend-react/package.json</code>"],
    ["Backend utama / SIMRS", "Yii1 atau Yii2", "Yii 2.0.55, PHP 8.3.37", "keluaran <code>yii version</code>"],
    ["Backend services / API", "Node.js", "Node 24, Express 5.3, TypeScript, Zod 4, pg 8, jsonwebtoken", "keluaran <code>npm ls</code>"],
    ["Database", "PostgreSQL", "PostgreSQL 16.15", "keluaran <code>select version()</code>"],
    ["API testing", "Postman", "Collection + environment; dijalankan dengan Postman CLI 1.93.1 dan Newman", "bab 8.2"],
    ["Version control", "Git", "Git; repo GitHub; commit konvensional (commitlint, husky)", "<code>git remote -v</code>"],
    ["Orkestrasi", "(tambahan)", "Docker Compose, 4 kontainer", "tabel docker compose ps di bab 5.10"]])

def L(target, text): return f'<a href="#{target}">{text}</a>'


peta_rows = [
    ["A. Instruksi Pengerjaan", "Stack wajib dan bukti penggunaannya", L("bab-2", "Bab 2.1") + ", " + L("bab-1", "Bab 1")],
    ["B. Ruang Lingkup Pengembangan, 1. Pengelolaan Master Data (Yii)", "Master data, CRUD, pencarian, validasi, duplikasi", L("m-5-2", "Bab 5.2")],
    ["B.2 Pendaftaran dan Antrean Pasien (Yii dan React.js)", "Pendaftaran, nomor antrean, status, riwayat", L("m-5-3", "Bab 5.3") + ", " + L("bab-4", "Bab 4.1")],
    ["B.3 Pemeriksaan dan Rekam Medis Elektronik (Yii dan React.js)", "Anamnesis, tanda vital, fisik, diagnosis", L("m-5-4", "Bab 5.4")],
    ["B.4 Tindakan Medis (Yii dan React.js)", "Tindakan, tarif, komponen tagihan", L("m-5-5", "Bab 5.5")],
    ["B.5 Farmasi dan Resep Obat (Yii dan React.js)", "Resep, validasi stok, penyerahan, riwayat obat", L("m-5-6", "Bab 5.6")],
    ["B.6 Pemeriksaan Penunjang (Yii, React.js, dan Node.js)", "Order lab, hasil, API integrasi", L("m-5-7", "Bab 5.7")],
    ["B.7 Billing dan Pembayaran (Yii dan React.js)", "Invoice, pembayaran bertahap, cetak", L("m-5-8", "Bab 5.8")],
    ["B.8 Dashboard dan Laporan (React.js, Yii, dan Node.js)", "Dashboard, filter periode, rincian", L("m-5-9", "Bab 5.9")],
    ["B.9 Pengelolaan Pengguna dan Hak Akses (Yii dan React.js)", "Login, enam role, otorisasi", L("m-5-1", "Bab 5.1")],
    ["C. Pengembangan Backend Services (Node.js)", "REST API, middleware, error handling, dokumentasi", L("m-5-10", "Bab 5.10") + ", " + L("lampiran-a", "Lampiran A")],
    ["D. Skenario Permasalahan Teknis", "D.1 sampai D.6", L("bab-7", "Bab 7")],
    ["E. Ketentuan Teknis", "E.1 sampai E.10", L("bab-e", "Bab E")],
    ["F. Output Pengerjaan", "Source code, database, dokumentasi teknis, hasil implementasi, pengujian", L("bab-10", "Bab 10") + ", " + L("bab-6", "Bab 6") + ", " + L("bab-4", "Bab 4") + ", " + L("bab-8", "Bab 8")],
    ["G. Ketentuan Pengerjaan", "Data dummy, pengumpulan", L("bab-9", "Bab 9") + ", " + L("bab-10", "Bab 10")]]
peta = chapter("Peta Instruksi A sampai G", "<p>Judul pada tabel mengikuti dokumen instruksi. Klik tautan untuk membuka bagian terkait.</p>" + table(["Bagian instruksi", "Isi", "Lokasi di dokumen ini"], peta_rows, "small"))

e_rows = [
    ["E.1", "Gunakan Yii1 atau Yii2 untuk backend utama dan business logic SIMRS.", "Yii 2.0.55 pada PHP 8.3. Seluruh business logic dan penulisan data transaksi ada di <code>backend-yii</code>.", L("bab-2", "Bab 2.1") + " (keluaran <code>yii version</code>)"],
    ["E.2", "Gunakan React.js untuk frontend aplikasi.", "React 19.3, TypeScript, Vite. Seluruh antarmuka ada di <code>frontend-react</code>.", L("bab-2", "Bab 2.1") + ", " + L("bab-4", "Bab 4")],
    ["E.3", "Gunakan Node.js untuk backend services dan API pendukung.", "Express 5 dan TypeScript: integrasi hasil lab (outbox + retry) dan API dashboard read-only di <code>service-node</code>.", L("m-5-10", "Bab 5.10")],
    ["E.4", "Gunakan PostgreSQL sebagai database utama.", "PostgreSQL 16.15, 30 tabel, constraint dan index pengaman.", L("bab-6", "Bab 6")],
    ["E.5", "Terapkan komunikasi antarbagian sistem melalui REST API.", "React ke Yii, React ke Node, Node ke Yii, dan sistem lab eksternal ke Node, semuanya REST JSON.", L("bab-2", "Bab 2.2, 2.3") + ", " + L("lampiran-a", "Lampiran A")],
    ["E.6", "Terapkan autentikasi, otorisasi, dan validasi data.", "JWT HS256 dan hak akses per menu untuk 6 role; validasi di server Yii, Zod di Node, dan form React Hook Form dengan Zod.", L("m-5-1", "Bab 5.1") + ", " + L("bab-3", "Bab 3.5")],
    ["E.7", "Gunakan Postman untuk melakukan pengujian API.", "Collection 35 request, 45 assertion, dijalankan dengan Postman CLI 1.93.1 dan Newman, 0 gagal.", L("bab-8", "Bab 8.2")],
    ["E.8", "Gunakan Git untuk pengelolaan source code.", "Repository publik GitHub <code>github.com/maeshataruna99-lgtm/simrs-rawat-jalan</code>; Conventional Commits dengan commitlint dan husky; CI GitHub Actions.", L("bab-2", "Bab 2.6")],
    ["E.9", "Diperbolehkan menggunakan library atau package pendukung yang relevan.", "Daftar paket Yii, Node, dan React beserta versi dan fungsinya.", L("lampiran-b", "Lampiran B")],
    ["E.10", "Wajib menjelaskan pembagian tanggung jawab antara Yii dan Node.js agar tidak terjadi duplikasi business logic maupun inkonsistensi data.", "Yii satu-satunya penulis data transaksi dan pemilik business logic dan migrasi; Node hanya integrasi dan agregasi read-only lewat <code>simrs_readonly</code>. Matriks lengkap di bawah.", L("bab-2", "Bab 2.4")]]
babE = chapter("E. Ketentuan Teknis", "<p>Sepuluh ketentuan teknis pada instruksi beserta pemenuhannya.</p>" + table(["No", "Ketentuan pada instruksi", "Pemenuhan", "Bukti"], e_rows, "small")
               + "<h3>E.1 sampai E.4 dan E.9: teknologi yang dipakai</h3>" + stack + "<h3>E.10: pembagian tanggung jawab Yii dan Node.js</h3>" + yvn
               + "<p>Duplikasi logic dicegah: flag lab dan status order hanya dihitung di Yii; tagihan dan revisi billing hanya di Yii; Node hanya meneruskan dan menjumlahkan kolom snapshot. Kedua layanan memakai format respons yang sama.</p>")


css = """@page { size: A4; margin: 15mm 13mm 16mm 13mm; }
body { font: 9.8pt/1.5 'Segoe UI', Arial, sans-serif; color:#1a1a1a; }
h1 { font-size: 27pt; margin: 0 0 4mm; } h2 { font-size: 15pt; margin: 0 0 3mm; border-bottom: 2px solid #0f9d6e; padding-bottom: 2mm; }
h3 { font-size: 10.5pt; margin: 4mm 0 1.5mm; color:#0b6e4d; break-after: avoid; } h3.h3big { font-size: 13pt; border-bottom: 1px solid #0f9d6e; padding-bottom: 1mm; } h4 { margin: 3mm 0 1mm; font-size: 9.5pt; break-after: avoid; }
.tag { font-size: 8.5pt; background:#e6f6ef; color:#0b6e4d; padding: 1px 7px; border-radius: 9px; vertical-align: middle; margin-left: 6px; }
section.module, section.part, section.chapter { break-before: page; }
.cover { height: 255mm; display:flex; flex-direction:column; justify-content:center; } .cover .sub { font-size: 13pt; color:#444; margin-bottom: 10mm; } .cover .meta { color:#555; }
table { width:100%; border-collapse: collapse; margin: 2mm 0; font-size: 8.8pt; } th { background:#0f9d6e; color:#fff; text-align:left; padding: 3px 6px; } td { border-bottom:1px solid #ddd; padding: 3px 6px; vertical-align: top; } tr { break-inside: avoid; }
table.small { font-size: 7.8pt; } table.small td:first-child { white-space: nowrap; } table.rbac td, table.rbac th { text-align:center; font-size: 8pt; } table.rbac td:first-child, table.rbac th:first-child { text-align:left; }
code { background:#f1f3f5; padding: 0 3px; border-radius: 3px; font: 8.4pt Consolas, monospace; }
ul, ol { margin: 0 0 0 5mm; padding-left: 4mm; } li { margin-bottom: 1mm; }
figure { margin: 3mm 0; break-inside: avoid; } figcaption { font-size: 8.5pt; color:#555; margin-top: 1mm; }
img { width: 100%; border: 1px solid #ccc; border-radius: 3px; } figure.app img { max-height: 100mm; object-fit: contain; object-position: top; background:#fafafa; } figure.term img { max-height: 190mm; object-fit: contain; }
.note { color:#555; font-style: italic; } .toc li { margin-bottom: 1.6mm; font-size: 10.5pt; }
.sm { margin: 2mm 0; } .smlbl { font-weight: 700; font-size: 9pt; margin-bottom: 1mm; } .chip { display:inline-block; background:#e6f6ef; border:1px solid #0f9d6e; border-radius: 10px; padding: 1px 9px; font-size: 8.8pt; } .arr { margin: 0 4px; color:#555; } .smnote { font-size: 8.5pt; color:#555; margin: 0 0 2mm; }
.entgrid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; } .ent { border:1px solid #94a3b8; border-radius: 4px; font-size: 6.8pt; break-inside: avoid; } .entname { background:#0f9d6e; color:#fff; font-weight:700; padding: 2px 5px; font-size: 7.6pt; }
.col { display:flex; gap: 3px; padding: 1px 5px; border-top: 1px solid #eef2f7; } .col span { flex: 1; font-weight: 600; } .col i { color:#64748b; font-style: normal; } .col b { width: 14px; font-size: 6pt; } b.PK { color:#b45309; } b.FK { color:#1d4ed8; } b.UK { color:#7e22ce; }
.svgwrap { margin: 3mm 0; break-inside: avoid; } a { color:#0b6e4d; text-decoration: none; } .toc a { color:#1a1a1a; } .rolegrid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; break-inside: avoid; } .rolegrid figure { margin: 0; } .rolegrid img { max-height: none; } pre { background:#f1f3f5; padding: 2mm; font-size: 7.5pt; overflow:hidden; white-space: pre-wrap; break-inside: avoid; } pre code { background:none; font-size: 7.5pt; }"""




doc = f"""<!doctype html><html lang="id"><head><meta charset="utf-8"><title>SIMRS Rawat Jalan - Module Guide and Proof</title><style>{css}</style></head><body>
<div class="cover"><h1>SIMRS Rawat Jalan</h1><div class="sub">Module Guide and Proof Book<br>Real Case Test Senior Programmer, PT Inova Medika Solusindo</div>
<div class="meta">Tanggal bukti: 24 November 2026<br>Repository: github.com/maeshataruna99-lgtm/simrs-rawat-jalan<br>Seluruh data dan screenshot dihasilkan setelah reset total dan seed ulang database.<br>Satu pasien ({e(nama_px)}, {e(rm_px)}) diikuti dari pendaftaran sampai lunas lewat antarmuka.</div></div>

<section class="part"><h2>Daftar Isi</h2><ol class="toc"><li><a href="#peta">Peta Instruksi A sampai G</a></li><li><a href="#bab-1">Fungsi proyek</a></li><li><a href="#bab-2">Stack dan arsitektur (Poin A, F.3), struktur kode</a></li><li><a href="#bab-e">E. Ketentuan Teknis (E.1 sampai E.10)</a></li><li><a href="#bab-3">Workflow pelayanan: diagram alur, status, hak akses</a></li><li><a href="#bab-4">Bukti alur satu pasien dari pendaftaran sampai lunas (F.4)</a></li><li><a href="#bab-5">Panduan dan bukti per modul (B.1 sampai B.9, C, bonus)</a></li><li><a href="#bab-6">Database: ERD, constraint, migrasi (F.2)</a></li><li><a href="#bab-7">Skenario teknis D.1 sampai D.6</a></li><li><a href="#bab-8">Pengujian: test case, Postman, unit dan konkurensi (F.5)</a></li><li><a href="#bab-9">Instalasi dan konfigurasi</a></li><li><a href="#bab-10">Kesesuaian dengan instruksi (A sampai G)</a></li><li><a href="#lampiran-a">Lampiran A: dokumentasi endpoint API</a>; <a href="#lampiran-b">Lampiran B: library pendukung</a></li></ol></section>

{peta}

{chapter("1. Fungsi proyek", f'''<p>SIMRS Rawat Jalan adalah sistem informasi rumah sakit untuk mengelola seluruh perjalanan pasien rawat jalan, dari pendaftaran sampai pembayaran, dalam satu aplikasi terintegrasi.</p>
<h3>Masalah yang diselesaikan</h3>{ul(["Data pasien, jadwal dokter, tindakan, obat, dan tarif tersebar di banyak catatan terpisah. Sistem menyatukannya di satu database terstruktur.", "Antrean dan nomor antrean mudah ganda saat banyak petugas bekerja bersamaan. Sistem membuatnya atomik.",
 "Biaya dari pendaftaran, tindakan, laboratorium, dan obat sulit digabung. Sistem membentuk satu tagihan otomatis dan menghitung totalnya.", "Stok obat dan pembayaran rawan salah saat transaksi bersamaan atau jaringan terputus. Sistem memakai lock, idempotensi, dan constraint database.", "Perubahan data klinis setelah tagihan dibuat sulit ditelusuri. Sistem mengunci kunjungan dan mencatat audit log."])}
<h3>Pengguna dan peran</h3>{table(["Role", "Tugas dalam alur"], [["Petugas Pendaftaran", "Mencari pasien, mendaftarkan kunjungan, mengelola antrean"], ["Dokter", "Memeriksa pasien, diagnosis, tindakan, resep, order lab, membaca riwayat medis"], ["Petugas Farmasi", "Memproses dan menyerahkan resep, mengelola stok obat"], ["Petugas Laboratorium", "Mengerjakan order dan menginput hasil"], ["Kasir", "Membentuk invoice, mencatat pembayaran, mencetak invoice dan bukti bayar"], ["Administrator", "Mengelola master data, pengguna, hak akses, dan melihat seluruh modul"]])}
<h3>Fungsi utama</h3>{ul(["Master data: pasien dan No. RM, dokter, poli, jadwal, tindakan dan tarif, obat dan stok, master lab, ICD-10.", "Pelayanan: pendaftaran, antrean, pemeriksaan elektronik, tindakan, resep, farmasi, laboratorium.", "Keuangan: invoice dari empat sumber biaya, pembayaran tunai dan non-tunai bertahap, bukti bayar yang dapat dicetak.",
 "Pelaporan: dashboard kunjungan, tindakan, pendapatan, obat, dan status pembayaran dengan filter periode dan export.", "Keamanan: login JWT dan hak akses per menu untuk enam role.", "Integrasi: API Node.js untuk sistem laboratorium eksternal dengan antrean pengiriman ulang."])}''')}

{chapter("2. Stack dan arsitektur", f'''<h3>2.1 Teknologi yang dipakai (Poin A)</h3>{stack}{T("A-stack-versions", "Bukti stack: keluaran versi PHP, Yii, Node, PostgreSQL, Git, dan dependensi")}
<h3>2.2 Diagram arsitektur dan alur komunikasi</h3><div class="svgwrap">{arch_svg}</div>
<p>React berkomunikasi dengan Yii (seluruh operasi bisnis) dan dengan Node (dashboard) lewat REST JSON dan JWT. Yii menerbitkan JWT; Node memverifikasinya dengan secret yang sama. Sistem lab eksternal memanggil Node dengan <code>X-Api-Key</code>. Node meneruskan hasil lab ke Yii. Yii membaca dan menulis PostgreSQL dan memegang migrasi. Node menulis hanya <code>t_integration_outbox</code> dan membaca sisanya sebagai <code>simrs_readonly</code>.</p>
<h3>2.3 Alur komunikasi React, Yii, Node, PostgreSQL</h3>{diag_flow}
<h3>2.4 Pembagian tanggung jawab Yii dan Node.js (E.10)</h3>{yvn}<p>Duplikasi logic dicegah: flag lab dan status order hanya dihitung di Yii; tagihan dan revisi billing hanya di Yii; Node hanya meneruskan dan menjumlahkan kolom snapshot. Kedua layanan memakai format respons yang sama.</p>
<h3>2.5 Keputusan teknis</h3>{decisions}
<h3>2.6 Struktur kode dan kerapihan</h3>{struktur}''')}

{babE}

{chapter("3. Workflow pelayanan", f'''<h3>3.1 Diagram alur end-to-end</h3><p>Diagram menunjukkan urutan tahap, pelaku (warna), cabang paralel dari dokter (tindakan, resep, laboratorium), titik temu di kasir, dan alur revisi.</p><div class="svgwrap">{flow_svg}</div>
<h3>3.2 Penjelasan alur</h3>{ol(["<b>Pendaftaran.</b> Petugas mencari pasien atau membuat pasien baru, memilih poli, jadwal dokter, dan penjamin. Sistem membuat nomor kunjungan dan nomor antrean otomatis. Status: menunggu.", "<b>Panggil.</b> Petugas memanggil pasien dari Antrean Poli. Status: diperiksa.",
 "<b>Pemeriksaan.</b> Dokter mengisi anamnesis, tanda vital, pemeriksaan fisik, dan diagnosis utama serta sekunder. Hasil tersimpan di rekam medis.", "<b>Cabang dokter.</b> Dokter dapat menambah tindakan (tarif dari master), resep obat (stok divalidasi), dan order laboratorium. Ketiganya menjadi komponen tagihan.",
 "<b>Farmasi.</b> Petugas memproses resep lalu menyerahkannya; stok berkurang dan mutasi tercatat.", "<b>Laboratorium.</b> Petugas menginput hasil (atau sistem eksternal mengirim lewat Node); flag dihitung otomatis; order selesai.",
 "<b>Invoice.</b> Kasir membentuk invoice dari empat sumber biaya. Kunjungan menjadi Valid (terkunci) agar tagihan tidak berubah tanpa jejak.", "<b>Revisi.</b> Bila data klinis perlu diubah, kasir menekan Unvalid, dokter mengubah, tagihan tersinkron (item lama di-void dan tercatat di audit log), lalu Valid lagi.",
 "<b>Pembayaran.</b> Kasir mencatat pembayaran tunai atau non-tunai, dapat bertahap. Status: belum dibayar, dibayar sebagian, lunas.", "<b>Penutup.</b> Invoice dan bukti bayar dicetak. Saat lunas, kunjungan otomatis berstatus selesai. Dashboard membaca semua data lewat Node."])}
<h3>3.3 Status pada tiap entitas</h3>{states}
<h3>3.4 Peran dalam alur</h3>{table(["Tahap", "Pelaku", "Layar"], [["Pendaftaran, antrean", "Petugas Pendaftaran", "Pendaftaran Kunjungan, Antrean Poli"], ["Pemeriksaan, tindakan, resep, order lab", "Dokter", "Pemeriksaan Pasien, Riwayat Rekam Medis"], ["Penyerahan obat", "Petugas Farmasi", "Pelayanan Resep"], ["Hasil lab", "Petugas Laboratorium", "Pemeriksaan Laboratorium"], ["Invoice, pembayaran, cetak", "Kasir", "Tagihan dan Pembayaran"], ["Dashboard", "Semua role", "Dashboard"]])}
<h3>3.5 Matriks hak akses (dibaca dari database setelah seed)</h3><p>R = baca, C = tambah, U = ubah, D = hapus, tanda minus = tanpa akses.</p>{rbac}''')}

<section class="chapter" id="bab-4"><h2>4. Bukti alur satu pasien dari pendaftaran sampai lunas</h2>
<p>Skrip <code>scripts/proof/flow.py</code> menjalankan antarmuka secara nyata untuk pasien <b>{e(nama_px)} ({e(rm_px)})</b> setelah reset dan seed ulang: kunjungan <code>{e(no_kunj)}</code>, antrean <b>{e(antrean_txt)}</b>, invoice <code>{e(no_inv)}</code> bernilai <b>{rp(total_inv)}</b> (pendaftaran 25.000 + tindakan 105.000 + laboratorium 70.000 + obat 15.000), dibayar {len(bayar)} kali sampai lunas.</p></section>
{bab4}

<section class="chapter" id="bab-5"><h2>5. Panduan dan bukti per modul</h2><p>Setiap modul memuat tujuan, hak akses, langkah penggunaan sesuai layar aplikasi, endpoint, tabel, aturan validasi, lokasi kode, dan bukti.</p></section>
{"".join(mods)}

{chapter("6. Database", f'''<h3>6.1 Ringkasan</h3><p>30 tabel bisnis: prefix <code>m_</code> untuk master dan <code>t_</code> untuk transaksi. Semua tabel memakai kolom audit (<code>created_at</code>, <code>updated_at</code>, <code>created_by</code>, <code>updated_by</code>); master memakai soft delete. Skema dikelola oleh 26 migrasi Yii di <code>backend-yii/migrations/</code>; ekspor lengkap di <code>database/schema.sql</code>.</p>
<h3>6.2 Entity Relationship Diagram</h3><p>Diagram digambar dari definisi di <code>database/erd.md</code>. Tanda PK = primary key, FK = foreign key, UK = unique.</p>{erd_sections()}
<h3>6.3 Constraint dan index pengaman utama</h3>{table(["Skenario", "Tabel", "Pengaman di PostgreSQL"], constraint_rows, "small")}''')}

{bab7}

{chapter("8. Pengujian", f'''<h3>8.1 Ringkasan hasil</h3>{table(["Jenis", "Hasil (data seed bersih)"], [["PHPUnit (Yii, transaksi penting)", "134 test, 446 assertion, OK"], ["Vitest (Node, supertest + PostgreSQL)", "38 test lulus"], ["Vitest (React)", "78 test lulus"], ["Postman CLI 1.93.1", "35 request, 45 assertion, 0 gagal"], ["Newman", "35 request, 45 assertion, 0 gagal"], ["Konkurensi D.1 sampai D.4", "Semua skrip lulus"]])}
<h3>8.2 Pengujian API dengan Postman</h3><p>Koleksi <code>postman/simrs.collection.json</code> menjalankan alur penuh lewat API: kesehatan layanan, login, master, pendaftaran, pemeriksaan, tindakan, resep, farmasi, lab, billing, pembayaran bertahap, dashboard, dan kasus ditolak (401, 403, 409, 422). Dijalankan dengan Postman CLI:</p><pre><code>postman collection run postman/simrs.collection.json -e postman/local.environment.json</code></pre>{T("postman-cli", "Postman CLI: versi, request, dan ringkasan 35 request, 45 assertion, 0 gagal")}{T("postman-newman", "Hasil yang sama dengan Newman")}
<h3>8.3 Unit dan integration test</h3>{T("test-yii-phpunit", "PHPUnit (Yii)")}{T("test-node-vitest", "Vitest (Node): 38 test lulus. Baris stderr berasal dari test penanganan error yang sengaja memicu error 500 untuk memastikan pesan internal tidak bocor ke respons")}{T("test-react-vitest", "Vitest (React)")}
<h3>8.4 Daftar test case fitur utama</h3>{testcases}''')}

{chapter("9. Instalasi dan konfigurasi", install)}

{bab10}
{lampiran}
</body></html>"""

open(OUT_HTML, "w", encoding="utf-8").write(doc)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto("file:///" + OUT_HTML.replace("\\", "/"))
    pg.wait_for_load_state("networkidle")
    pg.pdf(path=OUT_PDF, format="A4", print_background=True, display_header_footer=True, header_template="<span></span>",
           footer_template="<div style='font-size:8px;width:100%;text-align:center;color:#777'>SIMRS Rawat Jalan - Module Guide and Proof - halaman <span class='pageNumber'></span> dari <span class='totalPages'></span></div>",
           margin={"top": "15mm", "bottom": "16mm", "left": "13mm", "right": "13mm"})
    b.close()
print(OUT_PDF)
