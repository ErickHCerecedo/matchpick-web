'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface SiteConfig {
  bgUrl: string | null;
  saving: boolean;
  setBgUrl: (url: string | null) => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfig>({
  bgUrl: null,
  saving: false,
  setBgUrl: async () => {},
});

const CACHE_KEY = 'matchpick_site_bg';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  // Initialise from localStorage cache so the background shows instantly on load
  const [bgUrl, setBgUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(CACHE_KEY);
    return null;
  });
  const [saving, setSaving] = useState(false);

  // Fetch the authoritative value from the server once on mount
  useEffect(() => {
    fetch(`${API_URL}/site-settings`, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((res) => {
        const url: string | null = res?.data?.bg_url ?? null;
        setBgUrlState(url);
        if (url) localStorage.setItem(CACHE_KEY, url);
        else localStorage.removeItem(CACHE_KEY);
      })
      .catch(() => {
        // Keep the cached value if the API is unreachable
      });
  }, []);

  const setBgUrl = async (url: string | null) => {
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_URL}/admin/site-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ bg_url: url ?? null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? 'Error al guardar');
      }
      // Update cache and state only after the server confirms
      if (url) localStorage.setItem(CACHE_KEY, url);
      else localStorage.removeItem(CACHE_KEY);
      setBgUrlState(url);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteConfigContext.Provider value={{ bgUrl, saving, setBgUrl }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
