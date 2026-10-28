import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authRequest, ensureLoggedOut, type AuthUser } from '@/lib/auth';

type AuthContextValue = { user: AuthUser | null; loading: boolean; refresh: () => Promise<void> };
const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refresh: async () => {} });
export const useAuth = () => useContext(AuthContext);

function clearClientSession() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (/token|auth|session|user/i.test(key)) storage.removeItem(key);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try {
      const result = await authRequest<{ user: AuthUser }>('/api/auth/session');
      setUser(result.user);
    } catch {
      setUser(null);
      clearClientSession();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      if (window.location.pathname === '/login') {
        setUser(null);
        clearClientSession();
        await ensureLoggedOut();
        if (active) setLoading(false);
        return;
      }
      await refresh();
    };
    void checkSession();
    const onPageShow = () => { if (window.location.pathname !== '/login') void refresh(); };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', onPageShow);
    return () => {
      active = false;
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', onPageShow);
    };
  }, [location.pathname]);

  return <AuthContext.Provider value={{ user, loading, refresh }}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center" role="status">Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
