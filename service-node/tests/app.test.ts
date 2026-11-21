/**
 * Uji dasar aplikasi: healthcheck dan format error seragam.
 */
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AppError } from '../src/lib/app-error.js';
import { errorHandler } from '../src/middleware/error-handler.js';

describe('app', () => {
  it('GET /health membalas sukses', async () => {
    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'OK', data: { service: 'service-node' } });
  });

  it('route tidak terdaftar membalas 404 berformat seragam', async () => {
    const res = await request(createApp()).get('/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('AppError memakai status dan pesannya sendiri', async () => {
    const app = express();
    app.get('/x', () => {
      throw new AppError(422, 'Validasi gagal', { nik: ['NIK wajib diisi'] });
    });
    app.use(errorHandler);

    const res = await request(app).get('/x');

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      success: false,
      message: 'Validasi gagal',
      errors: { nik: ['NIK wajib diisi'] },
    });
  });

  it('error tak terduga dibalas 500 tanpa detail', async () => {
    const app = express();
    app.get('/x', () => {
      throw new Error('rahasia internal');
    });
    app.use(errorHandler);

    const res = await request(app).get('/x');

    expect(res.status).toBe(500);
    expect(res.body.message).not.toContain('rahasia');
  });
});
