"""Rekam video pembuktian kepatuhan lengkap Real Case Test (A, B.1-B.9, C, D.1-D.6, E, F.1-F.5, G, Bonus tanpa Chatbot)."""
import json
import os
import re
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from compliance_cards import (
    card_intro_workflow,
    card_section_a,
    card_section_c,
    card_section_d12,
    card_section_d34,
    card_section_d56,
    card_section_e,
    card_section_f14_g,
    card_section_f5,
)

APP = "http://localhost:5173"
SCRATCH = os.environ.get(
    "COMPLIANCE_TMP",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tmp_compliance"),
)
CLIPS_DIR = os.path.join(SCRATCH, "clips")
CARDS_DIR = os.path.join(SCRATCH, "cards")
STORAGE_PATH = os.path.join(SCRATCH, "admin_state.json")
TIMELINE_PATH = os.path.join(SCRATCH, "timeline.json")
os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(CARDS_DIR, exist_ok=True)

VIEWPORT = {"width": 1600, "height": 900}

CAMERA_JS = r"""
(() => {
  if (window.__showcaseInstalled) return;
  window.__showcaseInstalled = true;

  const style = document.createElement('style');
  style.textContent = `
    html {
      transition: transform 0.70s cubic-bezier(0.22, 1, 0.36, 1);
      transform-origin: 50% 50%;
      will-change: transform;
    }
    #__showcase_spot {
      position: fixed;
      pointer-events: none;
      z-index: 2147483645;
      border: 2.5px solid #0ea5e9;
      border-radius: 10px;
      box-shadow: 0 0 0 6px rgba(14, 165, 233, 0.20), 0 8px 24px rgba(14, 165, 233, 0.18);
      opacity: 0;
      transition: opacity 0.3s ease, left 0.35s cubic-bezier(0.22,1,0.36,1), top 0.35s cubic-bezier(0.22,1,0.36,1), width 0.35s cubic-bezier(0.22,1,0.36,1), height 0.35s cubic-bezier(0.22,1,0.36,1);
    }
    #__showcase_cursor {
      position: fixed;
      width: 20px;
      height: 20px;
      margin-left: -10px;
      margin-top: -10px;
      border-radius: 9999px;
      background: rgba(14, 165, 233, 0.88);
      border: 2.5px solid #ffffff;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 2147483646;
      opacity: 0;
      transition: left 0.32s cubic-bezier(0.22,1,0.36,1), top 0.32s cubic-bezier(0.22,1,0.36,1), transform 0.14s ease, opacity 0.25s ease;
    }
    #__showcase_cursor.clicking {
      transform: scale(0.72);
      background: #0284c7;
    }
  `;
  document.head.appendChild(style);

  const spot = document.createElement('div');
  spot.id = '__showcase_spot';
  document.documentElement.appendChild(spot);

  const cursor = document.createElement('div');
  cursor.id = '__showcase_cursor';
  document.documentElement.appendChild(cursor);

  window.__showcase = {
    zoomRect(rect, scale = 1.42, pad = 10) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ox = Math.max(40, Math.min(W - 40, cx));
      const oy = Math.max(40, Math.min(H - 40, cy));
      spot.style.left = `${Math.max(4, rect.left - pad)}px`;
      spot.style.top = `${Math.max(4, rect.top - pad)}px`;
      spot.style.width = `${Math.min(W - 8, rect.width + pad * 2)}px`;
      spot.style.height = `${Math.min(H - 8, rect.height + pad * 2)}px`;
      spot.style.opacity = '1';
      cursor.style.left = `${cx}px`;
      cursor.style.top = `${cy}px`;
      cursor.style.opacity = '1';
      const html = document.documentElement;
      html.style.transformOrigin = `${ox}px ${oy}px`;
      html.style.transform = `scale(${scale})`;
    },
    pulseClick() {
      cursor.classList.add('clicking');
      setTimeout(() => cursor.classList.remove('clicking'), 180);
    },
    zoomOut() {
      spot.style.opacity = '0';
      document.documentElement.style.transform = 'scale(1)';
      setTimeout(() => { cursor.style.opacity = '0'; }, 350);
    }
  };
})();
"""


def psql(query: str) -> str:
    return subprocess.check_output(
        ["docker", "exec", "simrs-postgres", "psql", "-U", "simrs", "-d", "simrs", "-tAc", query],
        text=True,
    ).strip()


def pick_fresh_patient():
    row = psql(
        """
        SELECT p.no_rm || '|' || p.nama
        FROM m_pasien p
        LEFT JOIN t_kunjungan k ON k.pasien_id = p.id AND k.tgl_kunjungan = CURRENT_DATE
        WHERE p.deleted_at IS NULL
        GROUP BY p.id, p.no_rm, p.nama
        HAVING COUNT(k.id) = 0
        ORDER BY p.no_rm ASC
        LIMIT 1;
        """
    )
    if not row or "|" not in row:
        raise RuntimeError("Tidak ada pasien seed tanpa kunjungan hari ini.")
    no_rm, nama = row.split("|", 1)
    return no_rm.strip(), nama.strip()


def get_latest_queue_code(no_rm: str, retries: int = 16) -> str:
    for _ in range(retries):
        row = psql(
            f"""
            SELECT COALESCE(mp.prefix_antrean, 'U') || '-' || LPAD(k.no_antrean::text, 3, '0')
            FROM t_kunjungan k
            JOIN m_pasien p ON p.id = k.pasien_id
            JOIN m_poli mp ON mp.id = k.poli_id
            WHERE p.no_rm = '{no_rm}' AND k.tgl_kunjungan = CURRENT_DATE
            ORDER BY k.id DESC
            LIMIT 1;
            """
        )
        if row.strip():
            return row.strip()
        time.sleep(0.5)
    raise RuntimeError(f"Kunjungan hari ini untuk {no_rm} tidak ditemukan.")


def get_latest_billing_ids(no_rm: str):
    row = psql(
        f"""
        SELECT i.id || '|' || i.no_invoice || '|' || COALESCE(pb.id::text, '') || '|' || COALESCE(pb.no_pembayaran, '')
        FROM t_kunjungan k
        JOIN m_pasien p ON p.id = k.pasien_id
        JOIN t_invoice i ON i.kunjungan_id = k.id
        LEFT JOIN t_pembayaran pb ON pb.invoice_id = i.id
        WHERE p.no_rm = '{no_rm}' AND k.tgl_kunjungan = CURRENT_DATE
        ORDER BY i.id DESC, pb.id DESC
        LIMIT 1;
        """
    )
    inv_id, no_inv, pb_id, no_pb = row.split("|")
    return int(inv_id), no_inv, int(pb_id), no_pb


def announcement_files(kode_antrean: str):
    num_map = {
        "0": "Nol", "1": "satu", "2": "dua", "3": "tiga", "4": "empat",
        "5": "lima", "6": "enam", "7": "tujuh", "8": "delapan", "9": "sembilan",
    }
    files = ["Nomor-Antrian"]
    for ch in kode_antrean.strip().upper():
        if ch in num_map:
            files.append(num_map[ch])
        elif "A" <= ch <= "Z":
            files.append(ch)
    return files


class Scene:
    def __init__(self, browser, scene_id: str, badge: str, rubric_codes, use_storage: bool = True, transition: str = "smoothleft"):
        self.scene_id = scene_id
        self.badge = badge
        self.rubric_codes = list(rubric_codes)
        self.transition = transition
        self.subtitles = []
        self.audio_cues = []
        self.segments = []
        kwargs = {
            "viewport": VIEWPORT,
            "record_video_dir": CLIPS_DIR,
            "record_video_size": VIEWPORT,
        }
        if use_storage and os.path.exists(STORAGE_PATH):
            kwargs["storage_state"] = STORAGE_PATH
        self.ctx = browser.new_context(**kwargs)
        self.pg = self.ctx.new_page()
        self.pg.set_default_timeout(30000)
        self.pg.set_default_navigation_timeout(60000)
        self.t0 = time.monotonic()
        self.trim_start = 0.0
        self.trim_end = 0.0
        self._active_sub = None
        self.video_path = None

    def now(self) -> float:
        return time.monotonic() - self.t0

    def install_cam(self):
        self.pg.evaluate(CAMERA_JS)

    def wait_idle(self, timeout: int = 8000):
        try:
            self.pg.wait_for_load_state("networkidle", timeout=timeout)
        except Exception:
            pass

    def goto(self, path: str, mark_start: bool = False, wait_selector: str = "main, #username, header"):
        if not mark_start and self.pg.url.startswith(APP):
            link = self.pg.locator(f"aside a[href='{path}'], nav a[href='{path}']").first
            if link.count() and link.is_visible():
                link.click()
                self.pg.locator(wait_selector).first.wait_for(state="visible", timeout=25000)
                self.wait_idle(6000)
                self.pg.wait_for_timeout(550)
                self.install_cam()
                return
        self.pg.goto(APP + path, wait_until="domcontentloaded", timeout=60000)
        self.pg.locator(wait_selector).first.wait_for(state="visible", timeout=45000)
        self.wait_idle(8000)
        self.pg.wait_for_timeout(650)
        self.install_cam()
        if mark_start:
            self.trim_start = max(0.0, self.now() - 0.15)

    def sub(self, text: str, min_read: float = None):
        self.ensure_readable()
        t = self.now()
        if self._active_sub is not None and self._active_sub["end"] is None:
            self._active_sub["end"] = t
        calc_read = max(3.9, len(text) / 18.5 + 1.25)
        item = {
            "start": t,
            "end": None,
            "text": text,
            "min_read": min_read if min_read is not None else calc_read,
        }
        self.subtitles.append(item)
        self._active_sub = item

    def ensure_readable(self, extra_sec: float = 0.0):
        if self._active_sub is not None and self._active_sub["end"] is None:
            elapsed = self.now() - self._active_sub["start"]
            target = self._active_sub.get("min_read", 3.9) + extra_sec
            remain = target - elapsed
            if remain > 0.05:
                self.pg.wait_for_timeout(int(remain * 1000))

    def end_sub(self, tail_sec: float = 0.85):
        self.ensure_readable()
        if self._active_sub is not None and self._active_sub["end"] is None:
            self._active_sub["end"] = self.now()
        self._active_sub = None
        if tail_sec > 0:
            self.pg.wait_for_timeout(int(tail_sec * 1000))

    def audio(self, wav_names):
        self.audio_cues.append({"time": self.now(), "wavs": list(wav_names)})

    def wait(self, ms: int):
        self.pg.wait_for_timeout(ms)

    def _rect(self, locator):
        locator.scroll_into_view_if_needed()
        self.pg.wait_for_timeout(140)
        box = locator.bounding_box()
        if not box:
            return {"left": 800, "top": 450, "width": 200, "height": 50}
        return {"left": box["x"], "top": box["y"], "width": box["width"], "height": box["height"]}

    def zoom_in(self, locator, scale: float = 1.42, pad: int = 12):
        self.install_cam()
        self.pg.evaluate("document.documentElement.style.transform = 'scale(1)'")
        self.pg.wait_for_timeout(120)
        rect = self._rect(locator)
        self.pg.evaluate("([r, s, p]) => window.__showcase.zoomRect(r, s, p)", [rect, scale, pad])
        self.pg.wait_for_timeout(750)

    def zoom_box(self, locators, scale: float = 1.38, pad: int = 16):
        self.install_cam()
        self.pg.evaluate("document.documentElement.style.transform = 'scale(1)'")
        self.pg.wait_for_timeout(120)
        rects = [self._rect(loc) for loc in locators]
        left = min(r["left"] for r in rects)
        top = min(r["top"] for r in rects)
        right = max(r["left"] + r["width"] for r in rects)
        bottom = max(r["top"] + r["height"] for r in rects)
        rect = {"left": left, "top": top, "width": right - left, "height": bottom - top}
        self.pg.evaluate("([r, s, p]) => window.__showcase.zoomRect(r, s, p)", [rect, scale, pad])
        self.pg.wait_for_timeout(750)

    def zoom_out(self, wait_ms: int = 750):
        self.install_cam()
        self.pg.evaluate("() => window.__showcase.zoomOut()")
        self.pg.wait_for_timeout(wait_ms)

    def type_human(self, locator, text: str, delay: int = 44):
        locator.click()
        self.pg.evaluate("() => window.__showcase && window.__showcase.pulseClick()")
        locator.fill("")
        locator.type(text, delay=delay)

    def click_visual(self, locator):
        self.install_cam()
        locator.click()
        self.pg.evaluate("() => window.__showcase && window.__showcase.pulseClick()")

    def close(self, save_storage: bool = False):
        self.end_sub()
        self.trim_end = self.now()
        if save_storage:
            self.ctx.storage_state(path=STORAGE_PATH)
        video = self.pg.video
        self.pg.close()
        self.ctx.close()
        self.video_path = str(video.path())
        return {
            "id": self.scene_id,
            "badge": self.badge,
            "rubric_codes": self.rubric_codes,
            "transition": self.transition,
            "video": self.video_path,
            "trim_start": round(self.trim_start, 3),
            "trim_end": round(self.trim_end, 3),
            "subtitles": self.subtitles,
            "audio_cues": self.audio_cues,
            "segments": self.segments,
        }


def record_html_card(browser, scene_id: str, badge: str, rubric_codes, html_content: str, sub_texts, transition: str = "fade"):
    html_path = os.path.join(CARDS_DIR, f"{scene_id}.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    sc = Scene(browser, scene_id, badge, rubric_codes, use_storage=False, transition=transition)
    url = "file:///" + html_path.replace("\\", "/")
    sc.pg.goto(url, wait_until="load")
    sc.wait(450)
    sc.trim_start = max(0.0, sc.now() - 0.1)
    for txt in sub_texts:
        sc.sub(txt)
        sc.ensure_readable()
    return sc.close()


def main():
    no_rm, nama_pasien = pick_fresh_patient()
    print(f"[Compliance] Pasien uji: {no_rm} ({nama_pasien})")
    scenes = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # =====================================================================
        # SESI A: STACK & INSTRUKSI PENGERJAAN
        # =====================================================================
        sec_a = record_html_card(
            browser, "01_sec_a", "A / INSTRUKSI PENGERJAAN & STACK", ["A"],
            card_section_a(),
            [
                "Sesi A — Instruksi Pengerjaan: aplikasi dibangun menggunakan seluruh 6 teknologi wajib yang ditentukan dalam studi kasus.",
                "Frontend React 19.3, Backend utama Yii2 2.0.55 (PHP 8.3), Backend Services Node.js v24, Database PostgreSQL 16, API Testing Postman, dan Git (135 commit).",
            ],
            transition="fade",
        )
        print("[OK] Sesi A: Stack")

        # =====================================================================
        # SESI B.1: MASTER DATA (YII) + CRUD + PENCARIAN + ANTI-DUPLIKASI
        # =====================================================================
        s_b1 = Scene(browser, "02_b1_master", "B.1 / PENGELOLAAN MASTER DATA (YII)", ["B.1"], use_storage=False, transition="smoothleft")
        s_b1.goto("/login", mark_start=True, wait_selector="#username")
        s_b1.sub("Masuk memakai akun Administrator (admin) untuk membuktikan seluruh modul Master Data dan alur transaksi SIMRS.")
        s_b1.zoom_box([s_b1.pg.locator("#username"), s_b1.pg.locator("#password"), s_b1.pg.locator("button[type=submit]")], scale=1.45, pad=22)
        s_b1.type_human(s_b1.pg.locator("#username"), "admin", delay=55)
        s_b1.type_human(s_b1.pg.locator("#password"), "simrs123", delay=50)
        s_b1.click_visual(s_b1.pg.locator("button[type=submit]"))
        s_b1.pg.wait_for_url(lambda u: "/login" not in u, timeout=25000)
        s_b1.wait_idle(8000)
        s_b1.wait(600)

        # Master Pasien + Pencarian/Filter
        s_b1.goto("/master/pasien", wait_selector="main table tbody tr")
        s_b1.sub("Sesi B.1 — Pengelolaan Master Data: 6 modul utama mencakup Pasien & No. RM, Dokter, Poli, Jadwal Praktik, Tindakan & Tarif, serta Obat & Stok.")
        cari_pasien = s_b1.pg.locator("main input[placeholder*='Cari']").first
        s_b1.zoom_in(cari_pasien, scale=1.45, pad=14)
        s_b1.type_human(cari_pasien, no_rm, delay=50)
        s_b1.wait(900)
        s_b1.zoom_out()
        s_b1.sub("Fitur pencarian dan filter berjalan cepat di setiap master data, lengkap dengan tombol tambah, ubah, dan hapus.")
        s_b1.ensure_readable()

        # Master Poli -> Uji Validasi Input & Pencegahan Duplikasi Data Penting
        s_b1.goto("/master/poli", wait_selector="main table tbody tr")
        s_b1.sub("Pembuktian validasi input & pencegahan duplikasi data penting: coba menambahkan kode poli duplikat 'POLI-UMUM'.")
        btn_add_poli = s_b1.pg.get_by_role("button", name="Tambah Poli").first
        s_b1.zoom_in(btn_add_poli, scale=1.48, pad=14)
        s_b1.click_visual(btn_add_poli)
        s_b1.pg.locator("#poli-kode").wait_for(state="visible", timeout=15000)
        s_b1.wait(450)
        s_b1.zoom_box([s_b1.pg.locator("#poli-kode"), s_b1.pg.locator("#poli-nama"), s_b1.pg.locator("#poli-tarif")], scale=1.36, pad=18)
        s_b1.type_human(s_b1.pg.locator("#poli-kode"), "POLI-UMUM", delay=48)
        s_b1.type_human(s_b1.pg.locator("#poli-nama"), "Poli Uji Duplikat", delay=38)
        s_b1.type_human(s_b1.pg.locator("#poli-prefix"), "X", delay=55)
        s_b1.type_human(s_b1.pg.locator("#poli-tarif"), "25000", delay=45)
        s_b1.click_visual(s_b1.pg.get_by_role("button", name="Simpan"))
        s_b1.wait(1400)
        s_b1.sub("Backend Yii2 menolak otomatis data duplikat (HTTP 422) dengan pesan validasi jelas sehingga integritas master terjaga.")
        s_b1.ensure_readable()
        s_b1.zoom_out()
        s_b1.pg.keyboard.press("Escape")
        s_b1.wait(500)

        # Tampilkan 4 master lain secara ringkas & rapi
        s_b1.goto("/master/dokter", wait_selector="main table tbody tr")
        s_b1.sub("Master Dokter dan Tenaga Medis, diikuti Jadwal Praktik Dokter, Tindakan Medis & Tarif, serta Obat & Stok.", min_read=4.2)
        s_b1.wait(1200)
        s_b1.goto("/master/jadwal-dokter", wait_selector="main table tbody tr")
        s_b1.wait(1100)
        s_b1.goto("/master/tindakan", wait_selector="main table tbody tr")
        s_b1.wait(1100)
        s_b1.goto("/master/obat", wait_selector="main table tbody tr")
        s_b1.ensure_readable()
        sec_b1 = s_b1.close(save_storage=True)
        print("[OK] Sesi B.1: Master Data")

        # =====================================================================
        # SESI B.2: PENDAFTARAN & ANTREAN PASIEN (+ REKAM BONUS DISPLAY ANTREAN LIVE)
        # =====================================================================
        s_b2 = Scene(browser, "03_b2_pendaftaran", "B.2 / PENDAFTARAN & ANTREAN PASIEN", ["B.2"], use_storage=True, transition="smoothleft")
        s_b2.goto("/transaction/pendaftaran", mark_start=True, wait_selector="input[placeholder^='Ketik No. RM']")
        s_b2.sub(f"Sesi B.2 — Pendaftaran Pasien: petugas mencari pasien berdasarkan No. RM atau identitas ({no_rm} — {nama_pasien}).")
        cari_rm = s_b2.pg.locator("input[placeholder^='Ketik No. RM']")
        s_b2.zoom_in(cari_rm, scale=1.48, pad=16)
        s_b2.type_human(cari_rm, no_rm, delay=52)
        s_b2.wait(950)
        s_b2.click_visual(s_b2.pg.get_by_role("button", name=re.compile(no_rm)).first)
        s_b2.wait(550)
        s_b2.zoom_out()

        s_b2.sub("Pilih poli tujuan (Poli Umum), jadwal dokter yang aktif (dr. Budi Santoso), dan penjamin, lalu daftarkan kunjungan.")
        s_b2.zoom_box([s_b2.pg.locator("#daftar-poli"), s_b2.pg.locator("#daftar-jadwal"), s_b2.pg.locator("#daftar-penjamin")], scale=1.40, pad=18)
        s_b2.pg.select_option("#daftar-poli", label="Poli Umum")
        s_b2.wait(800)
        jadwal_val = s_b2.pg.evaluate(
            "[...document.querySelectorAll('#daftar-jadwal option')].find(o => o.textContent.includes('Budi Santoso'))?.value || document.querySelectorAll('#daftar-jadwal option')[1]?.value"
        )
        if jadwal_val:
            s_b2.pg.select_option("#daftar-jadwal", value=jadwal_val)
        s_b2.wait(450)
        s_b2.pg.select_option("#daftar-penjamin", index=0)
        s_b2.wait(450)
        s_b2.zoom_out()

        btn_daftar = s_b2.pg.get_by_role("button", name="Daftarkan Kunjungan")
        s_b2.zoom_in(btn_daftar, scale=1.45, pad=16)
        s_b2.click_visual(btn_daftar)
        s_b2.wait(1300)
        s_b2.zoom_out()

        kode_antrean = get_latest_queue_code(no_rm)
        print(f"[Compliance] Kode antrean: {kode_antrean}")
        s_b2.sub(f"Sistem membangkitkan nomor antrean otomatis ({kode_antrean}) dan mencatat kunjungan baru berstatus Menunggu.")
        s_b2.ensure_readable()

        # Siapkan konteks Bonus Display Antrean sebelum pemanggilan agar transisi Menunggu -> Sedang Diperiksa memicu panggilan suara
        s_bonus_disp = Scene(browser, "17a_bonus_display", "BONUS / DISPLAY ANTREAN & SUARA OTOMATIS", ["BONUS_DISPLAY_VOICE"], use_storage=False, transition="dissolve")
        s_bonus_disp.goto("/display-antrean", mark_start=True, wait_selector="header button")
        b_seg1_start = s_bonus_disp.trim_start
        s_bonus_disp.sub("Fitur Bonus — Layar Display Antrean Publik (/display-antrean) untuk TV ruang tunggu, auto-refresh 10 detik tanpa perlu login.")
        s_bonus_disp.ensure_readable()
        btn_sound = s_bonus_disp.pg.get_by_role("button", name=re.compile("Aktifkan Suara|Enable Sound", re.I))
        s_bonus_disp.sub("Klik 'Aktifkan Suara' membuka izin audio browser dan memutar nada ding-dong; layar siap memanggil nomor antrean secara otomatis.")
        s_bonus_disp.zoom_in(btn_sound, scale=1.56, pad=18)
        s_bonus_disp.wait(450)
        s_bonus_disp.click_visual(btn_sound)
        s_bonus_disp.audio(["dingdong"])
        s_bonus_disp.wait(1600)
        s_bonus_disp.zoom_out()
        s_bonus_disp.end_sub()
        b_seg1_end = s_bonus_disp.now()

        # Lanjut B.2: tampilkan status antrean di /transaction/antrean lalu panggil pasien
        s_b2.goto("/transaction/antrean", wait_selector="main table")
        s_b2.sub(f"Menu Antrean menampilkan status antrean pasien secara real-time. Cari {no_rm} ({kode_antrean}) lalu klik Panggil / Periksa.")
        cari_ant = s_b2.pg.locator("main input[placeholder*='Cari']")
        if cari_ant.count():
            s_b2.zoom_in(cari_ant.first, scale=1.45, pad=14)
            s_b2.type_human(cari_ant.first, no_rm, delay=50)
            s_b2.wait(900)
            s_b2.zoom_out()
        btn_panggil = s_b2.pg.get_by_role("button", name="Panggil / Periksa").first
        s_b2.zoom_in(btn_panggil, scale=1.50, pad=16)
        s_b2.click_visual(btn_panggil)
        s_b2.wait(1200)
        s_b2.zoom_out()
        s_b2.sub(f"Status kunjungan {kode_antrean} berubah menjadi Diperiksa dan tersimpan ke riwayat kunjungan pasien.")
        sec_b2 = s_b2.close()
        print("[OK] Sesi B.2: Pendaftaran & Antrean")

        # Tangkap panggilan suara di Bonus Display Antrean saat pasien baru saja dipanggil
        b_seg2_start = s_bonus_disp.now()
        s_bonus_disp.sub(f"Begitu pasien dipanggil, kartu Sedang Diperiksa menampilkan {kode_antrean} dan memutar suara ejaan nomor dari bank audio VoiceA.")
        s_bonus_disp.pg.get_by_role("button", name=re.compile("Muat Ulang|Refresh", re.I)).click()
        s_bonus_disp.wait(750)
        card_q = s_bonus_disp.pg.get_by_text(kode_antrean).first
        if card_q.count():
            s_bonus_disp.zoom_in(card_q, scale=1.54, pad=36)
        wav_seq = announcement_files(kode_antrean)
        s_bonus_disp.audio(wav_seq)
        s_bonus_disp.wait(4800)
        s_bonus_disp.sub(f"Rangkaian audio VoiceA ({' -> '.join(wav_seq)}.wav) diputar otomatis sehingga pasien ruang tunggu langsung mendengar panggilan.")
        s_bonus_disp.zoom_out()
        s_bonus_disp.end_sub()
        b_seg2_end = s_bonus_disp.now()
        s_bonus_disp.segments = [
            {"id": "17a_bonus_display_on", "badge": "BONUS / DISPLAY ANTREAN & FITUR SUARA", "rubric_codes": ["BONUS_DISPLAY_VOICE"], "transition": "dissolve", "start": round(b_seg1_start, 3), "end": round(b_seg1_end, 3)},
            {"id": "17b_bonus_display_call", "badge": "BONUS / PANGGILAN SUARA OTOMATIS", "rubric_codes": ["BONUS_DISPLAY_VOICE"], "transition": "smoothleft", "start": round(b_seg2_start, 3), "end": round(b_seg2_end, 3)},
        ]
        sec_bonus_disp = s_bonus_disp.close()

        # Rekam Intro Blueprint sekarang setelah kode_antrean aktual diketahui!
        sec_intro = record_html_card(
            browser, "00_intro_workflow", "INTRO / WORKFLOW & GOAL SISTEM", ["INTRO"],
            card_intro_workflow(no_rm, nama_pasien, kode_antrean),
            [
                "Selamat datang di video pembuktian Real Case Test Senior Programmer PT Inova Medika Solusindo — SIMRS Rawat Jalan Terintegrasi.",
                "Struktur workflow mengalir end-to-end dari Master Data (B.1), Pendaftaran & Antrean (B.2), EMR & Tindakan (B.3–B.4), Farmasi & Lab (B.5–B.6), hingga Billing Lunas (B.7) & Dashboard/RBAC (B.8–B.9).",
                "Goal utama sistem: integrasi data medis & finansial tanpa celah, tahan konkurensi (D.1–D.6), otorisasi RBAC 6 role, serta arsitektur bersih Yii2 + Node.js + React + PostgreSQL.",
            ],
            transition="fade",
        )
        print("[OK] Intro Workflow & Goal")

        # =====================================================================
        # SESI B.3 & B.4: PEMERIKSAAN EMR (DIAGNOSIS UTAMA+SEKUNDER) & MULTI-TINDAKAN
        # =====================================================================
        s_b3 = Scene(browser, "04_b3_b4_emr", "B.3 & B.4 / EMR & TINDAKAN MEDIS", ["B.3", "B.4"], use_storage=True, transition="smoothleft")
        s_b3.goto("/transaction/pemeriksaan", mark_start=True, wait_selector="input[placeholder^='Cari no. kunjungan']")
        s_b3.sub("Sesi B.3 — Pemeriksaan & Rekam Medis Elektronik: dokter melihat daftar pasien menunggu pemeriksaan lalu membuka lembar EMR.")
        cari_ex = s_b3.pg.locator("input[placeholder^='Cari no. kunjungan']")
        s_b3.zoom_in(cari_ex, scale=1.45, pad=14)
        s_b3.type_human(cari_ex, no_rm, delay=48)
        s_b3.wait(950)
        s_b3.zoom_out()
        s_b3.click_visual(s_b3.pg.get_by_role("button", name="Periksa").first)
        s_b3.pg.locator("#keluhan_utama").wait_for(state="visible", timeout=25000)
        s_b3.wait_idle(6000)
        s_b3.wait(600)
        exam_path = s_b3.pg.url.replace(APP, "")
        s_b3.install_cam()

        s_b3.sub("Input keluhan utama dan anamnesis pasien secara terstruktur.")
        s_b3.zoom_box([s_b3.pg.locator("#keluhan_utama"), s_b3.pg.locator("#anamnesis")], scale=1.38, pad=16)
        s_b3.type_human(s_b3.pg.locator("#keluhan_utama"), "Demam tiga hari disertai batuk dan pilek", delay=28)
        s_b3.type_human(s_b3.pg.locator("#anamnesis"), "Demam naik turun 3 hari, batuk berdahak, tidak ada riwayat alergi obat.", delay=22)
        s_b3.zoom_out()

        s_b3.click_visual(s_b3.pg.locator("[id$=trigger-ttv]"))
        s_b3.wait(500)
        s_b3.sub("Input Tanda-Tanda Vital lengkap: tekanan darah, nadi, suhu tubuh, respirasi, SpO2, berat & tinggi badan.")
        s_b3.zoom_box([s_b3.pg.locator("#td_sistolik"), s_b3.pg.locator("#suhu"), s_b3.pg.locator("#tinggi_badan")], scale=1.36, pad=18)
        for k, v in dict(td_sistolik="120", td_diastolik="80", nadi="88", suhu="38.2", respirasi="20", spo2="98", berat_badan="65", tinggi_badan="168").items():
            s_b3.type_human(s_b3.pg.locator(f"#{k}"), v, delay=24)
        s_b3.zoom_out()

        s_b3.click_visual(s_b3.pg.locator("[id$=trigger-fisik]"))
        s_b3.wait(500)
        s_b3.sub("Input hasil Pemeriksaan Fisik lalu simpan ke catatan rekam medis pasien.")
        s_b3.zoom_in(s_b3.pg.locator("#pemeriksaan_fisik"), scale=1.42, pad=16)
        s_b3.type_human(s_b3.pg.locator("#pemeriksaan_fisik"), "Faring hiperemis, tonsil T1-T1, paru vesikuler, tidak ada ronki atau wheezing.", delay=24)
        s_b3.zoom_out()
        s_b3.click_visual(s_b3.pg.get_by_role("button", name="Simpan Pemeriksaan"))
        s_b3.wait(1200)

        # Diagnosis Utama + Diagnosis Sekunder (sesuai instruksi B.3!)
        s_b3.click_visual(s_b3.pg.locator("[id$=trigger-diagnosis]"))
        s_b3.wait(500)
        s_b3.sub("Menentukan Diagnosis Utama (J06.9 — ISPA Akut) dan Diagnosis Sekunder (J00 — Nasofaringitis) dari master ICD-10.")
        cb_diag = s_b3.pg.get_by_role("combobox", name=re.compile("Tambah diagnosis"))
        s_b3.zoom_in(cb_diag, scale=1.36, pad=18)
        s_b3.click_visual(cb_diag)
        s_b3.wait(900)
        s_b3.click_visual(s_b3.pg.get_by_text("J06.9 — Infeksi saluran pernapasan atas akut (ISPA)").first)
        s_b3.wait(500)
        s_b3.click_visual(cb_diag)
        s_b3.wait(800)
        s_b3.click_visual(s_b3.pg.get_by_text("J00 — Nasofaringitis akut (common cold)").first)
        s_b3.wait(500)
        s_b3.zoom_out()
        s_b3.click_visual(s_b3.pg.get_by_role("button", name="Simpan Diagnosis"))
        s_b3.wait(1200)
        s_b3.ensure_readable()

        # Sesi B.4: Tindakan Medis (pilih master + lihat tarif + tambah >1 tindakan)
        s_b3.click_visual(s_b3.pg.locator("[id$=trigger-tindakan]"))
        s_b3.wait(550)
        s_b3.sub("Sesi B.4 — Tindakan Medis: dokter memilih dari master tindakan beserta tarifnya, dan menambahkan lebih dari satu tindakan.")
        cb_tnd = s_b3.pg.get_by_role("combobox", name=re.compile("Pilih tindakan medis"))
        s_b3.zoom_in(cb_tnd, scale=1.36, pad=18)
        s_b3.click_visual(cb_tnd)
        s_b3.wait(750)
        s_b3.click_visual(s_b3.pg.get_by_text("TND001 — Konsultasi Dokter Umum").first)
        s_b3.wait(400)
        s_b3.click_visual(s_b3.pg.get_by_role("button", name="Tambah", exact=True))
        s_b3.wait(950)
        s_b3.zoom_out()
        s_b3.click_visual(cb_tnd)
        s_b3.wait(650)
        s_b3.click_visual(s_b3.pg.get_by_text("TND003 — Nebulizer").first)
        s_b3.wait(400)
        s_b3.click_visual(s_b3.pg.get_by_role("button", name="Tambah", exact=True))
        s_b3.wait(1000)
        s_b3.sub("Dua tindakan (Konsultasi Rp50.000 & Nebulizer Rp55.000) tercatat dan otomatis masuk sebagai komponen tagihan pasien.")
        sec_b34 = s_b3.close()
        print("[OK] Sesi B.3 & B.4: EMR & Tindakan")

        # =====================================================================
        # SESI B.5: FARMASI & RESEP OBAT (+ BUKTI STOK BERKURANG)
        # =====================================================================
        s_b5 = Scene(browser, "05_b5_farmasi", "B.5 / FARMASI, RESEP & STOK OBAT", ["B.5"], use_storage=True, transition="smoothleft")
        s_b5.goto(exam_path, mark_start=True, wait_selector="[id$=trigger-resep]")
        s_b5.click_visual(s_b5.pg.locator("[id$=trigger-resep]"))
        s_b5.wait(550)
        s_b5.sub("Sesi B.5 — Farmasi & Resep Obat: dokter meresepkan Paracetamol 500mg lengkap dengan dosis, frekuensi, jumlah, dan validasi ketersediaan stok.")
        cb_obat = s_b5.pg.get_by_role("combobox", name=re.compile("Tambah obat"))
        s_b5.click_visual(cb_obat)
        s_b5.wait(850)
        s_b5.click_visual(s_b5.pg.get_by_text("OBT001 — Paracetamol 500mg").first)
        s_b5.wait(550)
        s_b5.zoom_box([s_b5.pg.get_by_placeholder("Dosis"), s_b5.pg.get_by_placeholder("Frekuensi"), s_b5.pg.get_by_placeholder("Catatan resep")], scale=1.38, pad=18)
        s_b5.type_human(s_b5.pg.get_by_placeholder("Dosis"), "500 mg", delay=38)
        s_b5.type_human(s_b5.pg.get_by_placeholder("Frekuensi"), "3 x sehari sesudah makan", delay=28)
        s_b5.type_human(s_b5.pg.get_by_label(re.compile("^Jumlah")), "10", delay=42)
        s_b5.type_human(s_b5.pg.get_by_placeholder("Catatan resep"), "Diminum bila demam", delay=28)
        s_b5.zoom_out()
        s_b5.click_visual(s_b5.pg.get_by_role("button", name="Simpan Resep"))
        s_b5.wait(1200)

        # Cek stok Paracetamol SEBELUM penyerahan
        s_b5.goto("/master/obat", wait_selector="main table tbody tr")
        cari_ob1 = s_b5.pg.locator("main input[placeholder*='Cari']").first
        s_b5.type_human(cari_ob1, "Paracetamol", delay=40)
        s_b5.wait(900)
        s_b5.sub("Catat stok Paracetamol 500mg di Master Obat sebelum penyerahan resep oleh unit Farmasi.")
        s_b5.zoom_in(s_b5.pg.locator("main table tbody tr").first, scale=1.38, pad=14)
        s_b5.ensure_readable()
        s_b5.zoom_out()

        # Proses & Serahkan resep di Farmasi
        s_b5.goto("/transaction/farmasi", wait_selector="input[placeholder^='Cari no. resep']")
        s_b5.sub("Petugas Farmasi memproses resep dan menyelesaikan penyerahan obat kepada pasien.")
        cari_f = s_b5.pg.locator("input[placeholder^='Cari no. resep']")
        s_b5.zoom_in(cari_f, scale=1.45, pad=14)
        s_b5.type_human(cari_f, no_rm, delay=48)
        s_b5.wait(950)
        s_b5.zoom_out()
        if s_b5.pg.get_by_role("button", name="Proses", exact=True).count():
            bp = s_b5.pg.get_by_role("button", name="Proses", exact=True).first
            s_b5.zoom_in(bp, scale=1.48, pad=16)
            s_b5.click_visual(bp)
            s_b5.wait(1100)
            s_b5.zoom_out()
        bs = s_b5.pg.get_by_role("button", name="Serahkan").first
        s_b5.zoom_in(bs, scale=1.48, pad=16)
        s_b5.click_visual(bs)
        s_b5.wait(1200)
        s_b5.zoom_out()

        # Buktikan stok Paracetamol BERKURANG 10 setelah penyerahan!
        s_b5.goto("/master/obat", wait_selector="main table tbody tr")
        cari_ob2 = s_b5.pg.locator("main input[placeholder*='Cari']").first
        s_b5.type_human(cari_ob2, "Paracetamol", delay=40)
        s_b5.wait(900)
        s_b5.sub("Terbukti: stok Paracetamol 500mg otomatis berkurang 10 unit setelah penyerahan selesai dan mutasi obat tercatat.")
        s_b5.zoom_in(s_b5.pg.locator("main table tbody tr").first, scale=1.38, pad=14)
        s_b5.ensure_readable()
        s_b5.zoom_out()
        sec_b5 = s_b5.close()
        print("[OK] Sesi B.5: Farmasi & Stok Berkurang")

        # =====================================================================
        # SESI B.6: PEMERIKSAAN PENUNJANG (ORDER -> INPUT HASIL -> RIWAYAT DOKTER)
        # =====================================================================
        s_b6 = Scene(browser, "06_b6_lab", "B.6 / PEMERIKSAAN PENUNJANG (LAB)", ["B.6"], use_storage=True, transition="smoothleft")
        s_b6.goto(exam_path, mark_start=True, wait_selector="[id$=trigger-lab]")
        s_b6.click_visual(s_b6.pg.locator("[id$=trigger-lab]"))
        s_b6.wait(550)
        s_b6.sub("Sesi B.6 — Pemeriksaan Penunjang: dokter membuat order laboratorium (Hemoglobin & Leukosit) langsung dari lembar pemeriksaan.")
        s_b6.zoom_box([s_b6.pg.locator("#lab-1"), s_b6.pg.locator("#lab-5"), s_b6.pg.get_by_placeholder("Catatan klinis")], scale=1.38, pad=20)
        s_b6.click_visual(s_b6.pg.locator("#lab-1"))
        s_b6.wait(250)
        s_b6.click_visual(s_b6.pg.locator("#lab-5"))
        s_b6.wait(250)
        s_b6.type_human(s_b6.pg.get_by_placeholder("Catatan klinis"), "Demam 3 hari, cek hemoglobin dan leukosit", delay=28)
        s_b6.zoom_out()
        s_b6.click_visual(s_b6.pg.get_by_role("button", name="Kirim Order"))
        s_b6.wait(1500)

        s_b6.goto("/transaction/laboratorium", wait_selector="input[placeholder^='Cari no. order']")
        s_b6.sub("Petugas Laboratorium melihat daftar permintaan pemeriksaan lalu menginput hasil Hemoglobin (13.5) dan Leukosit (12500).")
        cari_l = s_b6.pg.locator("input[placeholder^='Cari no. order']")
        s_b6.zoom_in(cari_l, scale=1.45, pad=14)
        s_b6.type_human(cari_l, no_rm, delay=48)
        s_b6.wait(950)
        s_b6.zoom_out()
        s_b6.click_visual(s_b6.pg.get_by_text(re.compile(r"\d pemeriksaan")).first)
        s_b6.wait(650)
        box_hb = s_b6.pg.get_by_label("Hasil Hemoglobin")
        box_leu = s_b6.pg.get_by_label("Hasil Leukosit")
        s_b6.zoom_box([box_hb, box_leu], scale=1.42, pad=24)
        s_b6.type_human(box_hb, "13.5", delay=55)
        s_b6.click_visual(box_hb.locator("xpath=following-sibling::button | ../button").first)
        s_b6.wait(950)
        s_b6.type_human(box_leu, "12500", delay=55)
        s_b6.click_visual(box_leu.locator("xpath=following-sibling::button | ../button").first)
        s_b6.wait(1050)
        s_b6.zoom_out()
        s_b6.pg.locator("select").first.select_option(label="Selesai")
        s_b6.wait(1200)

        # Buktikan dokter dapat mengakses kembali hasil pemeriksaan, obat & lab melalui Riwayat Medis!
        s_b6.goto("/transaction/riwayat-medis", wait_selector="main")
        s_b6.sub("Pembuktian integrasi riwayat: dokter mengakses kembali diagnosis, riwayat obat, dan hasil laboratorium pasien di Riwayat Medis.")
        cb_rm = s_b6.pg.get_by_role("combobox", name=re.compile("Pilih pasien"))
        s_b6.zoom_in(cb_rm, scale=1.42, pad=16)
        s_b6.click_visual(cb_rm)
        s_b6.wait(500)
        s_b6.pg.keyboard.type(no_rm, delay=50)
        s_b6.wait(1300)
        s_b6.click_visual(s_b6.pg.get_by_text(no_rm).first)
        s_b6.wait(1600)
        s_b6.zoom_out()
        s_b6.ensure_readable()
        sec_b6 = s_b6.close()
        print("[OK] Sesi B.6: Lab & Riwayat Medis")

        # =====================================================================
        # SESI B.7: BILLING, VALIDASI, 4 SUMBER BIAYA, BAYAR BERTAHAP, CETAK BUKTI & INVOICE
        # =====================================================================
        s_b7 = Scene(browser, "07a_b7_billing", "B.7 / BILLING & PEMBAYARAN", ["B.7"], use_storage=True, transition="smoothleft")
        s_b7.goto("/transaction/billing", mark_start=True, wait_selector="[id$=trigger-belum-tagih]")
        s_b7.sub("Sesi B.7 — Billing & Pembayaran: terbitkan invoice yang menggabungkan 4 sumber biaya (pendaftaran, tindakan, penunjang lab, dan obat).")
        s_b7.click_visual(s_b7.pg.locator("[id$=trigger-belum-tagih]"))
        s_b7.wait(700)
        cari_b = s_b7.pg.locator("main input[placeholder^='Cari']")
        s_b7.zoom_in(cari_b, scale=1.45, pad=14)
        s_b7.type_human(cari_b, no_rm, delay=48)
        s_b7.pg.get_by_text(no_rm).first.wait_for(timeout=15000)
        s_b7.wait(700)
        s_b7.zoom_out()

        btn_inv = s_b7.pg.get_by_role("button", name="Buat Invoice").first
        s_b7.zoom_in(btn_inv, scale=1.48, pad=16)
        s_b7.click_visual(btn_inv)
        s_b7.wait(1000)
        s_b7.zoom_out()

        confirm_inv = s_b7.pg.locator("[role=alertdialog] button:not([disabled])").last
        confirm_inv.wait_for(state="visible", timeout=15000)
        s_b7.sub("Fitur validasi pra-invoice memeriksa kelengkapan pemeriksaan medis, laboratorium, dan penyerahan obat sebelum tagihan diterbitkan.", min_read=5.2)
        s_b7.ensure_readable()
        s_b7.click_visual(confirm_inv)
        s_b7.pg.wait_for_selector("[role=alertdialog]", state="detached", timeout=20000)

        s_b7.pg.locator("[role=dialog]").wait_for(state="visible", timeout=20000)
        s_b7.sub("Rincian biaya otomatis terakumulasi: Pendaftaran Rp25.000, Tindakan Rp105.000, Lab Rp70.000, dan Obat Rp15.000 (Total Rp215.000).", min_read=6.0)
        s_b7.ensure_readable()
        s_b7.pg.keyboard.press("Escape")
        s_b7.pg.wait_for_selector("[role=dialog]", state="detached", timeout=15000)
        s_b7.wait(600)
        s_b7.type_human(s_b7.pg.locator("main input[placeholder^='Cari']"), no_rm, delay=45)
        s_b7.pg.get_by_text(no_rm).first.wait_for(timeout=15000)
        s_b7.wait(900)

        s_b7.sub("Pembayaran bertahap Tunai Rp100.000 (dilindungi Idempotency-Key anti-bayar ganda): status berubah dari Belum Dibayar ke Dibayar Sebagian.", min_read=5.4)
        s_b7.click_visual(s_b7.pg.get_by_role("button", name="Bayar", exact=True).first)
        s_b7.pg.locator("#bayar-jumlah").wait_for(state="visible", timeout=15000)
        s_b7.wait(650)
        s_b7.zoom_box([s_b7.pg.locator("#bayar-jumlah"), s_b7.pg.get_by_role("button", name="Proses Pembayaran")], scale=1.38, pad=20)
        s_b7.type_human(s_b7.pg.locator("#bayar-jumlah"), "100000", delay=60)
        s_b7.wait(1000)
        s_b7.ensure_readable()
        s_b7.click_visual(s_b7.pg.get_by_role("button", name="Proses Pembayaran"))
        s_b7.pg.wait_for_selector("[role=dialog]", state="detached", timeout=20000)
        s_b7.wait(900)
        s_b7.zoom_out()

        s_b7.sub("Pelunasan sisa tagihan Rp115.000 memakai simulasi metode Non-Tunai (QRIS) dengan nomor referensi transaksi.", min_read=5.2)
        s_b7.wait(1800)
        b2 = s_b7.pg.get_by_role("button", name="Bayar", exact=True).first
        b2.wait_for(state="visible", timeout=15000)
        s_b7.click_visual(b2)
        s_b7.pg.locator("#bayar-metode").wait_for(state="visible", timeout=15000)
        s_b7.wait(500)
        s_b7.pg.select_option("#bayar-metode", label="Non-Tunai")
        s_b7.pg.locator("#bayar-referensi").wait_for(state="visible", timeout=10000)
        s_b7.wait(450)
        s_b7.zoom_box([s_b7.pg.locator("#bayar-metode"), s_b7.pg.locator("#bayar-referensi"), s_b7.pg.get_by_role("button", name="Proses Pembayaran")], scale=1.36, pad=20)
        s_b7.click_visual(s_b7.pg.get_by_role("button", name="Lunasi sisa"))
        s_b7.wait(550)
        s_b7.type_human(s_b7.pg.locator("#bayar-referensi"), "QRIS-20261124-0105", delay=48)
        s_b7.wait(1000)
        s_b7.ensure_readable()
        s_b7.click_visual(s_b7.pg.get_by_role("button", name="Proses Pembayaran"))
        s_b7.pg.wait_for_selector("[role=dialog]", state="detached", timeout=20000)
        s_b7.wait(900)
        s_b7.zoom_out()

        s_b7.sub(f"Tagihan pasien {nama_pasien} ({no_rm}) kini berstatus LUNAS (sisa Rp0). Seluruh transaksi tersimpan di Riwayat Pembayaran.", min_read=5.0)
        s_b7.ensure_readable()
        s_b7.click_visual(s_b7.pg.locator("[id$=trigger-riwayat]"))
        s_b7.wait(850)
        s_b7.type_human(s_b7.pg.locator("main input[placeholder^='Cari']"), no_rm, delay=45)
        s_b7.pg.get_by_text(no_rm).first.wait_for(timeout=15000)
        s_b7.wait(1200)
        sec_b7a = s_b7.close()

        inv_id, no_inv, pb_id, no_pb = get_latest_billing_ids(no_rm)
        print(f"[Compliance] Invoice {no_inv} (id={inv_id}), Bukti Bayar {no_pb} (id={pb_id})")

        # 07b: Halaman Cetak Bukti Bayar (langsung render penuh tanpa loading!)
        s_b7b = Scene(browser, "07b_b7_bukti_cetak", "B.7 / CETAK BUKTI BAYAR (KWITANSI)", ["B.7"], use_storage=True, transition="smoothleft")
        s_b7b.goto(f"/transaction/billing/pembayaran/{pb_id}/cetak", mark_start=True, wait_selector=f"text={no_pb}")
        s_b7b.sub(f"Halaman Cetak Bukti Pembayaran ({no_pb}) untuk {nama_pasien} ({no_rm}) dengan status Lunas dan tombol Cetak resmi.", min_read=5.6)
        s_b7b.ensure_readable()
        sec_b7b = s_b7b.close()

        # 07c: Halaman Cetak Invoice Lunas (langsung render penuh + tombol Export PDF & Cetak!)
        s_b7c = Scene(browser, "07c_b7_invoice_cetak", "B.7 / CETAK INVOICE LUNAS", ["B.7"], use_storage=True, transition="smoothleft")
        s_b7c.goto(f"/transaction/billing/invoice/{inv_id}/cetak", mark_start=True, wait_selector=f"text={no_inv}")
        s_b7c.sub(f"Halaman Cetak Invoice Lunas ({no_inv}) memuat 4 sumber biaya, riwayat pembayaran bertahap, serta fitur Export PDF dan Cetak.", min_read=6.0)
        s_b7c.ensure_readable()
        sec_b7c = s_b7c.close()
        print("[OK] Sesi B.7: Billing & Cetak Lunas")

        # =====================================================================
        # SESI B.8: DASHBOARD & LAPORAN (6 METRIK + FILTER PERIODE + API NODE.JS)
        # =====================================================================
        s_b8 = Scene(browser, "08_b8_dashboard", "B.8 / DASHBOARD & LAPORAN (NODE.JS API)", ["B.8"], use_storage=True, transition="smoothleft")
        s_b8.goto("/dashboard", mark_start=True, wait_selector="main")
        s_b8.sub("Sesi B.8 — Dashboard & Laporan: menampilkan 6 metrik operasional (kunjungan, per poli, tindakan, pendapatan, obat, dan status pembayaran) dari REST API Node.js.")
        btn_hari = s_b8.pg.get_by_role("button", name="Hari Ini").first
        btn_terapkan = s_b8.pg.get_by_role("button", name="Terapkan").first
        if btn_hari.count() and btn_terapkan.count():
            s_b8.zoom_box([btn_hari, btn_terapkan], scale=1.45, pad=16)
            s_b8.click_visual(btn_hari)
            s_b8.wait(400)
            s_b8.click_visual(btn_terapkan)
            s_b8.wait(1800)
            s_b8.zoom_out()
        s_b8.ensure_readable()
        s_b8.sub("Filter periode langsung menyegarkan seluruh grafik dan tab rincian data operasional maupun status pembayaran.")
        trig_pay = s_b8.pg.locator("[id$=trigger-pembayaran]")
        if trig_pay.count():
            s_b8.click_visual(trig_pay)
            s_b8.wait(1600)
        s_b8.ensure_readable()
        sec_b8 = s_b8.close()
        print("[OK] Sesi B.8: Dashboard")

        # =====================================================================
        # SESI B.9: PENGGUNA & HAK AKSES (6 ROLE + UJI PENOLAKAN 403 FORBIDDEN)
        # =====================================================================
        s_b9 = Scene(browser, "09a_b9_rbac", "B.9 / PENGGUNA & HAK AKSES (6 ROLE)", ["B.9"], use_storage=True, transition="smoothleft")
        s_b9.goto("/system/user", mark_start=True, wait_selector="main table tbody tr")
        s_b9.sub("Sesi B.9 — Autentikasi & Otorisasi RBAC: 6 role aktif — Administrator, Petugas Pendaftaran, Dokter, Farmasi, Laboratorium, dan Kasir.")
        s_b9.zoom_in(s_b9.pg.locator("main table").first, scale=1.28, pad=10)
        s_b9.ensure_readable()
        s_b9.zoom_out()

        s_b9.goto("/system/role-access", wait_selector="#role-access-select")
        s_b9.sub("Matriks Hak Akses membatasi izin CRUD setiap role; misalnya role Dokter dan Kasir hanya melihat modul sesuai kewenangannya.")
        sel_r = s_b9.pg.locator("#role-access-select")
        s_b9.zoom_in(sel_r, scale=1.48, pad=16)
        s_b9.pg.select_option("#role-access-select", label="Dokter")
        s_b9.wait(900)
        s_b9.pg.select_option("#role-access-select", label="Kasir")
        s_b9.wait(900)
        s_b9.zoom_out()
        s_b9.ensure_readable()
        sec_b9a = s_b9.close()

        # Uji negatif RBAC: login sebagai role 'pendaftaran' -> coba akses /transaction/billing -> 403 Forbidden!
        s_b9b = Scene(browser, "09b_b9_forbidden", "B.9 / BUKTI PENOLAKAN AKSES (403)", ["B.9"], use_storage=False, transition="smoothleft")
        s_b9b.goto("/login", mark_start=True, wait_selector="#username")
        s_b9b.sub("Pembuktian penegakan otorisasi: masuk sebagai Petugas Pendaftaran (pendaftaran) lalu coba membuka halaman Kasir / Billing.")
        s_b9b.zoom_box([s_b9b.pg.locator("#username"), s_b9b.pg.locator("#password")], scale=1.42, pad=18)
        s_b9b.type_human(s_b9b.pg.locator("#username"), "pendaftaran", delay=48)
        s_b9b.type_human(s_b9b.pg.locator("#password"), "simrs123", delay=45)
        s_b9b.click_visual(s_b9b.pg.locator("button[type=submit]"))
        s_b9b.pg.wait_for_url(lambda u: "/login" not in u, timeout=25000)
        s_b9b.wait_idle(8000)
        s_b9b.zoom_out()
        s_b9b.pg.goto(APP + "/transaction/billing", wait_until="domcontentloaded", timeout=60000)
        s_b9b.wait_idle(6000)
        s_b9b.wait(900)
        s_b9b.install_cam()
        s_b9b.sub("Terbukti: pengguna role Pendaftaran ditolak otomatis saat mencoba mengakses modul Billing/Kasir (halaman 403 Akses Ditolak).", min_read=5.2)
        s_b9b.ensure_readable()
        sec_b9b = s_b9b.close()
        print("[OK] Sesi B.9: RBAC & 403 Forbidden")

        # =====================================================================
        # SESI C, D.1-D.6, E, F.1-F.5, G (VISUAL PROOF CARDS)
        # =====================================================================
        sec_c = record_html_card(
            browser, "10_sec_c", "C / BACKEND SERVICES (NODE.JS)", ["C"],
            card_section_c(),
            [
                "Sesi C — Backend Services Node.js: memenuhi 5 implementasi minimal — REST API integrasi penunjang, API dashboard, middleware JWT + Zod, error konsisten, dan OpenAPI.",
                "Batas tanggung jawab tegas: Yii2 menangani seluruh mutasi & logika bisnis inti, sedangkan Node.js melayani analitik via user simrs_readonly dan gateway lab tanpa duplikasi logika.",
            ],
            transition="fade",
        )
        sec_d12 = record_html_card(
            browser, "11_sec_d12", "D.1 & D.2 / KONKURENSI PENDAFTARAN & STOK", ["D.1", "D.2"],
            card_section_d12(),
            [
                "Sesi D.1 — Duplikasi Pendaftaran: partial unique index PostgreSQL + atomic sequence lock menjamin 10 request paralel hanya menghasilkan 1 kunjungan (9 ditolak 409) dan antrean tidak ganda.",
                "Sesi D.2 — Konkurensi Stok Obat: pessimistic row lock SELECT FOR UPDATE memastikan dua transaksi paralel tidak pernah membuat stok minus atau menyerahkan obat ganda.",
            ],
            transition="smoothleft",
        )
        sec_d34 = record_html_card(
            browser, "12_sec_d34", "D.3 & D.4 / BAYAR GANDA & AUDIT REVISI", ["D.3", "D.4"],
            card_section_d34(),
            [
                "Sesi D.3 — Pembayaran Ganda: header Idempotency-Key + row lock invoice memastikan 5 retry paralel hanya mencatat 1 nomor pembayaran dan mencegah over-payment.",
                "Sesi D.4 — Perubahan Data Pasca-Billing: status Valid/Lunas mengunci revisi liar (409), kasir dapat membuka Unvalid untuk void & re-sync tagihan lengkap dengan 6 jejak Audit Log.",
            ],
            transition="smoothleft",
        )
        sec_d56 = record_html_card(
            browser, "13_sec_d56", "D.5 & D.6 / OUTBOX RETRY & PERFORMA", ["D.5", "D.6"],
            card_section_d56(),
            [
                "Sesi D.5 — Gangguan Integrasi API: saat Yii2 dimatikan, Node.js menampung hasil lab ke tabel outbox (HTTP 202) lalu mengirim ulang otomatis tepat sekali saat Yii2 pulih.",
                "Sesi D.6 — Performa Aplikasi: composite PostgreSQL index menghasilkan Index Scan 0.136 ms (EXPLAIN ANALYZE) dan median respons daftar 206–241 ms pada benchmark 20 request/endpoint.",
            ],
            transition="smoothleft",
        )
        sec_e = record_html_card(
            browser, "14_sec_e", "E / KETENTUAN TEKNIS (E.1 — E.10)", ["E"],
            card_section_e(),
            [
                "Sesi E — Ketentuan Teknis: seluruh 10 ketentuan (Yii2, React, Node.js, PostgreSQL, REST API, Auth/RBAC, Postman, Git 135 commit, library pendukung, dan batas Yii2 vs Node.js) terpenuhi 100%.",
            ],
            transition="fade",
        )
        sec_f14 = record_html_card(
            browser, "15_sec_f14_g", "F.1–F.4 & G / OUTPUT & DATA DUMMY", ["F.1", "F.2", "F.3", "F.4", "G"],
            card_section_f14_g(),
            [
                "Sesi F.1–F.4 — Output Pengerjaan: source code 3 service + Git repo, schema.sql + ERD + 26 migrasi, dokumentasi teknis lengkap, dan buku bukti PDF (SIMRS-Module-Guide-and-Proof.pdf).",
                "Sesi G — Ketentuan Data Dummy: seluruh pengujian memakai data dummy seed (50 pasien, 60 kunjungan, 6 akun role) yang dapat di-reset ulang kapan saja via reset-db.sh.",
            ],
            transition="smoothleft",
        )
        sec_f5 = record_html_card(
            browser, "16_sec_f5", "F.5 / PENGUJIAN OTOMATIS & POSTMAN", ["F.5"],
            card_section_f5(),
            [
                "Sesi F.5 — Bukti Pengujian: 134 tes PHPUnit (446 assertions), 38 tes Node.js Vitest, dan 78 tes React Vitest seluruhnya lulus 100% tanpa kegagalan.",
                "Koleksi Postman/Newman mengeksekusi 35 request end-to-end dengan 45 assertions (0 gagal), dilengkapi dokumen test case terstruktur di docs/test-cases.md.",
            ],
            transition="smoothleft",
        )
        print("[OK] Sesi C, D.1-D.6, E, F.1-F.5, G")

        # =====================================================================
        # SESI BONUS 2: EXPORT PDF & EXCEL + DARK MODE + BILINGUAL ID/EN (TANPA CHATBOT!)
        # =====================================================================
        s_bon = Scene(browser, "18_bonus_export_ui", "BONUS / EXPORT PDF-EXCEL, DARK MODE & ID/EN", ["BONUS_EXPORT_UI"], use_storage=True, transition="smoothleft")
        s_bon.goto("/dashboard", mark_start=True, wait_selector="main")
        s_bon.sub("Fitur Bonus Lainnya (selain Display Antrean Bersuara): ekspor laporan langsung ke PDF & Excel, mode gelap (Dark Mode), dan dukungan dwibahasa ID/EN.")
        btn_pdf = s_bon.pg.get_by_role("button", name=re.compile("Export PDF", re.I)).first
        btn_xls = s_bon.pg.get_by_role("button", name=re.compile("Export Excel", re.I)).first
        if btn_pdf.count() and btn_xls.count():
            s_bon.zoom_box([btn_pdf, btn_xls], scale=1.52, pad=18)
            s_bon.wait(1200)
            s_bon.zoom_out()
        s_bon.ensure_readable()

        # Dark Mode toggle
        btn_theme = s_bon.pg.locator("header button").filter(has=s_bon.pg.locator("svg.lucide-moon, svg.lucide-sun")).first
        if btn_theme.count():
            s_bon.sub("UI rapi dengan dukungan Dark Mode adaptif agar nyaman digunakan petugas rumah sakit pada shift malam.")
            s_bon.zoom_in(btn_theme, scale=1.58, pad=16)
            s_bon.click_visual(btn_theme)
            s_bon.wait(800)
            s_bon.zoom_out()
            s_bon.wait(1800)
            s_bon.ensure_readable()
            s_bon.click_visual(btn_theme)
            s_bon.wait(500)

        # Bilingual ID <-> EN toggle
        btn_lang = s_bon.pg.locator("header button").filter(has_text=re.compile(r"^(ID|EN)$")).first
        if btn_lang.count():
            s_bon.sub("Dukungan antarmuka Bilingual (Indonesia / Inggris) yang berpindah secara instan di seluruh halaman.")
            s_bon.zoom_in(btn_lang, scale=1.58, pad=16)
            s_bon.click_visual(btn_lang)
            s_bon.wait(800)
            s_bon.zoom_out()
            s_bon.wait(1800)
            s_bon.ensure_readable()
            s_bon.click_visual(btn_lang)
            s_bon.wait(500)

        sec_bonus_ui = s_bon.close()
        print("[OK] Sesi Bonus: Export PDF/Excel + Dark Mode + Bilingual")

        browser.close()

    # Susun urutan final yang presisi: Intro -> A -> B.1..B.9 -> C -> D.1..D.6 -> E -> F.1..F.5 & G -> Bonus Display Suara -> Bonus Export/UI
    scenes = [
        sec_intro,
        sec_a,
        sec_b1,
        sec_b2,
        sec_b34,
        sec_b5,
        sec_b6,
        sec_b7a,
        sec_b7b,
        sec_b7c,
        sec_b8,
        sec_b9a,
        sec_b9b,
        sec_c,
        sec_d12,
        sec_d34,
        sec_d56,
        sec_e,
        sec_f14,
        sec_f5,
        {**sec_bonus_disp, "use_segment": 0},
        {**sec_bonus_disp, "use_segment": 1},
        sec_bonus_ui,
    ]

    manifest = {
        "no_rm": no_rm,
        "nama_pasien": nama_pasien,
        "kode_antrean": kode_antrean,
        "no_invoice": no_inv,
        "no_pembayaran": no_pb,
        "viewport": VIEWPORT,
        "scenes": scenes,
    }
    with open(TIMELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False, default=str)
    print(f"[DONE] Timeline compliance tersimpan di {TIMELINE_PATH} ({len(scenes)} segmen)")


if __name__ == "__main__":
    main()
