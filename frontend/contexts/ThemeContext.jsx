/**
 * ThemeContext.jsx
 * Управление темой: dark | light | bw
 * Сохраняется в localStorage
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const THEMES = ['dark', 'light', 'bw'];
const DEFAULT_THEME = 'dark';
const STORAGE_KEY = 'aegis-theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // SSR-safe: первый рендер совпадает на сервере и клиенте.
  // Реальное значение из localStorage применим в useEffect ниже —
  // тёмная вспышка предотвращается inline-скриптом в pages/_document.jsx,
  // который ставит data-theme на <html> ДО гидрации React.
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && THEMES.includes(saved) && saved !== DEFAULT_THEME) {
        setThemeState(saved);
      }
    } catch {
      /* localStorage disabled */
    }
  }, []);

  const setTheme = useCallback((t) => {
    if (!THEMES.includes(t)) return;
    setThemeState(t);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
