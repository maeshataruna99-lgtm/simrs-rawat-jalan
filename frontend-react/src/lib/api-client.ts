/**
 * Klien HTTP ke backend Yii dan service Node.
 * Token JWT disisipkan otomatis; response 401 menghapus token agar user diarahkan login ulang.
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
      if (error.response?.status === 401) {
        tokenStorage.clear();
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
