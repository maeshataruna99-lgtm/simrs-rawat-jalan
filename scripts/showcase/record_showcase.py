"""Rekam video showcase end-to-end SIMRS Rawat Jalan dengan efek zoom-in/out dan timeline subtitle + audio."""
import json
import os
import re
import subprocess
import time
from playwright.sync_api import sync_playwright

APP = "http://localhost:5173"
SCRATCH = os.environ.get(
    "SHOWCASE_TMP",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tmp"),
)
CLIPS_DIR = os.path.join(SCRATCH, "clips")
STORAGE_PATH = os.path.join(SCRATCH, "admin_state.json")
TIMELINE_PATH = os.path.join(SCRATCH, "timeline.json")
os.makedirs(CLIPS_DIR, exist_ok=True)

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
    resetInstant() {
      const html = document.documentElement;
      html.style.transition = 'none';
      html.style.transform = 'scale(1)';
      spot.style.opacity = '0';
      cursor.style.opacity = '0';
      void html.offsetWidth;
      html.style.transition = 'transform 0.58s cubic-bezier(0.22, 1, 0.36, 1)';
    },
    zoomRect(rect, scale = 1.42, pad = 10) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Keep transform-origin inside viewport so scaled content always fills 100% with zero white edge
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
    moveCursorRect(rect) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      cursor.style.left = `${cx}px`;
      cursor.style.top = `${cy}px`;
      cursor.style.opacity = '1';
    },
    pulseClick() {
      cursor.classList.add('clicking');
      setTimeout(() => cursor.classList.remove('clicking'), 180);
    },
    highlightRect(rect, pad = 10) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      spot.style.left = `${Math.max(4, rect.left - pad)}px`;
      spot.style.top = `${Math.max(4, rect.top - pad)}px`;
      spot.style.width = `${Math.min(W - 8, rect.width + pad * 2)}px`;
      spot.style.height = `${Math.min(H - 8, rect.height + pad * 2)}px`;
      spot.style.opacity = '1';
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


def get_latest_queue_code(no_rm: str, retries: int = 15) -> str:
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
    raise RuntimeError(f"Kunjungan hari ini untuk {no_rm} tidak ditemukan di database.")


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
    def __init__(self, browser, scene_id: str, badge: str, use_storage: bool = True, transition: str = "fade"):
        self.scene_id = scene_id
        self.badge = badge
        self.transition = transition
        self.subtitles = []
        self.audio_cues = []
        self.segments = []  # optional multi-segment split (used by display antrean)
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
        # Jika sudah berada di app dan link sidebar tersedia, gunakan navigasi SPA agar instan tanpa reload Vite
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
        self.pg.wait_for_timeout(700)
        self.install_cam()
        if mark_start:
            self.trim_start = max(0.0, self.now() - 0.15)

    def sub(self, text: str, min_read: float = None):
        """Mulai subtitle baru dengan jaminan waktu baca medium agar teks selalu sempat dibaca sebelum berganti."""
        self.ensure_readable()
        t = self.now()
        if self._active_sub is not None and self._active_sub["end"] is None:
            self._active_sub["end"] = t
        calc_read = max(3.8, len(text) / 18.5 + 1.25)
        item = {
            "start": t,
            "end": None,
            "text": text,
            "min_read": min_read if min_read is not None else calc_read,
        }
        self.subtitles.append(item)
        self._active_sub = item

    def ensure_readable(self, extra_sec: float = 0.0):
        """Pastikan subtitle aktif sudah tampil cukup lama sebelum lanjut ke subtitle/transisi berikutnya."""
        if self._active_sub is not None and self._active_sub["end"] is None:
            elapsed = self.now() - self._active_sub["start"]
            target = self._active_sub.get("min_read", 3.8) + extra_sec
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
        self.pg.wait_for_timeout(780)

    def zoom_box(self, locators, scale: float = 1.38, pad: int = 16):
        """Zoom ke bounding box gabungan beberapa elemen (mis. satu grup form input)."""
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
        self.pg.wait_for_timeout(780)

    def zoom_out(self, wait_ms: int = 780):
        self.install_cam()
        self.pg.evaluate("() => window.__showcase.zoomOut()")
        self.pg.wait_for_timeout(wait_ms)

    def type_human(self, locator, text: str, delay: int = 46):
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
            "transition": self.transition,
            "video": self.video_path,
            "trim_start": round(self.trim_start, 3),
            "trim_end": round(self.trim_end, 3),
            "subtitles": self.subtitles,
            "audio_cues": self.audio_cues,
            "segments": self.segments,
        }


def main():
    no_rm, nama_pasien = pick_fresh_patient()
    print(f"[Showcase] Pasien terpilih: {no_rm} ({nama_pasien})")
    scenes_meta = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # =====================================================================
        # SCENE 1: LOGIN ADMIN
        # =====================================================================
        s1 = Scene(browser, "01_login", "01 / LOGIN ADMIN", use_storage=False, transition="fade")
        s1.goto("/login", mark_start=True, wait_selector="#username")
        s1.sub("Masuk ke SIMRS Rawat Jalan menggunakan akun Administrator (admin) yang memiliki akses penuh ke seluruh modul.")
        s1.wait(900)

        s1.zoom_box([s1.pg.locator("#username"), s1.pg.locator("#password"), s1.pg.locator("button[type=submit]")], scale=1.45, pad=22)
        s1.type_human(s1.pg.locator("#username"), "admin", delay=65)
        s1.wait(220)
        s1.type_human(s1.pg.locator("#password"), "simrs123", delay=55)
        s1.wait(350)
        s1.click_visual(s1.pg.locator("button[type=submit]"))
        s1.pg.wait_for_url(lambda u: "/login" not in u, timeout=25000)
        s1.wait_idle(8000)
        s1.wait(700)
        s1.install_cam()
        s1.sub("Login berhasil. Halaman Dashboard menampilkan ringkasan kunjungan, antrean poli, dan status operasional hari ini.")
        s1.wait(2200)
        scenes_meta.append(s1.close(save_storage=True))
        print("[OK] Scene 1: Login")

        # =====================================================================
        # SCENE 2: DAFTAR 6 USER & HAK AKSES ROLE (RBAC)
        # =====================================================================
        s2 = Scene(browser, "02_roles", "02 / 6 ROLE & RBAC", use_storage=True, transition="smoothleft")
        s2.goto("/system/user", mark_start=True, wait_selector="main table tbody tr")
        s2.sub("SIMRS memisahkan 6 role operasional: Administrator, Petugas Pendaftaran, Dokter, Farmasi, Laboratorium, dan Kasir.")
        s2.wait(1200)
        table_loc = s2.pg.locator("main table").first
        s2.zoom_in(table_loc, scale=1.28, pad=10)
        s2.sub("Akun default: admin (akses penuh), pendaftaran (registrasi & antrean), dokter (SOAP, tindakan, resep, lab).")
        s2.wait(3100)
        s2.sub("Dilanjutkan farmasi (proses & serah obat), laboratorium (hasil lab), serta kasir (invoice & pembayaran).")
        s2.wait(2900)
        s2.zoom_out()

        s2.goto("/system/role-access", wait_selector="#role-access-select")
        s2.sub("Pada matriks Hak Akses Role, setiap role dibatasi izin CRUD-nya secara ketat sesuai tanggung jawab unit.")
        s2.wait(900)
        sel_role = s2.pg.locator("#role-access-select")
        s2.zoom_in(sel_role, scale=1.50, pad=18)
        s2.pg.select_option("#role-access-select", label="Dokter")
        s2.wait(950)
        s2.zoom_out()
        s2.sub("Contoh: Role Dokter hanya mendapat akses Pemeriksaan, Riwayat Medis, Antrean, dan baca Master Medis.")
        s2.wait(1800)
        s2.zoom_in(sel_role, scale=1.50, pad=18)
        s2.pg.select_option("#role-access-select", label="Kasir")
        s2.wait(950)
        s2.zoom_out()
        s2.sub("Role Kasir fokus pada Billing dan Dashboard Keuangan. Pada demo ini, akun admin menjalankan seluruh alur secara berurutan.")
        s2.wait(2100)
        scenes_meta.append(s2.close())
        print("[OK] Scene 2: Roles & RBAC")

        # =====================================================================
        # SCENE 3: PENDAFTARAN PASIEN
        # =====================================================================
        s3 = Scene(browser, "03_pendaftaran", "03 / PENDAFTARAN PASIEN", use_storage=True, transition="smoothleft")
        s3.goto("/transaction/pendaftaran", mark_start=True, wait_selector="input[placeholder^='Ketik No. RM']")
        s3.sub(f"Tahap Pendaftaran: cari data pasien berdasarkan No. RM ({no_rm} — {nama_pasien}).")
        s3.wait(700)

        cari_rm = s3.pg.locator("input[placeholder^='Ketik No. RM']")
        s3.zoom_in(cari_rm, scale=1.48, pad=16)
        s3.type_human(cari_rm, no_rm, delay=55)
        s3.wait(1000)
        s3.click_visual(s3.pg.get_by_role("button", name=re.compile(no_rm)).first)
        s3.wait(500)
        s3.zoom_out()

        s3.sub("Pilih Poli Umum, jadwal dokter dr. Budi Santoso, dan jenis penjamin Umum lalu daftarkan kunjungan.")
        s3.zoom_box([s3.pg.locator("#daftar-poli"), s3.pg.locator("#daftar-jadwal"), s3.pg.locator("#daftar-penjamin")], scale=1.40, pad=18)
        s3.pg.select_option("#daftar-poli", label="Poli Umum")
        s3.wait(800)
        jadwal_val = s3.pg.evaluate(
            "[...document.querySelectorAll('#daftar-jadwal option')].find(o => o.textContent.includes('Budi Santoso'))?.value || document.querySelectorAll('#daftar-jadwal option')[1]?.value"
        )
        if jadwal_val:
            s3.pg.select_option("#daftar-jadwal", value=jadwal_val)
        s3.wait(450)
        s3.pg.select_option("#daftar-penjamin", index=0)
        s3.wait(450)
        s3.zoom_out()

        btn_daftar = s3.pg.get_by_role("button", name="Daftarkan Kunjungan")
        s3.zoom_in(btn_daftar, scale=1.45, pad=16)
        s3.click_visual(btn_daftar)
        s3.wait(1400)
        s3.zoom_out()

        kode_antrean = get_latest_queue_code(no_rm)
        print(f"[Showcase] Kode antrean terbentuk: {kode_antrean}")
        s3.sub(f"Pendaftaran berhasil! Pasien {nama_pasien} otomatis memperoleh nomor antrean {kode_antrean} dengan status Menunggu.")
        s3.wait(2100)
        scenes_meta.append(s3.close())
        print("[OK] Scene 3: Pendaftaran")

        # =====================================================================
        # SCENE 4A + 4B + 4C: DISPLAY ANTREAN (AKTIFKAN SUARA) -> PANGGIL -> SUARA BERBUNYI
        # =====================================================================
        # Buka konteks display antrean tetap hidup selama pemanggilan agar pendeteksian panggilan baru bekerja real-time
        s4_disp = Scene(browser, "04a_display_enable", "04 / DISPLAY ANTREAN & FITUR SUARA", use_storage=False, transition="dissolve")
        s4_disp.goto("/display-antrean", mark_start=True, wait_selector="header button")
        seg_a_start = s4_disp.trim_start
        s4_disp.sub("Layar Display Antrean (/display-antrean) bersifat publik untuk TV ruang tunggu dan otomatis memuat ulang setiap 10 detik.")
        s4_disp.wait(2300)

        btn_sound = s4_disp.pg.get_by_role("button", name=re.compile("Aktifkan Suara|Enable Sound", re.I))
        s4_disp.sub("Tersedia fitur panggilan suara otomatis memakai bank audio WAV per karakter. Klik 'Aktifkan Suara' untuk membuka izin audio browser.")
        s4_disp.zoom_in(btn_sound, scale=1.58, pad=18)
        s4_disp.wait(500)
        s4_disp.click_visual(btn_sound)
        s4_disp.audio(["dingdong"])
        s4_disp.wait(1500)
        s4_disp.sub("Bunyi 'ding-dong' menandakan Suara Aktif. Layar kini siap memanggil nomor antrean baru secara otomatis.")
        s4_disp.zoom_out()
        s4_disp.wait(1500)
        s4_disp.end_sub()
        seg_a_end = s4_disp.now()

        # Scene 4B: Admin memanggil pasien di /transaction/antrean
        s4_call = Scene(browser, "04b_panggil_antrean", "04 / PANGGIL ANTREAN POLI", use_storage=True, transition="smoothleft")
        s4_call.goto("/transaction/antrean", mark_start=True)
        s4_call.sub(f"Kembali ke menu Antrean: petugas mencari {no_rm} ({kode_antrean}) lalu memanggil pasien masuk ruang periksa.")
        cari_antrean = s4_call.pg.locator("main input[placeholder*='Cari']")
        if cari_antrean.count():
            s4_call.zoom_in(cari_antrean.first, scale=1.48, pad=16)
            s4_call.type_human(cari_antrean.first, no_rm, delay=55)
            s4_call.wait(900)
            s4_call.zoom_out()
        btn_panggil = s4_call.pg.get_by_role("button", name="Panggil / Periksa").first
        s4_call.zoom_in(btn_panggil, scale=1.52, pad=16)
        s4_call.wait(400)
        s4_call.click_visual(btn_panggil)
        s4_call.wait(1100)
        s4_call.zoom_out()
        s4_call.sub(f"Status kunjungan berubah dari Menunggu ke Diperiksa — memicu panggilan suara di Display Antrean.")
        s4_call.wait(1300)
        s4_call_meta = s4_call.close()

        # Scene 4C: Kembali ke layar Display Antrean -> refresh -> panggilan suara berbunyi!
        seg_c_start = s4_disp.now()
        s4_disp.sub(f"Di TV Ruang Tunggu, nomor {kode_antrean} masuk ke kartu 'Sedang Diperiksa' dan sistem membacakan nomor antrean otomatis.")
        btn_refresh = s4_disp.pg.get_by_role("button", name=re.compile("Muat Ulang|Refresh", re.I))
        btn_refresh.click()
        s4_disp.wait(700)
        # Zoom ke kartu nomor antrean yang sedang dipanggil
        target_card = s4_disp.pg.get_by_text(kode_antrean).first
        if target_card.count():
            s4_disp.zoom_in(target_card, scale=1.55, pad=36)
        wav_seq = announcement_files(kode_antrean)
        s4_disp.audio(wav_seq)
        s4_disp.wait(4600)
        s4_disp.sub(f"Rangkaian audio VoiceA ({' -> '.join(wav_seq)}.wav) diputar berurutan sehingga panggilan terdengar jelas di ruang tunggu.")
        s4_disp.zoom_out()
        s4_disp.wait(2000)
        s4_disp.end_sub()
        seg_c_end = s4_disp.now()

        s4_disp.segments = [
            {"id": "04a_display_enable", "badge": "04 / DISPLAY ANTREAN & FITUR SUARA", "transition": "dissolve", "start": round(seg_a_start, 3), "end": round(seg_a_end, 3)},
            {"id": "04c_display_announce", "badge": "04 / PANGGILAN SUARA OTOMATIS", "transition": "smoothright", "start": round(seg_c_start, 3), "end": round(seg_c_end, 3)},
        ]
        s4_disp_meta = s4_disp.close()

        # Susun urutan: 04a -> 04b -> 04c
        scenes_meta.append({**s4_disp_meta, "use_segment": 0})
        scenes_meta.append(s4_call_meta)
        scenes_meta.append({**s4_disp_meta, "use_segment": 1})
        print("[OK] Scene 4: Display Antrean + Suara + Panggil")

        # =====================================================================
        # SCENE 5: PEMERIKSAAN MEDIS (SOAP, TTV, DIAGNOSIS ICD-10, TINDAKAN, RESEP, LAB)
        # =====================================================================
        s5 = Scene(browser, "05_pemeriksaan", "05 / PEMERIKSAAN MEDIS (EMR)", use_storage=True, transition="smoothleft")
        s5.goto("/transaction/pemeriksaan", mark_start=True)
        s5.sub("Tahap Pelayanan Medis: buka worklist pemeriksaan, cari pasien, lalu masuk ke lembar Rekam Medis Elektronik.")
        cari_exam = s5.pg.locator("input[placeholder^='Cari no. kunjungan']")
        s5.zoom_in(cari_exam, scale=1.45, pad=14)
        s5.type_human(cari_exam, no_rm, delay=50)
        s5.wait(1000)
        s5.zoom_out()
        s5.click_visual(s5.pg.get_by_role("button", name="Periksa").first)
        s5.pg.locator("#keluhan_utama").wait_for(state="visible", timeout=25000)
        s5.wait_idle(6000)
        s5.wait(700)
        s5.install_cam()

        # 5a. Keluhan & Anamnesis
        s5.sub("Input Anamnesis: mencatat keluhan utama dan riwayat penyakit pasien.")
        s5.zoom_box([s5.pg.locator("#keluhan_utama"), s5.pg.locator("#anamnesis")], scale=1.38, pad=16)
        s5.type_human(s5.pg.locator("#keluhan_utama"), "Demam tiga hari disertai batuk dan pilek", delay=28)
        s5.type_human(s5.pg.locator("#anamnesis"), "Demam naik turun 3 hari, batuk berdahak, tidak ada riwayat alergi obat.", delay=22)
        s5.wait(350)
        s5.zoom_out()

        # 5b. Tanda Vital (TTV)
        s5.click_visual(s5.pg.locator("[id$=trigger-ttv]"))
        s5.wait(500)
        s5.sub("Input Tanda Vital: tekanan darah 120/80 mmHg, nadi 88, suhu 38.2°C, SpO2 98%, berat 65 kg.")
        s5.zoom_box([s5.pg.locator("#td_sistolik"), s5.pg.locator("#suhu"), s5.pg.locator("#tinggi_badan")], scale=1.36, pad=18)
        for k, v in dict(td_sistolik="120", td_diastolik="80", nadi="88", suhu="38.2", respirasi="20", spo2="98", berat_badan="65", tinggi_badan="168").items():
            s5.type_human(s5.pg.locator(f"#{k}"), v, delay=25)
        s5.wait(350)
        s5.zoom_out()

        # 5c. Pemeriksaan Fisik & Simpan
        s5.click_visual(s5.pg.locator("[id$=trigger-fisik]"))
        s5.wait(500)
        s5.sub("Lengkapi hasil Pemeriksaan Fisik lalu simpan catatan pemeriksaan medis.")
        s5.zoom_in(s5.pg.locator("#pemeriksaan_fisik"), scale=1.42, pad=16)
        s5.type_human(s5.pg.locator("#pemeriksaan_fisik"), "Faring hiperemis, tonsil T1-T1, paru vesikuler, tidak ada ronki.", delay=24)
        s5.wait(300)
        s5.zoom_out()
        s5.click_visual(s5.pg.get_by_role("button", name="Simpan Pemeriksaan"))
        s5.wait(1200)

        # 5d. Diagnosis ICD-10
        s5.click_visual(s5.pg.locator("[id$=trigger-diagnosis]"))
        s5.wait(500)
        s5.sub("Pilih kode diagnosis standar ICD-10 (J06.9 — ISPA Akut) lalu simpan diagnosis.")
        cb_diag = s5.pg.get_by_role("combobox", name=re.compile("Tambah diagnosis"))
        s5.zoom_in(cb_diag, scale=1.38, pad=18)
        s5.click_visual(cb_diag)
        s5.wait(1000)
        s5.click_visual(s5.pg.get_by_text("J06.9 — Infeksi saluran pernapasan atas akut (ISPA)").first)
        s5.wait(500)
        s5.zoom_out()
        s5.click_visual(s5.pg.get_by_role("button", name="Simpan Diagnosis"))
        s5.wait(1100)

        # 5e. Tindakan Medis
        s5.click_visual(s5.pg.locator("[id$=trigger-tindakan]"))
        s5.wait(500)
        s5.sub("Tambahkan tindakan medis (Konsultasi Dokter Umum & Nebulizer) yang otomatis terhubung ke tarif billing.")
        cb_tnd = s5.pg.get_by_role("combobox", name=re.compile("Pilih tindakan medis"))
        s5.zoom_in(cb_tnd, scale=1.36, pad=18)
        s5.click_visual(cb_tnd)
        s5.wait(700)
        s5.click_visual(s5.pg.get_by_text("TND001 — Konsultasi Dokter Umum").first)
        s5.wait(350)
        s5.click_visual(s5.pg.get_by_role("button", name="Tambah", exact=True))
        s5.wait(900)
        s5.zoom_out()
        s5.click_visual(cb_tnd)
        s5.wait(600)
        s5.click_visual(s5.pg.get_by_text("TND003 — Nebulizer").first)
        s5.wait(350)
        s5.click_visual(s5.pg.get_by_role("button", name="Tambah", exact=True))
        s5.wait(950)

        # 5f. Resep Obat
        s5.click_visual(s5.pg.locator("[id$=trigger-resep]"))
        s5.wait(500)
        s5.sub("Buat resep elektronik: Paracetamol 500mg sebanyak 10 tablet — langsung masuk ke antrean unit Farmasi.")
        cb_obat = s5.pg.get_by_role("combobox", name=re.compile("Tambah obat"))
        s5.click_visual(cb_obat)
        s5.wait(800)
        s5.click_visual(s5.pg.get_by_text("OBT001 — Paracetamol 500mg").first)
        s5.wait(550)
        s5.zoom_box([s5.pg.get_by_placeholder("Dosis"), s5.pg.get_by_placeholder("Frekuensi"), s5.pg.get_by_placeholder("Catatan resep")], scale=1.38, pad=18)
        s5.type_human(s5.pg.get_by_placeholder("Dosis"), "500 mg", delay=35)
        s5.type_human(s5.pg.get_by_placeholder("Frekuensi"), "3 x sehari sesudah makan", delay=26)
        s5.type_human(s5.pg.get_by_label(re.compile("^Jumlah")), "10", delay=40)
        s5.type_human(s5.pg.get_by_placeholder("Catatan resep"), "Diminum bila demam", delay=28)
        s5.wait(350)
        s5.zoom_out()
        s5.click_visual(s5.pg.get_by_role("button", name="Simpan Resep"))
        s5.wait(1200)

        # 5g. Order Lab
        s5.click_visual(s5.pg.locator("[id$=trigger-lab]"))
        s5.wait(500)
        s5.sub("Kirim order Laboratorium (Hemoglobin & Leukosit) untuk diproses oleh analis laboratorium.")
        s5.zoom_box([s5.pg.locator("#lab-1"), s5.pg.locator("#lab-5"), s5.pg.get_by_placeholder("Catatan klinis")], scale=1.38, pad=20)
        s5.click_visual(s5.pg.locator("#lab-1"))
        s5.wait(250)
        s5.click_visual(s5.pg.locator("#lab-5"))
        s5.wait(250)
        s5.type_human(s5.pg.get_by_placeholder("Catatan klinis"), "Demam 3 hari, cek hemoglobin dan leukosit", delay=26)
        s5.wait(350)
        s5.zoom_out()
        s5.click_visual(s5.pg.get_by_role("button", name="Kirim Order"))
        s5.wait(1600)
        scenes_meta.append(s5.close())
        print("[OK] Scene 5: Pemeriksaan Medis")

        # =====================================================================
        # SCENE 6: LABORATORIUM & FARMASI
        # =====================================================================
        s6 = Scene(browser, "06_lab_farmasi", "06 / LABORATORIUM & FARMASI", use_storage=True, transition="smoothleft")
        s6.goto("/transaction/laboratorium", mark_start=True)
        s6.sub("Unit Laboratorium: cari order pasien, buka item pemeriksaan, lalu input hasil Hemoglobin dan Leukosit.")
        cari_lab = s6.pg.locator("input[placeholder^='Cari no. order']")
        s6.zoom_in(cari_lab, scale=1.45, pad=14)
        s6.type_human(cari_lab, no_rm, delay=50)
        s6.wait(1000)
        s6.zoom_out()
        s6.click_visual(s6.pg.get_by_text(re.compile(r"\d pemeriksaan")).first)
        s6.wait(600)

        box_hb = s6.pg.get_by_label("Hasil Hemoglobin")
        box_leu = s6.pg.get_by_label("Hasil Leukosit")
        s6.zoom_box([box_hb, box_leu], scale=1.42, pad=24)
        s6.type_human(box_hb, "13.5", delay=60)
        s6.click_visual(box_hb.locator("xpath=following-sibling::button | ../button").first)
        s6.wait(1000)
        s6.type_human(box_leu, "12500", delay=60)
        s6.click_visual(box_leu.locator("xpath=following-sibling::button | ../button").first)
        s6.wait(1100)
        s6.zoom_out()

        s6.sub("Tandai status order Lab menjadi Selesai — nilai di luar rentang normal otomatis ditandai flag abnormal.")
        s6.pg.locator("select").first.select_option(label="Selesai")
        s6.wait(1300)

        # Farmasi
        s6.goto("/transaction/farmasi")
        s6.sub("Unit Farmasi: terima resep dokter, proses peracikan obat, lalu serahkan obat ke pasien (stok otomatis terpotong).")
        cari_far = s6.pg.locator("input[placeholder^='Cari no. resep']")
        s6.zoom_in(cari_far, scale=1.45, pad=14)
        s6.type_human(cari_far, no_rm, delay=50)
        s6.wait(1000)
        s6.zoom_out()
        if s6.pg.get_by_role("button", name="Proses", exact=True).count():
            btn_proses = s6.pg.get_by_role("button", name="Proses", exact=True).first
            s6.zoom_in(btn_proses, scale=1.48, pad=16)
            s6.click_visual(btn_proses)
            s6.wait(1100)
            s6.zoom_out()
        btn_serah = s6.pg.get_by_role("button", name="Serahkan").first
        s6.zoom_in(btn_serah, scale=1.48, pad=16)
        s6.click_visual(btn_serah)
        s6.wait(1200)
        s6.zoom_out()
        s6.sub("Obat berhasil diserahkan kepada pasien. Selanjutnya pasien menuju Kasir untuk penyelesaian tagihan.")
        s6.wait(1400)
        scenes_meta.append(s6.close())
        print("[OK] Scene 6: Lab & Farmasi")

        # =====================================================================
        # SCENE 7: KASIR, INVOICE & PEMBAYARAN LUNAS
        # =====================================================================
        s7 = Scene(browser, "07_kasir_bayar", "07 / KASIR & PEMBAYARAN LUNAS", use_storage=True, transition="smoothleft")
        s7.goto("/transaction/billing", mark_start=True)
        s7.sub("Unit Kasir / Billing: buka tab Belum Ditagih untuk menerbitkan invoice dari seluruh tindakan, obat, dan lab.")
        s7.click_visual(s7.pg.locator("[id$=trigger-belum-tagih]"))
        s7.wait(700)
        cari_bill = s7.pg.locator("main input[placeholder^='Cari']")
        s7.zoom_in(cari_bill, scale=1.45, pad=14)
        s7.type_human(cari_bill, no_rm, delay=50)
        s7.pg.get_by_text(no_rm).first.wait_for(timeout=15000)
        s7.wait(700)
        s7.zoom_out()

        btn_inv = s7.pg.get_by_role("button", name="Buat Invoice").first
        s7.zoom_in(btn_inv, scale=1.48, pad=16)
        s7.click_visual(btn_inv)
        s7.wait(1100)
        s7.zoom_out()

        confirm_inv = s7.pg.locator("[role=alertdialog] button:not([disabled])").last
        confirm_inv.wait_for(state="visible", timeout=15000)
        s7.sub("Sebelum invoice dibuat, sistem memvalidasi kelengkapan pemeriksaan medis, laboratorium, dan penyerahan obat.", min_read=5.0)
        s7.ensure_readable()
        s7.click_visual(confirm_inv)
        s7.pg.wait_for_selector("[role=alertdialog]", state="detached", timeout=20000)

        # BillingPage otomatis pindah ke tab Daftar Tagihan dan membuka InvoiceDetailDialog
        s7.pg.locator("[role=dialog]").wait_for(state="visible", timeout=20000)
        s7.sub("Rincian Invoice sebelum pembayaran: seluruh biaya Konsultasi, Nebulizer, Obat Farmasi, dan Lab terakumulasi otomatis.", min_read=5.8)
        s7.ensure_readable()
        # Tutup dialog detail agar tabel Daftar Tagihan terlihat jelas
        s7.pg.keyboard.press("Escape")
        s7.pg.wait_for_selector("[role=dialog]", state="detached", timeout=15000)
        s7.wait(700)
        s7.type_human(s7.pg.locator("main input[placeholder^='Cari']"), no_rm, delay=50)
        s7.pg.get_by_text(no_rm).first.wait_for(timeout=15000)
        s7.wait(1000)

        # Proses Pembayaran Tahap 1 (Tunai sebagian)
        s7.sub("Kasir mendukung pembayaran bertahap dan multi-metode. Contoh pertama: pembayaran sebagian Tunai sebesar Rp100.000.", min_read=5.2)
        s7.click_visual(s7.pg.get_by_role("button", name="Bayar", exact=True).first)
        s7.pg.locator("#bayar-jumlah").wait_for(state="visible", timeout=15000)
        s7.wait(700)
        s7.zoom_box([s7.pg.locator("#bayar-jumlah"), s7.pg.get_by_role("button", name="Proses Pembayaran")], scale=1.38, pad=20)
        s7.type_human(s7.pg.locator("#bayar-jumlah"), "100000", delay=65)
        s7.wait(1100)
        s7.ensure_readable()
        s7.click_visual(s7.pg.get_by_role("button", name="Proses Pembayaran"))
        s7.pg.wait_for_selector("[role=dialog]", state="detached", timeout=20000)
        s7.wait(900)
        s7.zoom_out()

        # Tahan agar status Dibayar Sebagian sempat terbaca jelas
        s7.sub("Status tagihan berubah menjadi Dibayar Sebagian dengan sisa tagihan terhitung otomatis. Lanjutkan pelunasan via Non-Tunai (QRIS).", min_read=5.4)
        s7.wait(2200)
        btn_bayar2 = s7.pg.get_by_role("button", name="Bayar", exact=True).first
        btn_bayar2.wait_for(state="visible", timeout=15000)
        s7.click_visual(btn_bayar2)
        s7.pg.locator("#bayar-metode").wait_for(state="visible", timeout=15000)
        s7.wait(600)
        s7.pg.select_option("#bayar-metode", label="Non-Tunai")
        s7.pg.locator("#bayar-referensi").wait_for(state="visible", timeout=10000)
        s7.wait(500)
        s7.zoom_box([s7.pg.locator("#bayar-metode"), s7.pg.locator("#bayar-referensi"), s7.pg.get_by_role("button", name="Proses Pembayaran")], scale=1.36, pad=20)
        s7.click_visual(s7.pg.get_by_role("button", name="Lunasi sisa"))
        s7.wait(650)
        s7.type_human(s7.pg.locator("#bayar-referensi"), "QRIS-20261124-0099", delay=52)
        s7.wait(1100)
        s7.ensure_readable()
        s7.click_visual(s7.pg.get_by_role("button", name="Proses Pembayaran"))
        s7.pg.wait_for_selector("[role=dialog]", state="detached", timeout=20000)
        s7.wait(1000)
        s7.zoom_out()

        s7.sub(f"Pembayaran BERHASIL LUNAS! Total Rp215.000 terbayar penuh dengan sisa Rp0 untuk pasien {nama_pasien} ({no_rm}).", min_read=5.0)
        s7.ensure_readable()

        # Tampilkan Riwayat Pembayaran -> Cetak Bukti Bayar (tahan nyaman untuk dibaca)
        s7.click_visual(s7.pg.locator("[id$=trigger-riwayat]"))
        s7.wait(900)
        s7.type_human(s7.pg.locator("main input[placeholder^='Cari']"), no_rm, delay=45)
        s7.pg.get_by_text(no_rm).first.wait_for(timeout=15000)
        s7.wait(800)
        s7.sub("Riwayat pembayaran mencatat setiap transaksi Tunai dan Non-Tunai lengkap dengan tombol cetak Bukti Bayar.", min_read=4.8)
        s7.ensure_readable()

        s7.click_visual(s7.pg.get_by_role("link", name="Bukti Bayar").first)
        s7.wait_idle(8000)
        s7.wait(900)
        s7.sub("Halaman Cetak Bukti Pembayaran (Kwitansi) siap dicetak sebagai bukti resmi pelunasan pasien.", min_read=5.2)
        s7.ensure_readable()

        # Kembali ke Billing via React Router link -> Cetak Invoice Lunas (tahan nyaman untuk dibaca)
        back_bill = s7.pg.locator("a[href='/transaction/billing']").first
        if back_bill.count() and back_bill.is_visible():
            s7.click_visual(back_bill)
            s7.pg.locator("main input[placeholder^='Cari']").wait_for(state="visible", timeout=20000)
            s7.wait_idle(6000)
            s7.wait(600)
        else:
            s7.goto("/transaction/billing")
        s7.type_human(s7.pg.locator("main input[placeholder^='Cari']"), no_rm, delay=45)
        s7.pg.get_by_text(no_rm).first.wait_for(timeout=15000)
        s7.wait(900)
        s7.click_visual(s7.pg.get_by_role("link", name="Cetak").first)
        s7.wait_idle(8000)
        s7.wait(1000)
        s7.sub("Halaman Cetak Invoice Lunas menampilkan rincian layanan, riwayat pembayaran, serta status LUNAS.", min_read=5.6)
        s7.ensure_readable()
        scenes_meta.append(s7.close())
        print("[OK] Scene 7: Kasir & Lunas")

        # =====================================================================
        # SCENE 8: VERIFIKASI STATUS SELESAI DI ANTREAN & DASHBOARD
        # =====================================================================
        s8 = Scene(browser, "08_selesai", "08 / RINGKASAN & DASHBOARD", use_storage=True, transition="fade")
        s8.goto("/transaction/antrean", mark_start=True)
        cari_end = s8.pg.locator("main input[placeholder*='Cari']")
        if cari_end.count():
            s8.type_human(cari_end.first, no_rm, delay=40)
            s8.wait(900)
        s8.sub(f"Setelah lunas, status kunjungan {no_rm} di daftar Antrean otomatis berubah menjadi Selesai.")
        s8.wait(2200)

        s8.goto("/dashboard")
        s8.sub("Seluruh metrik kunjungan dan pendapatan hari ini langsung terbarui secara real-time di Dashboard SIMRS.")
        s8.wait(2500)
        scenes_meta.append(s8.close())
        print("[OK] Scene 8: Ringkasan & Dashboard")

        browser.close()

    manifest = {
        "no_rm": no_rm,
        "nama_pasien": nama_pasien,
        "kode_antrean": kode_antrean,
        "viewport": VIEWPORT,
        "scenes": scenes_meta,
    }
    with open(TIMELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False, default=str)
    print(f"[DONE] Timeline tersimpan di {TIMELINE_PATH}")


if __name__ == "__main__":
    main()
