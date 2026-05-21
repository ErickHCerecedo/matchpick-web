import { api } from './api';
import type { User, AuthResponse } from '@/types';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await api.get<{ data: User }>('/auth/me');
    return res.data;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { email, password });
}

export async function register(
  name: string,
  email: string,
  password: string,
  password_confirmation: string
): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/register', {
    name,
    email,
    password,
    password_confirmation,
  });
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout', {}).catch(() => {});
  clearToken();
}
