import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Bot, FileText, Network, Play, Shield, Skull, TrendingUp, Zap } from 'lucide-react';
import NavBar from '../components/NavBar';
import { useLang } from '../contexts/LanguageContext';

// 3D hero is heavy and uses WebGL → load only on the client.
// `loading` keeps the layout stable, and we auto-recover from the dev-only
// "ChunkLoadError" that happens when next.js rebuilds and the browser still
// has a stale chunk hash in memory.
const HomeHero3D = dynamic(
  () =>
    import('../components/HomeHero3D').catch((err) => {
      if (typeof window !== 'undefined' && /ChunkLoadError|Loading chunk/i.test(String(err))) {
        // One-shot reload to pick up the fresh chunk after a dev rebuild.
        if (!sessionStorage.getItem('imperium-3d-reloaded')) {
          sessionStorage.setItem('imperium-3d-reloaded', '1');
          window.location.reload();
          return { default: () => null };
        }
      }
      // Graceful inline fallback if reloading didn't help.
      return {
        default: () => (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--wv-text-2)', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12, opacity: 0.85,
          }}>
            3D scene failed to load — check console
          </div>
        ),
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--wv-text-2)', fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12, opacity: 0.6,
      }}>
        Loading 3D scene…
      </div>
    ),
  },
);

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Animated counter (monospaced KPI) ────────────────────────────────────────
function KpiCounter({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 1200;
    const step = (now) => {
      const progress = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

function KpiCard({ icon: Icon, label, value, suffix = '', tone = 'cyan', delta = null }) {
  return (
    <div className="wv-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="wv-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon size={12} strokeWidth={2.2} />
          {label}
        </div>
        {delta != null && (
          <span className="wv-badge wv-badge-green" style={{ height: 18, fontSize: 10 }}>
            <TrendingUp size={10} />+{delta}
          </span>
        )}
      </div>
      <div className={`wv-kpi-value ${tone === 'red' ? 'alert' : tone === 'green' ? 'normal' : ''}`}>
        <KpiCounter value={value} />{suffix && <span className="wv-kpi-unit">{suffix}</span>}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function IndexPage() {
  const { t } = useLang();
  const h = t.home;

  const [llmStatus, setLlmStatus] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/llm/status`).then((r) => r.json()).then(setLlmStatus).catch(() => {});
  }, []);

  const availableLLMs = llmStatus?.providers
    ? Object.entries(llmStatus.providers).filter(([, v]) => v.available).length
    : 0;

  return (
    <div className="wv">
      <NavBar />

      <div className="wv-page">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="wv-page-header">
          <div>
            <div className="wv-eyebrow" style={{ marginBottom: 6 }}>{h.badge}</div>
            <h1 className="wv-h1">{h.titleLine1}</h1>
            <p className="wv-body" style={{ marginTop: 8, maxWidth: 760 }}>
              {h.titleLine2}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/battle" className="wv-btn wv-btn-primary wv-btn-lg">
              <Play size={16} strokeWidth={2.5} />
              {h.startBtn}
            </Link>
            <Link href="/dashboard" className="wv-btn wv-btn-ghost wv-btn-lg">
              <BarChart3 size={16} />
              {h.dashboardBtn}
            </Link>
          </div>
        </div>

        {/* ── KPI Row ─────────────────────────────────────────────────── */}
        <div className="wv-grid" style={{ marginBottom: 16 }}>
          <div className="wv-col-3">
            <KpiCard icon={Bot}      label={h.kpiAgents}  value={5} />
          </div>
          <div className="wv-col-3">
            <KpiCard icon={Skull}    label={h.kpiTactics} value={22} />
          </div>
          <div className="wv-col-3">
            <KpiCard icon={Network}  label={h.kpiDevices} value={7} />
          </div>
          <div className="wv-col-3">
            <KpiCard
              icon={Zap}
              label={h.kpiLLMs}
              value={availableLLMs || 4}
              tone="green"
            />
          </div>
        </div>

        {/* ── Main row: 3D scene (8 col) + Alerts/Info (4 col) ────────── */}
        <div className="wv-grid" style={{ marginBottom: 16 }}>
          {/* Featured 3D scene */}
          <div className="wv-col-8">
            <div className="wv-card" style={{ padding: 0, overflow: 'hidden', height: 460, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, left: 20, zIndex: 2 }}>
                <span className="wv-badge wv-badge-green">
                  <span className="wv-live-dot" /> {h.liveSim}
                </span>
                <div className="wv-h3" style={{ marginTop: 8 }}>{h.arenaTitle}</div>
                <div className="wv-body" style={{ marginTop: 4 }}>
                  {h.arenaSub
                    .replace('{agents}', 5)
                    .replace('{tactics}', 22)
                    .replace('{llms}', availableLLMs || '–')}
                </div>
              </div>
              <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <HomeHero3D height="460px" autoRotate />
              </div>
              <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 2 }}>
                <Link href="/battle" className="wv-btn wv-btn-primary">
                  <Play size={14} strokeWidth={2.5} />
                  {h.startBattleBtn}
                </Link>
              </div>
            </div>
          </div>

          {/* Alerts / Status panel */}
          <div className="wv-col-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="wv-card">
              <div className="wv-eyebrow" style={{ marginBottom: 10 }}>
                <Activity size={11} style={{ display: 'inline', marginRight: 6, verticalAlign: '-1px' }} />
                {h.sysStatus}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Row label={h.backendLabel} status={llmStatus ? 'online' : 'offline'} onlineLabel={h.online} offlineLabel={h.offline} />
                <Row label={h.activeLLM} value={(llmStatus?.active || '—').toUpperCase()} />
                <Row label={h.multiLLMMode} value={llmStatus?.multi_llm ? h.enabled : h.off} status={llmStatus?.multi_llm ? 'online' : null} onlineLabel={h.enabled} />
              </div>
            </div>

            <div className="wv-alert wv-alert-info">
              <strong>{h.researchGoal}</strong>
              <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.85)' }}>{h.goalText}</div>
            </div>

            <div className="wv-alert wv-alert-warning">
              <strong>{h.researchMethod}</strong>
              <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.85)' }}>{h.descText}</div>
            </div>
          </div>
        </div>

        {/* ── Thesis structure ────────────────────────────────────────── */}
        <div className="wv-card" style={{ marginBottom: 16 }}>
          <div className="wv-eyebrow" style={{ marginBottom: 14 }}>
            <FileText size={11} style={{ display: 'inline', marginRight: 6, verticalAlign: '-1px' }} />
            {h.structure}
          </div>
          <div className="wv-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {h.structureItems.map((item) => (
              <div key={item.num} style={{
                padding: 16,
                borderRadius: 12,
                background: 'var(--wv-bg)',
                border: '1px solid var(--wv-border)',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}>
                <div style={{
                  flex: '0 0 32px',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--wv-cyan-soft)',
                  color: 'var(--wv-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: '700 13px/1 "JetBrains Mono", monospace',
                }}>{item.num}</div>
                <div>
                  <div className="wv-h4">{item.title}</div>
                  <div className="wv-body" style={{ marginTop: 4, fontSize: 12 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Final CTA ──────────────────────────────────────────────── */}
        <div className="wv-card wv-card-featured" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div className="wv-eyebrow" style={{ color: 'var(--wv-cyan)' }}>{h.readyEyebrow}</div>
          <h2 className="wv-h2" style={{ marginTop: 8, marginBottom: 16 }}>
            {h.ctaTitle}
          </h2>
          <Link href="/battle" className="wv-btn wv-btn-primary wv-btn-lg">
            <Play size={16} strokeWidth={2.5} />
            {h.startBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Row helper ──────────────────────────────────────────────────────────────
function Row({ label, value, status, onlineLabel = 'ONLINE', offlineLabel = 'OFFLINE' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--wv-text-2)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {status === 'online' && <span className="wv-live-dot" />}
        {status === 'offline' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--wv-red)' }} />}
        <span className="wv-mono" style={{ color: status === 'online' ? 'var(--wv-green)' : status === 'offline' ? 'var(--wv-red)' : 'var(--wv-text)', fontSize: 12, fontWeight: 600 }}>
          {value || (status === 'online' ? onlineLabel : status === 'offline' ? offlineLabel : '—')}
        </span>
      </span>
    </div>
  );
}
