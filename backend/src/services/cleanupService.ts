import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '..', '..', 'uploads', 'temp');

/**
 * Delete ALL temp files regardless of age.
 * Used by cron job to clean up abandoned upload sessions.
 */
export function cleanupTempFiles(): void {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      console.log('[Cleanup] Temp directory does not exist, skipping cleanup');
      return;
    }

    const tempDirs = fs.readdirSync(TEMP_DIR);
    const count = tempDirs.length;

    if (count === 0) {
      console.log('[Cleanup] No temp directories to clean up');
      return;
    }

    let totalSize = 0;

    for (const dirName of tempDirs) {
      const dirPath = path.join(TEMP_DIR, dirName);

      try {
        const stats = fs.statSync(dirPath);

        if (stats.isDirectory()) {
          const dirSize = getDirectorySize(dirPath);
          totalSize += dirSize;

          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`[Cleanup] Deleted temp directory: ${dirName} (${formatBytes(dirSize)})`);
        }
      } catch (err) {
        console.error(`[Cleanup] Error processing directory ${dirName}:`, err);
      }
    }

    console.log(`[Cleanup] Complete: ${count} temp directories deleted, ${formatBytes(totalSize)} freed`);
  } catch (error) {
    console.error('[Cleanup] Error during temp file cleanup:', error);
  }
}

/**
 * Calculate total size of a directory recursively.
 */
function getDirectorySize(dirPath: string): number {
  let totalSize = 0;

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        totalSize += getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch {
    // Ignore errors for individual items
  }

  return totalSize;
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}
