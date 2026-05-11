import cron from 'node-cron';
import { cleanupOldFiles } from '../services/cleanupService.js';

/**
 * Initialize all cron jobs for the application.
 */
export function initializeCronJobs(): void {
  // Run old file cleanup every day at 12:00 AM IST
  // Keeps only the last 50 files globally, deletes older ones
  cron.schedule(
    '0 0 * * *',
    async () => {
      console.log('[Cron] Running scheduled old file cleanup at 12:00 AM IST');
      await cleanupOldFiles();
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  console.log('[Cron] Cron jobs initialized successfully');
  console.log('[Cron] - Old file cleanup: Daily at 12:00 AM IST (keeps last 50 files)');
}
