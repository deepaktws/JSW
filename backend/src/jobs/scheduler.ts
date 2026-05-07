import cron from 'node-cron';
import { cleanupTempFiles } from '../services/cleanupService.js';

/**
 * Initialize all cron jobs for the application.
 */
export function initializeCronJobs(): void {
  // Run temp file cleanup every day at 12:00 AM IST
  // Deletes all temp files
  cron.schedule(
    '0 0 * * *',
    () => {
      console.log('[Cron] Running scheduled temp file cleanup at 12:00 AM IST');
      cleanupTempFiles();
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  console.log('[Cron] Cron jobs initialized successfully');
  console.log('[Cron] - Temp file cleanup: Daily at 12:00 AM IST');
}
