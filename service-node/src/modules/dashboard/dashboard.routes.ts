/**
 * Route API dashboard read-only (/api/dashboard/...) dengan validasi periode (422), filter dokter/penjamin, dan detail berhalaman.
 * Seluruh endpoint memerlukan JWT valid dan izin `dashboard:read`.
 *
 * Dipakai di: src/app.ts.
 */
import { Router, type Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/app-error.js';
import { success } from '../../lib/response.js';
import { authenticate, hasPermission, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  getDetail,
  getFilterOptions,
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

/** Izin menu khusus data pendapatan (pendapatan, tagihan, pembayaran). Bawaan: admin dan kasir. */
const MENU_KEUANGAN = 'dashboard-keuangan';

function bolehKeuangan(req: Request): Promise<boolean> {
  return hasPermission(req.user?.role ?? '', MENU_KEUANGAN, 'read');
}

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

const penjaminField = z.enum(['umum', 'bpjs', 'asuransi']).optional();
const dokterIdField = z.coerce.number().int().min(1).optional();

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
    dokter_id: dokterIdField,
    penjamin: penjaminField,
  })
  .superRefine(applyPeriodeRefinement);

const detailParamsSchema = z.object({
  jenis: z.enum(['kunjungan', 'tindakan', 'pendapatan', 'obat', 'pembayaran']),
});

const detailQuerySchema = z
  .object({
    from: dateField,
    to: dateField,
    dokter_id: dokterIdField,
    penjamin: penjaminField,
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
    poli_id: z.coerce.number().int().min(1).optional(),
    status: z.string().trim().min(1).max(30).optional(),
  })
  .superRefine(applyPeriodeRefinement);

type PeriodeQuery = z.infer<typeof periodeQuerySchema>;
type DetailQuery = z.infer<typeof detailQuerySchema>;

dashboardRoutes.use(authenticate('jwt'), requirePermission('dashboard', 'read'));

function filterDariValidated(req: Request) {
  const q = (req.validated?.query ?? {}) as PeriodeQuery;
  return resolvePeriode(q.from, q.to, { dokter_id: q.dokter_id, penjamin: q.penjamin });
}

dashboardRoutes.get('/filters', async (_req, res, next) => {
  try {
    res.json(success(await getFilterOptions()));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get('/summary', validate({ query: periodeQuerySchema }), async (req, res, next) => {
  try {
    const summary = await getSummary(filterDariValidated(req));
    res.json(
      success(
        (await bolehKeuangan(req))
          ? summary
          : { ...summary, total_pendapatan: null, total_tagihan: null, invoice_per_status: null },
      ),
    );
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get(
  '/kunjungan-per-poli',
  validate({ query: periodeQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(success(await getKunjunganPerPoli(filterDariValidated(req))));
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
      res.json(success(await getTindakanTerbanyak(filterDariValidated(req))));
    } catch (err) {
      next(err);
    }
  },
);

dashboardRoutes.get(
  '/pendapatan',
  requirePermission(MENU_KEUANGAN),
  validate({ query: periodeQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(success(await getPendapatan(filterDariValidated(req))));
    } catch (err) {
      next(err);
    }
  },
);

dashboardRoutes.get('/obat', validate({ query: periodeQuerySchema }), async (req, res, next) => {
  try {
    res.json(success(await getPenggunaanObat(filterDariValidated(req))));
  } catch (err) {
    next(err);
  }
});

dashboardRoutes.get(
  '/pembayaran',
  requirePermission(MENU_KEUANGAN),
  validate({ query: periodeQuerySchema }),
  async (req, res, next) => {
    try {
      res.json(success(await getStatusPembayaran(filterDariValidated(req))));
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
      if ((jenis === 'pendapatan' || jenis === 'pembayaran') && !(await bolehKeuangan(req))) {
        throw new AppError(403, 'Anda tidak memiliki akses ke fitur ini.');
      }
      const filter = resolvePeriode(q.from, q.to, {
        dokter_id: q.dokter_id,
        penjamin: q.penjamin,
      });
      const hasil = await getDetail(jenis, filter, {
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
