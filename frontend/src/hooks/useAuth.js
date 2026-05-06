import { useSelector } from 'react-redux';

/**
 * Small helper to read auth state from Redux (token also mirrored in localStorage).
 */
export function useAuth() {
  const { token, user } = useSelector((state) => state.auth);
  return {
    isAuthenticated: Boolean(token),
    token,
    user,
  };
}
