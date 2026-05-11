import { describe, test, expect } from '@jest/globals';
import {
  getFileExtension,
  getFilePath,
  getTempUploadDir,
  getMetadataPath,
  getChunkPath,
  getUserFilesDir,
} from '../filePaths.js';

describe('filePaths', () => {
  describe('getFileExtension', () => {
    test('should extract extension with dot', () => {
      expect(getFileExtension('file.txt')).toBe('.txt');
      expect(getFileExtension('document.pdf')).toBe('.pdf');
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
    });

    test('should return empty string for files without extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
    });

    test('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('.gitignore');
      expect(getFileExtension('.env.local')).toBe('.local');
    });
  });

  describe('getFilePath', () => {
    test('should construct correct file path', () => {
      const file = {
        id: 'file-123',
        userId: 'user-456',
        originalName: 'document.pdf',
      };

      const filePath = getFilePath(file);

      expect(filePath).toContain('uploads');
      expect(filePath).toContain('files');
      expect(filePath).toContain('user-456');
      expect(filePath).toContain('file-123.pdf');
    });

    test('should handle files without extension', () => {
      const file = {
        id: 'file-123',
        userId: 'user-456',
        originalName: 'README',
      };

      const filePath = getFilePath(file);

      expect(filePath).toContain('file-123');
      expect(filePath).not.toContain('file-123.');
    });
  });

  describe('getTempUploadDir', () => {
    test('should construct temp directory path', () => {
      const dirPath = getTempUploadDir('file-123');

      expect(dirPath).toContain('uploads');
      expect(dirPath).toContain('temp');
      expect(dirPath).toContain('file-123');
    });
  });

  describe('getMetadataPath', () => {
    test('should construct metadata file path', () => {
      const metaPath = getMetadataPath('file-123');

      expect(metaPath).toContain('uploads');
      expect(metaPath).toContain('temp');
      expect(metaPath).toContain('file-123');
      expect(metaPath).toContain('metadata.json');
    });
  });

  describe('getChunkPath', () => {
    test('should construct chunk file path', () => {
      const chunkPath = getChunkPath('file-123', 5);

      expect(chunkPath).toContain('uploads');
      expect(chunkPath).toContain('temp');
      expect(chunkPath).toContain('file-123');
      expect(chunkPath).toContain('chunk-5');
    });
  });

  describe('getUserFilesDir', () => {
    test('should construct user files directory path', () => {
      const dirPath = getUserFilesDir('user-456');

      expect(dirPath).toContain('uploads');
      expect(dirPath).toContain('files');
      expect(dirPath).toContain('user-456');
    });
  });
});
