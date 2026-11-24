"""Ambil screenshot bukti: halaman aplikasi per role + bukti terminal (evidence/*.txt) dirender sebagai gambar."""
import html, os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "docs", "proof-book", "screenshots")
EVD = os.path.join(ROOT, "docs", "proof-book", "evidence")
APP = "http://localhost:5173"
os.makedirs(OUT, exist_ok=True)

PAGES = {  # role -> [(nama file, path)]
    "admin": [
        ("D-dashboard", "/dashboard"), ("M-user", "/system/user"), ("M-role", "/system/role"),
        ("M-role-access", "/system/role-access"), ("B1-pasien", "/master/pasien"), ("B1-dokter", "/master/dokter"),
        ("B1-poli", "/master/poli"), ("B1-jadwal", "/master/jadwal-dokter"), ("B1-tindakan", "/master/tindakan"),
        ("B1-obat", "/master/obat"), ("B1-lab", "/master/pemeriksaan-lab"), ("B1-icd10", "/master/icd10"),
    ],
    "pendaftaran": [("B2-pendaftaran", "/transaction/pendaftaran"), ("B2-antrean", "/transaction/antrean"),
                    ("RBAC-ditolak-billing", "/transaction/billing")],
    "dokter": [("B3-worklist-dokter", "/transaction/pemeriksaan"), ("B3-riwayat-medis", "/transaction/riwayat-medis"),
                       ("B3-B4-pemeriksaan-detail", "/transaction/pemeriksaan/59")],
    "farmasi": [("B5-farmasi", "/transaction/farmasi")],
    "laboratorium": [("B6-laboratorium", "/transaction/laboratorium")],
    "kasir": [("B7-billing", "/transaction/billing"), ("B7-invoice-cetak", "/transaction/billing/invoice/1/cetak"),
              ("B7-bukti-bayar-cetak", "/transaction/billing/pembayaran/1/cetak")],
}

def term(name, title):
    src = open(os.path.join(EVD, name + ".txt"), encoding="utf-8", errors="replace").read()
    src = re.sub(r"\x1b\[[0-9;]*m", "", src)
    lines = src.splitlines()
    if len(lines) > 70:
        lines = lines[:30] + ["...", f"({len(lines) - 60} baris di tengah dipotong; file lengkap: docs/proof-book/evidence/{name}.txt)", "..."] + lines[-30:]
    return (f"<body style='margin:0;background:#0d1117'><div style='background:#161b22;color:#8b949e;font:13px Segoe UI;padding:8px 14px'>{html.escape(title)}</div>"
            f"<pre style='margin:0;padding:14px;color:#c9d1d9;font:13px Consolas,monospace;white-space:pre'>{html.escape(chr(10).join(lines))}</pre></body>")

TERMS = [("A-stack-versions", "Bukti stack: versi PHP, Yii, Node, React, PostgreSQL, Git"),
         ("C-node-service", "Bukti layanan Node.js: health, dashboard, autentikasi, validasi"),
         ("B1-master-data", "Bukti data master di PostgreSQL"), ("B1-transaksi", "Bukti data transaksi di PostgreSQL"),
         ("db-counts-sebelum-reset", "Jumlah baris sebelum reset"), ("db-counts-sesudah-seed", "Jumlah baris sesudah reset dan seed ulang"),
         ("test-yii-phpunit", "PHPUnit (Yii2)"), ("test-node-vitest", "Vitest (Node.js)"), ("test-react-vitest", "Vitest (React)"),
         ("postman-newman", "Postman / Newman"), ("D5-outbox-retry", "D.5 gangguan integrasi: outbox dan retry"), ("D6-performa", "D.6 benchmark latensi API dan index"), ("postman-cli", "Postman CLI: collection run"), ("konkurensi-pendaftaran", "Konkurensi D.1"),
         ("konkurensi-stok-obat", "Konkurensi D.2"), ("konkurensi-pembayaran", "Konkurensi D.3 dan D.4")]

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, title in TERMS:
        pg = b.new_page(viewport={"width": 1280, "height": 400})
        pg.set_content(term(name, title))
        pg.screenshot(path=f"{OUT}/T-{name}.png", full_page=True)
        pg.close()
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page(); pg.goto(f"{APP}/login"); pg.wait_for_timeout(800)
    pg.screenshot(path=f"{OUT}/B9-login.png"); ctx.close()
    for role, pages in PAGES.items():
        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page(); pg.goto(f"{APP}/login")
        pg.fill("#username", role); pg.fill("#password", "simrs123"); pg.click("button[type=submit]")
        pg.wait_for_url(lambda u: "/login" not in u, timeout=15000)
        for fname, path in pages:
            pg.goto(APP + path); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1200)
            pg.screenshot(path=f"{OUT}/{fname}.png", full_page=True); print(role, fname, pg.url)
        ctx.close()
    b.close()
