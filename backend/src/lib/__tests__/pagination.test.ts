import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Request } from 'express';
import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  resolvePagination,
  buildPaginationMeta,
  paginatedHandler,
} from '../pagination.js';

type PaginatedServiceFn = Parameters<typeof paginatedHandler>[0];

describe('pagination', () => {
  describe('resolvePagination', () => {
    test('should use defaults when no query provided', () => {
      const result = resolvePagination();

      expect(result).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        skip: 0,
      });
    });

    test('should parse valid page and limit', () => {
      const result = resolvePagination({ page: '3', limit: '15' });

      expect(result).toEqual({
        page: 3,
        limit: 15,
        skip: 30,
      });
    });

    test('should cap limit at MAX_LIMIT', () => {
      const result = resolvePagination({ limit: '200' });

      expect(result.limit).toBe(MAX_LIMIT);
    });

    test('should use defaults for invalid values', () => {
      const result = resolvePagination({ page: 'invalid', limit: 'bad' });

      expect(result).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        skip: 0,
      });
    });

    test('should use defaults for negative values', () => {
      const result = resolvePagination({ page: '-1', limit: '-5' });

      expect(result).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        skip: 0,
      });
    });

    test('should use defaults for zero values', () => {
      const result = resolvePagination({ page: '0', limit: '0' });

      expect(result).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
        skip: 0,
      });
    });

    test('should calculate skip correctly for different pages', () => {
      expect(resolvePagination({ page: '1', limit: '10' }).skip).toBe(0);
      expect(resolvePagination({ page: '2', limit: '10' }).skip).toBe(10);
      expect(resolvePagination({ page: '5', limit: '25' }).skip).toBe(100);
    });
  });

  describe('buildPaginationMeta', () => {
    test('should build correct meta for first page', () => {
      const meta = buildPaginationMeta({ page: 1, limit: 10, total: 50 });

      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
    });

    test('should build correct meta for middle page', () => {
      const meta = buildPaginationMeta({ page: 3, limit: 20, total: 100 });

      expect(meta).toEqual({
        page: 3,
        limit: 20,
        total: 100,
        totalPages: 5,
      });
    });

    test('should handle partial last page', () => {
      const meta = buildPaginationMeta({ page: 3, limit: 10, total: 25 });

      expect(meta).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    test('should handle empty results', () => {
      const meta = buildPaginationMeta({ page: 1, limit: 10, total: 0 });

      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    test('should round up totalPages', () => {
      const meta = buildPaginationMeta({ page: 1, limit: 7, total: 20 });

      expect(meta.totalPages).toBe(3);
    });
  });

  describe('paginatedHandler', () => {
    let mockReq: { query: Record<string, string>; user: { id: string } };
    let mockRes: { json: jest.Mock };
    let mockNextFn: jest.Mock;
    let mockServiceFn: jest.Mock;

    beforeEach(() => {
      mockReq = {
        query: {},
        user: { id: 'user-123' },
      };
      mockRes = {
        json: jest.fn(),
      };
      mockNextFn = jest.fn();
      mockServiceFn = jest.fn();
    });

    test('should handle successful pagination', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      (mockServiceFn as jest.MockedFunction<PaginatedServiceFn>).mockResolvedValue({
        items: mockItems,
        total: 50,
      });

      const handler = paginatedHandler(mockServiceFn as unknown as PaginatedServiceFn);
      await handler(mockReq as unknown as Request, mockRes as never, mockNextFn);

      expect(mockServiceFn).toHaveBeenCalledWith({
        skip: 0,
        limit: DEFAULT_LIMIT,
        req: mockReq,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        items: mockItems,
        meta: {
          page: 1,
          limit: DEFAULT_LIMIT,
          total: 50,
          totalPages: 3,
        },
      });
      expect(mockNextFn).not.toHaveBeenCalled();
    });

    test('should use custom items key', async () => {
      const mockFiles = [{ id: 'file-1' }, { id: 'file-2' }];
      (mockServiceFn as jest.MockedFunction<PaginatedServiceFn>).mockResolvedValue({
        files: mockFiles,
        total: 10,
      });

      const handler = paginatedHandler(mockServiceFn as unknown as PaginatedServiceFn, 'files');
      await handler(mockReq as unknown as Request, mockRes as never, mockNextFn);

      expect(mockRes.json).toHaveBeenCalledWith({
        files: mockFiles,
        meta: expect.any(Object),
      });
    });

    test('should parse query parameters', async () => {
      mockReq.query = { page: '3', limit: '15' };
      (mockServiceFn as jest.MockedFunction<PaginatedServiceFn>).mockResolvedValue({
        items: [],
        total: 100,
      });

      const handler = paginatedHandler(mockServiceFn as unknown as PaginatedServiceFn);
      await handler(mockReq as unknown as Request, mockRes as never, mockNextFn);

      expect(mockServiceFn).toHaveBeenCalledWith({
        skip: 30,
        limit: 15,
        req: mockReq,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        items: [],
        meta: {
          page: 3,
          limit: 15,
          total: 100,
          totalPages: 7,
        },
      });
    });

    test('should handle service errors', async () => {
      const mockError = new Error('Service error');
      (mockServiceFn as jest.MockedFunction<PaginatedServiceFn>).mockRejectedValue(mockError);

      const handler = paginatedHandler(mockServiceFn as unknown as PaginatedServiceFn);
      await handler(mockReq as unknown as Request, mockRes as never, mockNextFn);

      expect(mockNextFn).toHaveBeenCalledWith(mockError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    test('should handle empty results', async () => {
      (mockServiceFn as jest.MockedFunction<PaginatedServiceFn>).mockResolvedValue({
        items: [],
        total: 0,
      });

      const handler = paginatedHandler(mockServiceFn as unknown as PaginatedServiceFn);
      await handler(mockReq as unknown as Request, mockRes as never, mockNextFn);

      expect(mockRes.json).toHaveBeenCalledWith({
        items: [],
        meta: {
          page: 1,
          limit: DEFAULT_LIMIT,
          total: 0,
          totalPages: 0,
        },
      });
    });
  });
});
