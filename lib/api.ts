const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

console.log('[API] URL configured:', API_URL);

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const fullUrl = `${API_URL}${path}`;

  console.log(`[API] ${options.method ?? 'GET'} ${fullUrl}`);

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    console.error('[API] Network error (CORS or unreachable):', err);
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
  }

  console.log(`[API] Response ${res.status} from ${fullUrl}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `Error ${res.status}` }));
    console.error('[API] Error response:', error);
    throw new Error((error as { message?: string }).message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
