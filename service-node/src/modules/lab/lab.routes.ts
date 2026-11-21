/**
 * Route integrasi laboratorium untuk sistem eksternal (header X-Api-Key): /api/lab/orders dan /api/lab/results.
 */
import { Router } from 'express';
import { z } from 'zod';
import { success } from '../../lib/response.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { forwardResult, listOrders, type LabResultInput } from './lab.service.js';

export const labRoutes = Router();

const ordersQuery = z.object({
  status: z
    .string()
    .regex(/^(diminta|diproses|selesai)(,(diminta|diproses|selesai))*$/, 'Status tidak dikenal.')
    .default('diminta,diproses'),
});

export const resultBody = z.object({
  detail_id: z.coerce.number().int().positive(),
  hasil: z.string().trim().min(1).max(100),
  idempotency_key: z.string().trim().min(8).max(100),
});

/** GET /api/lab/orders?status=diminta,diproses */
labRoutes.get(
  '/orders',
  authenticate('apiKey'),
  validate({ query: ordersQuery }),
  async (req, res) => {
    const { status } = req.validated!.query as z.infer<typeof ordersQuery>;
    res.json(success(await listOrders(status)));
  },
);

/** POST /api/lab/results — body { detail_id, hasil, idempotency_key } */
labRoutes.post(
  '/results',
  authenticate('apiKey'),
  validate({ body: resultBody }),
  async (req, res) => {
    const data = await forwardResult(req.validated!.body as LabResultInput);
    res.json(success(data, 'Hasil laboratorium diterima.'));
  },
);
