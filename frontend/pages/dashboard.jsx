import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, TrendingUp, Target, Zap, Activity, Database, Skull } from 'lucide-react';
import NavBar from '../components/NavBar';
import { useLang } from '../contexts/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Recharts tooltip styled in WattVision palette
const WV_TOOLTIP = {
  contentStyle: {
    background: '#1E1E1E',
    border: '1px solid #2C2C2E',
    borderRadius: 12,
    color: '#FFFFFF',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    padding: '10px 12px',
  },
  itemStyle: { color: '#00E5FF' },
  labelStyle: { color: '#98989D', fontSize: 11, marginBottom: 4 },
};

const AGENT_COLORS = {
  ShadowInjector:  '#FF453A',
  ContextPhantom:  '#BF5AF2',
  PrivilegeReaper: '#FF9F0A',
  SilentEscalator: '#00E5FF',
  NetworkPhantom:  '#32D74B',
};

function getAgentColor(name) { return AGENT_COLORS[name] || '#98989D'; }

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, suffix = '', tone = 'cyan', icon: Icon }) {
  return (
    <div className="wv-card">
      <div className="wv-eyebrow" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon size={11} strokeWidth={2.2} />}
        {label}
      </div>
      <div className={`wv-kpi-value ${tone === 'red' ? 'alert' : tone === 'green' ? 'normal' : ''}`}>
        {value}{suffix && <span className="wv-kpi-unit">{suffix}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children, height = 240 }) {
  return (
    <div className="wv-card">
      <div className="wv-eyebrow" style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon size={11} strokeWidth={2.2} />}
        {title}
      </div>
      {subtitle && <div className="wv-body" style={{ fontSize: 12, marginBottom: 12 }}>{subtitle}</div>}
      <div style={{ height }}>{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLang();
  const d = t.dashboard;
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/api/memory`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const tacticData = summary?.most_successful_tactics?.slice(0, 8).map((t) => ({
    name: t.tactic.replace(/_/g, ' '),
    wins: t.wins, losses: t.losses,
    rate: Math.round(t.rate * 100),
  })) || [];

  const targetData = summary?.most_vulnerable_targets?.map((t) => ({
    target: t.target.replace(/_/g, ' '),
    vulnerability: Math.round(t.vulnerability * 100),
    attempts: t.attempts, hits: t.hits,
  })) || [];

  const timelineData = summary?.history?.map((entry, i) => ({
    round: i + 1, risk: entry.risk_delta || 0, success: entry.success ? 1 : 0,
  })) || [];

  const agentStats = {};
  (summary?.history || []).forEach((entry) => {
    if (!agentStats[entry.agent]) agentStats[entry.agent] = { agent: entry.agent, attacks: 0, successes: 0 };
    agentStats[entry.agent].attacks++;
    if (entry.success) agentStats[entry.agent].successes++;
  });
  const agentData = Object.values(agentStats).map((a) => ({
    agent: a.agent.replace('Injector', 'Inj.').replace('Escalator', 'Esc.').replace('Phantom', 'Ph.').replace('Reaper', 'R.'),
    successRate: a.attacks > 0 ? Math.round((a.successes / a.attacks) * 100) : 0,
    attacks: a.attacks,
  }));

  const cumulativeRiskData = (() => {
    let cum = 0;
    return (summary?.history || []).map((entry, i) => {
      cum = Math.max(0, Math.min(100, cum + (entry.risk_delta || 0)));
      return { round: i + 1, cumRisk: cum };
    });
  })();

  const tacticCategories = {
    'Prompt Injection':     ['direct_injection', 'nested_injection', 'instruction_override', 'delimiter_confusion', 'chain_of_thought_exploit'],
    'Context Attacks':      ['context_hijack', 'role_confusion', 'memory_poisoning', 'false_authority', 'context_poisoning', 'semantic_drift', 'history_manipulation'],
    'Privilege Escalation': ['admin_impersonation', 'token_forgery', 'sudo_injection', 'permission_bypass', 'multi_step_attack'],
    'Boundary Erosion':     ['incremental_trust', 'boundary_erosion', 'context_normalization', 'jailbreak_roleplay'],
    'Network Attacks':      ['dns_spoofing', 'mitm_interception', 'traffic_injection', 'packet_sniffing', 'arp_poisoning'],
  };

  const categoryStats = Object.entries(tacticCategories).map(([category, tactics]) => {
    const relevant = (summary?.most_successful_tactics || []).filter((t) => tactics.includes(t.tactic));
    const wins = relevant.reduce((s, t) => s + t.wins, 0);
    const total = relevant.reduce((s, t) => s + t.wins + t.losses, 0);
    return { category, wins, total, rate: total > 0 ? Math.round((wins / total) * 100) : 0 };
  });

  return (
    <div className="wv">
      <NavBar />

      <div className="wv-page">
        <div className="wv-page-header">
          <div>
            <div className="wv-eyebrow" style={{ marginBottom: 6 }}>{d.eyebrow}</div>
            <h1 className="wv-h1">{d.title}</h1>
            <p className="wv-body" style={{ marginTop: 8 }}>
              {d.subtitle}
            </p>
          </div>
          <button onClick={fetchData} className="wv-btn wv-btn-ghost">
            <RefreshCw size={14} />
            {d.refresh}
          </button>
        </div>

        {loading && !summary && (
          <div className="wv-card" style={{ textAlign: 'center', padding: 48, color: 'var(--wv-text-2)' }}>
            {d.loading}
          </div>
        )}

        {error && (
          <div className="wv-alert">
            <strong>{d.connectionError.replace('{error}', '')}</strong> {error}
            <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.85)' }}>
              {d.connectionHint}
            </div>
          </div>
        )}

        {summary && (
          <>
            {/* ── KPI Row ─────────────────────────────────────────────── */}
            <div className="wv-grid" style={{ marginBottom: 16 }}>
              <div className="wv-col-3">
                <KpiCard label={d.totalAttacks} value={summary.total_attacks} icon={Database} tone="cyan" />
              </div>
              <div className="wv-col-3">
                <KpiCard label={d.successful} value={summary.successful_attacks} icon={AlertTriangle} tone="red" />
              </div>
              <div className="wv-col-3">
                <KpiCard label={d.blocked} value={summary.blocked_attacks} icon={Zap} tone="green" />
              </div>
              <div className="wv-col-3">
                <KpiCard
                  label={d.successRate}
                  value={`${Math.round(summary.success_rate * 100)}%`}
                  icon={TrendingUp}
                  tone={summary.success_rate > 0.5 ? 'red' : 'cyan'}
                />
              </div>
            </div>

            {/* ── Charts row 1 ────────────────────────────────────────── */}
            <div className="wv-grid" style={{ marginBottom: 16 }}>
              <div className="wv-col-6">
                <ChartCard title={d.tacticPerformance} subtitle={d.tacticSubtitle} icon={Activity}>
                  {tacticData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tacticData} margin={{ top: 0, right: 10, bottom: 28, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                        <XAxis dataKey="name" tick={{ fill: '#98989D', fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: '#98989D', fontSize: 10 }} />
                        <Tooltip {...WV_TOOLTIP} />
                        <Bar dataKey="wins" fill="#FF453A" name="Wins" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="losses" fill="#00E5FF" name="Losses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </ChartCard>
              </div>

              <div className="wv-col-6">
                <ChartCard title={d.targetVulnerability} subtitle={d.targetSubtitle} icon={Target}>
                  {targetData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={targetData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#98989D', fontSize: 10 }} unit="%" />
                        <YAxis dataKey="target" type="category" tick={{ fill: '#FFFFFF', fontSize: 11 }} />
                        <Tooltip {...WV_TOOLTIP} formatter={(v) => `${v}%`} />
                        <Bar dataKey="vulnerability" fill="#BF5AF2" name="Vuln" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </ChartCard>
              </div>
            </div>

            {/* ── Charts row 2 ────────────────────────────────────────── */}
            <div className="wv-grid" style={{ marginBottom: 16 }}>
              <div className="wv-col-6">
                <ChartCard title={d.attackTimeline} subtitle={d.timelineSubtitle} icon={TrendingUp}>
                  {timelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                        <XAxis dataKey="round" tick={{ fill: '#98989D', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#98989D', fontSize: 10 }} />
                        <Tooltip {...WV_TOOLTIP} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#98989D' }} />
                        <Line type="monotone" dataKey="risk" stroke="#FF9F0A" dot={false} strokeWidth={2} name="Risk Δ" />
                        <Line type="monotone" dataKey="success" stroke="#32D74B" dot={false} strokeWidth={2} name="Success" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </ChartCard>
              </div>

              <div className="wv-col-6">
                <ChartCard title={d.agentPerformance} subtitle={d.agentSubtitle} icon={Skull}>
                  {agentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={agentData}>
                        <PolarGrid stroke="#2C2C2E" />
                        <PolarAngleAxis dataKey="agent" tick={{ fill: '#FFFFFF', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#98989D', fontSize: 9 }} />
                        <Radar name="Success %" dataKey="successRate" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.2} />
                        <Tooltip {...WV_TOOLTIP} formatter={(v) => `${v}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </ChartCard>
              </div>
            </div>

            {/* ── Charts row 3 ────────────────────────────────────────── */}
            <div className="wv-grid" style={{ marginBottom: 16 }}>
              <div className="wv-col-6">
                <ChartCard title={d.cumulativeRisk} subtitle={d.cumulativeSubtitle} icon={AlertTriangle}>
                  {cumulativeRiskData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeRiskData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                        <defs>
                          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF453A" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#FF453A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                        <XAxis dataKey="round" tick={{ fill: '#98989D', fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#98989D', fontSize: 10 }} />
                        <Tooltip {...WV_TOOLTIP} />
                        <Area type="monotone" dataKey="cumRisk" stroke="#FF453A" fill="url(#riskGrad)" strokeWidth={2} name="Risk Score" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyState />}
                </ChartCard>
              </div>

              <div className="wv-col-6">
                <div className="wv-card">
                  <div className="wv-eyebrow" style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={11} strokeWidth={2.2} />
                    {d.categoryEffectiveness}
                  </div>
                  <div className="wv-body" style={{ fontSize: 12, marginBottom: 16 }}>
                    {d.categorySubtitle}
                  </div>
                  {categoryStats.some((c) => c.total > 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {categoryStats.map((c) => {
                        const tone = c.rate > 50 ? 'var(--wv-red)' : c.rate > 25 ? 'var(--wv-orange)' : 'var(--wv-green)';
                        return (
                          <div key={c.category}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span className="wv-h4" style={{ fontSize: 13 }}>{d.categories[c.category] || c.category}</span>
                              <span className="wv-mono" style={{ color: tone, fontSize: 12, fontWeight: 600 }}>
                                {c.rate}% · {c.total > 0 ? `${c.wins}/${c.total}` : '—'}
                              </span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: 'var(--wv-bg)', borderRadius: 3, overflow: 'hidden' }}>
                              <motion.div
                                style={{ height: '100%', background: tone, borderRadius: 3 }}
                                initial={{ width: 0 }}
                                animate={{ width: `${c.rate}%` }}
                                transition={{ duration: 0.8 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <EmptyState message={d.noData} />}
                </div>
              </div>
            </div>

            {/* ── Research Metrics ────────────────────────────────────── */}
            <div className="wv-card" style={{ marginBottom: 16 }}>
              <div className="wv-eyebrow" style={{ marginBottom: 4 }}>{d.researchEyebrow}</div>
              <h3 className="wv-h3" style={{ marginBottom: 16 }}>{d.researchMetrics}</h3>
              <div className="wv-grid" style={{ marginBottom: 16 }}>
                <div className="wv-col-3">
                  <div style={{ padding: 16, background: 'var(--wv-bg)', borderRadius: 12, border: '1px solid var(--wv-border)' }}>
                    <div className="wv-kpi-value alert" style={{ fontSize: 26 }}>
                      {summary.total_attacks > 0 ? Math.round(summary.success_rate * 100) : 0}
                      <span style={{ fontSize: 16 }}>%</span>
                    </div>
                    <div className="wv-kpi-label">{d.bypassRate}</div>
                  </div>
                </div>
                <div className="wv-col-3">
                  <div style={{ padding: 16, background: 'var(--wv-bg)', borderRadius: 12, border: '1px solid var(--wv-border)' }}>
                    <div className="wv-kpi-value normal" style={{ fontSize: 26 }}>
                      {summary.total_attacks > 0 ? Math.round((1 - summary.success_rate) * 100) : 0}
                      <span style={{ fontSize: 16 }}>%</span>
                    </div>
                    <div className="wv-kpi-label">{d.defenseRate}</div>
                  </div>
                </div>
                <div className="wv-col-3">
                  <div style={{ padding: 16, background: 'var(--wv-bg)', borderRadius: 12, border: '1px solid var(--wv-border)' }}>
                    <div className="wv-kpi-value" style={{ fontSize: 26 }}>{summary.total_attacks}</div>
                    <div className="wv-kpi-label">{d.totalProbes}</div>
                  </div>
                </div>
                <div className="wv-col-3">
                  <div style={{ padding: 16, background: 'var(--wv-bg)', borderRadius: 12, border: '1px solid var(--wv-border)' }}>
                    <div className="wv-kpi-value" style={{ fontSize: 26, color: 'var(--wv-violet)' }}>
                      {summary.most_successful_tactics?.length || 0}
                    </div>
                    <div className="wv-kpi-label">{d.tacticVariants}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Recent attacks table ───────────────────────────────── */}
            <div className="wv-card">
              <div className="wv-eyebrow" style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Database size={11} strokeWidth={2.2} />
                {d.recentLog}
              </div>
              <div className="wv-body" style={{ fontSize: 12, marginBottom: 16 }}>
                {d.recentSubtitle}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="wv-table">
                  <thead>
                    <tr>
                      <th>{d.table.num}</th>
                      <th>{d.table.agent}</th>
                      <th>{d.table.target}</th>
                      <th>{d.table.tactic}</th>
                      <th>{d.table.result}</th>
                      <th style={{ textAlign: 'right' }}>{d.table.delta}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.history || []).map((entry, i) => (
                      <tr key={i}>
                        <td className="wv-mono" style={{ color: 'var(--wv-text-2)' }}>{i + 1}</td>
                        <td>
                          <span style={{ color: getAgentColor(entry.agent), fontWeight: 600 }}>{entry.agent}</span>
                        </td>
                        <td className="wv-mono" style={{ color: 'var(--wv-cyan)' }}>{entry.target}</td>
                        <td className="wv-mono" style={{ color: 'var(--wv-text-2)', fontSize: 12 }}>
                          {entry.tactic?.replace(/_/g, ' ')}
                        </td>
                        <td>
                          {entry.success ? (
                            <span className="wv-badge wv-badge-red">{t.battle.breach}</span>
                          ) : (
                            <span className="wv-badge wv-badge-green">{t.battle.block}</span>
                          )}
                        </td>
                        <td className="wv-mono" style={{ textAlign: 'right', color: entry.risk_delta > 0 ? 'var(--wv-orange)' : 'var(--wv-green)', fontWeight: 600 }}>
                          {entry.risk_delta > 0 ? `+${entry.risk_delta}` : entry.risk_delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!summary.history || summary.history.length === 0) && (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--wv-text-2)' }}>
                    {d.noData}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message = 'No data — run a simulation first' }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--wv-text-2)',
      fontSize: 13,
    }}>
      {message}
    </div>
  );
}
