import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const TEMP_DIR = path.join(BASE_UPLOAD_DIR, 'temp');
const FILES_DIR = path.join(BASE_UPLOAD_DIR, 'files');

export interface FileRecord {
  id: string;
  userId: string;
  originalName: string;
}

/**
 * Extract file extension from filename (includes the dot).
 * Examples: "file.xlsx" -> ".xlsx", "archive.tar.gz" -> ".gz"
 */
export function getFileExtension(originalName: string): string {
  const match = originalName.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

/**
 * Reconstruct the full file path from a File record.
 * Path format: uploads/files/{userId}/{fileId}{ext}
 */
export function getFilePath(file: FileRecord): string {
  const ext = getFileExtension(file.originalName);
  return path.join(FILES_DIR, file.userId, `${file.id}${ext}`);
}

/**
 * Get the temp directory path for an upload session.
 */
export function getTempUploadDir(fileId: string): string {
  return path.join(TEMP_DIR, fileId);
}

/**
 * Get the metadata file path for an upload session.
 */
export function getMetadataPath(fileId: string): string {
  return path.join(getTempUploadDir(fileId), 'metadata.json');
}

/**
 * Get the chunk file path.
 */
export function getChunkPath(fileId: string, chunkIndex: number): string {
  return path.join(getTempUploadDir(fileId), `chunk-${chunkIndex}`);
}

/**
 * Get the user's files directory path.
 */
export function getUserFilesDir(userId: string): string {
  return path.join(FILES_DIR, userId);
}

/**
 * Ensure the upload directories exist on server startup.
 * Creates uploads/temp/ and uploads/files/ if they don't exist.
 * Cleans up temp folder on startup.
 */
export function ensureUploadDirectories(): void {
  try {
    if (!fs.existsSync(BASE_UPLOAD_DIR)) {
      fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
      console.log('Created uploads directory');
    }

    if (!fs.existsSync(FILES_DIR)) {
      fs.mkdirSync(FILES_DIR, { recursive: true });
      console.log('Created uploads/files directory');
    }

    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      console.log('Cleaned up temp directory');
    }

    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log('Created uploads/temp directory');

    console.log('Upload directories initialized successfully');
  } catch (err) {
    console.error('Error initializing upload directories:', err);
    throw err;
  }
}

/**
 * Create a user's files directory if it doesn't exist.
 */
export function ensureUserFilesDir(userId: string): string {
  const userDir = getUserFilesDir(userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}
