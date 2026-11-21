/**
 * Uji route integrasi laboratorium (/api/lab) dengan backend Yii tiruan lewat fetch yang di-stub.
 */
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { resetYiiToken } from '../src/lib/yii-client.js';

const API_KEY = 'kunci-lab-uji';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeAll(() => {
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

describe('POST /api/lab/results', () => {
  it('meneruskan hasil ke Yii dengan Idempotency-Key dan login ulang saat token ditolak', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { success: true, data: { token: 'tok-lama' } }))
      .mockResolvedValueOnce(json(401, { success: false, message: 'Sesi berakhir' }))
      .mockResolvedValueOnce(json(200, { success: true, data: { token: 'tok-baru' } }))
      .mockResolvedValueOnce(
        json(200, { success: true, data: { id: 11, hasil: '150', flag: 'tinggi' } }),
      );

    const res = await request(createApp())
      .post('/api/lab/results')
      .set('X-Api-Key', API_KEY)
      .send({ detail_id: 11, hasil: '150', idempotency_key: 'alat-01-0001' });

    expect(res.status).toBe(200);
    expect(res.body.data.flag).toBe('tinggi');
    const [url, init] = fetchMock.mock.calls[3];
    expect(url).toBe('http://yii.test/transaction/hasil-lab/11');
    expect(init?.method).toBe('PUT');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('alat-01-0001');
    expect(headers.Authorization).toBe('Bearer tok-baru');
  });

  it('error validasi dari Yii diteruskan apa adanya', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { success: true, data: { token: 'tok' } }))
      .mockResolvedValueOnce(json(404, { success: false, message: 'Detail tidak ditemukan.' }));

    const res = await request(createApp())
      .post('/api/lab/results')
      .set('X-Api-Key', API_KEY)
      .send({ detail_id: 999, hasil: '5', idempotency_key: 'alat-01-0002' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Detail tidak ditemukan.');
  });

  it('body tidak valid dibalas 422 tanpa memanggil Yii', async () => {
    const res = await request(createApp())
      .post('/api/lab/results')
      .set('X-Api-Key', API_KEY)
      .send({ detail_id: 'x', hasil: '' });

    expect(res.status).toBe(422);
    expect(Object.keys(res.body.errors)).toEqual(
      expect.arrayContaining(['detail_id', 'hasil', 'idempotency_key']),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
