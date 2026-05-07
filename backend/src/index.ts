/**
 * Server entry — loads env, runs migrations in Docker startup script optional; here we only listen.
 */
import { config } from './config/env.js';
import app from './app.js';
import { ensureUploadDirectories } from './lib/filePaths.js';
import { initializeCronJobs } from './jobs/scheduler.js';

ensureUploadDirectories();
initializeCronJobs();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${config.port} (${config.nodeEnv})`);
});
