/**
 * useDarkMode — reads/writes a `.dark` class on <html> and persists to localStorage.
 *
 * Returns: [isDark: boolean, toggleDark: () => void]
 *
 * Initialization order:
 *   1. If `theme` key exists in localStorage, use it.
 *   2. Otherwise, fall back to prefers-color-scheme.
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'mf-theme';

function getInitialDark() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'dark';
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export default function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  const toggleDark = () => setIsDark((prev) => !prev);

  return [isDark, toggleDark];
}
