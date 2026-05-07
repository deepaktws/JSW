import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { prisma } from '../config/database.js';
import { config } from '../config/env.js';
import {
  getFilePath,
  ensureUserFilesDir,
  getTempUploadDir,
  getMetadataPath,
  getChunkPath,
} from '../lib/filePaths.js';

const MAX_FILE_SIZE = config.fileSizeLimit;

/**
 * Calculate upload progress percentage.
 */
function calculateProgress(receivedChunks, totalChunks) {
  return {
    received: receivedChunks.length,
    total: totalChunks,
    percentage: Math.round((receivedChunks.length / totalChunks) * 100),
  };
}

/**
 * Read and validate metadata from disk.
 */
function readAndValidateMetadata(metadataPath, userId) {
  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch (err) {
    const error = new Error('Corrupted upload session metadata');
    error.status = 500;
    throw error;
  }

  // Validate userId matches
  if (metadata.userId !== userId) {
    const err = new Error('Access denied: Cannot upload chunks for another user');
    err.status = 403;
    throw err;
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
}) {
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

  // Validate totalChunks consistency
  if (metadata.totalChunks !== totalChunks) {
    const err = new Error(
      `Inconsistent totalChunks: expected ${metadata.totalChunks}, got ${totalChunks}`
    );
    err.status = 400;
    throw err;
  }

  // Check if chunk already received (idempotency)
  if (metadata.receivedChunks.includes(chunkIndex)) {
    return { completed: false, progress: calculateProgress(metadata.receivedChunks, totalChunks) };
  }

  // Validate total file size doesn't exceed limit
  const newTotalSize = metadata.totalSize + chunkBuffer.length;
  if (newTotalSize > MAX_FILE_SIZE) {
    const err = new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
    err.status = 413;
    throw err;
  }

  // Write chunk to disk
  fs.writeFileSync(chunkPath, chunkBuffer);

  // Update metadata
  metadata.receivedChunks.push(chunkIndex);
  metadata.receivedChunks.sort((a, b) => a - b);
  metadata.totalSize = newTotalSize;
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  // Check if all chunks received
  if (metadata.receivedChunks.length === totalChunks) {
    const file = await finalizeUpload(fileId, metadata);
    return { completed: true, file };
  }

  return { completed: false, progress: calculateProgress(metadata.receivedChunks, totalChunks) };
}

/**
 * Internal function to finalize upload by merging chunks.
 */
async function finalizeUpload(fileId, metadata) {
  if (metadata.receivedChunks.length !== metadata.totalChunks) {
    const missing = [];
    for (let i = 0; i < metadata.totalChunks; i++) {
      if (!metadata.receivedChunks.includes(i)) {
        missing.push(i);
      }
    }
    const err = new Error(`Missing chunks: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
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
    // Use streams for async, non-blocking file merge
    const writeStream = fs.createWriteStream(finalPath);

    // Merge chunks one by one
    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunkPath = getChunkPath(fileId, i);
      
      // Read chunk asynchronously
      const chunkData = await fsPromises.readFile(chunkPath);
      
      // Write to stream
      await new Promise((resolve, reject) => {
        if (!writeStream.write(chunkData)) {
          // Wait for drain event if buffer is full
          writeStream.once('drain', resolve);
          writeStream.once('error', reject);
        } else {
          resolve();
        }
      });
    }

    // Close write stream
    await new Promise((resolve, reject) => {
      writeStream.end((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get final file size
    const stats = await fsPromises.stat(finalPath);
    const sizeBytes = stats.size;

    // Verify file size matches expected
    if (Math.abs(sizeBytes - metadata.totalSize) > 1024) {
      // Allow 1KB difference for rounding
      throw new Error(
        `File size mismatch: expected ${metadata.totalSize}, got ${sizeBytes}`
      );
    }

    // Create database record
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

    // Cleanup temp directory
    try {
      await fsPromises.rm(uploadDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      // Log but don't fail if cleanup fails
      console.error('Warning: Failed to cleanup temp directory:', cleanupErr);
    }

    return file;
  } catch (err) {
    // Cleanup partial file on error
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
export async function getFileById(fileId) {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      status: 'ACTIVE',
    },
  });

  if (!file) {
    const err = new Error('File not found');
    err.status = 404;
    throw err;
  }

  return file;
}

/**
 * Get file for download with path verification.
 */
export async function getFileForDownload(fileId) {
  const file = await getFileById(fileId);
  const filePath = getFilePath(file);

  if (!fs.existsSync(filePath)) {
    const err = new Error('File not found on disk');
    err.status = 404;
    throw err;
  }

  return { file, filePath };
}

/**
 * List all active files for a user (paginated).
 */
export async function listUserFiles({ userId, skip, limit }) {
  const where = {
    userId,
    status: 'ACTIVE',
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
export async function softDeleteFile(fileId, userId) {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      userId,
      status: 'ACTIVE',
    },
  });

  if (!file) {
    const err = new Error('File not found');
    err.status = 404;
    throw err;
  }

  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
    },
  });

  return updatedFile;
}
