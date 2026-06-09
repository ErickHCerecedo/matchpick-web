'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface SiteConfig {
  bgUrl: string | null;
  setBgUrl: (url: string | null) => void;
}

const SiteConfigContext = createContext<SiteConfig>({ bgUrl: null, setBgUrl: () => {} });

const STORAGE_KEY = 'matchpick_site_bg';

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [bgUrl, setBgUrlState] = useState<string | null>(null);

  useEffect(() => {
    setBgUrlState(localStorage.getItem(STORAGE_KEY));
  }, []);

  const setBgUrl = (url: string | null) => {
    if (url) {
      localStorage.setItem(STORAGE_KEY, url);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setBgUrlState(url);
  };

  return (
    <SiteConfigContext.Provider value={{ bgUrl, setBgUrl }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
