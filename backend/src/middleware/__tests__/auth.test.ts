import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { authenticate } from '../auth.js';
import { mockRequest, mockResponse, mockNext } from '../../test/testUtils.js';

jest.mock('jsonwebtoken');
jest.mock('../../config/env.js', () => ({
  config: {
    jwtSecret: 'test-secret',
  },
}));

describe('authenticate middleware', () => {
  let req: ReturnType<typeof mockRequest>;
  let res: ReturnType<typeof mockResponse>;
  let next: ReturnType<typeof mockNext>;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  test('should authenticate valid token', () => {
    const mockPayload = {
      sub: 'user-123',
      email: 'test@example.com',
    };

    req.headers['authorization'] = 'Bearer valid-token';
    jest.mocked(jwt.verify).mockReturnValue(mockPayload as never);

    authenticate(req as never, res as never, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(req.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reject missing authorization header', () => {
    authenticate(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject invalid authorization format', () => {
    req.headers['authorization'] = 'InvalidFormat token';

    authenticate(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject expired token', () => {
    req.headers['authorization'] = 'Bearer expired-token';
    jest.mocked(jwt.verify).mockImplementation(() => {
      throw new jwt.TokenExpiredError('Token expired', new Date());
    });

    authenticate(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token expired',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject invalid token', () => {
    req.headers['authorization'] = 'Bearer invalid-token';
    jest.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authenticate(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle malformed tokens', () => {
    req.headers['authorization'] = 'Bearer ';

    authenticate(req as never, res as never, next);

    expect(jwt.verify).toHaveBeenCalledWith('', 'test-secret');
  });
});
