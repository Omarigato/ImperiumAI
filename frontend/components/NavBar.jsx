import Link from 'next/link';
import { useRouter } from 'next/router';
import { Zap, Activity, BarChart3, FileText, Users, Skull, Shield } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

const LANG_LABELS = { en: 'EN', ru: 'RU', kz: 'KZ' };

export default function NavBar({ live = false, currentRound = 0 }) {
  const { lang, setLang, t } = useLang();
  const router = useRouter();

  const links = [
    { href: '/',              label: t.nav.home,          icon: Zap },
    { href: '/battle',        label: t.nav.simulation,    icon: Activity },
    { href: '/dashboard',     label: t.nav.results,       icon: BarChart3 },
    { href: '/agents',        label: 'Agents',            icon: Skull },
    { href: '/attacks',       label: 'Attacks',           icon: Shield },
    { href: '/documentation', label: t.nav.documentation, icon: FileText },
    { href: '/team',          label: 'Team',              icon: Users },
  ];

  return (
    <nav className="wv-nav">
      <div className="wv-nav-inner">
        <Link href="/" className="wv-nav-logo">
          <Zap size={18} strokeWidth={2.5} />
          <span>AegisAI</span>
        </Link>

        <ul className="wv-nav-links">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = router.pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`wv-nav-link${isActive ? ' active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon size={14} strokeWidth={2} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {live && (
            <span className="wv-badge wv-badge-green">
              <span className="wv-live-dot" /> Live · R{currentRound}
            </span>
          )}
          <div style={{ display: 'flex', gap: 2, background: 'var(--wv-surface)', border: '1px solid var(--wv-border)', borderRadius: 6, padding: 2 }}>
            {['en', 'ru', 'kz'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: 4,
                  background: lang === l ? 'var(--wv-cyan)' : 'transparent',
                  color: lang === l ? '#000' : 'var(--wv-text-2)',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
