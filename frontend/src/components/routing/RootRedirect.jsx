import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/** Sends guests to login and signed-in users to home. */
export function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />;
}
