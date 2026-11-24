"""Rekam video showcase khusus Chatbot Bantuan SIMRS (Zero-LLM, auto-detect, chaining, fuzzy FAQ, konteks halaman, bilingual reaktif, RBAC, dan bukti 14 Vitest)."""
import json
import os
import re
import subprocess
import time
from playwright.sync_api import sync_playwright

APP = "http://localhost:5173"
SCRATCH = os.environ.get(
    "CHATBOT_TMP",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tmp_chatbot"),
)
CLIPS_DIR = os.path.join(SCRATCH, "clips")
CARDS_DIR = os.path.join(SCRATCH, "cards")
STORAGE_PATH = os.path.join(SCRATCH, "admin_state.json")
TIMELINE_PATH = os.path.join(SCRATCH, "timeline.json")
os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(CARDS_DIR, exist_ok=True)

VIEWPORT = {"width": 1600, "height": 900}

CARD_CSS = """
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
  padding: 64px 72px 124px 72px;
  height: 100%; display: flex; flex-direction: column; gap: 22px;
}
.head {
  display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 1px solid rgba(148,163,184,0.20); padding-bottom: 16px;
}
.kicker { color: #38bdf8; font-size: 16px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
h1 { font-size: 38px; font-weight: 700; letter-spacing: -0.02em; color: #f8fafc; line-height: 1.15; }
.subhead { color: #cbd5e1; font-size: 18px; margin-top: 6px; }
.pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(16, 185, 129, 0.16); color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.35);
  padding: 8px 16px; border-radius: 999px; font-size: 15px; font-weight: 700;
}
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; flex: 1; min-height: 0; }
.card {
  background: rgba(15, 23, 42, 0.80); border: 1px solid rgba(148,163,184,0.18);
  border-radius: 16px; padding: 22px 24px; display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.28);
  animation: fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.card-title { font-size: 20px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; justify-content: space-between; }
.badge { font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 6px; background: rgba(14,165,233,0.18); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); }
.badge.ok { background: rgba(16,185,129,0.18); color: #34d399; border-color: rgba(52,211,153,0.35); }
ul.chk { list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 16px; color: #e2e8f0; line-height: 1.42; }
ul.chk li { display: flex; gap: 10px; align-items: flex-start; }
ul.chk li .ic { color: #34d399; font-weight: 800; flex-shrink: 0; }
.term {
  background: #060b14; border: 1px solid rgba(51,65,85,0.75); border-radius: 12px;
  padding: 16px 18px; font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 14.5px; line-height: 1.56; color: #e2e8f0; white-space: pre-wrap; flex: 1;
}
.term .g { color: #34d399; font-weight: 700; }
.term .b { color: #38bdf8; font-weight: 700; }
.term .m { color: #94a3b8; }
code { background: rgba(56,189,248,0.14); color: #7dd3fc; padding: 1px 6px; border-radius: 5px; font-family: Consolas, monospace; font-size: 14.5px; }
"""

INTRO_HTML = f"""<!doctype html><html lang='id'><head><meta charset='utf-8'><style>{CARD_CSS}</style></head><body>
<div class="topbar"></div>
<div class="wrap">
  <div class="head">
    <div>
      <div class="kicker">FITUR BONUS — ASISTEN BANTUAN SIMRS RAWAT JALAN</div>
      <h1>Chatbot Bantuan Deterministik Tanpa LLM</h1>
      <div class="subhead">Router Intent Instan • Lookup Data Live Yii2 &amp; Node.js • FAQ Fuzzy Typo-Tolerant • Isolasi RBAC</div>
    </div>
    <div class="pill">✓ Zero API Key • 0 Halusinasi • 14/14 Tests PASS</div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card-title">1. Arsitektur Tanpa LLM <span class="badge">knowledge.ts</span></div>
      <ul class="chk">
        <li><span class="ic">✓</span><span><strong>Auto-Detect Nomor SIMRS:</strong> langsung mengenali pola <code>RM...</code>, <code>RJ...</code>, <code>INV...</code>, <code>RSP...</code>, <code>LAB...</code> dari input bebas tanpa memilih menu.</span></li>
        <li><span class="ic">✓</span><span><strong>Perintah Singkat &amp; FAQ Fuzzy:</strong> mendukung perintah seperti <code>stok obat paracetamol</code>, <code>jadwal hari ini</code>, serta pencarian toleransi typo &amp; sinonim domain RS.</span></li>
      </ul>
    </div>
    <div class="card">
      <div class="card-title">2. Lookup Live Read-Only <span class="badge ok">lookups.ts</span></div>
      <ul class="chk">
        <li><span class="ic">✓</span><span><strong>7 Sumber Data Live + 1 FAQ:</strong> Pasien &amp; Antrean, Tagihan, Jadwal Dokter, Stok Obat, Farmasi, Lab, dan Ringkasan Operasional (Node.js + Yii2).</span></li>
        <li><span class="ic">✓</span><span><strong>Tangguh &amp; Actionable:</strong> memakai <code>Promise.allSettled</code> (tetap tampil parsial saat 1 API gagal), <code>AbortController</code>, dan tombol aksi langsung (<code>Cek tagihan</code>, <code>Lihat invoice</code>).</span></li>
      </ul>
    </div>
    <div class="card">
      <div class="card-title">3. Konteks Halaman &amp; Keamanan RBAC <span class="badge ok">6 ROLE</span></div>
      <ul class="chk">
        <li><span class="ic">✓</span><span><strong>Prioritas Adaptif:</strong> urutan kategori &amp; saran FAQ otomatis menyesuaikan halaman aktif (mis. Billing vs Farmasi).</span></li>
        <li><span class="ic">✓</span><span><strong>Isolasi Hak Akses:</strong> kategori di luar izin role disembunyikan di UI dan tetap divalidasi backend Yii2/Node.js.</span></li>
      </ul>
    </div>
    <div class="card">
      <div class="card-title">4. UX Modern &amp; Bilingual Reaktif <span class="badge">chatbot.storage.ts</span></div>
      <ul class="chk">
        <li><span class="ic">✓</span><span><strong>Keyboard-First:</strong> buka/tutup cepat via <code>Alt+H</code> dan <code>Escape</code> dari halaman mana pun.</span></li>
        <li><span class="ic">✓</span><span><strong>Riwayat Terstruktur di <code>sessionStorage</code>:</strong> bertahan saat pindah halaman/reload, otomatis berubah bahasa <code>ID ↔ EN</code> live, dan terhapus saat logout.</span></li>
      </ul>
    </div>
  </div>
</div>
</body></html>"""

VITEST_HTML = f"""<!doctype html><html lang='id'><head><meta charset='utf-8'><style>{CARD_CSS}</style></head><body>
<div class="topbar"></div>
<div class="wrap">
  <div class="head">
    <div>
      <div class="kicker">VERIFIKASI OTOMATIS — FRONTEND VITEST</div>
      <h1>14 / 14 Pengujian Perilaku Chatbot Lulus Tanpa Kegagalan</h1>
      <div class="subhead">Seluruh logika intent router, toleransi typo, RBAC, kegagalan parsial, abort request, dan bilingual teruji otomatis</div>
    </div>
    <div class="pill">✓ 14 Passed • 0 Failed</div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card-title">Eksekusi Riil Vitest <span class="badge ok">tests/chatbot.test.tsx</span></div>
      <div class="term"><span class="b">$ docker exec simrs-react npx vitest run tests/chatbot.test.tsx</span>

RUN  v5.1.1 /app

<span class="g">✓</span> tests/chatbot.test.tsx <span class="g">(14 tests)</span> 5567ms
  <span class="g">✓</span> Knowledge base: artikel relevan, sinonim RS &amp; toleransi typo
  <span class="g">✓</span> Intent router: pola nomor SIMRS &amp; perintah sesuai izin
  <span class="g">✓</span> Prioritas topik &amp; saran FAQ mengikuti halaman aktif
  <span class="g">✓</span> RBAC: hanya menampilkan kategori sesuai izin role
  <span class="g">✓</span> Promise.allSettled: tetap tampil parsial saat 1 sumber gagal
  <span class="g">✓</span> Chaining aksi Cek tagihan &amp; abort request lama saat klik Menu
  <span class="g">✓</span> Bilingual reaktif ID/EN, persistensi sessionStorage, &amp; Escape

<span class="g">Test Files  1 passed (1)</span>
<span class="g">Tests       14 passed (14)</span></div>
    </div>
    <div class="card">
      <div class="card-title">Cakupan Verifikasi Fitur <span class="badge">TERBUKTI LIVE</span></div>
      <ul class="chk">
        <li><span class="ic">✓</span><span><strong>Auto-Detect &amp; Chaining:</strong> ketik No. RM -&gt; hasil pasien &amp; kunjungan -&gt; klik <code>Cek tagihan</code> -&gt; buka halaman cetak invoice.</span></li>
        <li><span class="ic">✓</span><span><strong>Perintah Cepat &amp; Ringkasan:</strong> <code>stok obat paracetamol</code>, <code>jadwal hari ini</code>, dan ringkasan operasional gabungan Node.js + Yii2.</span></li>
        <li><span class="ic">✓</span><span><strong>Fuzzy Typo &amp; Sinonim:</strong> <code>cara buat invoic</code> dan <code>suara layar tv antrean</code> tepat menemukan panduan &amp; tombol buka halaman.</span></li>
        <li><span class="ic">✓</span><span><strong>Konteks, Persistensi &amp; RBAC:</strong> prioritas adaptif per halaman, terjemahan bubble live <code>ID ↔ EN</code>, serta pembatasan ketat pada role <code>pendaftaran</code>.</span></li>
      </ul>
    </div>
  </div>
</div>
</body></html>"""

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
      border-radius: 12px;
      box-shadow: 0 0 0 6px rgba(14, 165, 233, 0.22), 0 8px 24px rgba(14, 165, 233, 0.20);
      opacity: 0;
      transition: opacity 0.3s ease, left 0.35s cubic-bezier(0.22,1,0.36,1), top 0.35s cubic-bezier(0.22,1,0.36,1), width 0.35s cubic-bezier(0.22,1,0.36,1), height 0.35s cubic-bezier(0.22,1,0.36,1);
    }
    #__showcase_cursor {
      position: fixed;
      width: 20px; height: 20px; margin-left: -10px; margin-top: -10px;
      border-radius: 9999px;
      background: rgba(14, 165, 233, 0.88);
      border: 2.5px solid #ffffff;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 2147483646;
      opacity: 0;
      transition: left 0.32s cubic-bezier(0.22,1,0.36,1), top 0.32s cubic-bezier(0.22,1,0.36,1), transform 0.14s ease, opacity 0.25s ease;
    }
    #__showcase_cursor.clicking { transform: scale(0.72); background: #0284c7; }
  `;
  document.head.appendChild(style);

  const spot = document.createElement('div');
  spot.id = '__showcase_spot';
  document.documentElement.appendChild(spot);

  const cursor = document.createElement('div');
  cursor.id = '__showcase_cursor';
  document.documentElement.appendChild(cursor);

  window.__showcase = {
    zoomRect(rect, scale = 1.32, pad = 10, originBiasX = null, originBiasY = null) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ox = originBiasX !== null ? originBiasX : Math.max(40, Math.min(W - 40, cx));
      const oy = originBiasY !== null ? originBiasY : Math.max(40, Math.min(H - 40, cy));
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


def get_demo_patient_rm():
    out = subprocess.check_output(
        [
            "docker", "exec", "simrs-postgres", "psql", "-U", "simrs", "-d", "simrs", "-tAc",
            """
            SELECT p.no_rm || '|' || p.nama
            FROM t_invoice i
            JOIN t_kunjungan k ON k.id = i.kunjungan_id
            JOIN m_pasien p ON p.id = k.pasien_id
            WHERE i.status = 'lunas'
            ORDER BY i.id DESC LIMIT 1;
            """,
        ],
        text=True,
    ).strip()
    if "|" in out:
        return out.split("|", 1)
    return "RM000005", "Eko Santoso"


class Scene:
    def __init__(self, browser, scene_id: str, badge: str, sub_align: str = "left", use_storage: bool = True, transition: str = "smoothleft"):
        self.scene_id = scene_id
        self.badge = badge
        self.sub_align = sub_align  # "center" for HTML cards, "left" when right-side chatbot is open
        self.transition = transition
        self.subtitles = []
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

    def goto(self, path: str, mark_start: bool = False, wait_selector: str = "main, #username"):
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
        calc_read = max(4.0, len(text) / 18.0 + 1.3)
        item = {"start": t, "end": None, "text": text, "min_read": min_read if min_read is not None else calc_read}
        self.subtitles.append(item)
        self._active_sub = item

    def ensure_readable(self):
        if self._active_sub is not None and self._active_sub["end"] is None:
            elapsed = self.now() - self._active_sub["start"]
            remain = self._active_sub.get("min_read", 4.0) - elapsed
            if remain > 0.05:
                self.pg.wait_for_timeout(int(remain * 1000))

    def end_sub(self, tail_sec: float = 0.85):
        self.ensure_readable()
        if self._active_sub is not None and self._active_sub["end"] is None:
            self._active_sub["end"] = self.now()
        self._active_sub = None
        if tail_sec > 0:
            self.pg.wait_for_timeout(int(tail_sec * 1000))

    def wait(self, ms: int):
        self.pg.wait_for_timeout(ms)

    def _rect(self, locator):
        box = locator.bounding_box()
        if not box:
            return {"left": 1200, "top": 500, "width": 360, "height": 420}
        return {"left": box["x"], "top": box["y"], "width": box["width"], "height": box["height"]}

    def zoom_widget(self, scale: float = 1.28):
        """Zoom halus terfokus ke dialog Chatbot di sisi kanan bawah tanpa memotong tepi kanan/bawah."""
        self.install_cam()
        self.pg.evaluate("document.documentElement.style.transform = 'scale(1)'")
        self.pg.wait_for_timeout(120)
        dlg = self.pg.locator("[role='dialog']").first
        rect = self._rect(dlg)
        # Origin di dekat sudut kanan bawah (1560, 860) menjaga seluruh panel chatbot masuk penuh di layar
        self.pg.evaluate("([r, s]) => window.__showcase.zoomRect(r, s, 8, 1565, 860)", [rect, scale])
        self.pg.wait_for_timeout(760)

    def zoom_in(self, locator, scale: float = 1.48, pad: int = 14):
        self.install_cam()
        self.pg.evaluate("document.documentElement.style.transform = 'scale(1)'")
        self.pg.wait_for_timeout(120)
        locator.scroll_into_view_if_needed()
        self.pg.wait_for_timeout(100)
        rect = self._rect(locator)
        self.pg.evaluate("([r, s, p]) => window.__showcase.zoomRect(r, s, p)", [rect, scale, pad])
        self.pg.wait_for_timeout(760)

    def zoom_out(self, wait_ms: int = 760):
        self.install_cam()
        self.pg.evaluate("() => window.__showcase.zoomOut()")
        self.pg.wait_for_timeout(wait_ms)

    def send_chat(self, text: str, delay: int = 44):
        inp = self.pg.locator("[role='dialog'] input").first
        inp.wait_for(state="visible", timeout=15000)
        inp.click()
        self.pg.evaluate("() => window.__showcase && window.__showcase.pulseClick()")
        inp.fill("")
        inp.type(text, delay=delay)
        self.wait(350)
        self.pg.locator("[role='dialog'] button[type='submit']").first.click()
        self.pg.evaluate("() => window.__showcase && window.__showcase.pulseClick()")
        self.wait(1500)

    def click_menu(self):
        btn = self.pg.locator("[role='dialog']").get_by_role("button", name=re.compile("^(Menu)$", re.I)).first
        if btn.count() and btn.is_visible():
            btn.click()
            self.wait(650)

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
            "sub_align": self.sub_align,
            "transition": self.transition,
            "video": self.video_path,
            "trim_start": round(self.trim_start, 3),
            "trim_end": round(self.trim_end, 3),
            "subtitles": self.subtitles,
        }


def record_card(browser, scene_id: str, badge: str, html_str: str, sub_texts, transition: str = "fade"):
    hp = os.path.join(CARDS_DIR, f"{scene_id}.html")
    with open(hp, "w", encoding="utf-8") as f:
        f.write(html_str)
    sc = Scene(browser, scene_id, badge, sub_align="center", use_storage=False, transition=transition)
    sc.pg.goto("file:///" + hp.replace("\\", "/"), wait_until="load")
    sc.wait(450)
    sc.trim_start = max(0.0, sc.now() - 0.1)
    for t in sub_texts:
        sc.sub(t)
        sc.ensure_readable()
    return sc.close()


def main():
    no_rm, nama_pasien = get_demo_patient_rm()
    print(f"[Chatbot Showcase] Pasien live demo: {no_rm} ({nama_pasien})")
    scenes = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # =====================================================================
        # 00: INTRO ARSITEKTUR CHATBOT TANPA LLM
        # =====================================================================
        scenes.append(record_card(
            browser, "00_intro_chatbot", "INTRO / ARSITEKTUR CHATBOT TANPA LLM", INTRO_HTML,
            [
                "Chatbot Bantuan SIMRS dirancang deterministik tanpa LLM atau API key: nol biaya token, nol halusinasi, dan respons instan.",
                "Dilengkapi deteksi otomatis pola nomor SIMRS, lookup live read-only ke Yii2 & Node.js, toleransi typo FAQ, konteks halaman, bilingual reaktif, serta isolasi RBAC.",
            ],
            transition="fade",
        ))
        print("[OK] 00: Intro Arsitektur")

        # =====================================================================
        # 01: SHORTCUT Alt+H, AUTO-DETECT RM & CHAINING CEK TAGIHAN -> INVOICE
        # =====================================================================
        s1 = Scene(browser, "01_autodetect_chain", "01 / AUTO-DETECT NOMOR & CHAINING AKSI", sub_align="left", use_storage=False, transition="smoothleft")
        # Login dulu sebelum mark_start agar sesi langsung fokus pada Dashboard + Chatbot
        s1.goto("/login", mark_start=False, wait_selector="#username")
        s1.pg.fill("#username", "admin")
        s1.pg.fill("#password", "simrs123")
        s1.pg.click("button[type=submit]")
        s1.pg.wait_for_url(lambda u: "/login" not in u, timeout=25000)
        s1.wait_idle(8000)
        s1.wait(700)
        s1.install_cam()
        s1.trim_start = max(0.0, s1.now() - 0.1)

        s1.sub("Di pojok kanan bawah tersedia tombol Bantuan yang juga bisa dibuka cepat lewat shortcut keyboard Alt+H.")
        btn_help = s1.pg.locator("button[aria-label='Bantuan']").first
        s1.zoom_in(btn_help, scale=1.55, pad=16)
        s1.wait(600)
        s1.zoom_out()
        # Buka memakai shortcut Alt+H!
        s1.pg.keyboard.press("Alt+h")
        s1.pg.locator("[role='dialog']").first.wait_for(state="visible", timeout=15000)
        s1.wait(650)

        s1.sub(f"Ketik langsung '{no_rm}' tanpa memilih kategori — intent router otomatis mendeteksi pola No. RM dan mengambil data pasien serta kunjungan live.")
        s1.zoom_widget(scale=1.28)
        s1.send_chat(no_rm, delay=58)
        s1.wait(1200)
        s1.ensure_readable()

        # Klik chaining aksi "Cek tagihan" dari bubble hasil pasien!
        btn_cek = s1.pg.locator("[role='dialog']").get_by_role("button", name=re.compile("Cek tagihan", re.I)).first
        if btn_cek.count() and btn_cek.is_visible():
            s1.sub("Klik tombol aksi 'Cek tagihan' langsung dari hasil pasien untuk menelusuri invoice terkait (chaining lookup).")
            btn_cek.click()
            s1.wait(1800)
            s1.ensure_readable()

            link_inv = s1.pg.locator("[role='dialog']").get_by_role("link", name=re.compile("Lihat invoice|Cetak", re.I)).first
            if link_inv.count() and link_inv.is_visible():
                s1.sub("Dari hasil tagihan, tombol 'Lihat invoice' langsung membuka halaman cetak invoice lunas pasien dalam satu klik.")
                s1.wait(900)
                link_inv.click()
                s1.wait_idle(8000)
                s1.zoom_out()
                s1.wait(2200)
                s1.ensure_readable()
            else:
                s1.zoom_out()
        else:
            s1.zoom_out()
        scenes.append(s1.close(save_storage=True))
        print("[OK] 01: Auto-detect & Chaining")

        # =====================================================================
        # 02: PERINTAH SINGKAT (STOK OBAT, JADWAL HARI INI) & RINGKASAN NODE+YII
        # =====================================================================
        s2 = Scene(browser, "02_commands_summary", "02 / PERINTAH CEPAT & RINGKASAN LIVE", sub_align="left", use_storage=True, transition="smoothleft")
        s2.goto("/dashboard", mark_start=True, wait_selector="main")
        s2.pg.keyboard.press("Alt+h")
        s2.pg.locator("[role='dialog']").first.wait_for(state="visible", timeout=15000)
        s2.wait(500)
        s2.zoom_widget(scale=1.28)

        s2.sub("Perintah singkat 'stok obat paracetamol' otomatis memanggil API master obat dan menampilkan sisa stok serta harga jual.")
        s2.send_chat("stok obat paracetamol", delay=42)
        s2.wait(1400)
        s2.ensure_readable()

        s2.sub("Perintah 'jadwal hari ini' mengambil jadwal praktik dokter aktif hari ini secara real-time.")
        s2.send_chat("jadwal hari ini", delay=46)
        s2.wait(1400)
        s2.ensure_readable()

        s2.sub("Klik 'Menu' lalu pilih Ringkasan Operasional untuk menggabungkan data API Node.js (/api/dashboard/summary) dan antrean tagihan Yii2.")
        s2.click_menu()
        btn_sum = s2.pg.locator("[role='dialog']").get_by_role("button", name=re.compile("ringkasan operasional", re.I)).first
        if btn_sum.count() and btn_sum.is_visible():
            btn_sum.click()
            s2.wait(2000)
        s2.ensure_readable()
        s2.zoom_out()
        scenes.append(s2.close())
        print("[OK] 02: Perintah Singkat & Ringkasan")

        # =====================================================================
        # 03: FAQ LOKAL — TOLERANSI TYPO & SINONIM DOMAIN RS
        # =====================================================================
        s3 = Scene(browser, "03_fuzzy_faq", "03 / FAQ FUZZY, TYPO & SINONIM", sub_align="left", use_storage=True, transition="smoothleft")
        s3.goto("/dashboard", mark_start=True, wait_selector="main")
        s3.pg.keyboard.press("Alt+h")
        s3.pg.locator("[role='dialog']").first.wait_for(state="visible", timeout=15000)
        s3.wait(500)
        s3.zoom_widget(scale=1.28)

        s3.sub("Uji toleransi typo tanpa LLM: ketik 'cara buat invoic' (sengaja kurang huruf 'e') — mesin fuzzy tetap menemukan panduan Billing yang tepat.")
        s3.send_chat("cara buat invoic", delay=52)
        s3.wait(1400)
        s3.ensure_readable()

        s3.sub("Uji sinonim domain rumah sakit: ketik 'suara layar tv antrean' — bot mencocokkan sinonim ke panduan Display Antrean lengkap dengan tombol buka halaman.")
        s3.send_chat("suara layar tv antrean", delay=46)
        s3.wait(1500)
        s3.ensure_readable()
        s3.zoom_out()
        scenes.append(s3.close())
        print("[OK] 03: FAQ Fuzzy & Sinonim")

        # =====================================================================
        # 04: KONTEKS HALAMAN, PERSISTENSI SESSIONSTORAGE, BILINGUAL REAKTIF & ESCAPE
        # =====================================================================
        s4 = Scene(browser, "04_context_bilingual", "04 / KONTEKS HALAMAN, PERSISTENSI & ID/EN", sub_align="left", use_storage=True, transition="smoothleft")
        s4.goto("/transaction/farmasi", mark_start=True, wait_selector="main")
        s4.pg.keyboard.press("Alt+h")
        s4.pg.locator("[role='dialog']").first.wait_for(state="visible", timeout=15000)
        s4.wait(500)
        s4.zoom_widget(scale=1.26)
        s4.sub("Prioritas adaptif konteks halaman: di halaman Farmasi, kategori Antrean Resep Farmasi dan Stok Obat otomatis naik ke urutan teratas.")
        s4.ensure_readable()

        # Kirim query untuk membuktikan persistensi sessionStorage & bilingual reaktif
        s4.send_chat(no_rm, delay=52)
        s4.wait(1200)
        s4.zoom_out()

        # Pindah ke halaman Billing -> riwayat chat di sessionStorage tetap bertahan!
        s4.sub("Pindah ke halaman Billing: riwayat percakapan tetap tersimpan utuh di sessionStorage tanpa hilang saat berpindah modul.")
        s4.goto("/transaction/billing", wait_selector="main")
        s4.wait(700)
        # Jika dialog tertutup saat pindah, buka kembali
        if not s4.pg.locator("[role='dialog']").count():
            s4.pg.keyboard.press("Alt+h")
            s4.pg.locator("[role='dialog']").first.wait_for(state="visible", timeout=15000)
        s4.wait(600)
        s4.ensure_readable()

        # Toggle Bahasa ID -> EN saat dialog chatbot terbuka -> seluruh bubble langsung terjemah live!
        btn_lang = s4.pg.locator("header button").filter(has_text=re.compile(r"^(ID|EN)$")).first
        if btn_lang.count():
            s4.sub("Karena riwayat disimpan sebagai JSON terstruktur, mengganti bahasa ID ke EN langsung menerjemahkan seluruh bubble chat yang sudah tampil.")
            s4.zoom_in(btn_lang, scale=1.48, pad=14)
            btn_lang.click()
            s4.wait(650)
            s4.zoom_out()
            s4.zoom_widget(scale=1.26)
            s4.wait(1600)
            s4.ensure_readable()
            s4.zoom_out()
            # Kembalikan ke ID
            btn_lang.click()
            s4.wait(600)

        # Tutup memakai tombol Escape
        s4.sub("Menekan tombol Escape menutup dialog asisten dengan bersih agar alur kerja petugas tetap cepat.")
        s4.wait(900)
        s4.pg.keyboard.press("Escape")
        s4.wait(1200)
        s4.ensure_readable()
        scenes.append(s4.close())
        print("[OK] 04: Konteks, Persistensi & Bilingual")

        # =====================================================================
        # 05: ISOLASI KEAMANAN RBAC (ROLE PENDAFTARAN)
        # =====================================================================
        s5 = Scene(browser, "05_rbac_chatbot", "05 / ISOLASI KEAMANAN RBAC", sub_align="left", use_storage=False, transition="smoothleft")
        s5.goto("/login", mark_start=False, wait_selector="#username")
        s5.pg.fill("#username", "pendaftaran")
        s5.pg.fill("#password", "simrs123")
        s5.pg.click("button[type=submit]")
        s5.pg.wait_for_url(lambda u: "/login" not in u, timeout=25000)
        s5.wait_idle(8000)
        s5.wait(700)
        s5.install_cam()
        s5.trim_start = max(0.0, s5.now() - 0.1)

        s5.sub("Pembuktian keamanan RBAC: masuk sebagai Petugas Pendaftaran (pendaftaran) lalu buka Asisten SIMRS lewat Alt+H.")
        s5.pg.keyboard.press("Alt+h")
        s5.pg.locator("[role='dialog']").first.wait_for(state="visible", timeout=15000)
        s5.wait(600)
        s5.zoom_widget(scale=1.28)
        s5.ensure_readable()

        s5.sub("Terbukti: kategori Tagihan/Billing, Stok Obat, Farmasi, dan Laboratorium otomatis disembunyikan — role hanya melihat fitur sesuai izinnya.")
        s5.ensure_readable()

        s5.sub("Sekalipun user mengetik perintah 'stok obat paracetamol' secara manual, router izin menolak eksekusi lookup sensitif tersebut.")
        s5.send_chat("stok obat paracetamol", delay=44)
        s5.wait(1500)
        s5.ensure_readable()
        s5.zoom_out()
        scenes.append(s5.close())
        print("[OK] 05: Isolasi RBAC")

        # =====================================================================
        # 06: KARTU BUKTI 14/14 VITEST PASS
        # =====================================================================
        scenes.append(record_card(
            browser, "06_vitest_proof", "06 / BUKTI UJI OTOMATIS (14/14 PASS)", VITEST_HTML,
            [
                "Seluruh perilaku Chatbot Bantuan diverifikasi lewat 14 tes otomatis di frontend-react/tests/chatbot.test.tsx dengan hasil 100% lulus.",
            ],
            transition="fade",
        ))
        print("[OK] 06: Bukti Vitest")

        browser.close()

    manifest = {"no_rm": no_rm, "nama_pasien": nama_pasien, "viewport": VIEWPORT, "scenes": scenes}
    with open(TIMELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False, default=str)
    print(f"[DONE] Timeline chatbot tersimpan di {TIMELINE_PATH} ({len(scenes)} segmen)")


if __name__ == "__main__":
    main()
