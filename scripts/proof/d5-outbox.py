"""Bukti D.5: Yii dimatikan, hasil lab tetap diterima Node (202, outbox pending), lalu terkirim otomatis setelah Yii hidup lagi."""
import json, os, subprocess, time, urllib.request, urllib.error, uuid

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KEY = next(l.split("=", 1)[1].strip().split(",")[0] for l in open(os.path.join(ROOT, ".env")) if l.startswith("LAB_API_KEYS="))
out = []

def sh(*a): return subprocess.run(a, capture_output=True, text=True, cwd=ROOT).stdout.strip()
def sql(q): return sh("docker", "exec", "simrs-postgres", "psql", "-U", "simrs", "-d", "simrs", "-c", q)
def say(s=""): out.append(s); print(s)

def post(body):
    req = urllib.request.Request("http://localhost:3000/api/lab/results", data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "X-Api-Key": KEY})
    try: r = urllib.request.urlopen(req, timeout=60); return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()

detail = sh("docker", "exec", "simrs-postgres", "psql", "-U", "simrs", "-d", "simrs", "-At", "-c", "select id from t_order_lab_detail where hasil is null order by id limit 1")
if not detail:  # tidak ada order tertunda: buat satu order lab lewat API Yii sebagai dokter
    def yii(method, path, data=None, tok=None):
        rq = urllib.request.Request("http://localhost:8080" + path, data=json.dumps(data).encode() if data is not None else None, method=method,
                                    headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {tok}"} if tok else {})})
        return json.loads(urllib.request.urlopen(rq).read())
    tok = yii("POST", "/system/auth/login", {"username": "dokter", "password": "simrs123"})["data"]["token"]
    kid = int(sh("docker", "exec", "simrs-postgres", "psql", "-U", "simrs", "-d", "simrs", "-At", "-c", "select id from t_kunjungan where dokter_id=1 and status in ('menunggu','diperiksa') order by id desc limit 1"))
    yii("POST", "/transaction/order-lab", {"kunjungan_id": kid, "catatan_klinis": "Uji D.5", "pemeriksaan_lab_ids": [1]}, tok)
    detail = sh("docker", "exec", "simrs-postgres", "psql", "-U", "simrs", "-d", "simrs", "-At", "-c", "select id from t_order_lab_detail where hasil is null order by id desc limit 1")
idem = str(uuid.uuid4())
body = {"detail_id": int(detail), "hasil": "14.1", "idempotency_key": idem}
say(f"# Langkah 1: matikan Yii (simulasi gangguan integrasi)\n$ docker stop simrs-yii\n{sh('docker', 'stop', 'simrs-yii')}\n")
say(f"# Langkah 2: sistem lab eksternal mengirim hasil ke Node saat Yii mati\n$ POST :3000/api/lab/results  (X-Api-Key) {json.dumps(body)}")
c, r = post(body); say(f"HTTP {c}\n{json.dumps(json.loads(r), indent=2, ensure_ascii=False)}\n")
say("# Langkah 3: pesan aman di outbox (belum terkirim)\n$ select id,status,percobaan,idempotency_key from t_integration_outbox")
say(sql("select id,status,percobaan,idempotency_key from t_integration_outbox order by id desc limit 1"))
say(f"Hasil di tabel detail lab saat ini:\n{sql(f'select id,hasil,flag from t_order_lab_detail where id={detail}')}")
say(f"# Langkah 4: hidupkan Yii lagi\n$ docker start simrs-yii\n{sh('docker', 'start', 'simrs-yii')}\n")
for i in range(40):
    time.sleep(5)
    st = sh("docker", "exec", "simrs-postgres", "psql", "-U", "simrs", "-d", "simrs", "-At", "-c", f"select status from t_integration_outbox where idempotency_key='{idem}'")
    if st == "terkirim": break
say(f"# Langkah 5: worker outbox mengulang pengiriman sampai berhasil (menunggu ~{(i + 1) * 5} detik)")
say(sql("select id,status,percobaan,idempotency_key from t_integration_outbox order by id desc limit 1"))
say(f"Hasil di tabel detail lab sekarang:\n{sql(f'select id,hasil,flag from t_order_lab_detail where id={detail}')}")
say("# Langkah 6: kirim ulang key yang sama (retry klien) tidak menggandakan hasil")
c, r = post(body); say(f"HTTP {c}\n{json.dumps(json.loads(r), indent=2, ensure_ascii=False)}\n")
say(sql(f"select count(*) as baris_outbox_dengan_key_ini from t_integration_outbox where idempotency_key='{idem}'"))
open(os.path.join(ROOT, "docs", "proof-book", "evidence", "D5-outbox-retry.txt"), "w", encoding="utf-8").write("\n".join(out))
