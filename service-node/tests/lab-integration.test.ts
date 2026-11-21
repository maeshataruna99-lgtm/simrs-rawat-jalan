/**
 * Test integrasi D.5 (poin 7.5): Node + outbox (database simrs_test) + Yii tiruan berupa server HTTP sungguhan.
 * Yii tiruan menyimpan hasil per Idempotency-Key seperti Yii asli, dan bisa diatur mati, error 5xx,
 * atau menyimpan lalu terlambat membalas (respons hilang karena timeout).
 * Target: hasil tidak hilang dan tidak tercatat dua kali.
 */
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/lib/db.js';
import { resetYiiToken } from '../src/lib/yii-client.js';
import { processDueOutbox } from '../src/modules/lab/outbox.worker.js';
import { cleanOutbox, outboxRow, useTestDatabase } from './test-db.js';

const API_KEY = 'kunci-lab-integrasi';
const PREFIX = `uji-integrasi-${Date.now()}-`;

type Mode = 'mati' | 'error' | 'lambat' | 'normal';
let mode: Mode = 'normal';
/** Hasil tersimpan di Yii tiruan: Idempotency-Key -> hasil. */
const tersimpan = new Map<string, string>();
/** Jumlah penyimpanan baru (bukan duplikat) per key. */
const penulisan = new Map<string, number>();
let putCount = 0;
let server: Server;

function fakeYii() {
  const app = express();
  app.use(express.json());
  app.post('/system/auth/login', (_req, res) => {
    res.json({ success: true, data: { token: 'tok' } });
  });
  app.put('/transaction/hasil-lab/:id', (req, res) => {
    putCount += 1;
    if (mode === 'mati') {
      req.socket.destroy();
      return;
    }
    if (mode === 'error') {
      res.status(503).json({ success: false, message: 'Database sibuk' });
      return;
    }
    const key = String(req.header('idempotency-key'));
    if (!tersimpan.has(key)) {
      tersimpan.set(key, req.body.hasil);
      penulisan.set(key, (penulisan.get(key) ?? 0) + 1);
    }
    const balas = () =>
      res.json({ success: true, data: { id: Number(req.params.id), hasil: tersimpan.get(key) } });
    if (mode === 'lambat') {
      setTimeout(balas, 500);
      return;
    }
    balas();
  });
  return app;
}

/** Memajukan jadwal retry agar worker langsung mencoba, lalu menjalankan satu putaran worker. */
async function workerSekarang(key: string) {
  await db().query(
    "UPDATE t_integration_outbox SET retry_berikutnya = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE idempotency_key = $1",
    [key],
  );
  return processDueOutbox();
}

function kirim(detailId: number, hasil: string, key: string) {
  return request(createApp())
    .post('/api/lab/results')
    .set('X-Api-Key', API_KEY)
    .send({ detail_id: detailId, hasil, idempotency_key: key });
}

beforeAll(async () => {
  useTestDatabase();
  server = fakeYii().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  process.env.YII_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.YII_TIMEOUT_MS = '200';
  process.env.LAB_API_KEYS = API_KEY;
});

beforeEach(() => {
  resetYiiToken();
  mode = 'normal';
  putCount = 0;
});

afterAll(async () => {
  await cleanOutbox(PREFIX, true);
  await new Promise((resolve) => server.close(resolve));
});

describe('Integrasi hasil lab saat Yii gagal lalu pulih (D.5)', () => {
  it('Yii mati lalu error 5xx: hasil tertahan di outbox, terkirim tepat sekali setelah pulih', async () => {
    const key = `${PREFIX}mati`;

    mode = 'mati';
    expect((await kirim(21, '180', key)).status).toBe(202);
    // Sistem eksternal mengirim ulang karena ragu: tetap satu baris outbox.
    expect((await kirim(21, '180', key)).status).toBe(202);

    mode = 'error';
    await workerSekarang(key);
    expect(await outboxRow(key)).toMatchObject({ status: 'pending' });
    expect(tersimpan.has(key)).toBe(false);

    mode = 'normal';
    await workerSekarang(key);
    expect(await outboxRow(key)).toMatchObject({ status: 'terkirim', percobaan: 4 });
    expect(tersimpan.get(key)).toBe('180');
    expect(penulisan.get(key)).toBe(1);

    // Outbox sudah terkirim: putaran worker berikutnya tidak mengirim lagi.
    putCount = 0;
    await workerSekarang(key);
    expect(putCount).toBe(0);

    const { rows } = await db().query(
      'SELECT count(*)::int AS n FROM t_integration_outbox WHERE idempotency_key = $1',
      [key],
    );
    expect(rows[0].n).toBe(1);
  });

  it('Yii menyimpan tetapi respons hilang (timeout): kiriman ulang tidak membuat hasil ganda', async () => {
    const key = `${PREFIX}lambat`;

    mode = 'lambat';
    expect((await kirim(22, '95', key)).status).toBe(202);
    expect(tersimpan.get(key)).toBe('95');
    expect(await outboxRow(key)).toMatchObject({ status: 'pending' });

    mode = 'normal';
    await workerSekarang(key);
    expect(await outboxRow(key)).toMatchObject({ status: 'terkirim' });
    expect(penulisan.get(key)).toBe(1);
  });

  it('dua worker berjalan bersamaan tidak mengirim baris yang sama dua kali', async () => {
    const key = `${PREFIX}paralel`;
    mode = 'mati';
    await kirim(23, '7', key);
    await db().query(
      "UPDATE t_integration_outbox SET retry_berikutnya = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE idempotency_key = $1",
      [key],
    );

    mode = 'normal';
    putCount = 0;
    await Promise.all([processDueOutbox(), processDueOutbox(), processDueOutbox()]);

    expect(putCount).toBe(1);
    expect(await outboxRow(key)).toMatchObject({ status: 'terkirim' });
  });
});
