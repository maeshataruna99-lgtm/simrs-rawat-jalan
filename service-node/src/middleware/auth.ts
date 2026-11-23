/**
 * Autentikasi request ke service Node.
 * - `jwt`: token Bearer yang diterbitkan Yii (secret dan issuer sama), dipakai frontend.
 * - `apiKey`: header X-Api-Key dari LAB_API_KEYS, dipakai sistem eksternal seperti alat laboratorium.
 */
import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/app-error.js';
import { readDb } from '../lib/db.js';

export type AuthMethod = 'jwt' | 'apiKey';

export interface AuthUser {
  id: number;
  role: string;
  nama: string;
}

export interface AuthClient {
  type: 'external';
}

const ISSUER = 'simrs-backend';

/**
 * Membuat middleware yang menerima salah satu metode autentikasi yang diizinkan.
 * Gagal semua metode dibalas 401 dengan format seragam.
 *
 * Contoh: `router.post('/results', authenticate('apiKey'), ...)`,
 *         `router.get('/summary', authenticate('jwt'), ...)`.
 *
 * Dipakai di: route modul lab-integration (poin 7.3) dan dashboard (poin 9.1).
 */
export function authenticate(...methods: AuthMethod[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (methods.includes('jwt')) {
      const user = userFromBearer(req.header('authorization'));
      if (user) {
        req.user = user;
        return next();
      }
    }

    if (methods.includes('apiKey') && isValidApiKey(req.header('x-api-key'))) {
      req.apiClient = { type: 'external' };
      return next();
    }

    // Klien mesin (alat lab) tidak punya sesi login, jadi diberi pesan khusus API key.
    const message = methods.includes('jwt')
      ? 'Sesi tidak valid atau sudah berakhir, silakan login ulang.'
      : 'API key tidak valid atau tidak dikirim (header X-Api-Key).';
    next(new AppError(401, message));
  };
}

export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

const ACTION_COLUMN: Record<PermissionAction, string> = {
  read: 'can_read',
  create: 'can_create',
  update: 'can_update',
  delete: 'can_delete',
};

const DEFAULT_PERMISSION_CACHE_TTL_MS = 5_000;
const MAX_PERMISSION_CACHE_ENTRIES = 500;

interface PermissionCacheEntry {
  allowed: boolean;
  expiresAt: number;
}

const permissionCache = new Map<string, PermissionCacheEntry>();
const permissionInFlight = new Map<string, Promise<boolean>>();

function permissionCacheTtlMs(): number {
  const raw = process.env.PERMISSION_CACHE_TTL_MS;
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_PERMISSION_CACHE_TTL_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_PERMISSION_CACHE_TTL_MS;
}

/**
 * Mengosongkan cache izin RBAC di memori.
 *
 * Dipakai di: tests/ dan saat perlu memaksa pembacaan ulang hak akses.
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
  permissionInFlight.clear();
}

/**
 * Memastikan role pengguna pada JWT memiliki izin menu:aksi di m_role_access.
 * Ditolak 403 bila tidak memiliki izin.
 *
 * Dipakai di: modules/dashboard/dashboard.routes.ts.
 */
export function requirePermission(menuCode: string, action: PermissionAction = 'read') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const roleKode = req.user?.role;
    if (!roleKode) {
      return next(new AppError(401, 'Sesi tidak valid atau sudah berakhir, silakan login ulang.'));
    }
    try {
      if (!(await hasPermission(roleKode, menuCode, action))) {
        return next(new AppError(403, 'Anda tidak memiliki akses ke fitur ini.'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Cek izin menu:aksi untuk satu role tanpa menolak request.
 * Hasil di-cache singkat di memori (bawaan 5 detik, dapat diatur lewat PERMISSION_CACHE_TTL_MS)
 * disertai deduplikasi query in-flight agar burst request paralel tidak membanjiri pool baca.
 *
 * Dipakai di: requirePermission(), dashboard.routes.ts (menyaring data keuangan).
 */
export async function hasPermission(
  roleKode: string,
  menuCode: string,
  action: PermissionAction = 'read',
): Promise<boolean> {
  const ttlMs = permissionCacheTtlMs();
  const cacheKey = `${roleKode}:${menuCode}:${action}`;
  const now = Date.now();

  if (ttlMs > 0) {
    const cached = permissionCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.allowed;
    }
    const pending = permissionInFlight.get(cacheKey);
    if (pending) {
      return pending;
    }
  }

  const queryPromise = (async () => {
    const { rowCount } = await readDb().query(
      `SELECT 1
       FROM m_role_access ra
       JOIN m_role r ON r.id = ra.role_id AND r.deleted_at IS NULL
       JOIN m_menu m ON m.id = ra.menu_id AND m.deleted_at IS NULL
       WHERE r.kode = $1 AND m.kode = $2 AND ra.${ACTION_COLUMN[action]} = true
       LIMIT 1`,
      [roleKode, menuCode],
    );
    const allowed = Boolean(rowCount);
    if (ttlMs > 0) {
      if (permissionCache.size >= MAX_PERMISSION_CACHE_ENTRIES) {
        permissionCache.clear();
      }
      permissionCache.set(cacheKey, { allowed, expiresAt: Date.now() + ttlMs });
    }
    return allowed;
  })();

  if (ttlMs > 0) {
    const tracked = queryPromise.finally(() => {
      if (permissionInFlight.get(cacheKey) === tracked) {
        permissionInFlight.delete(cacheKey);
      }
    });
    permissionInFlight.set(cacheKey, tracked);
    return tracked;
  }

  return queryPromise;
}

/**
 * Memverifikasi token Bearer. Token tidak sah dalam bentuk apa pun menghasilkan null.
 */
function userFromBearer(header: string | undefined): AuthUser | null {
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secret = process.env.JWT_SECRET ?? '';
  if (!token || secret.length < 32) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: ISSUER });
    if (typeof payload === 'string' || payload.sub === undefined) {
      return null;
    }
    return { id: Number(payload.sub), role: String(payload.role), nama: String(payload.nama) };
  } catch {
    return null;
  }
}

/**
 * Mencocokkan API key dengan daftar di LAB_API_KEYS memakai perbandingan waktu konstan.
 */
function isValidApiKey(key: string | undefined): boolean {
  if (!key) {
    return false;
  }

  const candidate = Buffer.from(key);
  return (process.env.LAB_API_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .some((allowed) => {
      const expected = Buffer.from(allowed);
      return expected.length === candidate.length && timingSafeEqual(expected, candidate);
    });
}
