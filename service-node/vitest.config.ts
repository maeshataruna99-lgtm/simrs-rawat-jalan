/**
 * Konfigurasi Vitest. File test dijalankan berurutan karena test outbox berbagi tabel t_integration_outbox di simrs_test.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { fileParallelism: false },
});
