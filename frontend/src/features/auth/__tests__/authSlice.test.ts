import { describe, expect, test, beforeEach } from '@jest/globals';
import authReducer, { logout, setCredentials, type AuthState } from '../authSlice';

describe('authSlice reducer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should return the initial state', () => {
    const state = authReducer(undefined, { type: 'unknown' });

    expect(state).toEqual({
      token: null,
      user: null,
    });
  });

  test('should set credentials and persist token', () => {
    const previousState: AuthState = {
      token: null,
      user: null,
    };

    const nextState = authReducer(
      previousState,
      setCredentials({
        token: 'token-123',
        user: {
          id: 'u-1',
          email: 'test@example.com',
        },
      }),
    );

    expect(nextState.token).toBe('token-123');
    expect(nextState.user).toEqual({
      id: 'u-1',
      email: 'test@example.com',
    });
    expect(localStorage.getItem('token')).toBe('token-123');
  });

  test('should clear credentials on logout', () => {
    localStorage.setItem('token', 'token-123');
    const previousState: AuthState = {
      token: 'token-123',
      user: {
        id: 'u-1',
        email: 'test@example.com',
      },
    };

    const nextState = authReducer(previousState, logout());

    expect(nextState).toEqual({
      token: null,
      user: null,
    });
    expect(localStorage.getItem('token')).toBeNull();
  });
});
