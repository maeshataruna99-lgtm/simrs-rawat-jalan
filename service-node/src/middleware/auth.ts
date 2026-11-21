/**
 * Autentikasi request ke service Node.
 * - `jwt`: token Bearer yang diterbitkan Yii (secret dan issuer sama), dipakai frontend.
 * - `apiKey`: header X-Api-Key dari LAB_API_KEYS, dipakai sistem eksternal seperti alat laboratorium.
 */
import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/app-error.js';

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

    next(new AppError(401, 'Sesi tidak valid atau sudah berakhir, silakan login ulang.'));
  };
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
