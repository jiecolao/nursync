import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authRequest, type AuthUser } from '@/lib/auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    authRequest<{ user: AuthUser }>('/auth/session')
      .then(result => { if (active) setUser(result.user); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  if (loading) return <div className="p-8 text-center" role="status">Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
