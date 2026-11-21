/**
 * Perakitan aplikasi Express: parser, route, dan penanganan error.
 * Dipisah dari server.ts agar bisa diuji tanpa membuka port.
 *
 * Dipakai di: server.ts, tests/.
 */
import express from 'express';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { healthRoutes } from './modules/health/health.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
