import type { ReactNode } from 'react';
export function CanAccess({ user, roles, permissions, children, fallback = null }: {
  user: { role?: string; roles?: string[]; permissions?: Record<string, boolean> } | null;
  roles?: string[];
  permissions?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
  const roleAllowed = !roles?.length || roles.some(role => userRoles.includes(role));
  const permissionsAllowed = !permissions?.length || permissions.every(permission => user?.permissions?.[permission] === true);
  return roleAllowed && permissionsAllowed ? <>{children}</> : <>{fallback}</>;
}
