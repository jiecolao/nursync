export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5151';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  roles: string[];
  permissions: Record<string, boolean>;
  profile?: {
    facultyId: string | null;
    username: string;
    lastName: string;
    firstName: string;
    middleName: string | null;
    suffix: string | null;
    genderId: number | null;
    genderName: string | null;
    photoPath: string | null;
    createdAt: string;
    status: boolean;
  };
};

let refreshPromise: Promise<void> | null = null;

export async function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) throw new Error('Session refresh failed');
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const request = () => fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: init.body instanceof FormData
      ? init.headers
      : { 'Content-Type': 'application/json', ...init.headers },
  });

  let response = await request();
  const canRefresh = !path.startsWith('/api/auth/');
  if (response.status === 401 && canRefresh) {
    await refreshAuthSession();
    response = await request();
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.message ?? 'Request failed');
  }
  return response.json() as Promise<T>;
}
