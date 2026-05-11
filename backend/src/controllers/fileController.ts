import { validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import { paginatedHandler } from '../lib/pagination.js';
import * as fileService from '../services/fileService.js';

/**
 * Upload a chunk (auto-finalizes when complete).
 * POST /files/upload
 */
export async function uploadChunk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No chunk uploaded' });
      return;
    }

    const userId = req.user.id;
    const { file_id, chunk_index, total_chunks, original_name, mime_type } = req.body as {
      file_id: string;
      chunk_index: string;
      total_chunks: string;
      original_name: string;
      mime_type: string;
    };

    const result = await fileService.uploadChunk({
      userId,
      fileId: file_id,
      chunkIndex: parseInt(chunk_index, 10),
      totalChunks: parseInt(total_chunks, 10),
      chunkBuffer: req.file.buffer,
      originalName: original_name,
      mimeType: mime_type,
    });

    if (result.completed) {
      res.status(201).json({ completed: true, file: result.file });
      return;
    }

    res.status(202).json({ completed: false, progress: result.progress });
  } catch (err) {
    next(err);
  }
}

/**
 * List all files for the authenticated user (paginated).
 * GET /files
 */
export const listFiles = paginatedHandler(
  ({ skip, limit, req }) =>
    fileService.listUserFiles({ userId: req.user.id, skip, limit }),
  'files',
);

/**
 * Get file metadata by ID.
 * GET /files/:id
 */
export async function getFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const id = String(req.params.id);
    const file = await fileService.getFileById(id);

    if (file.userId !== req.user.id) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ file });
  } catch (err) {
    next(err);
  }
}

/**
 * Download a file.
 * GET /files/:id/download
 */
export async function downloadFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const id = String(req.params.id);
    const { file, filePath } = await fileService.getFileForDownload(id);

    if (file.userId !== req.user.id) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.sizeBytes);

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

/**
 * Soft delete a file.
 * DELETE /files/:id
 */
export async function deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const id = String(req.params.id);
    const userId = req.user.id;

    const file = await fileService.softDeleteFile(id, userId);

    res.json({ message: 'File deleted successfully', file });
  } catch (err) {
    next(err);
  }
}
