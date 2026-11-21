/**
 * Uji route integrasi laboratorium (/api/lab) dan outbox dengan backend Yii tiruan lewat fetch yang di-stub.
 * Outbox memakai database simrs_test.
 */
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { db } from '../src/lib/db.js';
import { resetYiiToken } from '../src/lib/yii-client.js';
import { processDueOutbox } from '../src/modules/lab/outbox.worker.js';
import { cleanOutbox, outboxRow, useTestDatabase } from './test-db.js';

const API_KEY = 'kunci-lab-uji';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn<typeof fetch>();

const PREFIX = `uji-lab-${Date.now()}-`;
const login = () => json(200, { success: true, data: { token: 'tok' } });

beforeAll(() => {
  useTestDatabase();
  process.env.LAB_API_KEYS = API_KEY;
  process.env.YII_URL = 'http://yii.test';
  process.env.LAB_YII_USERNAME = 'laboratorium';
  process.env.LAB_YII_PASSWORD = 'rahasia';
});

beforeEach(() => {
  resetYiiToken();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await cleanOutbox(PREFIX, true);
});

function kirim(body: object) {
  return request(createApp()).post('/api/lab/results').set('X-Api-Key', API_KEY).send(body);
}

describe('GET /api/lab/orders', () => {
  it('menolak tanpa API key', async () => {
    const res = await request(createApp()).get('/api/lab/orders');
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('login sebagai akun layanan lalu memetakan order Yii ke format eksternal', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { success: true, data: { token: 'tok-1' } }))
      .mockResolvedValueOnce(
        json(200, {
          success: true,
          data: [
            {
              id: 5,
              no_order: 'LAB202611210001',
              status: 'diminta',
              catatan_klinis: 'DM?',
              created_at: '2026-11-21 09:00:00',
              pasien: { no_rm: 'RM000001', nama: 'Budi' },
              details: [
                {
                  id: 11,
                  hasil: null,
                  satuan: 'mg/dL',
                  nilai_rujukan: '70-110',
                  flag: null,
                  pemeriksaan: { kode: 'LAB01', nama: 'Gula Darah' },
                },
              ],
            },
          ],
        }),
      );

    const res = await request(createApp()).get('/api/lab/orders').set('X-Api-Key', API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      order_id: 5,
      no_order: 'LAB202611210001',
      pemeriksaan: [{ detail_id: 11, kode: 'LAB01', nilai_rujukan: '70-110', hasil: null }],
    });
    expect(fetchMock.mock.calls[0][0]).toBe('http://yii.test/system/auth/login');
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('http://yii.test/transaction/order-lab?status=diminta%2Cdiproses');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it('status tidak dikenal dibalas 422', async () => {
    const res = await request(createApp())
      .get('/api/lab/orders?status=hapus')
      .set('X-Api-Key', API_KEY);
    expect(res.status).toBe(422);
  });
});

describe('POST /api/lab/results dengan outbox', () => {
  it('meneruskan hasil dengan Idempotency-Key, login ulang saat token ditolak, outbox terkirim', async () => {
    const key = `${PREFIX}ok`;
    fetchMock
      .mockResolvedValueOnce(json(200, { success: true, data: { token: 'tok-lama' } }))
      .mockResolvedValueOnce(json(401, { success: false, message: 'Sesi berakhir' }))
      .mockResolvedValueOnce(json(200, { success: true, data: { token: 'tok-baru' } }))
      .mockResolvedValueOnce(
        json(200, { success: true, data: { id: 11, hasil: '150', flag: 'tinggi' } }),
      );

    const res = await kirim({ detail_id: 11, hasil: '150', idempotency_key: key });

    expect(res.status).toBe(200);
    expect(res.body.data.flag).toBe('tinggi');
    const [url, init] = fetchMock.mock.calls[3];
    expect(url).toBe('http://yii.test/transaction/hasil-lab/11');
    expect(init?.method).toBe('PUT');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe(key);
    expect(headers.Authorization).toBe('Bearer tok-baru');
    expect(await outboxRow(key)).toMatchObject({ status: 'terkirim', percobaan: 1 });
  });

  it('Yii mati: dibalas 202, outbox tetap pending dan terkirim oleh worker setelah Yii hidup', async () => {
    const key = `${PREFIX}mati`;
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await kirim({ detail_id: 12, hasil: '90', idempotency_key: key });
    expect(res.status).toBe(202);
    expect(res.body.data).toEqual({ idempotency_key: key, status: 'pending' });
    expect(await outboxRow(key)).toMatchObject({
      status: 'pending',
      percobaan: 1,
      terjadwal: true,
    });

    // Jatuh tempo dimajukan agar worker langsung mencoba lagi; Yii kini hidup.
    await db().query(
      "UPDATE t_integration_outbox SET retry_berikutnya = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE idempotency_key = $1",
      [key],
    );
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(login())
      .mockResolvedValueOnce(json(200, { success: true, data: { id: 12, hasil: '90' } }));

    await processDueOutbox();
    expect(await outboxRow(key)).toMatchObject({ status: 'terkirim', percobaan: 2 });
  });

  it('kiriman ulang dengan key sama tidak membuat baris outbox baru', async () => {
    const key = `${PREFIX}ganda`;
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith('/login') ? login() : json(200, { success: true, data: { id: 13 } }),
    );

    await kirim({ detail_id: 13, hasil: '7', idempotency_key: key });
    await kirim({ detail_id: 13, hasil: '7', idempotency_key: key });

    const { rows } = await db().query(
      'SELECT count(*)::int AS n FROM t_integration_outbox WHERE idempotency_key = $1',
      [key],
    );
    expect(rows[0].n).toBe(1);
  });

  it('ditolak Yii (4xx) diteruskan apa adanya dan outbox ditandai gagal tanpa retry', async () => {
    const key = `${PREFIX}tolak`;
    fetchMock
      .mockResolvedValueOnce(login())
      .mockResolvedValueOnce(json(404, { success: false, message: 'Detail tidak ditemukan.' }));

    const res = await kirim({ detail_id: 999, hasil: '5', idempotency_key: key });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Detail tidak ditemukan.');
    expect(await outboxRow(key)).toMatchObject({ status: 'gagal' });
  });

  it('body tidak valid dibalas 422 tanpa menyentuh outbox atau Yii', async () => {
    const res = await kirim({ detail_id: 'x', hasil: '' });

    expect(res.status).toBe(422);
    expect(Object.keys(res.body.errors)).toEqual(
      expect.arrayContaining(['detail_id', 'hasil', 'idempotency_key']),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
