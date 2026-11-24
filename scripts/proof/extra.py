"""Screenshot pelengkap proof book: CRUD dan validasi master, stok tidak cukup, riwayat mutasi, tab dashboard,
sidebar per role, dan fitur bonus. Jalankan setelah flow.py: python scripts/proof/extra.py [langkah ...]"""
import os, re, sys
from playwright.sync_api import sync_playwright
import flow

OUT = os.path.join(flow.ROOT, "docs", "proof-book", "screenshots", "extra")
os.makedirs(OUT, exist_ok=True)
flow.OUT = OUT  # shot() memakai flow.OUT


def search(pg, text):
    pg.fill("main input[placeholder*='Cari']", text); pg.wait_for_timeout(1500)


def isi_pasien(pg, nik, nama):
    pg.fill("#pasien-nik", nik); pg.fill("#pasien-nama", nama); pg.fill("#pasien-tgl-lahir", "1990-05-17")
    pg.select_option("#pasien-jk", index=1); pg.fill("#pasien-no-hp", "081234567890"); pg.fill("#pasien-alamat", "Jl. Uji Coba No. 1, Bandung")


def m_crud(b):
    pg = flow.login(b, "admin")
    flow.open_page(pg, "/master/pasien")
    pg.get_by_role("button", name="Tambah Pasien").click(); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Simpan").click(); pg.wait_for_timeout(1000)
    flow.shot(pg, "m1-validasi-form-kosong")
    isi_pasien(pg, "3273011000000001", "Uji Duplikat")
    pg.get_by_role("button", name="Simpan").click()
    pg.get_by_text("NIK sudah terdaftar").first.wait_for(timeout=15000)
    flow.shot(pg, "m2-nik-duplikat-ditolak")
    pg.fill("#pasien-nik", "3273019999990001"); pg.fill("#pasien-nama", "Uji Pasien Baru")
    pg.get_by_role("button", name="Simpan").click(); pg.wait_for_timeout(1500)
    search(pg, "Uji Pasien"); flow.shot(pg, "m3-pasien-ditambah-no-rm-otomatis")
    pg.get_by_role("button", name="Ubah").first.click(); pg.wait_for_timeout(800)
    pg.fill("#pasien-nama", "Uji Pasien Diubah"); pg.get_by_role("button", name="Simpan").click(); pg.wait_for_timeout(1500)
    search(pg, "Uji Pasien"); flow.shot(pg, "m4-pasien-diubah")
    pg.get_by_role("button", name="Hapus").first.click(); pg.wait_for_timeout(800)
    flow.shot(pg, "m5-konfirmasi-hapus")
    pg.locator("[role=alertdialog] button, [role=dialog] button", has_text=re.compile("^Hapus$")).last.click(); pg.wait_for_timeout(1800)
    search(pg, "Uji Pasien"); flow.shot(pg, "m6-pasien-dihapus")
    pg.context.close()


def r_stok(b):
    pg = flow.login(b, "dokter")
    flow.open_page(pg, "/transaction/pemeriksaan")
    pg.fill("input[placeholder^='Cari no. kunjungan']", "RM000009"); pg.wait_for_timeout(1200)
    pg.get_by_role("button", name="Periksa").first.click(); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(800)
    flow.tab(pg, "resep")
    pg.get_by_role("combobox", name=re.compile("Tambah obat")).click(); pg.wait_for_timeout(1000)
    pg.get_by_text("OBT001 — Paracetamol 500mg").first.click(); pg.wait_for_timeout(600)
    pg.get_by_placeholder("Dosis").fill("500 mg"); pg.get_by_placeholder("Frekuensi").fill("3 x sehari")
    pg.get_by_label(re.compile("^Jumlah")).fill("99999")
    pg.get_by_role("button", name="Simpan Resep").click(); pg.wait_for_timeout(1200)
    flow.shot(pg, "r1-resep-melebihi-stok-ditolak", full=True)
    pg.context.close()


def o_mutasi(b):
    pg = flow.login(b, "admin")
    flow.open_page(pg, "/master/obat")
    search(pg, "Paracetamol")
    pg.get_by_role("button", name="Riwayat Mutasi").first.click(); pg.wait_for_timeout(1800)
    flow.shot(pg, "o1-riwayat-mutasi-stok")
    pg.context.close()


def d_tab(b):
    pg = flow.login(b, "admin")
    flow.open_page(pg, "/dashboard")
    pg.get_by_role("button", name="7 Hari").click(); pg.get_by_role("button", name="Terapkan").click(); pg.wait_for_timeout(2500)
    flow.shot(pg, "d0-dashboard-filter-7-hari", full=True)
    for t in ("kunjungan", "tindakan", "pendapatan", "obat", "pembayaran"):
        pg.click(f"[id$=trigger-{t}]"); pg.wait_for_timeout(1800)
        flow.shot(pg, f"d-rincian-{t}", full=True)
    pg.context.close()


def role_home(b):
    for role in ("admin", "pendaftaran", "dokter", "farmasi", "laboratorium", "kasir"):
        pg = flow.login(b, role)
        flow.open_page(pg, "/")
        pg.screenshot(path=f"{OUT}/role-{role}.png", clip={"x": 0, "y": 0, "width": 460, "height": 900}); print("shot role", role)
        pg.context.close()


def bonus(b):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); pg = ctx.new_page()
    pg.goto(f"{flow.APP}/display-antrean"); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1500)
    flow.shot(pg, "b1-layar-display-antrean"); ctx.close()
    pg = flow.login(b, "admin")
    flow.open_page(pg, "/dashboard")
    pg.get_by_role("button", name="Bantuan").click(); pg.wait_for_timeout(1000)
    flow.shot(pg, "b2-chatbot-bantuan")
    pg.keyboard.press("Escape"); pg.get_by_label(re.compile("Ganti tema")).click(); pg.wait_for_timeout(1200)
    flow.shot(pg, "b3-tema-gelap", full=True)
    pg.context.close()


STEPS = {"crud": m_crud, "stok": r_stok, "mutasi": o_mutasi, "dash": d_tab, "role": role_home, "bonus": bonus}

if __name__ == "__main__":
    with sync_playwright() as p:
        b = p.chromium.launch()
        for k in (sys.argv[1:] or list(STEPS)):
            print("==", k)
            try:
                STEPS[k](b)
            except Exception as ex:  # lanjutkan agar langkah lain tetap menghasilkan bukti
                print("GAGAL", k, str(ex).splitlines()[0][:160])
        b.close()
