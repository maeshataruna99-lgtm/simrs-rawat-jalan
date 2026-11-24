"""Gabungkan klip Playwright menjadi video showcase MP4 profesional dengan transisi xfade, subtitle ASS, chapter badge, dan audio VoiceA."""
import json
import os
import subprocess
import sys
import textwrap

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRATCH = os.environ.get(
    "SHOWCASE_TMP",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tmp"),
)
TIMELINE_PATH = os.path.join(SCRATCH, "timeline.json")
VOICE_DIR = os.path.join(ROOT, "frontend-react", "public", "audio", "VoiceA")
OUT_DIR = os.path.join(ROOT, "docs", "showcase")
OUT_MP4 = os.path.join(OUT_DIR, "simrs-workflow-showcase.mp4")
CONTACT_PNG = os.path.join(SCRATCH, "contact-sheet.png")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(SCRATCH, exist_ok=True)

W, H, FPS = 1600, 900, 30
XFADE_DUR = 0.75
FONT_BOLD = "C\\:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C\\:/Windows/Fonts/segoeui.ttf"


def run(cmd, quiet=False):
    if not quiet:
        print(">>", " ".join(cmd[:8]), "...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("CMD FAILED:", " ".join(cmd))
        print("STDERR:", res.stderr[-2000:])
        raise RuntimeError(f"Command failed with code {res.returncode}")
    return res


def probe_duration(path: str) -> float:
    res = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", path,
        ],
        text=True,
    ).strip()
    return float(res)


def fmt_ass_time(sec: float) -> str:
    sec = max(0.0, sec)
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    cs = int(round((sec - int(sec)) * 100))
    if cs >= 100:
        cs = 99
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def escape_drawtext(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("%", "\\%")
    )


def wrap_ass(text: str, width: int = 74) -> str:
    lines = textwrap.wrap(text.strip(), width=width)
    return r"\N".join(lines[:3])


def make_title_card(out_path: str, duration: float, tag: str, title: str, subtitle: str, footer: str = "", title_size: int = 56, fade_in: bool = True, fade_out: bool = False):
    vf = [
        f"drawbox=x=0:y=0:w={W}:h=8:color=0x0ea5e9@1.0:t=fill",
        f"drawbox=x=120:y=312:w=104:h=5:color=0x0ea5e9@1.0:t=fill",
        f"drawtext=fontfile='{FONT_BOLD}':text='{escape_drawtext(tag)}':fontcolor=0x38bdf8:fontsize=24:x=120:y=268",
        f"drawtext=fontfile='{FONT_BOLD}':text='{escape_drawtext(title)}':fontcolor=0xf8fafc:fontsize={title_size}:x=120:y=336",
        f"drawtext=fontfile='{FONT_REG}':text='{escape_drawtext(subtitle)}':fontcolor=0xcbd5e1:fontsize=28:x=120:y={336 + title_size + 28}",
        f"drawbox=x=120:y={336 + title_size + 96}:w=1360:h=1:color=0x334155@0.8:t=fill",
    ]
    if footer:
        vf.append(
            f"drawtext=fontfile='{FONT_REG}':text='{escape_drawtext(footer)}':fontcolor=0x94a3b8:fontsize=22:x=120:y={336 + title_size + 122}"
        )
    if fade_in:
        vf.append("fade=t=in:st=0:d=0.65")
    if fade_out:
        vf.append(f"fade=t=out:st={max(0.0, duration - 1.0):.2f}:d=1.0")
    vf.append("format=yuv420p")

    run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=0x0b1220:s={W}x{H}:r={FPS}:d={duration:.3f}",
        "-vf", ",".join(vf),
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        out_path,
    ])


def trim_and_normalize(src_video: str, start: float, end: float, out_path: str):
    dur = max(1.0, end - start)
    run([
        "ffmpeg", "-y",
        "-ss", f"{start:.3f}",
        "-i", src_video,
        "-t", f"{dur:.3f}",
        "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1220,fps={FPS},format=yuv420p",
        "-an",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        out_path,
    ])


def build_voice_phrase(wav_names, out_wav: str):
    """Gabungkan file VoiceA/*.wav berurutan dengan jeda 60ms agar natural seperti use-queue-announcement.ts."""
    inputs = []
    filter_parts = []
    valid = []
    for name in wav_names:
        p = os.path.join(VOICE_DIR, f"{name}.wav")
        if os.path.exists(p):
            valid.append(p)
        else:
            print(f"[WARN] File audio tidak ditemukan: {p}")
    if not valid:
        return None
    for idx, p in enumerate(valid):
        inputs.extend(["-i", p])
        # Konversi ke 48kHz stereo dan tambahkan pad 60ms di akhir tiap kata
        filter_parts.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,apad=pad_dur=0.06[a{idx}]")
    concat_in = "".join(f"[a{i}]" for i in range(len(valid)))
    filter_parts.append(f"{concat_in}concat=n={len(valid)}:v=0:a=1,volume=1.55[outa]")
    run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", ";".join(filter_parts),
        "-map", "[outa]",
        "-ar", "48000", "-ac", "2",
        out_wav,
    ], quiet=True)
    return out_wav


def main():
    if not os.path.exists(TIMELINE_PATH):
        raise FileNotFoundError(f"Timeline tidak ditemukan: {TIMELINE_PATH}")
    with open(TIMELINE_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    no_rm = manifest["no_rm"]
    nama_pasien = manifest["nama_pasien"]
    kode_antrean = manifest["kode_antrean"]

    norm_dir = os.path.join(SCRATCH, "norm")
    audio_dir = os.path.join(SCRATCH, "audio")
    os.makedirs(norm_dir, exist_ok=True)
    os.makedirs(audio_dir, exist_ok=True)

    # 1. Buat Intro Card
    clips = []
    intro_mp4 = os.path.join(norm_dir, "00_intro.mp4")
    make_title_card(
        intro_mp4, 4.5,
        "SIMRS RAWAT JALAN — SHOWCASE",
        "Alur Pelayanan Rawat Jalan End-to-End",
        "Login Admin  •  6 Role RBAC  •  Display Antrean Bersuara  •  Pembayaran Lunas",
        footer=f"Studi Kasus Langsung: Pasien {nama_pasien} ({no_rm})  •  Antrean {kode_antrean}",
        fade_in=True, fade_out=False,
    )
    clips.append({
        "id": "00_intro",
        "path": intro_mp4,
        "dur": probe_duration(intro_mp4),
        "transition": "fade",
        "badge": "",
        "subtitles": [],
        "audio_cues": [],
    })

    # 2. Potong & normalisasi setiap scene dari manifest
    for idx, sc in enumerate(manifest["scenes"], 1):
        if "use_segment" in sc:
            seg = sc["segments"][sc["use_segment"]]
            cid = seg["id"]
            badge = seg["badge"]
            trans = seg["transition"]
            t_start = seg["start"]
            t_end = seg["end"]
        else:
            cid = sc["id"]
            badge = sc["badge"]
            trans = sc.get("transition", "smoothleft")
            t_start = sc["trim_start"]
            t_end = sc["trim_end"]

        out_clip = os.path.join(norm_dir, f"{idx:02d}_{cid}.mp4")
        trim_and_normalize(sc["video"], t_start, t_end, out_clip)
        real_dur = probe_duration(out_clip)

        # Relatifkan subtitle & audio cues terhadap t_start dan batasi ke [0, real_dur]
        rel_subs = []
        for sub in sc.get("subtitles", []):
            s0 = sub["start"] - t_start
            s1 = (sub["end"] if sub["end"] is not None else t_end) - t_start
            if s1 <= 0.05 or s0 >= real_dur - 0.05:
                continue
            rel_subs.append({
                "start": max(0.0, s0),
                "end": min(real_dur, s1),
                "text": sub["text"],
            })

        rel_audio = []
        for cue in sc.get("audio_cues", []):
            at = cue["time"] - t_start
            if -0.2 <= at <= real_dur:
                rel_audio.append({"time": max(0.0, at), "wavs": cue["wavs"]})

        clips.append({
            "id": cid,
            "path": out_clip,
            "dur": real_dur,
            "transition": trans,
            "badge": badge,
            "subtitles": rel_subs,
            "audio_cues": rel_audio,
        })

    # 3. Buat Outro Card dengan ucapan Terima Kasih
    outro_mp4 = os.path.join(norm_dir, "99_outro.mp4")
    make_title_card(
        outro_mp4, 5.5,
        "SIMRS RAWAT JALAN — WORKFLOW SELESAI",
        "Terima Kasih",
        f"Alur Pelayanan Pasien {nama_pasien} ({no_rm}) Selesai & Lunas Terverifikasi",
        footer=f"Antrean {kode_antrean} Selesai  •  6 Role RBAC Terintegrasi  •  Layar Display Antrean & Pengumuman Suara Aktif",
        title_size=72,
        fade_in=False, fade_out=True,
    )
    clips.append({
        "id": "99_outro",
        "path": outro_mp4,
        "dur": probe_duration(outro_mp4),
        "transition": "fade",
        "badge": "",
        "subtitles": [],
        "audio_cues": [],
    })

    # 4. Hitung offset timeline global untuk xfade
    offsets = []
    cur = 0.0
    for i, c in enumerate(clips):
        offsets.append(cur)
        if i < len(clips) - 1:
            cur += c["dur"] - XFADE_DUR
        else:
            cur += c["dur"]
    total_dur = cur
    print(f"[Compose] Total {len(clips)} segmen, durasi gabungan {total_dur:.2f}s")

    # 5. Bangun file subtitle ASS (chapter badge + lower-third subtitles)
    ass_path = os.path.join(SCRATCH, "showcase.ass")
    ass_lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {W}",
        f"PlayResY: {H}",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        # Lower-third subtitle: putih tegas, box gelap transparan (#0B1220 alpha ~0x30)
        "Style: Sub,Segoe UI,31,&H00FFFFFF,&H0000FFFF,&H300B1220,&H300B1220,-1,0,0,0,100,100,0,0,3,11,0,2,80,80,32,1",
        # Top-left Chapter Badge: bold putih-biru, box gelap elegan
        "Style: Chapter,Segoe UI,22,&H00F8FAFC,&H0000FFFF,&H280B1220,&H280B1220,-1,0,0,0,100,100,0.4,0,3,9,0,7,28,28,22,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    for i, c in enumerate(clips):
        base = offsets[i]
        # Chapter badge selama klip aktif (hindari overlap dengan transisi)
        if c["badge"]:
            b_start = base + (0.25 if i > 0 else 0.0)
            b_end = base + c["dur"] - (XFADE_DUR if i < len(clips) - 1 else 0.0)
            if b_end > b_start + 0.2:
                badge_txt = r"{\c&H00E9A50E&}▌ {\c&H00F8FAFC&}" + c["badge"]
                ass_lines.append(
                    f"Dialogue: 1,{fmt_ass_time(b_start)},{fmt_ass_time(b_end)},Chapter,,0,0,0,,{badge_txt}"
                )
        for sub in c["subtitles"]:
            s0 = base + sub["start"]
            # Hindari overlap subtitle saat transisi xfade menuju klip berikutnya
            max_end = base + c["dur"] - (XFADE_DUR + 0.08 if i < len(clips) - 1 else 0.0)
            s1 = min(base + sub["end"], max_end)
            if s1 - s0 < 0.25:
                continue
            ass_lines.append(
                f"Dialogue: 2,{fmt_ass_time(s0)},{fmt_ass_time(s1)},Sub,,0,0,0,,{wrap_ass(sub['text'], 76)}"
            )

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write("\n".join(ass_lines) + "\n")
    print(f"[Compose] ASS subtitle ditulis: {ass_path} ({len(ass_lines)} baris)")

    # 6. Bangun rantai xfade video + render video intermediate (tanpa audio dulu)
    video_joined = os.path.join(SCRATCH, "video_xfade.mp4")
    v_inputs = []
    for c in clips:
        v_inputs.extend(["-i", c["path"]])

    xfade_filters = []
    prev_lbl = "[0:v]"
    for i in range(1, len(clips)):
        trans = clips[i]["transition"]
        # Posisi xfade = offsets[i]
        off = offsets[i]
        out_lbl = f"[vx{i}]" if i < len(clips) - 1 else "[vxf]"
        xfade_filters.append(
            f"{prev_lbl}[{i}:v]xfade=transition={trans}:duration={XFADE_DUR:.3f}:offset={off:.3f}{out_lbl}"
        )
        prev_lbl = out_lbl

    # Escape path untuk filter ass di Windows
    ass_escaped = ass_path.replace("\\", "/").replace(":", "\\:")
    xfade_filters.append(f"[vxf]ass='{ass_escaped}',format=yuv420p[vfinal]")

    run([
        "ffmpeg", "-y", *v_inputs,
        "-filter_complex", ";".join(xfade_filters),
        "-map", "[vfinal]",
        "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        video_joined,
    ])

    # 7. Bangun trek audio master dengan suara panggilan VoiceA tepat pada timestamp
    a_inputs = ["-f", "lavfi", "-t", f"{total_dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    a_filters = []
    mix_labels = ["[0:a]"]
    cue_idx = 1

    for i, c in enumerate(clips):
        base = offsets[i]
        for cue in c["audio_cues"]:
            phrase_wav = os.path.join(audio_dir, f"cue_{cue_idx:02d}.wav")
            built = build_voice_phrase(cue["wavs"], phrase_wav)
            if not built:
                continue
            delay_ms = int(round((base + cue["time"]) * 1000))
            a_inputs.extend(["-i", built])
            a_filters.append(f"[{cue_idx}:a]adelay={delay_ms}|{delay_ms}[ac{cue_idx}]")
            mix_labels.append(f"[ac{cue_idx}]")
            print(f"[Audio] Cue #{cue_idx} ({cue['wavs']}) @ {delay_ms/1000:.2f}s")
            cue_idx += 1

    master_wav = os.path.join(audio_dir, "master.wav")
    if len(mix_labels) > 1:
        a_filters.append(
            f"{''.join(mix_labels)}amix=inputs={len(mix_labels)}:duration=first:normalize=0:dropout_transition=0,alimiter=limit=0.95[aout]"
        )
        run([
            "ffmpeg", "-y", *a_inputs,
            "-filter_complex", ";".join(a_filters),
            "-map", "[aout]",
            "-t", f"{total_dur:.3f}",
            "-ar", "48000", "-ac", "2",
            master_wav,
        ])
    else:
        run(["ffmpeg", "-y", *a_inputs, "-ar", "48000", "-ac", "2", master_wav])

    # 8. Mux video + audio ke MP4 final (faststart untuk streaming web)
    run([
        "ffmpeg", "-y",
        "-i", video_joined,
        "-i", master_wav,
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart",
        "-shortest",
        OUT_MP4,
    ])
    print(f"[DONE] Video showcase final: {OUT_MP4}")

    # 9. Buat Contact Sheet 12 frame (4x3) untuk verifikasi visual
    step_sec = max(1.0, total_dur / 12.5)
    run([
        "ffmpeg", "-y",
        "-i", OUT_MP4,
        "-vf", f"fps=1/{step_sec:.2f},scale=480:270,tile=4x3:padding=6:margin=8:color=0x0b1220",
        "-frames:v", "1",
        CONTACT_PNG,
    ], quiet=True)
    print(f"[DONE] Contact sheet: {CONTACT_PNG}")


if __name__ == "__main__":
    main()
