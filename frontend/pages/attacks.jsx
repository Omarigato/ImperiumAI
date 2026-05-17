/**
 * Attack Taxonomy — Imperium AI
 * 5 attack categories × 25 techniques. Visual / behavioural metadata is
 * hard-coded here; all user-visible text is pulled from the per-language
 * dictionary at `t.attacks.data`.
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull, Ghost, Bone, Bug, Network, ChevronDown, ChevronRight,
  Search, Shield, AlertTriangle, Eye, Target, Zap, Filter, Play,
} from 'lucide-react';
import NavBar from '../components/NavBar';
import { useLang } from '../contexts/LanguageContext';

// Visual metadata — icons, colour, MITRE id, ordered technique list per
// category. Translatable text lives in locales/<lang>.json -> attacks.data.
const ATTACK_META = [
  {
    id: 'prompt_injection',
    agent: 'ShadowInjector',
    Icon: Skull,
    color: '#FF453A',
    mitre: 'AML.T0051',
    techniques: ['direct_injection', 'nested_injection', 'instruction_override', 'delimiter_confusion', 'chain_of_thought_exploit'],
    techniqueMeta: {
      direct_injection:         { severity: 'high',     stealthiness: 'low' },
      nested_injection:         { severity: 'high',     stealthiness: 'medium' },
      instruction_override:     { severity: 'critical', stealthiness: 'medium' },
      delimiter_confusion:      { severity: 'high',     stealthiness: 'medium' },
      chain_of_thought_exploit: { severity: 'high',     stealthiness: 'high' },
    },
  },
  {
    id: 'context_manipulation',
    agent: 'ContextPhantom',
    Icon: Ghost,
    color: '#BF5AF2',
    mitre: 'AML.T0054',
    techniques: ['context_hijack', 'role_confusion', 'memory_poisoning', 'false_authority'],
    techniqueMeta: {
      context_hijack:   { severity: 'high',     stealthiness: 'high' },
      role_confusion:   { severity: 'critical', stealthiness: 'medium' },
      memory_poisoning: { severity: 'high',     stealthiness: 'high' },
      false_authority:  { severity: 'critical', stealthiness: 'medium' },
    },
  },
  {
    id: 'privilege_escalation',
    agent: 'PrivilegeReaper',
    Icon: Bone,
    color: '#FF9F0A',
    mitre: 'AML.T0055',
    techniques: ['admin_impersonation', 'token_forgery', 'sudo_injection', 'permission_bypass', 'multi_step_attack'],
    techniqueMeta: {
      admin_impersonation: { severity: 'high',     stealthiness: 'low' },
      token_forgery:       { severity: 'critical', stealthiness: 'high' },
      sudo_injection:      { severity: 'high',     stealthiness: 'low' },
      permission_bypass:   { severity: 'high',     stealthiness: 'medium' },
      multi_step_attack:   { severity: 'critical', stealthiness: 'high' },
    },
  },
  {
    id: 'social_engineering',
    agent: 'SilentEscalator',
    Icon: Bug,
    color: '#00E5FF',
    mitre: 'AML.T0056',
    techniques: ['incremental_trust', 'semantic_drift', 'boundary_erosion', 'context_normalization', 'jailbreak_roleplay'],
    techniqueMeta: {
      incremental_trust:     { severity: 'medium',   stealthiness: 'high' },
      semantic_drift:        { severity: 'medium',   stealthiness: 'critical' },
      boundary_erosion:      { severity: 'high',     stealthiness: 'high' },
      context_normalization: { severity: 'high',     stealthiness: 'high' },
      jailbreak_roleplay:    { severity: 'critical', stealthiness: 'medium' },
    },
  },
  {
    id: 'network_layer',
    agent: 'NetworkPhantom',
    Icon: Network,
    color: '#32D74B',
    mitre: 'AML.T0057',
    techniques: ['dns_spoofing', 'mitm_interception', 'traffic_injection', 'packet_sniffing', 'arp_poisoning'],
    techniqueMeta: {
      dns_spoofing:      { severity: 'high',     stealthiness: 'high' },
      mitm_interception: { severity: 'critical', stealthiness: 'high' },
      traffic_injection: { severity: 'critical', stealthiness: 'medium' },
      packet_sniffing:   { severity: 'high',     stealthiness: 'critical' },
      arp_poisoning:     { severity: 'critical', stealthiness: 'high' },
    },
  },
];

// Severity / stealth → WattVision badge variant
const SEVERITY_BADGE = {
  low:      'wv-badge-green',
  medium:   'wv-badge-orange',
  high:     'wv-badge-orange',
  critical: 'wv-badge-red',
};

const STEALTH_BADGE = {
  low:      'wv-badge-green',
  medium:   'wv-badge-orange',
  high:     'wv-badge-violet',
  critical: 'wv-badge-violet',
};

// ── Page ────────────────────────────────────────────────────────────────────
export default function AttacksPage() {
  const { t } = useLang();
  const at = t.attacks;

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  // Build per-language enriched category list.
  const categories = useMemo(() => {
    return ATTACK_META.map((m) => {
      const data = at.data[m.id];
      return {
        ...m,
        label: data.label,
        tier: data.tier,
        summary: data.summary,
        defenseStrategy: data.defenseStrategy,
        techniqueList: m.techniques.map((tid) => ({
          id: tid,
          name:      data.techniques[tid].name,
          iotImpact: data.techniques[tid].iotImpact,
          mechanism: data.techniques[tid].mechanism,
          indicator: data.techniques[tid].indicator,
          defense:   data.techniques[tid].defense,
          severity:     m.techniqueMeta[tid].severity,
          stealthiness: m.techniqueMeta[tid].stealthiness,
        })),
      };
    });
  }, [at]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => filter === 'all' || c.id === filter);
  }, [categories, filter]);

  const totalTechniques = categories.reduce((s, c) => s + c.techniqueList.length, 0);
  const criticalCount = categories.flatMap((c) => c.techniqueList).filter((t) => t.severity === 'critical').length;

  const allTechniques = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.techniqueList.map((t) => ({ ...t, category: cat.label, agent: cat.agent, color: cat.color })),
    );
  }, [categories]);

  const searchedTechniques = useMemo(() => {
    if (!search) return allTechniques;
    const q = search.toLowerCase();
    return allTechniques.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.mechanism || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q),
    );
  }, [allTechniques, search]);

  return (
    <div className="wv">
      <NavBar />

      <div className="wv-page">
        {/* Header */}
        <div className="wv-page-header">
          <div>
            <div className="wv-eyebrow" style={{ marginBottom: 6 }}>{at.eyebrow}</div>
            <h1 className="wv-h1">{at.title}</h1>
            <p className="wv-body" style={{ marginTop: 8, maxWidth: 760 }}>
              {at.subtitle.replace('{count}', totalTechniques)}
            </p>
          </div>
          <Link href="/battle" className="wv-btn wv-btn-primary">
            <Play size={14} strokeWidth={2.5} />
            {at.seeAction}
          </Link>
        </div>

        {/* KPIs */}
        <div className="wv-grid" style={{ marginBottom: 16 }}>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">{at.totalTechniques}</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{totalTechniques}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">{at.categories}</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{categories.length}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">{at.criticalSeverity}</div>
              <div className="wv-kpi-value alert" style={{ marginTop: 12 }}>{criticalCount}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">{at.agentsCount}</div>
              <div className="wv-kpi-value normal" style={{ marginTop: 12 }}>5</div>
            </div>
          </div>
        </div>

        {/* Filter + Search bar */}
        <div className="wv-card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={14} color="var(--wv-text-2)" />
            <button
              onClick={() => setFilter('all')}
              className={`wv-badge ${filter === 'all' ? 'wv-badge-cyan' : ''}`}
              style={{ cursor: 'pointer', height: 28, padding: '0 12px' }}
            >
              {at.all} ({totalTechniques})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className="wv-badge"
                style={{
                  cursor: 'pointer',
                  height: 28,
                  padding: '0 12px',
                  background: filter === cat.id ? `${cat.color}1F` : 'var(--wv-surface)',
                  borderColor: filter === cat.id ? cat.color : 'var(--wv-border)',
                  color: filter === cat.id ? cat.color : 'var(--wv-text-2)',
                }}
              >
                {cat.label} ({cat.techniqueList.length})
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative', minWidth: 240 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--wv-text-2)' }} />
              <input
                type="text"
                placeholder={at.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="wv-input"
                style={{ width: '100%', paddingLeft: 36 }}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {search ? (
          <div className="wv-grid">
            {searchedTechniques.map((tt) => (
              <div key={tt.id + tt.category} className="wv-col-6">
                <TechniqueCard technique={tt} categoryColor={tt.color} labels={at} />
              </div>
            ))}
            {searchedTechniques.length === 0 && (
              <div className="wv-col-12">
                <div className="wv-card" style={{ textAlign: 'center', padding: 32, color: 'var(--wv-text-2)' }}>
                  {at.noResults.replace('{query}', search)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredCategories.map((cat, i) => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                isExpanded={expanded === cat.id}
                onToggle={() => setExpanded(expanded === cat.id ? null : cat.id)}
                index={i}
                labels={at}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Category card ───────────────────────────────────────────────────────────
function CategoryCard({ cat, isExpanded, onToggle, index, labels }) {
  const Icon = cat.Icon;
  return (
    <motion.div
      className="wv-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ padding: 0, overflow: 'hidden', borderColor: isExpanded ? cat.color : 'var(--wv-border)' }}
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
          background: `${cat.color}1F`, border: `1px solid ${cat.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 48px',
        }}>
          <Icon size={22} color={cat.color} strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="wv-h3" style={{ color: cat.color }}>{cat.label}</span>
            <span className="wv-badge wv-badge-cyan">{cat.mitre}</span>
            <span className="wv-badge">{cat.tier}</span>
            <span className="wv-badge" style={{ color: 'var(--wv-text-2)' }}>
              {cat.techniqueList.length} {labels.techniques}
            </span>
          </div>
          <div className="wv-body" style={{ fontSize: 13, marginTop: 4 }}>
            {labels.agentLabel}: <span style={{ color: cat.color, fontWeight: 600 }}>{cat.agent}</span>
          </div>
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
            <div style={{ padding: '4px 20px 20px', borderTop: `1px solid ${cat.color}33` }}>
              <div className="wv-grid" style={{ marginTop: 16, marginBottom: 16 }}>
                <div className="wv-col-6">
                  <div className="wv-eyebrow" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={11} /> {labels.fields.summary}
                  </div>
                  <p className="wv-body" style={{ fontSize: 13, lineHeight: 1.7 }}>{cat.summary}</p>
                </div>
                <div className="wv-col-6">
                  <div className="wv-eyebrow" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={11} color="var(--wv-green)" /> {labels.fields.defenseStrategy}
                  </div>
                  <p className="wv-body" style={{ fontSize: 13, lineHeight: 1.7 }}>{cat.defenseStrategy}</p>
                </div>
              </div>

              <div className="wv-eyebrow" style={{ marginBottom: 12 }}>
                {labels.fields.techniques} ({cat.techniqueList.length})
              </div>
              <div className="wv-grid">
                {cat.techniqueList.map((tt) => (
                  <div key={tt.id} className="wv-col-6">
                    <TechniqueCard technique={tt} categoryColor={cat.color} labels={labels} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Technique card ──────────────────────────────────────────────────────────
function TechniqueCard({ technique: t, labels }) {
  const sevBadge = SEVERITY_BADGE[t.severity] || 'wv-badge-orange';
  const stlBadge = STEALTH_BADGE[t.stealthiness] || 'wv-badge-orange';

  return (
    <div style={{
      padding: 14,
      background: 'var(--wv-bg)',
      border: '1px solid var(--wv-border)',
      borderRadius: 12,
      height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wv-h4" style={{ color: 'var(--wv-text)' }}>{t.name}</div>
          <div className="wv-mono" style={{ fontSize: 10, color: 'var(--wv-text-2)', marginTop: 2 }}>
            {t.id}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className={`wv-badge ${sevBadge}`}>
          <AlertTriangle size={10} />
          {labels.severity[t.severity] || t.severity.toUpperCase()}
        </span>
        <span className={`wv-badge ${stlBadge}`}>
          <Eye size={10} />
          {labels.stealth[t.stealthiness] || t.stealthiness.toUpperCase()} · {labels.fields.stealth}
        </span>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div className="wv-eyebrow" style={{ fontSize: 10, marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Target size={10} /> {labels.fields.iotImpact}
        </div>
        <div className="wv-body" style={{ fontSize: 12 }}>{t.iotImpact}</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div className="wv-eyebrow" style={{ fontSize: 10, marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Zap size={10} /> {labels.fields.mechanism}
        </div>
        <div className="wv-body" style={{ fontSize: 12, lineHeight: 1.6 }}>{t.mechanism}</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div className="wv-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>{labels.fields.indicator}</div>
        <div className="wv-mono" style={{
          fontSize: 11,
          padding: '8px 10px',
          background: 'var(--wv-surface)',
          border: '1px solid var(--wv-border)',
          borderRadius: 8,
          color: 'var(--wv-cyan)',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {t.indicator}
        </div>
      </div>

      <div>
        <div className="wv-eyebrow" style={{ fontSize: 10, marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--wv-green)' }}>
          <Shield size={10} /> {labels.fields.defense}
        </div>
        <div className="wv-body" style={{ fontSize: 12, lineHeight: 1.6 }}>{t.defense}</div>
      </div>
    </div>
  );
}
