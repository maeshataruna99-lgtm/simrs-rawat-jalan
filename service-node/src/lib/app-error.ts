/**
 * Error yang sudah diketahui penyebabnya, membawa HTTP status dan pesan untuk klien.
 * Error lain dianggap tak terduga dan dibalas 500 tanpa membocorkan detail.
 *
 * Dipakai di: service dan middleware yang perlu menolak request, dibaca oleh middleware/error-handler.ts.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
