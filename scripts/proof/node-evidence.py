"""Bukti layanan Node.js: panggilan HTTP nyata ke service dan Yii, hasil ke evidence/C-node-service.txt."""
import json, os, subprocess, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
out = []

def call(label, url, headers=None, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers=headers or {})
    if body: req.add_header("Content-Type", "application/json")
    try:
        r = urllib.request.urlopen(req); code, raw = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        code, raw = e.code, e.read().decode()
    out.append(f"$ {label}\nHTTP {code}")
    try: out.append(json.dumps(json.loads(raw), indent=2, ensure_ascii=False)[:1400])
    except Exception: out.append(raw[:600])
    out.append("")
    return raw

tok = json.loads(call("POST :8080/system/auth/login  (Yii menerbitkan JWT)", "http://localhost:8080/system/auth/login",
                      body={"username": "admin", "password": "simrs123"}))["data"]["token"]
out[-2] = out[-2][:200] + " ...(dipotong)"
auth = {"Authorization": f"Bearer {tok}"}
call("GET :3000/health", "http://localhost:3000/health")
call("GET :3000/api/dashboard/summary?from=2026-11-01&to=2026-11-30  (Bearer JWT dari Yii)", "http://localhost:3000/api/dashboard/summary?from=2026-11-01&to=2026-11-30", auth)
call("GET :3000/api/dashboard/summary  (tanpa token -> ditolak middleware)", "http://localhost:3000/api/dashboard/summary?from=2026-11-01&to=2026-11-30")
call("GET :3000/api/lab/orders  (tanpa X-Api-Key -> ditolak)", "http://localhost:3000/api/lab/orders")
call("GET :3000/api/dashboard/summary?from=2026-11-30&to=2026-11-01  (validasi Zod -> 422)", "http://localhost:3000/api/dashboard/summary?from=2026-11-30&to=2026-11-01", auth)
out.append("$ docker compose ps")
out.append(subprocess.run(["docker", "compose", "ps", "--format", "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"], cwd=ROOT, capture_output=True, text=True).stdout)
open(os.path.join(ROOT, "docs", "proof-book", "evidence", "C-node-service.txt"), "w", encoding="utf-8").write("\n".join(out))
