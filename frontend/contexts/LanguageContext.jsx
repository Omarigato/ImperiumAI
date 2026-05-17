/**
 * LanguageContext.jsx
 * Контекст языка — хранит выбранный язык, отдаёт текущий словарь `t`
 * (целиком объект из locales/<lang>.json). Используется на главной
 * странице как `const { t } = useLang(); t.home.badge`.
 * Для остальных страниц есть хук useTranslation с функцией `t('home.badge')`.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

import en from '../locales/en.json';
import ru from '../locales/ru.json';
import kz from '../locales/kz.json';

const DICTIONARIES = { en, ru, kz };
const SUPPORTED_LANGS = Object.keys(DICTIONARIES);
const DEFAULT_LANG = 'en';
const STORAGE_KEY = 'imperium-lang';

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // ⚠️ Гидрация: первый рендер на сервере И на клиенте должен совпадать,
  // поэтому стартуем с DEFAULT_LANG. Сохранённое значение из localStorage
  // подтягиваем уже после hydration в useEffect — это устраняет ошибку
  // "Text content does not match server-rendered HTML".
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LANGS.includes(saved) && saved !== DEFAULT_LANG) {
        setLangState(saved);
      }
    } catch {
      /* localStorage disabled — игнорируем */
    }
  }, []);

  const setLang = useCallback((newLang) => {
    if (!SUPPORTED_LANGS.includes(newLang)) return;
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* noop */ }
    }
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANG] }),
    [lang, setLang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
