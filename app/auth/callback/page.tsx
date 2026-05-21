'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, getCurrentUser } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      router.push('/login?error=google_failed');
      return;
    }

    if (token) {
      setToken(token);
      const pendingRedirect = localStorage.getItem('pendingRedirect') ?? '/';
      localStorage.removeItem('pendingRedirect');
      getCurrentUser().then((user) => {
        if (user) setUser(user);
        router.push(pendingRedirect);
      });
    } else {
      router.push('/login');
    }
  }, [params, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-4" />
        <p className="text-slate-400">Iniciando sesión...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <CallbackHandler />
    </Suspense>
  );
}
