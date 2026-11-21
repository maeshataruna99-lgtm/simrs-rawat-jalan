/**
 * Pembentuk format response API yang seragam dengan backend Yii (CONTRIBUTING.md bagian 8).
 */

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
}

/**
 * Membungkus data sukses.
 *
 * Dipakai di: seluruh controller di src/modules.
 */
export function success<T>(data: T, message = 'OK', meta?: PageMeta) {
  return { success: true as const, message, data, ...(meta && { meta }) };
}

/**
 * Membungkus data gagal. `errors` berisi pesan per field untuk validasi.
 *
 * Dipakai di: middleware/error-handler.ts.
 */
export function failure(message: string, errors?: Record<string, string[]>) {
  return { success: false as const, message, ...(errors && { errors }) };
}
