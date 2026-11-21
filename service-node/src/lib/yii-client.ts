/**
 * Klien HTTP ke backend Yii sebagai akun layanan laboratorium (LAB_YII_USERNAME/LAB_YII_PASSWORD).
 * Token JWT disimpan di memori dan diperbarui otomatis saat Yii membalas 401.
 */
import { AppError } from './app-error.js';

export interface YiiResponse<T> {
  status: number;
  body: { success: boolean; message: string; data?: T; errors?: Record<string, string[]> };
}

/** Yii tidak dapat dihubungi (mati, timeout, atau error 5xx); request boleh dicoba ulang. */
export class YiiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YiiUnavailableError';
  }
}

let cachedToken: string | null = null;

const baseUrl = () => process.env.YII_URL ?? 'http://localhost:8080';
const timeoutMs = () => Number(process.env.YII_TIMEOUT_MS ?? 5000);

async function send<T>(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<YiiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (err) {
    throw new YiiUnavailableError(`Yii tidak dapat dihubungi: ${(err as Error).message}`);
  }
  if (res.status >= 500) {
    throw new YiiUnavailableError(`Yii membalas ${res.status}.`);
  }
  const json = (await res.json().catch(() => ({}))) as YiiResponse<T>['body'];
  return { status: res.status, body: json };
}

async function login(): Promise<string> {
  const res = await send<{ token: string }>('POST', '/system/auth/login', {
    username: process.env.LAB_YII_USERNAME ?? '',
    password: process.env.LAB_YII_PASSWORD ?? '',
  });
  if (res.status !== 200 || !res.body.data?.token) {
    throw new AppError(502, 'Akun layanan laboratorium gagal login ke backend Yii.');
  }
  cachedToken = res.body.data.token;
  return cachedToken;
}

/**
 * Memanggil endpoint Yii dengan token akun layanan; login ulang sekali bila token ditolak.
 * Melempar YiiUnavailableError bila Yii tidak dapat dihubungi atau error 5xx.
 *
 * Dipakai di: modules/lab/lab.service.ts.
 */
export async function yiiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<YiiResponse<T>> {
  const token = cachedToken ?? (await login());
  let res = await send<T>(method, path, body, { ...headers, Authorization: `Bearer ${token}` });
  if (res.status === 401) {
    const fresh = await login();
    res = await send<T>(method, path, body, { ...headers, Authorization: `Bearer ${fresh}` });
  }
  return res;
}

/**
 * Menghapus token tersimpan.
 *
 * Dipakai di: tests/.
 */
export function resetYiiToken(): void {
  cachedToken = null;
}
