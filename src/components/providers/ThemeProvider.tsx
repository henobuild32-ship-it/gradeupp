'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const themeVariant = useAppStore((s) => s.themeVariant);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-white', themeVariant === 'white');
    if (themeVariant === 'white') {
      root.classList.remove('dark');
    } else if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode, themeVariant]);

  return <>{children}</>;
}
