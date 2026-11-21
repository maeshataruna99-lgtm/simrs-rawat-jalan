/**
 * Route pengecekan kesehatan service. Dipakai healthcheck Docker.
 */
import { Router } from 'express';
import { success } from '../../lib/response.js';

export const healthRoutes = Router();

/** GET /health */
healthRoutes.get('/', (_req, res) => {
  res.json(success({ service: 'service-node' }));
});
