/**
 * Validasi request dengan skema zod. Pesan error berbahasa Indonesia dan dikelompokkan per field,
 * sama dengan format validasi backend Yii.
 */
import type { NextFunction, Request, Response } from 'express';
import { z, type ZodType } from 'zod';
import { AppError } from '../lib/app-error.js';

z.config(z.locales.id());

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Membuat middleware validasi. Data yang lolos (sudah dikonversi tipenya) disimpan di `req.validated`;
 * data yang gagal dibalas 422 dengan `errors` per field.
 *
 * Contoh: `router.get('/summary', validate({ query: periodeSchema }), handler)`.
 *
 * Dipakai di: route modul lab-integration (poin 7.3) dan dashboard (poin 9.1).
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {};
    const validated: NonNullable<Request['validated']> = {};

    for (const part of ['body', 'query', 'params'] as const) {
      const schema = schemas[part];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        validated[part] = result.data;
        continue;
      }

      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || part;
        (errors[field] ??= []).push(issue.message);
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError(422, 'Validasi gagal.', errors));
    }

    req.validated = validated;
    next();
  };
}
