/**
 * Uji middleware autentikasi JWT dan API key.
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as dbLib from '../src/lib/db.js';
import {
  authenticate,
  clearPermissionCache,
  hasPermission,
  type AuthMethod,
} from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/error-handler.js';

const SECRET = 'rahasia-khusus-test-minimal-32-karakter';

function appWith(...methods: AuthMethod[]) {
  const app = express();
  app.get('/x', authenticate(...methods), (req, res) => {
    res.json({ user: req.user ?? null, apiClient: req.apiClient ?? null });
  });
  app.use(errorHandler);
  return app;
}

function token(payload: object, options: jwt.SignOptions = {}, secret = SECRET) {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    issuer: 'simrs-backend',
    expiresIn: 60,
    ...options,
  });
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.LAB_API_KEYS = 'kunci-lab-satu, kunci-lab-dua';
});

describe('authenticate jwt', () => {
  it('token sah mengisi req.user', async () => {
    const res = await request(appWith('jwt'))
      .get('/x')
      .set('Authorization', `Bearer ${token({ sub: 7, role: 'dokter', nama: 'dr. Budi' })}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 7, role: 'dokter', nama: 'dr. Budi' });
  });

  it.each([
    ['tanpa token', undefined],
    ['token kedaluwarsa', `Bearer ${token({ sub: 7 }, { expiresIn: -10 })}`],
    [
      'secret berbeda',
      `Bearer ${token({ sub: 7 }, {}, 'secret-lain-yang-juga-panjang-32-karakter')}`,
    ],
    ['issuer berbeda', `Bearer ${token({ sub: 7 }, { issuer: 'pihak-lain' })}`],
    ['bukan bearer', 'Basic abc'],
  ])('%s dibalas 401', async (_label, header) => {
    const req = request(appWith('jwt')).get('/x');
    const res = await (header ? req.set('Authorization', header) : req);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('authenticate apiKey', () => {
  it('API key terdaftar mengisi req.apiClient', async () => {
    const res = await request(appWith('apiKey')).get('/x').set('X-Api-Key', 'kunci-lab-dua');

    expect(res.status).toBe(200);
    expect(res.body.apiClient).toEqual({ type: 'external' });
  });

  it('API key salah dibalas 401', async () => {
    const res = await request(appWith('apiKey')).get('/x').set('X-Api-Key', 'kunci-palsu');

    expect(res.status).toBe(401);
  });

  it('token JWT tidak diterima di endpoint khusus API key', async () => {
    const res = await request(appWith('apiKey'))
      .get('/x')
      .set('Authorization', `Bearer ${token({ sub: 1, role: 'admin', nama: 'Admin' })}`);

    expect(res.status).toBe(401);
  });

  it('endpoint yang menerima keduanya lolos dengan API key', async () => {
    const res = await request(appWith('jwt', 'apiKey'))
      .get('/x')
      .set('X-Api-Key', 'kunci-lab-satu');

    expect(res.status).toBe(200);
  });
});

describe('hasPermission cache', () => {
  afterEach(() => {
    delete process.env.PERMISSION_CACHE_TTL_MS;
    clearPermissionCache();
    vi.restoreAllMocks();
  });

  it('men-cache hasil izin dalam TTL singkat dan mendeduplikasi query paralel', async () => {
    const queryMock = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { rowCount: 1 };
    });
    vi.spyOn(dbLib, 'readDb').mockReturnValue({ query: queryMock } as unknown as ReturnType<
      typeof dbLib.readDb
    >);

    const parallel = await Promise.all([
      hasPermission('admin', 'dashboard', 'read'),
      hasPermission('admin', 'dashboard', 'read'),
      hasPermission('admin', 'dashboard', 'read'),
    ]);
    expect(parallel).toEqual([true, true, true]);
    expect(queryMock).toHaveBeenCalledTimes(1);

    // Pemanggilan ulang dalam TTL membaca cache tanpa query DB.
    expect(await hasPermission('admin', 'dashboard', 'read')).toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(1);

    // Setelah clearPermissionCache(), query dijalankan ulang.
    clearPermissionCache();
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    expect(await hasPermission('admin', 'dashboard', 'read')).toBe(false);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('PERMISSION_CACHE_TTL_MS=0 menonaktifkan cache', async () => {
    process.env.PERMISSION_CACHE_TTL_MS = '0';
    const queryMock = vi.fn().mockResolvedValue({ rowCount: 1 });
    vi.spyOn(dbLib, 'readDb').mockReturnValue({ query: queryMock } as unknown as ReturnType<
      typeof dbLib.readDb
    >);

    await hasPermission('kasir', 'dashboard', 'read');
    await hasPermission('kasir', 'dashboard', 'read');
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
