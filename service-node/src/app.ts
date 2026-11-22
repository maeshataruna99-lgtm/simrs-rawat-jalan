/**
 * Perakitan aplikasi Express: CORS, parser, route, dan penanganan error.
 * Dipisah dari server.ts agar bisa diuji tanpa membuka port.
 *
 * Dipakai di: server.ts, tests/.
 */
import express from 'express';
import { fileURLToPath } from 'node:url';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { labRoutes } from './modules/lab/lab.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Api-Key, Idempotency-Key',
    );
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  // Spesifikasi OpenAPI disajikan apa adanya agar bisa dibuka di Swagger Editor / Postman.
  app.get('/openapi.yaml', (_req, res) => {
    res
      .type('application/yaml')
      .sendFile(fileURLToPath(new URL('../openapi.yaml', import.meta.url)));
  });
  app.use('/health', healthRoutes);
  app.use('/api/lab', labRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
