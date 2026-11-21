/**
 * Helper test: mengarahkan koneksi ke database simrs_test (dibuat database/init, dimigrasi `composer test` di Yii)
 * dan membersihkan baris outbox milik test.
 *
 * Dipakai di: tests/lab.test.ts, tests/lab-integration.test.ts.
 */
import { closeDb, db } from '../src/lib/db.js';

export function useTestDatabase(): void {
  process.env.DB_HOST ??= 'localhost';
  process.env.DB_PORT ??= '5432';
  process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'simrs_test';
  process.env.DB_USER ??= 'simrs';
  process.env.DB_PASSWORD ??= 'simrs_dev';
}

/** Menghapus baris outbox dengan awalan key tertentu lalu menutup pool. */
export async function cleanOutbox(prefix: string, close = false): Promise<void> {
  await db().query('DELETE FROM t_integration_outbox WHERE idempotency_key LIKE $1', [
    `${prefix}%`,
  ]);
  if (close) {
    await closeDb();
  }
}

/** Baris outbox berdasarkan key. */
export async function outboxRow(key: string) {
  const { rows } = await db().query(
    'SELECT status, percobaan, error_terakhir, retry_berikutnya > CURRENT_TIMESTAMP AS terjadwal FROM t_integration_outbox WHERE idempotency_key = $1',
    [key],
  );
  return rows[0] as
    | { status: string; percobaan: number; error_terakhir: string | null; terjadwal: boolean }
    | undefined;
}
