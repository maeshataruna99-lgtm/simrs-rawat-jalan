/**
 * Worker pengirim ulang outbox: setiap interval mengambil baris pending yang sudah jatuh tempo dan mengirimnya ke Yii.
 * Baris dikunci FOR UPDATE SKIP LOCKED agar dua instance worker tidak mengirim baris yang sama bersamaan.
 */
import { db } from '../../lib/db.js';
import { deliver, type OutboxRow } from './outbox.js';

/**
 * Memproses satu batch baris pending yang jatuh tempo. Mengembalikan jumlah baris yang dicoba.
 *
 * Dipakai di: startOutboxWorker(), tests/.
 */
export async function processDueOutbox(limit = 20): Promise<number> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<OutboxRow>(
      `SELECT id, idempotency_key, status, percobaan, payload FROM t_integration_outbox
       WHERE status = 'pending' AND retry_berikutnya <= CURRENT_TIMESTAMP
       ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [limit],
    );
    // Jadwal digeser dulu sebagai lease; deliver() menimpanya dengan status akhir.
    if (rows.length > 0) {
      await client.query(
        `UPDATE t_integration_outbox SET retry_berikutnya = CURRENT_TIMESTAMP + INTERVAL '60 seconds'
         WHERE id = ANY($1)`,
        [rows.map((r) => r.id)],
      );
    }
    await client.query('COMMIT');

    for (const row of rows) {
      await deliver(row);
    }
    return rows.length;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Menjalankan worker berkala. Error satu putaran dicatat tanpa menghentikan worker.
 *
 * Dipakai di: server.ts.
 */
export function startOutboxWorker(intervalMs = Number(process.env.OUTBOX_INTERVAL_MS ?? 5000)) {
  let running = false;
  return setInterval(() => {
    if (running) return;
    running = true;
    processDueOutbox()
      .catch((err) => console.error('Outbox worker gagal:', err))
      .finally(() => {
        running = false;
      });
  }, intervalMs);
}
