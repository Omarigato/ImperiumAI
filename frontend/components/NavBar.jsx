import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLang } from '../contexts/LanguageContext';
import { useTheme, THEMES } from '../contexts/ThemeContext';

const THEME_ICONS = { dark: '🌙', light: '☀️', bw: '◑' };
const LANG_LABELS = { en: 'EN', ru: 'RU', kz: 'KZ' };

export default function NavBar() {
  const { lang, setLang, t } = useLang();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const links = [
    { href: '/', label: t.nav.home },
    { href: '/battle', label: t.nav.simulation },
    { href: '/dashboard', label: t.nav.results },
    { href: '/documentation', label: t.nav.documentation },
  ];

  const nextTheme = () => {
    const idx = THEMES.indexOf(theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <nav className="academic-nav">
      <div className="academic-nav-inner">
        <Link href="/" className="academic-logo">
          AegisAI
        </Link>

        <ul className="academic-nav-links">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`academic-nav-link${router.pathname === href ? ' active' : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="academic-nav-controls">
          <div className="lang-switcher">
            {['en', 'ru', 'kz'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`lang-btn${lang === l ? ' active' : ''}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          <button
            onClick={nextTheme}
            className="theme-btn"
            title={`Theme: ${theme}`}
          >
            {THEME_ICONS[theme]}
          </button>
        </div>
      </div>
    </nav>
  );
}
