/**
 * Klien HTTP ke backend Yii dan service Node.
 * Token JWT disisipkan otomatis; response 401 menghapus token dan memanggil handler logout.
 *
 * Dipakai di: file `*.api.ts` di setiap modul (src/modules/...).
 */
import axios, { type AxiosInstance } from 'axios';
import { tokenStorage } from './token-storage';

/** Bentuk response seragam dari Yii dan Node (CONTRIBUTING.md bagian 8). */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; per_page: number; total: number };
  errors?: Record<string, string[]>;
}

/** Mengubah respons daftar berhalaman menjadi { items, meta }. */
export function toPage<T>(res: ApiResponse<T[]>) {
  return {
    items: res.data,
    meta: res.meta ?? { page: 1, per_page: res.data.length, total: res.data.length },
  };
}

let onUnauthorized: () => void = () => {};

/**
 * Mendaftarkan aksi saat server membalas 401 (token tidak sah atau kedaluwarsa).
 *
 * Dipakai di: lib/auth-store.ts (logout otomatis).
 */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/** Pesan error dari respons API seragam, atau pesan cadangan bila server tidak terjangkau. */
export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

/** Error validasi per field dari respons 422. */
export function fieldErrors(error: unknown): Record<string, string[]> {
  if (axios.isAxiosError<ApiResponse<unknown>>(error) && error.response?.status === 422) {
    return error.response.data?.errors ?? {};
  }
  return {};
}

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL, timeout: 15000 });

  client.interceptors.request.use((config) => {
    const token = tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // Login gagal juga 401, tetapi itu bukan sesi kedaluwarsa sehingga tidak memicu logout.
      const isLoginRequest = error.config?.url?.endsWith('/system/auth/login');
      if (error.response?.status === 401 && !isLoginRequest) {
        tokenStorage.clear();
        onUnauthorized();
      }
      return Promise.reject(error);
    },
  );

  return client;
}

/** Backend utama: master, transaksi, sistem. */
export const yiiApi = createClient(import.meta.env.VITE_YII_URL ?? 'http://localhost:8080');

/** Service pendukung: dashboard dan integrasi laboratorium. */
export const nodeApi = createClient(import.meta.env.VITE_NODE_URL ?? 'http://localhost:3000');
