/**
 * Route API dashboard read-only (/api/dashboard/...).
 * Seluruh endpoint memerlukan JWT valid dan izin `dashboard:read`.
 *
 * Dipakai di: src/app.ts.
 */
import { Router, type Request } from 'express';
import { success } from '../../lib/response.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import {
  getKunjunganPerPoli,
  getPendapatan,
  getPenggunaanObat,
  getStatusPembayaran,
  getSummary,
  getTindakanTerbanyak,
  resolvePeriode,
} from './dashboard.service.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate('jwt'), requirePermission('dashboard', 'read'));

function periodeDariRequest(req: Request) {
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : undefined;
  return resolvePeriode(from, to);
}

dashboardRoutes.get('/summary', async (req, res, next) => {
  try {
    res.json(success(await getSummary(periodeDariRequest(req))));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get('/kunjungan-per-poli', async (req, res, next) => {
  try {
    res.json(success(await getKunjunganPerPoli(periodeDariRequest(req))));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get('/tindakan', async (req, res, next) => {
  try {
    res.json(success(await getTindakanTerbanyak(periodeDariRequest(req))));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get('/pendapatan', async (req, res, next) => {
  try {
    res.json(success(await getPendapatan(periodeDariRequest(req))));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get('/obat', async (req, res, next) => {
  try {
    res.json(success(await getPenggunaanObat(periodeDariRequest(req))));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get('/pembayaran', async (req, res, next) => {
  try {
    res.json(success(await getStatusPembayaran(periodeDariRequest(req))));
  } catch (err) {
    next(err);
  }
});
