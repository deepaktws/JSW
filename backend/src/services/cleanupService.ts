import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { getFilePath } from '../lib/filePaths.js';

const prisma = new PrismaClient();

/**
 * Clean up old files, keeping only the last 50 most recent files globally.
 * Marks files as DELETED in the database and removes physical files from disk.
 * Used by cron job to maintain storage limits.
 */
export async function cleanupOldFiles(): Promise<void> {
  try {
    console.log('[Cleanup] Starting old file cleanup...');

    const totalCount = await prisma.file.count({
      where: {
        status: 'UPLOADED',
      },
    });

    if (totalCount <= 50) {
      console.log(`[Cleanup] Only ${totalCount} files exist, no cleanup needed (keeping last 50)`);
      return;
    }

    const filesToDelete = await prisma.file.findMany({
      where: {
        status: 'UPLOADED',
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 50,
      select: {
        id: true,
        userId: true,
        originalName: true,
        sizeBytes: true,
      },
    });

    console.log(`[Cleanup] Found ${filesToDelete.length} files to delete (keeping 50 most recent)`);

    let totalSize = 0;
    const successfullyDeletedIds: string[] = [];
    const deletionErrors: Array<{ id: string; name: string; error: unknown }> = [];

    for (const file of filesToDelete) {
      try {
        const filePath = getFilePath(file);
        let fileSize = file.sizeBytes;

        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          fileSize = stats.size;
          
          fs.unlinkSync(filePath);
          totalSize += fileSize;
        } else {
          console.log(`[Cleanup] File not found on disk (already deleted): ${file.originalName}`);
        }

        successfullyDeletedIds.push(file.id);
        console.log(`[Cleanup] Deleted: ${file.originalName} (${formatBytes(fileSize)})`);
      } catch (err) {
        deletionErrors.push({ id: file.id, name: file.originalName, error: err });
        console.error(`[Cleanup] Error deleting file ${file.originalName}:`, err);
      }
    }

    if (successfullyDeletedIds.length > 0) {
      await prisma.file.updateMany({
        where: {
          id: {
            in: successfullyDeletedIds,
          },
        },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });
    }

    console.log(`[Cleanup] Complete: ${successfullyDeletedIds.length} files deleted, ${deletionErrors.length} errors, ${formatBytes(totalSize)} freed`);
  } catch (error) {
    console.error('[Cleanup] Error during old file cleanup:', error);
  }
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
