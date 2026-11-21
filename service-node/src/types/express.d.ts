/**
 * Tambahan properti request Express yang diisi middleware.
 */
import type { AuthClient, AuthUser } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      /** User dari token JWT Yii. Diisi middleware/auth.ts. */
      user?: AuthUser;
      /** Sistem eksternal dari header X-Api-Key. Diisi middleware/auth.ts. */
      apiClient?: AuthClient;
      /** Hasil validasi body/query/params yang sudah bertipe. Diisi middleware/validate.ts. */
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

export {};
