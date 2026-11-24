"""Alur satu pasien lewat UI dari pendaftaran sampai lunas, dengan screenshot per langkah.
Pemakaian: python scripts/proof/flow.py [langkah ...]   (tanpa argumen = semua langkah berurutan)
Pasien diambil dari seed yang belum punya kunjungan hari ini (RM000041)."""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "docs", "proof-book", "screenshots", "flow")
APP = "http://localhost:5173"
RM = os.environ.get("RM", "RM000041")
LAB2 = os.environ.get("LAB2", "Leukosit")
os.makedirs(OUT, exist_ok=True)


def login(b, user):
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.goto(f"{APP}/login")
    pg.fill("#username", user); pg.fill("#password", "simrs123"); pg.click("button[type=submit]")
    pg.wait_for_url(lambda u: "/login" not in u, timeout=15000)
    return pg


def open_page(pg, path):
    pg.goto(APP + path); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(900)


def shot(pg, name, full=False):
    pg.wait_for_timeout(600)
    pg.screenshot(path=f"{OUT}/{name}.png", full_page=full)
    print("shot", name)


def pick(pg, trigger_text, option_text):
    """Buka combobox shadcn berdasarkan teks pemicu, pilih opsi pertama yang memuat option_text (atau pertama bila kosong)."""
    pg.get_by_role("combobox", name=re.compile(trigger_text)).click() if trigger_text else None
    pg.wait_for_timeout(400)
    opt = pg.get_by_role("option", name=re.compile(option_text)) if option_text else pg.get_by_role("option")
    opt.first.click(); pg.wait_for_timeout(400)


def s1_pendaftaran(b):
    pg = login(b, "pendaftaran")
    open_page(pg, "/transaction/pendaftaran")
    pg.fill("input[placeholder^='Ketik No. RM']", RM); pg.wait_for_timeout(1200)
    shot(pg, "01-cari-pasien")
    pg.get_by_role("button", name=re.compile(RM)).first.click(); pg.wait_for_timeout(600)
    pg.select_option("#daftar-poli", label="Poli Umum"); pg.wait_for_timeout(800)
    pg.select_option("#daftar-jadwal", value=pg.evaluate("[...document.querySelectorAll('#daftar-jadwal option')].find(o => o.textContent.includes('Budi Santoso')).value"))
    pg.select_option("#daftar-penjamin", index=0)
    shot(pg, "02-pilih-poli-dokter-jadwal", full=True)
    pg.get_by_role("button", name="Daftarkan Kunjungan").click(); pg.wait_for_timeout(1500)
    shot(pg, "03-pendaftaran-berhasil", full=True)
    open_page(pg, "/transaction/antrean")
    pg.fill("input[placeholder*='Cari']", RM) if pg.locator("main input[placeholder*='Cari']").count() else None
    pg.wait_for_timeout(1000)
    shot(pg, "04-antrean-status-menunggu")
    pg.get_by_role("button", name="Panggil / Periksa").first.click(); pg.wait_for_timeout(1200)
    shot(pg, "05-antrean-status-diperiksa")
    pg.context.close()


def panel(pg):
    return pg.evaluate(r"""() => [...document.querySelectorAll('main [role=tabpanel][data-state=active] *')].filter(e => ['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.tagName) || e.getAttribute('role') == 'combobox').map(e => [e.tagName, e.id, e.getAttribute('placeholder') || '', (e.innerText || '').trim().slice(0, 28), e.getAttribute('aria-label') || ''].join('|')).join(' ;; ')""")


def tab(pg, name):
    pg.click(f"[id$=trigger-{name}]"); pg.wait_for_timeout(700)


def s2_pemeriksaan(b):
    pg = login(b, "dokter")
    open_page(pg, "/transaction/pemeriksaan")
    pg.fill("input[placeholder^='Cari no. kunjungan']", RM); pg.wait_for_timeout(1200)
    shot(pg, "06-worklist-dokter")
    pg.get_by_role("button", name="Periksa").first.click(); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1000)
    pg.fill("#keluhan_utama", "Demam tiga hari disertai batuk dan pilek")
    pg.fill("#anamnesis", "Demam naik turun sejak 3 hari, batuk berdahak, tidak sesak, tidak ada riwayat alergi obat.")
    shot(pg, "07-anamnesis", full=True)
    tab(pg, "ttv")
    for k, v in dict(td_sistolik="120", td_diastolik="80", nadi="88", suhu="38.2", respirasi="20", spo2="98", berat_badan="65", tinggi_badan="168").items():
        pg.fill(f"#{k}", v)
    shot(pg, "08-tanda-vital", full=True)
    tab(pg, "fisik")
    pg.fill("#pemeriksaan_fisik", "Faring hiperemis, tonsil T1-T1, paru vesikuler, tidak ada ronki atau wheezing.")
    pg.get_by_role("button", name="Simpan Pemeriksaan").click(); pg.wait_for_timeout(1500)
    shot(pg, "09-pemeriksaan-fisik-tersimpan", full=True)
    tab(pg, "diagnosis")
    pg.get_by_role("combobox", name=re.compile("Tambah diagnosis")).click(); pg.wait_for_timeout(1500)
    pg.get_by_text("J06.9 — Infeksi saluran pernapasan atas akut (ISPA)").first.click(); pg.wait_for_timeout(600)
    pg.get_by_role("combobox", name=re.compile("Tambah diagnosis")).click(); pg.wait_for_timeout(1000)
    pg.get_by_text("J00 — Nasofaringitis akut (common cold)").first.click(); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Simpan Diagnosis").click(); pg.wait_for_timeout(1500)
    shot(pg, "10-diagnosis-utama-sekunder", full=True)
    pg.context.close()


def open_exam(b):
    pg = login(b, "dokter")
    open_page(pg, "/transaction/pemeriksaan")
    pg.fill("input[placeholder^='Cari no. kunjungan']", RM); pg.wait_for_timeout(1200)
    pg.get_by_role("button", name="Periksa").first.click(); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1000)
    return pg


def s3_tindakan(b):
    pg = open_exam(b)
    tab(pg, "tindakan")
    pg.get_by_role("combobox", name=re.compile("Pilih tindakan medis")).click(); pg.wait_for_timeout(1000)
    shot(pg, "11-pilih-tindakan-dan-tarif")
    pg.get_by_text("TND001 — Konsultasi Dokter Umum").first.click(); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Tambah", exact=True).click(); pg.wait_for_timeout(1200)
    pg.get_by_role("combobox", name=re.compile("Pilih tindakan medis")).click(); pg.wait_for_timeout(800)
    pg.get_by_text("TND003 — Nebulizer").first.click(); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Tambah", exact=True).click(); pg.wait_for_timeout(1200)
    shot(pg, "12-dua-tindakan-tercatat", full=True)
    pg.context.close()


def s4_resep(b):
    pg = open_exam(b)
    tab(pg, "resep")
    pg.get_by_role("combobox", name=re.compile("Tambah obat")).click(); pg.wait_for_timeout(1000)
    shot(pg, "13-pilih-obat-dan-stok")
    pg.get_by_text("OBT001 — Paracetamol 500mg").first.click(); pg.wait_for_timeout(700)
    pg.get_by_placeholder("Dosis").fill("500 mg"); pg.get_by_placeholder("Frekuensi").fill("3 x sehari sesudah makan")
    pg.get_by_label(re.compile("^Jumlah")).fill("10")
    pg.get_by_placeholder("Catatan resep").fill("Diminum bila demam")
    shot(pg, "14-resep-diisi", full=True)
    pg.get_by_role("button", name="Simpan Resep").click(); pg.wait_for_timeout(1500)
    shot(pg, "15-resep-tersimpan", full=True)
    pg.context.close()


def s5_lab_order(b):
    pg = open_exam(b)
    tab(pg, "lab")
    pg.locator("#lab-1").click(); pg.locator("#lab-5").click()
    pg.get_by_placeholder("Catatan klinis").fill("Demam 3 hari, mohon cek hemoglobin dan leukosit")
    shot(pg, "16-order-lab-dipilih", full=True)
    pg.get_by_role("button", name="Kirim Order").click(); pg.wait_for_timeout(1500)
    pg.wait_for_timeout(2500); shot(pg, "17-order-lab-terkirim", full=True)
    pg.context.close()


def s6_lab_hasil(b):
    pg = login(b, "laboratorium")
    open_page(pg, "/transaction/laboratorium")
    pg.fill("input[placeholder^='Cari no. order']", RM); pg.wait_for_timeout(1200)
    shot(pg, "18-worklist-lab", full=True)
    pg.get_by_text(re.compile(r"\d pemeriksaan")).first.click(); pg.wait_for_timeout(600)
    for n, (nama, nilai) in enumerate((("Hemoglobin", "13.5"), (LAB2, "12500" if LAB2 == "Leukosit" else "95"))):
        box = pg.get_by_label(f"Hasil {nama}")
        box.fill(nilai)
        box.locator("xpath=following-sibling::button | ../button").first.click(); pg.wait_for_timeout(1500)
        if n == 0:
            shot(pg, "19-hasil-pertama-tersimpan", full=True)
    pg.locator("select").first.select_option(label="Selesai"); pg.wait_for_timeout(1500)
    pg.get_by_text(re.compile(r"\d pemeriksaan")).first.click(); pg.wait_for_timeout(600)
    shot(pg, "20-lab-selesai-dengan-flag", full=True)
    pg.context.close()


def s7_farmasi(b):
    pg = login(b, "farmasi")
    open_page(pg, "/transaction/farmasi")
    pg.fill("input[placeholder^='Cari no. resep']", RM); pg.wait_for_timeout(1200)
    shot(pg, "21-antrean-resep-baru")
    if pg.get_by_role("button", name="Proses", exact=True).count():
        pg.get_by_role("button", name="Proses", exact=True).first.click(); pg.wait_for_timeout(1500)
    shot(pg, "22-resep-diproses")
    pg.get_by_role("button", name="Serahkan").first.click(); pg.wait_for_timeout(1500)
    pg.locator("select").first.select_option(label="Diserahkan"); pg.wait_for_timeout(1500)
    shot(pg, "23-resep-diserahkan")
    pg.context.close()
    pg = login(b, "admin")
    open_page(pg, "/master/obat")
    pg.fill("main input[placeholder*='Cari']", "Paracetamol"); pg.wait_for_timeout(1500)
    shot(pg, "24-stok-obat-berkurang")
    pg.context.close()


def s8_kasir(b):
    pg = login(b, "kasir")
    open_page(pg, "/transaction/billing")
    pg.click("[id$=trigger-belum-tagih]"); pg.wait_for_timeout(800)
    pg.fill("main input[placeholder^='Cari']", RM)
    pg.get_by_text(RM).first.wait_for(timeout=15000); pg.wait_for_timeout(800)
    shot(pg, "25-belum-ditagih")
    pg.get_by_role("button", name="Buat Invoice").first.click(); pg.wait_for_timeout(1500)
    shot(pg, "26-dialog-buat-invoice-peringatan")
    pg.locator("[role=alertdialog] button, [role=dialog] button", has_text="Buat Invoice").click(); pg.wait_for_selector("[role=alertdialog], [role=dialog]", state="detached"); pg.wait_for_timeout(1500)
    open_page(pg, "/transaction/billing")
    pg.fill("main input[placeholder^='Cari']", RM)
    pg.get_by_text(RM).first.wait_for(timeout=15000); pg.wait_for_timeout(800)
    shot(pg, "27-invoice-terbentuk-belum-dibayar")
    print(pg.evaluate("[...document.querySelectorAll('main tbody button')].map(e=>e.innerText).join(' | ')"))
    pg.context.close()


def s9_bayar_explore(b):
    pg = login(b, "kasir")
    open_page(pg, "/transaction/billing")
    pg.fill("main input[placeholder^='Cari']", RM)
    pg.get_by_text(RM).first.wait_for(timeout=15000); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Detail").first.click(); pg.wait_for_timeout(1500)
    shot(pg, "28-detail-invoice-4-sumber")
    print(pg.evaluate("[...document.querySelectorAll('[role=dialog] button, [role=dialog] input, [role=dialog] select')].map(e=>e.tagName+':'+(e.innerText||e.id||e.getAttribute('aria-label'))).join(' | ')"))
    pg.context.close()


def s10_bayar(b):
    pg = login(b, "kasir")
    open_page(pg, "/transaction/billing")
    pg.fill("main input[placeholder^='Cari']", RM)
    pg.get_by_text(RM).first.wait_for(timeout=15000); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Bayar", exact=True).first.click(); pg.wait_for_timeout(1200)
    shot(pg, "29-dialog-bayar")
    pg.fill("#bayar-jumlah", "100000")
    shot(pg, "30-bayar-sebagian-tunai")
    pg.get_by_role("button", name="Proses Pembayaran").click(); pg.wait_for_timeout(2000)
    shot(pg, "31-status-dibayar-sebagian")
    pg.get_by_role("button", name="Bayar", exact=True).first.click(); pg.wait_for_timeout(1200)
    pg.select_option("#bayar-metode", label="Non-Tunai")
    pg.get_by_role("button", name="Lunasi sisa").click()
    pg.fill("#bayar-referensi", "QRIS-20261124-0042")
    shot(pg, "32-bayar-sisa-non-tunai")
    pg.get_by_role("button", name="Proses Pembayaran").click(); pg.wait_for_timeout(2500)
    shot(pg, "33-status-lunas")
    pg.click("[id$=trigger-riwayat]"); pg.wait_for_timeout(800)
    pg.fill("main input[placeholder^='Cari']", RM)
    pg.get_by_text(RM).first.wait_for(timeout=15000); pg.wait_for_timeout(800)
    shot(pg, "34-riwayat-pembayaran")
    pg.get_by_role("link", name="Bukti Bayar").last.click(); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1500)
    shot(pg, "35-bukti-bayar-cetak", full=True)
    open_page(pg, "/transaction/billing")
    pg.fill("main input[placeholder^='Cari']", RM)
    pg.get_by_text(RM).first.wait_for(timeout=15000); pg.wait_for_timeout(800)
    pg.get_by_role("link", name="Cetak").first.click(); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1500)
    shot(pg, "36-invoice-cetak-lunas", full=True)
    pg.context.close()


def s11_hasil_akhir(b):
    pg = login(b, "dokter")
    open_page(pg, "/transaction/riwayat-medis")
    pg.get_by_role("combobox", name=re.compile("Pilih pasien")).click(); pg.wait_for_timeout(500)
    pg.keyboard.type(RM); pg.wait_for_timeout(1800)
    pg.get_by_text(RM).first.click(); pg.wait_for_timeout(2500)
    shot(pg, "37-riwayat-medis-pasien", full=True)
    pg.context.close()
    pg = login(b, "pendaftaran")
    open_page(pg, "/transaction/antrean")
    pg.fill("main input[placeholder*='Cari']", RM); pg.wait_for_timeout(1500)
    shot(pg, "38-kunjungan-selesai-setelah-lunas")
    pg.context.close()


def s12_dashboard(b):
    pg = login(b, "admin")
    open_page(pg, "/dashboard")
    pg.get_by_role("button", name="Hari Ini").click(); pg.get_by_role("button", name="Terapkan").click(); pg.wait_for_timeout(2500)
    shot(pg, "39-dashboard-hari-ini", full=True)
    pg.click("[id$=trigger-pembayaran]"); pg.wait_for_timeout(2000)
    shot(pg, "40-dashboard-rincian-tagihan", full=True)
    pg.context.close()


STEPS = {"1": s1_pendaftaran, "2": s2_pemeriksaan, "3": s3_tindakan, "4": s4_resep, "5": s5_lab_order, "6": s6_lab_hasil, "7": s7_farmasi, "8": s8_kasir, "9": s9_bayar_explore, "10": s10_bayar, "11": s11_hasil_akhir, "12": s12_dashboard}

if __name__ == "__main__":
    which = sys.argv[1:] or list(STEPS)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for k in which:
            STEPS[k](b)
        b.close()
