export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5151/api';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  roles: string[];
  permissions: Record<string, boolean>;
};

export async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.message ?? 'Request failed');
  }
  return response.json() as Promise<T>;
}
