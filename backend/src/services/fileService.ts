import fs from 'fs';
import { promises as fsPromises } from 'fs';
import type { File } from '@prisma/client';
import { prisma } from '../config/database.js';
import { config } from '../config/env.js';
import {
  getFilePath,
  ensureUserFilesDir,
  getTempUploadDir,
  getMetadataPath,
  getChunkPath,
} from '../lib/filePaths.js';
import { AppError } from '../lib/errors.js';

const MAX_FILE_SIZE = config.fileSizeLimit;

interface UploadMetadata {
  fileId: string;
  userId: string;
  originalName: string;
  mimeType: string;
  totalChunks: number;
  receivedChunks: number[];
  totalSize: number;
  createdAt: string;
}

interface UploadProgress {
  received: number;
  total: number;
  percentage: number;
}

interface UploadChunkParams {
  userId: string;
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkBuffer: Buffer;
  originalName: string;
  mimeType: string;
}

type UploadChunkResult =
  | { completed: false; progress: UploadProgress }
  | { completed: true; file: File };

/**
 * Calculate upload progress percentage.
 */
function calculateProgress(receivedChunks: number[], totalChunks: number): UploadProgress {
  return {
    received: receivedChunks.length,
    total: totalChunks,
    percentage: Math.round((receivedChunks.length / totalChunks) * 100),
  };
}

/**
 * Read and validate metadata from disk.
 */
function readAndValidateMetadata(
  metadataPath: string,
  userId: string,
): UploadMetadata | null {
  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  let metadata: UploadMetadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as UploadMetadata;
  } catch {
    throw new AppError('Corrupted upload session metadata', 500);
  }

  if (metadata.userId !== userId) {
    throw new AppError('Access denied: Cannot upload chunks for another user', 403);
  }

  return metadata;
}

/**
 * Upload a chunk. Auto-finalizes if all chunks received.
 * Returns { completed: false, progress } or { completed: true, file }.
 */
export async function uploadChunk({
  userId,
  fileId,
  chunkIndex,
  totalChunks,
  chunkBuffer,
  originalName,
  mimeType,
}: UploadChunkParams): Promise<UploadChunkResult> {
  const uploadDir = getTempUploadDir(fileId);
  const metadataPath = getMetadataPath(fileId);
  const chunkPath = getChunkPath(fileId, chunkIndex);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let metadata = readAndValidateMetadata(metadataPath, userId);

  if (!metadata) {
    metadata = {
      fileId,
      userId,
      originalName,
      mimeType,
      totalChunks,
      receivedChunks: [],
      totalSize: 0,
      createdAt: new Date().toISOString(),
    };
  }

  if (metadata.totalChunks !== totalChunks) {
    throw new AppError(
      `Inconsistent totalChunks: expected ${metadata.totalChunks}, got ${totalChunks}`,
      400,
    );
  }

  if (metadata.receivedChunks.includes(chunkIndex)) {
    return { completed: false, progress: calculateProgress(metadata.receivedChunks, totalChunks) };
  }

  const newTotalSize = metadata.totalSize + chunkBuffer.length;
  if (newTotalSize > MAX_FILE_SIZE) {
    throw new AppError(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`,
      413,
    );
  }

  fs.writeFileSync(chunkPath, chunkBuffer);

  metadata.receivedChunks.push(chunkIndex);
  metadata.receivedChunks.sort((a, b) => a - b);
  metadata.totalSize = newTotalSize;
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  if (metadata.receivedChunks.length === totalChunks) {
    const file = await finalizeUpload(fileId, metadata);
    return { completed: true, file };
  }

  return { completed: false, progress: calculateProgress(metadata.receivedChunks, totalChunks) };
}

/**
 * Internal function to finalize upload by merging chunks.
 */
async function finalizeUpload(fileId: string, metadata: UploadMetadata): Promise<File> {
  if (metadata.receivedChunks.length !== metadata.totalChunks) {
    const missing: number[] = [];
    for (let i = 0; i < metadata.totalChunks; i++) {
      if (!metadata.receivedChunks.includes(i)) {
        missing.push(i);
      }
    }
    throw new AppError(`Missing chunks: ${missing.join(', ')}`, 400);
  }

  ensureUserFilesDir(metadata.userId);

  const fileRecord = {
    id: fileId,
    userId: metadata.userId,
    originalName: metadata.originalName,
    mimeType: metadata.mimeType,
  };

  const finalPath = getFilePath(fileRecord);
  const uploadDir = getTempUploadDir(fileId);

  try {
    const writeStream = fs.createWriteStream(finalPath);

    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunkPath = getChunkPath(fileId, i);
      const chunkData = await fsPromises.readFile(chunkPath);

      await new Promise<void>((resolve, reject) => {
        if (!writeStream.write(chunkData)) {
          writeStream.once('drain', resolve);
          writeStream.once('error', reject);
        } else {
          resolve();
        }
      });
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const stats = await fsPromises.stat(finalPath);
    const sizeBytes = stats.size;

    if (Math.abs(sizeBytes - metadata.totalSize) > 1024) {
      throw new Error(`File size mismatch: expected ${metadata.totalSize}, got ${sizeBytes}`);
    }

    const file = await prisma.file.create({
      data: {
        id: fileId,
        userId: metadata.userId,
        originalName: metadata.originalName,
        sizeBytes,
        mimeType: metadata.mimeType,
        status: 'ACTIVE',
      },
    });

    try {
      await fsPromises.rm(uploadDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error('Warning: Failed to cleanup temp directory:', cleanupErr);
    }

    return file;
  } catch (err) {
    try {
      if (fs.existsSync(finalPath)) {
        await fsPromises.unlink(finalPath);
      }
    } catch (cleanupErr) {
      console.error('Warning: Failed to cleanup partial file:', cleanupErr);
    }
    throw err;
  }
}

/**
 * Get a file by ID (only active files).
 */
export async function getFileById(fileId: string): Promise<File> {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      status: 'ACTIVE',
    },
  });

  if (!file) {
    throw new AppError('File not found', 404);
  }

  return file;
}

/**
 * Get file for download with path verification.
 */
export async function getFileForDownload(fileId: string): Promise<{ file: File; filePath: string }> {
  const file = await getFileById(fileId);
  const filePath = getFilePath(file);

  if (!fs.existsSync(filePath)) {
    throw new AppError('File not found on disk', 404);
  }

  return { file, filePath };
}

/**
 * List all active files for a user (paginated).
 */
export async function listUserFiles({
  userId,
  skip,
  limit,
}: {
  userId: string;
  skip: number;
  limit: number;
}): Promise<{ files: File[]; total: number }> {
  const where = {
    userId,
    status: 'ACTIVE' as const,
  };

  const [files, total] = await prisma.$transaction([
    prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.file.count({ where }),
  ]);

  return { files, total };
}

/**
 * Soft delete a file (sets status to DELETED and deletedAt timestamp).
 */
export async function softDeleteFile(fileId: string, userId: string): Promise<File> {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      userId,
      status: 'ACTIVE',
    },
  });

  if (!file) {
    throw new AppError('File not found', 404);
  }

  return prisma.file.update({
    where: { id: fileId },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
    },
  });
}
