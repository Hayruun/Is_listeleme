import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'is-listeleme:theme';

function initialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Depolama kapali olabilir; sistem tercihine duseriz.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Tema tercihi yalnizca bu tarayicida tutulur (kisisel konfor ayari). */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      // Yoksayilir.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return [theme, toggle];
}
