/**
 * Koneksi PostgreSQL bersama. Node hanya menulis t_integration_outbox; modul dashboard memakai koneksi read-only.
 */
import pg from 'pg';

let pool: pg.Pool | null = null;
let readOnlyPool: pg.Pool | null = null;

function parsePoolMax(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Pool koneksi utama (dipakai outbox integrasi lab dan utilitas test).
 *
 * Dipakai di: modules/lab/outbox.ts, tests/.
 */
export function db(): pg.Pool {
  pool ??= new pg.Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: parsePoolMax(process.env.DB_POOL_MAX, 16),
  });
  return pool;
}

/**
 * Pool koneksi khusus baca untuk query dashboard dan cek hak akses.
 * Memakai DB_READONLY_USER bila diset, atau fallback ke DB_USER pada lingkungan test/lokal.
 *
 * Dipakai di: modules/dashboard/dashboard.service.ts, middleware/auth.ts.
 */
export function readDb(): pg.Pool {
  readOnlyPool ??= new pg.Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_READONLY_USER || process.env.DB_USER,
    password: process.env.DB_READONLY_PASSWORD || process.env.DB_PASSWORD,
    max: parsePoolMax(process.env.DB_READONLY_POOL_MAX, 20),
  });
  return readOnlyPool;
}

/**
 * Menutup seluruh pool (dipakai test agar proses bisa selesai).
 *
 * Dipakai di: tests/.
 */
export async function closeDb(): Promise<void> {
  await Promise.all([pool?.end(), readOnlyPool?.end()]);
  pool = null;
  readOnlyPool = null;
}
