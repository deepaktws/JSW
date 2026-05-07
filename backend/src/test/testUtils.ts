import { jest } from '@jest/globals';

/**
 * Test utilities for mocking and testing.
 */

export interface MockRequest {
  body: Record<string, unknown>;
  params: Record<string, string>;
  query: Record<string, string>;
  user: { id: string; email: string } | null;
  file: Express.Multer.File | null;
  headers: Record<string, string>;
}

export interface MockResponse {
  status: jest.MockedFunction<(code: number) => MockResponse>;
  json: jest.MockedFunction<(body: unknown) => MockResponse>;
  send: jest.MockedFunction<(body: unknown) => MockResponse>;
  sendFile: jest.MockedFunction<(path: string) => MockResponse>;
  setHeader: jest.MockedFunction<(name: string, value: string | number) => MockResponse>;
}

/**
 * Create a mock Express request object.
 */
export function mockRequest({
  body = {},
  params = {},
  query = {},
  user = null,
  file = null,
}: Partial<MockRequest> = {}): MockRequest {
  return {
    body,
    params,
    query,
    user,
    file,
    headers: {},
  };
}

/**
 * Create a mock Express response object.
 */
export function mockResponse(): MockResponse {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendFile: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  } as unknown as MockResponse;
  return res;
}

/**
 * Create a mock Express next function.
 */
export function mockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Create a mock Prisma client.
 */
export function mockPrismaClient() {
  return {
    file: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  };
}

interface MockFileOptions {
  id?: string;
  userId?: string;
  originalName?: string;
  sizeBytes?: number;
  mimeType?: string;
  status?: string;
  createdAt?: Date;
  deletedAt?: Date | null;
}

/**
 * Create a mock file object.
 */
export function mockFile({
  id = 'file-123',
  userId = 'user-123',
  originalName = 'test.txt',
  sizeBytes = 1024,
  mimeType = 'text/plain',
  status = 'ACTIVE',
  createdAt = new Date(),
  deletedAt = null,
}: MockFileOptions = {}) {
  return {
    id,
    userId,
    originalName,
    sizeBytes,
    mimeType,
    status,
    createdAt,
    deletedAt,
  };
}

interface MockUserOptions {
  id?: string;
  email?: string;
  username?: string;
}

/**
 * Create a mock user object.
 */
export function mockUser({
  id = 'user-123',
  email = 'test@example.com',
  username = 'testuser',
}: MockUserOptions = {}) {
  return { id, email, username };
}

/**
 * Generate a valid UUID v4.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface MockMulterFileOptions {
  fieldname?: string;
  originalname?: string;
  encoding?: string;
  mimetype?: string;
  buffer?: Buffer;
  size?: number;
}

/**
 * Create a mock multer file object.
 */
export function mockMulterFile({
  fieldname = 'data',
  originalname = 'test.txt',
  encoding = '7bit',
  mimetype = 'text/plain',
  buffer = Buffer.from('test data'),
  size,
}: MockMulterFileOptions = {}) {
  return {
    fieldname,
    originalname,
    encoding,
    mimetype,
    buffer,
    size: size ?? buffer.length,
  };
}

/**
 * Wait for a promise to resolve or reject.
 * Useful for testing async error handling.
 */
export async function expectAsync<T>(
  promise: Promise<T>,
): Promise<{ resolved: true; result: T } | { resolved: false; error: unknown }> {
  try {
    const result = await promise;
    return { resolved: true, result };
  } catch (error) {
    return { resolved: false, error };
  }
}
