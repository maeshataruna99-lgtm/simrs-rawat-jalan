"""Komposisi video showcase Chatbot Bantuan SIMRS (simrs-chatbot-showcase.mp4) dengan transisi xfade 0.75s, subtitle ASS adaptif kiri/tengah anti-overlap, dan penutup Terima Kasih."""
import json
import os
import subprocess
import textwrap

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRATCH = os.environ.get(
    "CHATBOT_TMP",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tmp_chatbot"),
)
TIMELINE_PATH = os.path.join(SCRATCH, "timeline.json")
OUT_DIR = os.path.join(ROOT, "docs", "showcase")
OUT_MP4 = os.path.join(OUT_DIR, "simrs-chatbot-showcase.mp4")
CONTACT_PNG = os.path.join(SCRATCH, "chatbot-contact-sheet.png")
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
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def wrap_ass(text: str, width: int = 74) -> str:
    lines = textwrap.wrap(text.strip(), width=width)
    return r"\N".join(lines[:3])


def make_outro_card(out_path: str, duration: float):
    tag = "SIMRS RAWAT JALAN — SHOWCASE CHATBOT BANTUAN"
    title = "Terima Kasih"
    subtitle = "Asisten Bantuan Deterministik Tanpa LLM • Live Lookup Yii2 & Node.js • RBAC Aman"
    footer = "Auto-Detect Nomor SIMRS  •  FAQ Toleransi Typo & Sinonim  •  Bilingual Reaktif ID/EN  •  14/14 Vitest PASS"
    vf = [
        f"drawbox=x=0:y=0:w={W}:h=8:color=0x0ea5e9@1.0:t=fill",
        f"drawbox=x=120:y=312:w=108:h=5:color=0x10b981@1.0:t=fill",
        f"drawtext=fontfile='{FONT_BOLD}':expansion=none:text='{escape_drawtext(tag)}':fontcolor=0x38bdf8:fontsize=22:x=120:y=268",
        f"drawtext=fontfile='{FONT_BOLD}':expansion=none:text='{escape_drawtext(title)}':fontcolor=0xf8fafc:fontsize=76:x=120:y=336",
        f"drawtext=fontfile='{FONT_REG}':expansion=none:text='{escape_drawtext(subtitle)}':fontcolor=0xe2e8f0:fontsize=27:x=120:y=444",
        f"drawbox=x=120:y=508:w=1360:h=1:color=0x334155@0.85:t=fill",
        f"drawtext=fontfile='{FONT_REG}':expansion=none:text='{escape_drawtext(footer)}':fontcolor=0x94a3b8:fontsize=21:x=120:y=534",
        f"fade=t=out:st={max(0.0, duration - 1.0):.2f}:d=1.0",
        "format=yuv420p",
    ]
    run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=0x0b1220:s={W}x{H}:r={FPS}:d={duration:.3f}",
        "-vf", ",".join(vf),
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        out_path,
    ])


def trim_and_normalize(src_video: str, start: float, end: float, out_path: str):
    dur = max(1.2, end - start)
    run([
        "ffmpeg", "-y",
        "-ss", f"{start:.3f}",
        "-i", src_video,
        "-t", f"{dur:.3f}",
        "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x0b1220,fps={FPS},format=yuv420p",
        "-an",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        out_path,
    ], quiet=True)


def main():
    with open(TIMELINE_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    norm_dir = os.path.join(SCRATCH, "norm")
    os.makedirs(norm_dir, exist_ok=True)

    clips = []
    for idx, sc in enumerate(manifest["scenes"]):
        out_clip = os.path.join(norm_dir, f"{idx:02d}_{sc['id']}.mp4")
        trim_and_normalize(sc["video"], sc["trim_start"], sc["trim_end"], out_clip)
        real_dur = probe_duration(out_clip)
        print(f"  [{idx:02d}] {sc['id']:22s} | {real_dur:6.2f}s | {sc['badge']}")

        rel_subs = []
        for sub in sc.get("subtitles", []):
            s0 = sub["start"] - sc["trim_start"]
            s1 = (sub["end"] if sub["end"] is not None else sc["trim_end"]) - sc["trim_start"]
            if s1 <= 0.05 or s0 >= real_dur - 0.05:
                continue
            rel_subs.append({"start": max(0.0, s0), "end": min(real_dur, s1), "text": sub["text"]})

        clips.append({
            "id": sc["id"],
            "path": out_clip,
            "dur": real_dur,
            "transition": sc.get("transition", "smoothleft"),
            "badge": sc["badge"],
            "sub_align": sc.get("sub_align", "left"),
            "subtitles": rel_subs,
        })

    outro_mp4 = os.path.join(norm_dir, "99_outro.mp4")
    make_outro_card(outro_mp4, 5.5)
    clips.append({
        "id": "99_outro",
        "path": outro_mp4,
        "dur": probe_duration(outro_mp4),
        "transition": "fade",
        "badge": "",
        "sub_align": "center",
        "subtitles": [],
    })

    offsets = []
    cur = 0.0
    for i, c in enumerate(clips):
        offsets.append(cur)
        cur += c["dur"] - XFADE_DUR if i < len(clips) - 1 else c["dur"]
    total_dur = cur
    print(f"[Compose] Total {len(clips)} segmen, durasi gabungan {total_dur:.2f}s ({total_dur/60:.2f} menit)")

    ass_path = os.path.join(SCRATCH, "chatbot.ass")
    ass_lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {W}",
        f"PlayResY: {H}",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        # SubCenter untuk kartu full-screen (Intro & Vitest)
        "Style: SubCenter,Segoe UI,30,&H00FFFFFF,&H0000FFFF,&H280B1220,&H280B1220,-1,0,0,0,100,100,0,0,3,11,0,2,76,76,28,1",
        # SubLeft untuk demo UI live agar TIDAK menutupi widget Chatbot di pojok kanan bawah!
        "Style: SubLeft,Segoe UI,28,&H00FFFFFF,&H0000FFFF,&H280B1220,&H280B1220,-1,0,0,0,100,100,0,0,3,11,0,1,44,580,32,1",
        # Chapter badge di kiri atas
        "Style: Chapter,Segoe UI,21,&H00F8FAFC,&H0000FFFF,&H240B1220,&H240B1220,-1,0,0,0,100,100,0.4,0,3,9,0,7,26,26,18,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    for i, c in enumerate(clips):
        base = offsets[i]
        if c["badge"]:
            b_start = base + (0.28 if i > 0 else 0.0)
            b_end = base + c["dur"] - (XFADE_DUR + 0.05 if i < len(clips) - 1 else 0.0)
            if b_end > b_start + 0.2:
                badge_txt = r"{\c&H00E9A50E&}▌ {\c&H00F8FAFC&}" + c["badge"]
                ass_lines.append(f"Dialogue: 1,{fmt_ass_time(b_start)},{fmt_ass_time(b_end)},Chapter,,0,0,0,,{badge_txt}")
        style_name = "SubCenter" if c["sub_align"] == "center" else "SubLeft"
        wrap_w = 78 if style_name == "SubCenter" else 56
        for sub in c["subtitles"]:
            s0 = base + sub["start"]
            max_end = base + c["dur"] - (XFADE_DUR + 0.08 if i < len(clips) - 1 else 0.0)
            s1 = min(base + sub["end"], max_end)
            if s1 - s0 < 0.25:
                continue
            ass_lines.append(f"Dialogue: 2,{fmt_ass_time(s0)},{fmt_ass_time(s1)},{style_name},,0,0,0,,{wrap_ass(sub['text'], wrap_w)}")

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write("\n".join(ass_lines) + "\n")

    inputs = []
    for c in clips:
        inputs.extend(["-i", c["path"]])
    filters = []
    prev = "[0:v]"
    for i in range(1, len(clips)):
        out_lbl = f"[vx{i}]" if i < len(clips) - 1 else "[vxf]"
        filters.append(f"{prev}[{i}:v]xfade=transition={clips[i]['transition']}:duration={XFADE_DUR:.3f}:offset={offsets[i]:.3f}{out_lbl}")
        prev = out_lbl

    ass_escaped = ass_path.replace("\\", "/").replace(":", "\\:")
    filters.append(f"[vxf]ass='{ass_escaped}',format=yuv420p[vfinal]")

    run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", ";".join(filters),
        "-map", "[vfinal]",
        "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        OUT_MP4,
    ])
    print(f"[DONE] Video showcase chatbot final: {OUT_MP4}")

    step_sec = max(1.0, total_dur / 12.5)
    run([
        "ffmpeg", "-y", "-i", OUT_MP4,
        "-vf", f"fps=1/{step_sec:.2f},scale=480:270,tile=4x3:padding=5:margin=8:color=0x0b1220",
        "-frames:v", "1", CONTACT_PNG,
    ], quiet=True)
    print(f"[DONE] Contact sheet 4x3: {CONTACT_PNG}")


if __name__ == "__main__":
    main()
