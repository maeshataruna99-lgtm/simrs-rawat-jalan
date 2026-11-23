/**
 * Outbox integrasi laboratorium (t_integration_outbox): hasil dari sistem eksternal disimpan dulu,
 * lalu dikirim ke Yii. Bila Yii tidak dapat diakses, baris tetap pending dan dikirim ulang dengan backoff (D.5).
 */
import { db } from '../../lib/db.js';
import { AppError } from '../../lib/app-error.js';
import { YiiUnavailableError } from '../../lib/yii-client.js';
import { forwardResult, type LabResultInput } from './lab.service.js';

export interface OutboxRow {
  id: number;
  idempotency_key: string;
  status: 'pending' | 'terkirim' | 'gagal';
  percobaan: number;
  payload: LabResultInput;
}

export type DeliveryResult =
  | { status: 'terkirim'; data: unknown; duplikat?: boolean }
  | { status: 'pending'; error: string }
  | { status: 'gagal'; error: AppError };

/** Jeda percobaan berikutnya: 5, 10, 20, ... detik, maksimal 5 menit. */
export function backoffSeconds(percobaan: number): number {
  return Math.min(5 * 2 ** Math.max(percobaan - 1, 0), 300);
}

/**
 * Menyimpan hasil ke outbox. Key yang sama tidak membuat baris baru (mengembalikan baris lama).
 * Baris baru diberi jeda 30 detik agar worker tidak mengirim bersamaan dengan pengiriman langsung.
 *
 * Dipakai di: lab.routes.ts (POST /api/lab/results).
 */
export async function enqueue(input: LabResultInput): Promise<OutboxRow> {
  const inserted = await db().query<OutboxRow>(
    `INSERT INTO t_integration_outbox (idempotency_key, tujuan, payload, retry_berikutnya)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '30 seconds')
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id, idempotency_key, status, percobaan, payload`,
    [input.idempotency_key, `PUT /transaction/hasil-lab/${input.detail_id}`, JSON.stringify(input)],
  );
  if (inserted.rows[0]) {
    return inserted.rows[0];
  }
  const existing = await db().query<OutboxRow>(
    'SELECT id, idempotency_key, status, percobaan, payload FROM t_integration_outbox WHERE idempotency_key = $1',
    [input.idempotency_key],
  );
  const row = existing.rows[0];
  if (row && (row.payload.detail_id !== input.detail_id || row.payload.hasil !== input.hasil)) {
    throw new AppError(409, 'Idempotency-Key sudah digunakan untuk hasil dengan isi berbeda.');
  }
  return row;
}

/**
 * Singleflight map in-process per idempotency_key: mencegah request atau worker paralel
 * dengan key sama memanggil Yii bersamaan sebelum pengiriman pertama selesai.
 */
const inFlightDeliveries = new Map<string, Promise<DeliveryResult>>();

function duplicateResult(row: OutboxRow): DeliveryResult {
  return {
    status: 'terkirim',
    duplikat: true,
    data: {
      id: row.payload.detail_id,
      hasil: row.payload.hasil,
      idempotency_key: row.idempotency_key,
      status: 'terkirim',
    },
  };
}

/**
 * Mengunci baris outbox secara singkat untuk membaca status terbaru dan memperpanjang lease
 * `retry_berikutnya` agar worker berkala tidak ikut memproses baris yang sedang dikirim.
 */
async function claimOutboxRow(row: OutboxRow): Promise<OutboxRow | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<OutboxRow>(
      `SELECT id, idempotency_key, status, percobaan, payload
       FROM t_integration_outbox
       WHERE id = $1
       FOR UPDATE`,
      [row.id],
    );
    const current = rows[0] ?? null;
    if (current && current.status === 'pending') {
      await client.query(
        `UPDATE t_integration_outbox
         SET retry_berikutnya = GREATEST(retry_berikutnya, CURRENT_TIMESTAMP + INTERVAL '30 seconds'),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [current.id],
      );
    }
    await client.query('COMMIT');
    return current;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function executeDeliver(row: OutboxRow): Promise<DeliveryResult> {
  const fresh = (await claimOutboxRow(row)) ?? row;
  if (fresh.status === 'terkirim') {
    return duplicateResult(fresh);
  }

  try {
    const data = await forwardResult(fresh.payload);
    await db().query(
      `UPDATE t_integration_outbox
       SET status = 'terkirim', percobaan = percobaan + 1,
           error_terakhir = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status <> 'terkirim'`,
      [fresh.id],
    );
    return { status: 'terkirim', data };
  } catch (err) {
    const percobaan = fresh.percobaan + 1;
    if (err instanceof YiiUnavailableError) {
      await db().query(
        `UPDATE t_integration_outbox
         SET percobaan = percobaan + 1, error_terakhir = $2,
             retry_berikutnya = CURRENT_TIMESTAMP + make_interval(secs => $3),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'pending'`,
        [fresh.id, err.message, backoffSeconds(percobaan)],
      );
      return { status: 'pending', error: err.message };
    }
    if (err instanceof AppError && err.status < 500) {
      await db().query(
        `UPDATE t_integration_outbox
         SET status = 'gagal', percobaan = percobaan + 1, error_terakhir = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'pending'`,
        [fresh.id, err.message],
      );
      return { status: 'gagal', error: err };
    }
    throw err;
  }
}

/**
 * Mengirim satu baris outbox ke Yii lalu mencatat hasilnya:
 * bila baris sudah berstatus `terkirim`, kembalikan sukses idempoten tanpa memanggil ulang Yii
 * maupun menaikkan penghitung `percobaan`; bila ada kiriman paralel in-flight untuk key yang sama,
 * pemanggil lain menunggu hasil kiriman tunggal tersebut;
 * sukses -> terkirim; Yii tidak terjangkau -> tetap pending dengan jadwal ulang; ditolak Yii (4xx) -> gagal permanen.
 *
 * Dipakai di: lab.routes.ts, outbox.worker.ts.
 */
export async function deliver(row: OutboxRow): Promise<DeliveryResult> {
  if (row.status === 'terkirim') {
    return duplicateResult(row);
  }

  const existing = inFlightDeliveries.get(row.idempotency_key);
  if (existing) {
    const res = await existing;
    return res.status === 'terkirim' ? { ...res, duplikat: true } : res;
  }

  const promise = executeDeliver(row).finally(() => {
    if (inFlightDeliveries.get(row.idempotency_key) === promise) {
      inFlightDeliveries.delete(row.idempotency_key);
    }
  });
  inFlightDeliveries.set(row.idempotency_key, promise);
  return promise;
}
