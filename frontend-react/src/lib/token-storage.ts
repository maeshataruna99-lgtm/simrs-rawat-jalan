/**
 * Penyimpanan token JWT di localStorage.
 *
 * Dipakai di: lib/api-client.ts (menyisipkan header Authorization), store autentikasi (poin 1.10).
 */
const KEY = 'simrs_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(KEY),
  set: (token: string): void => localStorage.setItem(KEY, token),
  clear: (): void => localStorage.removeItem(KEY),
};
