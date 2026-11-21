/**
 * Route API dashboard read-only (/api/dashboard/...) dengan validasi periode (422) dan detail berhalaman.
 * Seluruh endpoint memerlukan JWT valid dan izin `dashboard:read`.
 *
 * Dipakai di: src/app.ts.
 */
import { Router, type Request } from 'express';
import { z } from 'zod';
import { success } from '../../lib/response.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  getDetail,
  getKunjunganPerPoli,
  getPendapatan,
  getPenggunaanObat,
  getStatusPembayaran,
  getSummary,
  getTindakanTerbanyak,
  resolvePeriode,
  type DetailJenis,
} from './dashboard.service.js';

export const dashboardRoutes = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(val: string): boolean {
  if (!DATE_RE.test(val)) return false;
  const [y, m, d] = val.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const dateField = z
  .string()
  .refine(isValidCalendarDate, 'Format tanggal harus YYYY-MM-DD yang valid.')
  .optional();

function applyPeriodeRefinement<T extends { from?: string; to?: string }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  const resolved = resolvePeriode(data.from, data.to);
  const start = Date.parse(`${resolved.from}T00:00:00Z`);
  const end = Date.parse(`${resolved.to}T00:00:00Z`);
  if (start > end) {
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Tanggal akhir harus sama atau setelah tanggal awal.',
    });
    return;
  }
  const days = Math.round((end - start) / 86_400_000) + 1;
  if (days > 366) {
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Rentang periode maksimal 366 hari.',
    });
  }
}

const periodeQuerySchema = z
  .object({
    from: dateField,
    to: dateField,
  })
  .superRefine(applyPeriodeRefinement);

const detailParamsSchema = z.object({
  jenis: z.enum(['kunjungan', 'tindakan', 'pendapatan', 'obat', 'pembayaran']),
});

const detailQuerySchema = z
  .object({
    from: dateField,
    to: dateField,
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
    poli_id: z.coerce.number().int().min(1).optional(),
    status: z.string().trim().min(1).max(30).optional(),
  })
  .superRefine(applyPeriodeRefinement);

type PeriodeQuery = z.infer<typeof periodeQuerySchema>;
type DetailQuery = z.infer<typeof detailQuerySchema>;

dashboardRoutes.use(authenticate('jwt'), requirePermission('dashboard', 'read'));

function periodeDariValidated(req: Request) {
  const q = (req.validated?.query ?? {}) as PeriodeQuery;
  return resolvePeriode(q.from, q.to);
}

dashboardRoutes.get('/summary', validate({ query: periodeQuerySchema }), async (req, res, next) => {
  try {
    res.json(success(await getSummary(periodeDariValidated(req))));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get(
  '/kunjungan-per-poli',
  validate({ query: periodeQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(success(await getKunjunganPerPoli(periodeDariValidated(req))));
    } catch (err) {
      next(err);
    }
  },
);

dashboardRoutes.get(
  '/tindakan',
  validate({ query: periodeQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(success(await getTindakanTerbanyak(periodeDariValidated(req))));
    } catch (err) {
      next(err);
    }
  },
);

dashboardRoutes.get(
  '/pendapatan',
  validate({ query: periodeQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(success(await getPendapatan(periodeDariValidated(req))));
    } catch (err) {
      next(err);
    }
  },
);

dashboardRoutes.get('/obat', validate({ query: periodeQuerySchema }), async (req, res, next) => {
  try {
    res.json(success(await getPenggunaanObat(periodeDariValidated(req))));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get(
  '/pembayaran',
  validate({ query: periodeQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(success(await getStatusPembayaran(periodeDariValidated(req))));
    } catch (err) {
      next(err);
    }
  },
);

dashboardRoutes.get(
  '/detail/:jenis',
  validate({ params: detailParamsSchema, query: detailQuerySchema }),
  async (req, res, next) => {
    try {
      const { jenis } = req.validated?.params as { jenis: DetailJenis };
      const q = req.validated?.query as DetailQuery;
      const periode = resolvePeriode(q.from, q.to);
      const hasil = await getDetail(jenis, periode, {
        page: q.page,
        per_page: q.per_page,
        poli_id: q.poli_id,
        status: q.status,
      });
      res.json(success(hasil.items, 'OK', hasil.meta));
    } catch (err) {
      next(err);
    }
  },
);
