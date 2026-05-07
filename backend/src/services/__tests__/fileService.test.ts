import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as fileService from '../fileService.js';
import { prisma } from '../../config/database.js';

jest.mock('fs', () => ({
  ...(jest.requireActual<typeof import('fs')>('fs')),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  createWriteStream: jest.fn(),
  promises: {
    readFile: jest.fn(),
    stat: jest.fn(),
    rm: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock('../../config/database.js', () => ({
  prisma: {
    file: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../config/env.js', () => ({
  config: {
    fileSizeLimit: 100 * 1024 * 1024,
  },
}));

describe('fileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadChunk', () => {
    const mockUploadData = {
      userId: 'user-123',
      fileId: 'file-456',
      chunkIndex: 0,
      totalChunks: 3,
      chunkBuffer: Buffer.from('chunk data'),
      originalName: 'test.txt',
      mimeType: 'text/plain',
    };

    test('should create new upload session for first chunk', async () => {
      jest.mocked(fs.existsSync).mockReturnValue(false);
      jest.mocked(fs.mkdirSync).mockReturnValue(undefined);
      jest.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await fileService.uploadChunk(mockUploadData);

      expect(result.completed).toBe(false);
      expect((result as { completed: false; progress: { received: number; total: number; percentage: number } }).progress).toEqual({
        received: 1,
        total: 3,
        percentage: 33,
      });
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    test('should handle subsequent chunks and update progress', async () => {
      const existingMetadata = {
        fileId: 'file-456',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        totalChunks: 3,
        receivedChunks: [0],
        totalSize: 10,
        createdAt: new Date().toISOString(),
      };

      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingMetadata) as never);
      jest.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const result = await fileService.uploadChunk({
        ...mockUploadData,
        chunkIndex: 1,
      });

      expect(result.completed).toBe(false);
      expect((result as { completed: false; progress: { received: number; total: number; percentage: number } }).progress).toEqual({
        received: 2,
        total: 3,
        percentage: 67,
      });
    });

    test('should auto-finalize when all chunks are received', async () => {
      const existingMetadata = {
        fileId: 'file-456',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        totalChunks: 3,
        receivedChunks: [0, 1],
        totalSize: 20,
        createdAt: new Date().toISOString(),
      };

      const mockFile = {
        id: 'file-456',
        userId: 'user-123',
        originalName: 'test.txt',
        sizeBytes: 30,
        mimeType: 'text/plain',
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingMetadata) as never);
      jest.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const mockWriteStream = {
        write: jest.fn().mockReturnValue(true),
        end: jest.fn((cb: () => void) => cb()),
        once: jest.fn(),
      };
      jest.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as never);
      jest.mocked(fsPromises.readFile).mockResolvedValue(Buffer.from('chunk data') as never);
      jest.mocked(fsPromises.stat).mockResolvedValue({ size: 30 } as never);
      jest.mocked(fsPromises.rm).mockResolvedValue(undefined);
      jest.mocked(prisma.file.create).mockResolvedValue(mockFile);

      const result = await fileService.uploadChunk({
        ...mockUploadData,
        chunkIndex: 2,
      });

      expect(result.completed).toBe(true);
      expect((result as { completed: true; file: typeof mockFile }).file).toEqual(mockFile);
      expect(prisma.file.create).toHaveBeenCalledWith({
        data: {
          id: 'file-456',
          userId: 'user-123',
          originalName: 'test.txt',
          sizeBytes: 30,
          mimeType: 'text/plain',
          status: 'ACTIVE',
        },
      });
    });

    test('should reject chunks from different user', async () => {
      const existingMetadata = {
        fileId: 'file-456',
        userId: 'different-user',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        totalChunks: 3,
        receivedChunks: [0],
        totalSize: 10,
        createdAt: new Date().toISOString(),
      };

      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingMetadata) as never);

      await expect(fileService.uploadChunk(mockUploadData)).rejects.toThrow(
        'Access denied: Cannot upload chunks for another user',
      );
    });

    test('should reject if file size exceeds limit', async () => {
      const largeMetadata = {
        fileId: 'file-456',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        totalChunks: 3,
        receivedChunks: [0],
        totalSize: 100 * 1024 * 1024,
        createdAt: new Date().toISOString(),
      };

      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(largeMetadata) as never);

      await expect(fileService.uploadChunk(mockUploadData)).rejects.toThrow(
        'File size exceeds maximum allowed size',
      );
    });

    test('should handle idempotent chunk uploads', async () => {
      const existingMetadata = {
        fileId: 'file-456',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        totalChunks: 3,
        receivedChunks: [0, 1],
        totalSize: 20,
        createdAt: new Date().toISOString(),
      };

      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingMetadata) as never);

      const result = await fileService.uploadChunk({
        ...mockUploadData,
        chunkIndex: 1,
      });

      expect(result.completed).toBe(false);
      expect((result as { completed: false; progress: { received: number } }).progress.received).toBe(2);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('should reject inconsistent totalChunks', async () => {
      const existingMetadata = {
        fileId: 'file-456',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        totalChunks: 5,
        receivedChunks: [0],
        totalSize: 10,
        createdAt: new Date().toISOString(),
      };

      jest.mocked(fs.existsSync).mockReturnValue(true);
      jest.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingMetadata) as never);

      await expect(fileService.uploadChunk(mockUploadData)).rejects.toThrow(
        'Inconsistent totalChunks',
      );
    });
  });

  describe('getFileById', () => {
    test('should return active file by id', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        sizeBytes: 1024,
        mimeType: 'text/plain',
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(prisma.file.findFirst).mockResolvedValue(mockFile);

      const result = await fileService.getFileById('file-123');

      expect(result).toEqual(mockFile);
      expect(prisma.file.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'file-123',
          status: 'ACTIVE',
        },
      });
    });

    test('should throw 404 if file not found', async () => {
      jest.mocked(prisma.file.findFirst).mockResolvedValue(null);

      await expect(fileService.getFileById('non-existent')).rejects.toThrow('File not found');
    });
  });

  describe('getFileForDownload', () => {
    test('should return file and path if exists', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        sizeBytes: 1024,
        mimeType: 'text/plain',
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(prisma.file.findFirst).mockResolvedValue(mockFile);
      jest.mocked(fs.existsSync).mockReturnValue(true);

      const result = await fileService.getFileForDownload('file-123');

      expect(result.file).toEqual(mockFile);
      expect(result.filePath).toBeDefined();
    });

    test('should throw 404 if file not on disk', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        sizeBytes: 1024,
        mimeType: 'text/plain',
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(prisma.file.findFirst).mockResolvedValue(mockFile);
      jest.mocked(fs.existsSync).mockReturnValue(false);

      await expect(fileService.getFileForDownload('file-123')).rejects.toThrow(
        'File not found on disk',
      );
    });
  });

  describe('listUserFiles', () => {
    test('should return paginated files for user', async () => {
      const mockFiles = [
        { id: 'file-1', userId: 'user-123', originalName: 'file1.txt', sizeBytes: 100, mimeType: 'text/plain', status: 'ACTIVE' as const, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: 'file-2', userId: 'user-123', originalName: 'file2.txt', sizeBytes: 200, mimeType: 'text/plain', status: 'ACTIVE' as const, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ];

      jest.mocked(prisma.$transaction).mockResolvedValue([mockFiles, 10] as never);

      const result = await fileService.listUserFiles({
        userId: 'user-123',
        skip: 0,
        limit: 10,
      });

      expect(result).toEqual({
        files: mockFiles,
        total: 10,
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('softDeleteFile', () => {
    test('should soft delete file', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        sizeBytes: 1024,
        mimeType: 'text/plain',
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const deletedFile = {
        ...mockFile,
        status: 'DELETED' as const,
        deletedAt: new Date(),
      };

      jest.mocked(prisma.file.findFirst).mockResolvedValue(mockFile);
      jest.mocked(prisma.file.update).mockResolvedValue(deletedFile);

      const result = await fileService.softDeleteFile('file-123', 'user-123');

      expect(result.status).toBe('DELETED');
      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        data: {
          status: 'DELETED',
          deletedAt: expect.any(Date),
        },
      });
    });

    test('should throw 404 if file not found', async () => {
      jest.mocked(prisma.file.findFirst).mockResolvedValue(null);

      await expect(fileService.softDeleteFile('non-existent', 'user-123')).rejects.toThrow(
        'File not found',
      );
    });
  });
});
