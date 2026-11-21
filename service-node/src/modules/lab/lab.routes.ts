/**
 * Route integrasi laboratorium untuk sistem eksternal (header X-Api-Key): /api/lab/orders dan /api/lab/results.
 * Hasil selalu masuk outbox dulu; saat Yii mati request tetap dibalas 202 Accepted.
 */
import { Router } from 'express';
import { z } from 'zod';
import { success } from '../../lib/response.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { listOrders, type LabResultInput } from './lab.service.js';
import { deliver, enqueue } from './outbox.js';

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
    const input = req.validated!.body as LabResultInput;
    const result = await deliver(await enqueue(input));
    if (result.status === 'gagal') {
      throw result.error;
    }
    if (result.status === 'pending') {
      // Yii belum dapat diakses: hasil aman di outbox dan dikirim ulang oleh worker.
      res
        .status(202)
        .json(
          success(
            { idempotency_key: input.idempotency_key, status: 'pending' },
            'Hasil diterima dan akan dikirim ulang.',
          ),
        );
      return;
    }
    res.json(success(result.data, 'Hasil laboratorium diterima.'));
  },
);
