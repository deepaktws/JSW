import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import fileRoutes from '../fileRoutes.js';
import * as fileService from '../../services/fileService.js';
import { authenticate } from '../../middleware/auth.js';

jest.mock('../../services/fileService.js');
jest.mock('../../middleware/auth.js');

describe('File Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/files', fileRoutes);
    // Add basic error handler for tests
    app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status ?? 500).json({ message: err.message });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(authenticate).mockImplementation((req, _res, next) => {
      req.user = { id: 'user-123', email: 'test@example.com' };
      next();
    });
  });

  describe('POST /files/upload', () => {
    test('should upload chunk successfully', async () => {
      jest.mocked(fileService.uploadChunk).mockResolvedValue({
        completed: false,
        progress: { received: 1, total: 3, percentage: 33 },
      });

      const response = await request(app)
        .post('/files/upload')
        .field('file_id', 'file-456')
        .field('chunk_index', '0')
        .field('total_chunks', '3')
        .field('original_name', 'test.txt')
        .field('mime_type', 'text/plain')
        .attach('data', Buffer.from('chunk data'), 'chunk-0');

      expect(response.status).toBe(202);
      expect(response.body).toEqual({
        completed: false,
        progress: { received: 1, total: 3, percentage: 33 },
      });
    });

    test('should return 201 when upload completes', async () => {
      const mockFile = {
        id: 'file-456',
        userId: 'user-123',
        originalName: 'test.txt',
        sizeBytes: 1024,
        mimeType: 'text/plain',
        status: 'UPLOADED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(fileService.uploadChunk).mockResolvedValue({
        completed: true,
        file: mockFile,
      });

      const response = await request(app)
        .post('/files/upload')
        .field('file_id', 'file-456')
        .field('chunk_index', '2')
        .field('total_chunks', '3')
        .field('original_name', 'test.txt')
        .field('mime_type', 'text/plain')
        .attach('data', Buffer.from('chunk data'), 'chunk-2');

      expect(response.status).toBe(201);
      expect(response.body.completed).toBe(true);
    });

    test('should return 400 for invalid file_id', async () => {
      const response = await request(app)
        .post('/files/upload')
        .field('file_id', 'invalid-uuid')
        .field('chunk_index', '0')
        .field('total_chunks', '3')
        .field('original_name', 'test.txt')
        .field('mime_type', 'text/plain')
        .attach('data', Buffer.from('chunk data'), 'chunk-0');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    test('should return 400 if no chunk uploaded', async () => {
      const response = await request(app)
        .post('/files/upload')
        .field('file_id', 'c7f54e9c-1234-4a5b-8c9d-0e1f2a3b4c5d')
        .field('chunk_index', '0')
        .field('total_chunks', '3')
        .field('original_name', 'test.txt')
        .field('mime_type', 'text/plain');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No chunk uploaded');
    });
  });

  describe('GET /files', () => {
    test('should list user files', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          userId: 'user-123',
          originalName: 'file1.txt',
          sizeBytes: 1024,
          createdAt: new Date(),
        },
      ];

      jest.mocked(fileService.listUserFiles).mockResolvedValue({
        files: mockFiles as never,
        total: 1,
      });

      const response = await request(app).get('/files');

      expect(response.status).toBe(200);
    });

    test('should support pagination', async () => {
      jest.mocked(fileService.listUserFiles).mockResolvedValue({
        files: [] as never,
        total: 50,
      });

      const response = await request(app).get('/files').query({ page: 2, per_page: 10 });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /files/:id', () => {
    test('should get file by id', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        sizeBytes: 1024,
        mimeType: 'text/plain',
        status: 'UPLOADED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(fileService.getFileById).mockResolvedValue(mockFile);

      const response = await request(app).get('/files/file-123');

      expect(response.status).toBe(200);
      expect(response.body.file.id).toBe('file-123');
    });

    test('should return 403 if user does not own file', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'different-user',
        originalName: 'test.txt',
        sizeBytes: 1024,
        mimeType: 'text/plain',
        status: 'UPLOADED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(fileService.getFileById).mockResolvedValue(mockFile);

      const response = await request(app).get('/files/file-123');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });

    test('should return 400 for invalid UUID', async () => {
      const response = await request(app).get('/files/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /files/:id/download', () => {
    test('should call getFileForDownload', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
        status: 'UPLOADED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(fileService.getFileForDownload).mockResolvedValue({
        file: mockFile,
        filePath: '/path/to/file.txt',
      });

      await request(app).get('/files/file-123/download');

      expect(fileService.getFileForDownload).toHaveBeenCalledWith('file-123');
    });

    test('should return 403 if user does not own file', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'different-user',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
        status: 'UPLOADED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.mocked(fileService.getFileForDownload).mockResolvedValue({
        file: mockFile,
        filePath: '/path/to/file.txt',
      });

      const response = await request(app).get('/files/file-123/download');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('DELETE /files/:id', () => {
    test('should soft delete file', async () => {
      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        sizeBytes: 1024,
        mimeType: 'text/plain',
        status: 'DELETED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest.mocked(fileService.softDeleteFile).mockResolvedValue(mockFile);

      const response = await request(app).delete('/files/file-123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('File deleted successfully');
      expect(fileService.softDeleteFile).toHaveBeenCalledWith('file-123', 'user-123');
    });

    test('should return 400 for invalid UUID', async () => {
      const response = await request(app).delete('/files/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    test('should handle file not found', async () => {
      const error = Object.assign(new Error('File not found'), { status: 404 });
      jest.mocked(fileService.softDeleteFile).mockRejectedValue(error);

      const response = await request(app).delete('/files/non-existent');

      expect(response.status).toBe(404);
    });
  });
});
