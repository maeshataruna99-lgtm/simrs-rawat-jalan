/**
 * Koneksi PostgreSQL bersama. Node hanya menulis t_integration_outbox; tabel bisnis cukup dibaca.
 */
import pg from 'pg';

let pool: pg.Pool | null = null;

/**
 * Pool koneksi dari DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, dibuat saat pertama dipakai.
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
    max: 5,
  });
  return pool;
}

/**
 * Menutup pool (dipakai test agar proses bisa selesai).
 *
 * Dipakai di: tests/.
 */
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = null;
}
