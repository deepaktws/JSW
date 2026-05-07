import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import type { AuthUser } from '../services/api';

export type UseAuthResult = {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
};

/**
 * Small helper to read auth state from Redux (token also mirrored in localStorage).
 */
export function useAuth(): UseAuthResult {
  const { token, user } = useSelector((state: RootState) => state.auth);
  return {
    isAuthenticated: Boolean(token),
    token,
    user,
  };
}

