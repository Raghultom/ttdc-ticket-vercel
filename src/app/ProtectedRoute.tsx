import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '../constants/roles';
import { useAuthStore } from '../store/authStore';
import { homeRouteForRole } from './homeRoute';

interface ProtectedRouteProps {
  roles: Role[];
  children: ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={homeRouteForRole(user.role)} replace />;
  }
  return <>{children}</>;
}
