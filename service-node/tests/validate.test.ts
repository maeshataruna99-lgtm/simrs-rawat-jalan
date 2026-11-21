/**
 * Uji middleware validasi zod.
 */
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/error-handler.js';
import { validate } from '../src/middleware/validate.js';

function app() {
  const app = express();
  app.use(express.json());
  app.post(
    '/hasil/:orderId',
    validate({
      params: z.object({ orderId: z.coerce.number().int().positive() }),
      query: z.object({ dryRun: z.enum(['ya', 'tidak']).default('tidak') }),
      body: z.object({ kode: z.string().min(1), nilai: z.number() }),
    }),
    (req, res) => {
      res.json(req.validated);
    },
  );
  app.use(errorHandler);
  return app;
}

describe('validate', () => {
  it('data valid diteruskan dalam bentuk yang sudah dikonversi', async () => {
    const res = await request(app()).post('/hasil/12').send({ kode: 'HB', nilai: 13.5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      params: { orderId: 12 },
      query: { dryRun: 'tidak' },
      body: { kode: 'HB', nilai: 13.5 },
    });
  });

  it('data tidak valid dibalas 422 dengan error per field', async () => {
    const res = await request(app()).post('/hasil/abc?dryRun=mungkin').send({ kode: '' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(Object.keys(res.body.errors).sort()).toEqual(['dryRun', 'kode', 'nilai', 'orderId']);
  });

  it('pesan error berbahasa Indonesia', async () => {
    const res = await request(app()).post('/hasil/1').send({ kode: 'HB' });

    expect(res.body.errors.nilai[0]).toMatch(/[Dd]iharapkan|[Ww]ajib|[Tt]idak valid/);
  });
});
