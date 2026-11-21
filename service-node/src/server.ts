/**
 * Entry point: menjalankan aplikasi Express pada port dari environment dan worker outbox laboratorium.
 */
import { createApp } from './app.js';
import { startOutboxWorker } from './modules/lab/outbox.worker.js';

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`service-node berjalan di port ${port}`);
});

startOutboxWorker();
