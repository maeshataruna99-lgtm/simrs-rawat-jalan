/**
 * Konfigurasi Vite dan Vitest. Alias `@` menunjuk ke folder src.
 */
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: true,
    port: 5173,
    // File watcher biasa tidak menangkap perubahan dari bind mount Windows ke container.
    watch: { usePolling: process.env.DOCKER === 'true' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
