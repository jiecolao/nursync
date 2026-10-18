import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authRequest, type AuthUser } from '@/lib/auth';

type AuthContextValue = { user: AuthUser | null; loading: boolean; refresh: () => Promise<void> };
const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refresh: async () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try { const result = await authRequest<{ user: AuthUser }>('/auth/session'); setUser(result.user); }
    catch { setUser(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  return <AuthContext.Provider value={{ user, loading, refresh }}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center" role="status">Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
