import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/** Wrap login (and similar) routes so authenticated users skip straight to home. */
export function GuestOnly({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
