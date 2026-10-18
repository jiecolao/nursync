import type { ReactNode } from 'react';
import { useAuth } from './ProtectedRoute';

export function CanAccess({ roles, permissions, children, fallback = null }: {
  roles?: string[];
  permissions?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
  const roleAllowed = !roles?.length || roles.some(role => userRoles.includes(role));
  const permissionsAllowed = !permissions?.length || permissions.every(permission => user?.permissions?.[permission] === true);
  return roleAllowed && permissionsAllowed ? <>{children}</> : <>{fallback}</>;
}
