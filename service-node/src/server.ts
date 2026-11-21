/**
 * Entry point: menjalankan aplikasi Express pada port dari environment.
 */
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`service-node berjalan di port ${port}`);
});
