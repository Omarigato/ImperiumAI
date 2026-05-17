import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull, Ghost, Bone, Bug, Network, ChevronDown, ChevronRight,
  Target, Lock, Crosshair, GitBranch, CheckCircle2, AlertCircle, Play,
} from 'lucide-react';
import NavBar from '../components/NavBar';
import { useLang } from '../contexts/LanguageContext';

// Visual-only metadata that doesn't depend on language (icons, colours, tier
// IDs, target device IDs). Everything text-y lives in locales/<lang>.json
// under "agents.data".
const AGENT_META = [
  {
    name: 'ShadowInjector',
    Icon: Skull,
    color: '#FF453A',
    tierId: 'tier1',
    targets: ['front_door', 'security_panel'],
    versions: ['v0.1', 'v0.3', 'v0.6', 'v1.0', 'v1.2', 'v1.5'],
  },
  {
    name: 'ContextPhantom',
    Icon: Ghost,
    color: '#BF5AF2',
    tierId: 'tier2',
    targets: ['camera_system', 'thermostat', 'lights'],
    versions: ['v0.1', 'v0.4', 'v0.7', 'v1.0', 'v1.3'],
  },
  {
    name: 'PrivilegeReaper',
    Icon: Bone,
    color: '#FF9F0A',
    tierId: 'tier2',
    targets: ['security_panel', 'alarm', 'front_door'],
    versions: ['v0.1', 'v0.3', 'v0.6', 'v0.9', 'v1.0'],
  },
  {
    name: 'SilentEscalator',
    Icon: Bug,
    color: '#00E5FF',
    tierId: 'tier3',
    targets: ['lights', 'thermostat', 'camera_system', 'front_door'],
    versions: ['v0.1', 'v0.4', 'v0.7', 'v1.0', 'v1.4'],
  },
  {
    name: 'NetworkPhantom',
    Icon: Network,
    color: '#32D74B',
    tierId: 'tier3',
    targets: ['router', 'camera_system', 'thermostat'],
    versions: ['v0.1', 'v0.3', 'v0.6', 'v0.9', 'v1.0', 'v1.2'],
  },
];

const HIERARCHY_META = [
  { tierId: 'tier1', tierLabel: 'Tier 1', agents: ['ShadowInjector'],                       color: '#FF453A' },
  { tierId: 'tier2', tierLabel: 'Tier 2', agents: ['ContextPhantom', 'PrivilegeReaper'],    color: '#FF9F0A' },
  { tierId: 'tier3', tierLabel: 'Tier 3', agents: ['SilentEscalator', 'NetworkPhantom'],    color: '#00E5FF' },
];

// ── AgentCard ───────────────────────────────────────────────────────────────
function AgentCard({ meta, data, isExpanded, onToggle, index, tierLabel, labels }) {
  const Icon = meta.Icon;
  return (
    <motion.div
      className="wv-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ padding: 0, overflow: 'hidden', borderColor: isExpanded ? meta.color : 'var(--wv-border)' }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 20,
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${meta.color}1F`, border: `1px solid ${meta.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 48px',
        }}>
          <Icon size={22} color={meta.color} strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="wv-h3" style={{ color: meta.color }}>{meta.name}</span>
            <span className="wv-badge" style={{ borderColor: `${meta.color}55`, color: meta.color, background: `${meta.color}1F` }}>
              {tierLabel}
            </span>
          </div>
          <div className="wv-body" style={{ fontSize: 13, marginTop: 2 }}>{data.role}</div>
        </div>

        {isExpanded ? <ChevronDown size={18} color="var(--wv-text-2)" /> : <ChevronRight size={18} color="var(--wv-text-2)" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 20px 20px', borderTop: `1px solid ${meta.color}33` }}>
              <p className="wv-body" style={{ marginTop: 16, color: 'var(--wv-text)', lineHeight: 1.7 }}>
                {data.description}
              </p>

              {/* Capabilities & Weaknesses */}
              <div className="wv-grid" style={{ marginTop: 16 }}>
                <div className="wv-col-6">
                  <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={11} color="var(--wv-green)" /> {labels.capabilities}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.capabilities.map((c) => (
                      <li key={c} className="wv-body" style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                        <span style={{ color: meta.color }}>▸</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="wv-col-6">
                  <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={11} color="var(--wv-red)" /> {labels.weaknesses}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.weaknesses.map((w) => (
                      <li key={w} className="wv-body" style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--wv-red)' }}>▸</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Targets */}
              <div style={{ marginTop: 20 }}>
                <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Target size={11} /> {labels.targets}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {meta.targets.map((t) => (
                    <span key={t} className="wv-badge wv-badge-cyan">{t}</span>
                  ))}
                </div>
              </div>

              {/* Tactics */}
              <div style={{ marginTop: 20 }}>
                <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Crosshair size={11} /> {labels.tactics} ({Object.keys(data.tactics).length})
                </div>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {Object.entries(data.tactics).map(([id, desc]) => (
                    <div key={id} style={{
                      padding: 12, background: 'var(--wv-bg)',
                      border: '1px solid var(--wv-border)', borderRadius: 10,
                    }}>
                      <div className="wv-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--wv-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {id.replace(/_/g, ' ')}
                      </div>
                      <div className="wv-body" style={{ fontSize: 12 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Path */}
              <div style={{ marginTop: 20 }}>
                <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <GitBranch size={11} /> {labels.evolution}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4 }}>
                  {data.learningPath.map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
                    >
                      <span className="wv-mono" style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                        background: `${meta.color}1F`, border: `1px solid ${meta.color}55`,
                        color: meta.color, flex: '0 0 auto', letterSpacing: '0.04em',
                      }}>
                        {meta.versions[i] || `v${i + 1}`}
                      </span>
                      <div className="wv-body" style={{ fontSize: 13, paddingTop: 2 }}>{event}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const { t } = useLang();
  const a = t.agents;
  const [expanded, setExpanded] = useState(null);

  // Per-language enriched list (meta + translated data).
  const agents = useMemo(() => {
    return AGENT_META.map((m) => ({
      ...m,
      data: a.data[m.name],
      tierLabel: a.tier[m.tierId].label,
    }));
  }, [a]);

  const totalTactics = useMemo(
    () => agents.reduce((s, x) => s + Object.keys(x.data.tactics).length, 0),
    [agents],
  );
  const totalEvolutions = useMemo(
    () => agents.reduce((s, x) => s + x.data.learningPath.length, 0),
    [agents],
  );

  return (
    <div className="wv">
      <NavBar />

      <div className="wv-page">
        {/* Header */}
        <div className="wv-page-header">
          <div>
            <div className="wv-eyebrow" style={{ marginBottom: 6 }}>{a.eyebrow}</div>
            <h1 className="wv-h1">{a.title}</h1>
            <p className="wv-body" style={{ marginTop: 8, maxWidth: 760 }}>
              {a.subtitle}
            </p>
          </div>
          <Link href="/battle" className="wv-btn wv-btn-primary wv-btn-lg">
            <Play size={16} strokeWidth={2.5} />
            {a.watchInBattle}
          </Link>
        </div>

        {/* KPIs */}
        <div className="wv-grid" style={{ marginBottom: 16 }}>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">{a.activeAgents}</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{agents.length}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">{a.totalTactics}</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{totalTactics}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">{a.hierarchyTiers}</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{HIERARCHY_META.length}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">{a.evolutions}</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{totalEvolutions}</div>
            </div>
          </div>
        </div>

        {/* Hierarchy strip */}
        <div className="wv-card" style={{ marginBottom: 16 }}>
          <div className="wv-eyebrow" style={{ marginBottom: 12 }}>{a.hierarchy}</div>
          <div className="wv-grid">
            {HIERARCHY_META.map((h) => (
              <div key={h.tierId} className="wv-col-4">
                <div style={{
                  padding: 16, background: 'var(--wv-bg)',
                  border: `1px solid ${h.color}55`, borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="wv-mono" style={{ fontWeight: 700, color: h.color, fontSize: 13, letterSpacing: '0.04em' }}>
                      {h.tierLabel}
                    </span>
                    <span className="wv-h4">{a.tier[h.tierId].label}</span>
                  </div>
                  <div className="wv-body" style={{ fontSize: 12, marginBottom: 10 }}>{a.tier[h.tierId].desc}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {h.agents.map((agentName) => {
                      const ag = AGENT_META.find((x) => x.name === agentName);
                      return (
                        <span
                          key={agentName}
                          className="wv-badge"
                          style={{ borderColor: `${ag.color}55`, color: ag.color, background: `${ag.color}1F` }}
                        >
                          {agentName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {agents.map((agent, i) => (
            <AgentCard
              key={agent.name}
              meta={agent}
              data={agent.data}
              tierLabel={agent.tierLabel}
              labels={{
                capabilities: a.capabilities,
                weaknesses:   a.weaknesses,
                targets:      a.targets,
                tactics:      a.tactics,
                evolution:    a.evolution,
              }}
              isExpanded={expanded === agent.name}
              onToggle={() => setExpanded(expanded === agent.name ? null : agent.name)}
              index={i}
            />
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/attacks" className="wv-btn wv-btn-outline">
            <Lock size={14} />
            {a.seeAttacks}
          </Link>
        </div>
      </div>
    </div>
  );
}
