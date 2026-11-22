/**
 * Penanganan error terpusat agar semua kegagalan dibalas dengan format seragam.
 */
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';
import { failure } from '../lib/response.js';

/**
 * Membalas 404 untuk route yang tidak terdaftar.
 *
 * Dipakai di: app.ts, dipasang setelah semua route.
 */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json(failure('Halaman tidak ditemukan.'));
}

/**
 * Mengubah error menjadi response JSON. AppError memakai status dan pesannya sendiri,
 * error lain dicatat ke log dan dibalas 500.
 *
 * Dipakai di: app.ts, dipasang paling akhir.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json(failure(err.message, err.errors));
    return;
  }
  // Body JSON rusak dari express.json() adalah kesalahan klien, bukan server.
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json(failure('Body request bukan JSON yang valid.'));
    return;
  }

  console.error(err);
  res.status(500).json(failure('Terjadi kesalahan pada server.'));
}
