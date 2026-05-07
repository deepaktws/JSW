import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type GuestOnlyProps = {
  children: ReactNode;
};

/** Wrap login (and similar) routes so authenticated users skip straight to home. */
export function GuestOnly({ children }: GuestOnlyProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

