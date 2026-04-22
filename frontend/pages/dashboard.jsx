import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, AreaChart, Area, Cell,
} from 'recharts';
import { motion } from 'framer-motion';

const API = 'http://localhost:8000';

const CYBER_TOOLTIP = {
  contentStyle: { background: '#0F0F1A', border: '1px solid #1A1A2E', color: '#E0E0E0', fontFamily: 'monospace' },
  itemStyle: { color: '#00FFFF' },
  labelStyle: { color: '#9B00FF' },
};

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold tracking-widest glow-text">{title}</h2>
      {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div className="cyber-panel rounded p-4 text-center" style={{ borderColor: color + '44' }}>
      <div className="text-2xl font-bold" style={{ color, textShadow: `0 0 10px ${color}` }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1 tracking-wider uppercase">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/memory`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Prepare chart data
  const tacticData = summary?.most_successful_tactics?.slice(0, 8).map((t) => ({
    name: t.tactic.replace(/_/g, ' '),
    wins: t.wins,
    losses: t.losses,
    rate: Math.round(t.rate * 100),
  })) || [];

  const targetData = summary?.most_vulnerable_targets?.map((t) => ({
    target: t.target.replace(/_/g, ' '),
    vulnerability: Math.round(t.vulnerability * 100),
    attempts: t.attempts,
    hits: t.hits,
  })) || [];

  // Timeline from history
  const timelineData = summary?.history?.map((entry, i) => ({
    round: i + 1,
    risk: entry.risk_delta || 0,
    success: entry.success ? 1 : 0,
  })) || [];

  // Agent radar data
  const agentStats = {};
  (summary?.history || []).forEach((entry) => {
    if (!agentStats[entry.agent]) {
      agentStats[entry.agent] = { agent: entry.agent, attacks: 0, successes: 0 };
    }
    agentStats[entry.agent].attacks++;
    if (entry.success) agentStats[entry.agent].successes++;
  });

  const agentData = Object.values(agentStats).map((a) => ({
    agent: a.agent.replace('Injector', 'Inj.').replace('Escalator', 'Esc.'),
    successRate: a.attacks > 0 ? Math.round((a.successes / a.attacks) * 100) : 0,
    attacks: a.attacks,
  }));

  // Cumulative risk over time
  const cumulativeRiskData = (() => {
    let cumRisk = 0;
    return (summary?.history || []).map((entry, i) => {
      cumRisk = Math.max(0, Math.min(100, cumRisk + (entry.risk_delta || 0)));
      return { round: i + 1, cumRisk, success: entry.success ? cumRisk : null, blocked: !entry.success ? cumRisk : null };
    });
  })();

  // Tactic category breakdown for research section
  const tacticCategories = {
    'Prompt Injection': ['direct_injection', 'nested_injection', 'instruction_override', 'delimiter_confusion', 'chain_of_thought_exploit'],
    'Context Attacks': ['context_hijack', 'role_confusion', 'memory_poisoning', 'false_authority'],
    'Privilege Escalation': ['admin_impersonation', 'token_forgery', 'sudo_injection', 'permission_bypass', 'multi_step_attack'],
    'Boundary Erosion': ['incremental_trust', 'semantic_drift', 'boundary_erosion', 'context_normalization', 'jailbreak_roleplay'],
    'Network Attacks': ['dns_spoofing', 'mitm_interception', 'traffic_injection', 'packet_sniffing', 'arp_poisoning'],
  };

  const categoryStats = Object.entries(tacticCategories).map(([category, tactics]) => {
    const relevant = (summary?.most_successful_tactics || []).filter(t => tactics.includes(t.tactic));
    const wins = relevant.reduce((s, t) => s + t.wins, 0);
    const total = relevant.reduce((s, t) => s + t.wins + t.losses, 0);
    return { category, wins, total, rate: total > 0 ? Math.round((wins / total) * 100) : 0 };
  });


      <div className="scan-overlay" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-900/30 bg-bg-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold glow-text tracking-widest">⚔ AEGISAI</span>
          <span className="text-xs text-gray-600">ANALYTICS DASHBOARD</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="text-xs text-gray-500 hover:text-cyber-cyan transition-colors tracking-wider"
          >
            ↻ REFRESH
          </button>
          <Link href="/batch" className="text-xs text-gray-500 hover:text-cyber-cyan tracking-wider">
            BATCH TEST
          </Link>
          <Link href="/agents" className="text-xs text-gray-500 hover:text-cyber-cyan tracking-wider">
            AGENTS
          </Link>
          <Link href="/attacks" className="text-xs text-gray-500 hover:text-red-400 tracking-wider">
            ATTACKS
          </Link>
          <Link href="/team" className="text-xs text-gray-500 hover:text-cyber-cyan tracking-wider">
            TEAM
          </Link>
          <Link href="/iot-lab" className="text-xs text-gray-500 hover:text-cyber-cyan tracking-wider">
            IOT LAB
          </Link>
          <Link href="/battle" className="text-xs text-cyber-red hover:text-red-400 tracking-wider">
            ← BATTLE
          </Link>
          <Link href="/" className="text-xs text-gray-600 hover:text-cyber-cyan tracking-wider">
            HOME
          </Link>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {loading && !summary && (
          <div className="text-center py-20 text-cyber-cyan animate-pulse tracking-widest">
            LOADING ANALYTICS…
          </div>
        )}

        {error && (
          <div className="cyber-panel rounded p-6 text-center" style={{ borderColor: '#FF000044' }}>
            <p className="text-red-400">⚠ Could not connect to backend: {error}</p>
            <p className="text-xs text-gray-600 mt-2">Make sure the backend is running on port 8000</p>
          </div>
        )}

        {summary && (
          <>
            {/* Stat badges */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <StatBadge label="Total Attacks" value={summary.total_attacks} color="#00FFFF" />
              <StatBadge label="Successful" value={summary.successful_attacks} color="#FF4444" />
              <StatBadge label="Blocked" value={summary.blocked_attacks} color="#00FF41" />
              <StatBadge
                label="Success Rate"
                value={`${Math.round(summary.success_rate * 100)}%`}
                color={summary.success_rate > 0.5 ? '#FF6600' : '#9B00FF'}
              />
            </motion.div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tactic success bar chart */}
              <motion.div
                className="cyber-panel rounded p-5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SectionHeader
                  title="TACTIC PERFORMANCE"
                  subtitle="Win/loss breakdown per attack tactic"
                />
                {tacticData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={tacticData} margin={{ top: 0, right: 10, bottom: 20, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#666', fontSize: 9 }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                      <Tooltip {...CYBER_TOOLTIP} />
                      <Bar dataKey="wins" fill="#FF4444" name="Wins" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="losses" fill="#224466" name="Losses" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-52 flex items-center justify-center text-gray-600 text-sm">
                    No data — run a simulation first
                  </div>
                )}
              </motion.div>

              {/* Target vulnerability */}
              <motion.div
                className="cyber-panel rounded p-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <SectionHeader
                  title="TARGET VULNERABILITY"
                  subtitle="Percentage of attacks that succeeded per device"
                />
                {targetData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={targetData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} unit="%" />
                      <YAxis dataKey="target" type="category" tick={{ fill: '#888', fontSize: 10 }} />
                      <Tooltip {...CYBER_TOOLTIP} formatter={(v) => `${v}%`} />
                      <Bar dataKey="vulnerability" fill="#9B00FF" name="Vuln %" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-52 flex items-center justify-center text-gray-600 text-sm">
                    No data — run a simulation first
                  </div>
                )}
              </motion.div>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline */}
              <motion.div
                className="cyber-panel rounded p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <SectionHeader
                  title="ATTACK TIMELINE"
                  subtitle="Risk delta and outcomes over rounds"
                />
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={timelineData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E" />
                      <XAxis dataKey="round" tick={{ fill: '#666', fontSize: 10 }} label={{ value: 'Round', position: 'insideBottom', fill: '#555', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                      <Tooltip {...CYBER_TOOLTIP} />
                      <Legend wrapperStyle={{ fontSize: 10, color: '#888' }} />
                      <Line type="monotone" dataKey="risk" stroke="#FF6600" dot={false} strokeWidth={2} name="Risk Δ" />
                      <Line type="monotone" dataKey="success" stroke="#00FF41" dot={false} strokeWidth={2} name="Success (1/0)" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-52 flex items-center justify-center text-gray-600 text-sm">
                    No history yet
                  </div>
                )}
              </motion.div>

              {/* Agent comparison radar */}
              <motion.div
                className="cyber-panel rounded p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <SectionHeader
                  title="AGENT PERFORMANCE"
                  subtitle="Success rate by agent"
                />
                {agentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={agentData}>
                      <PolarGrid stroke="#1A1A2E" />
                      <PolarAngleAxis dataKey="agent" tick={{ fill: '#888', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#555', fontSize: 9 }} />
                      <Radar name="Success %" dataKey="successRate" stroke="#00FFFF" fill="#00FFFF" fillOpacity={0.15} />
                      <Tooltip {...CYBER_TOOLTIP} formatter={(v) => `${v}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-52 flex items-center justify-center text-gray-600 text-sm">
                    No agent data yet
                  </div>
                )}
              </motion.div>
            </div>

            {/* Charts row 3: Cumulative risk + attack category breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cumulative risk progression */}
              <motion.div
                className="cyber-panel rounded p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <SectionHeader
                  title="CUMULATIVE RISK PROGRESSION"
                  subtitle="Running risk score over all recorded attacks"
                />
                {cumulativeRiskData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={cumulativeRiskData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FF4444" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E" />
                      <XAxis dataKey="round" tick={{ fill: '#666', fontSize: 10 }} label={{ value: 'Attack #', position: 'insideBottom', fill: '#555', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} />
                      <Tooltip {...CYBER_TOOLTIP} formatter={(v) => `${v}`} />
                      <Area type="monotone" dataKey="cumRisk" stroke="#FF4444" fill="url(#riskGrad)" strokeWidth={2} name="Risk Score" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-52 flex items-center justify-center text-gray-600 text-sm">No history yet</div>
                )}
              </motion.div>

              {/* Attack category effectiveness */}
              <motion.div
                className="cyber-panel rounded p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <SectionHeader
                  title="ATTACK CATEGORY EFFECTIVENESS"
                  subtitle="Bypass rate grouped by attack strategy"
                />
                {categoryStats.some(c => c.total > 0) ? (
                  <div className="space-y-3 mt-2">
                    {categoryStats.map((c) => (
                      <div key={c.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{c.category}</span>
                          <span style={{ color: c.rate > 50 ? '#FF4444' : c.rate > 25 ? '#FF8800' : '#00FF41' }}>
                            {c.rate}% bypass {c.total > 0 ? `(${c.wins}/${c.total})` : '(no data)'}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full" style={{ background: '#1A1A2E' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: c.rate > 50 ? '#FF4444' : c.rate > 25 ? '#FF8800' : '#00FF41',
                              boxShadow: `0 0 6px ${c.rate > 50 ? '#FF4444' : c.rate > 25 ? '#FF8800' : '#00FF41'}`,
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${c.rate}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-52 flex items-center justify-center text-gray-600 text-sm">Run a battle first</div>
                )}
              </motion.div>
            </div>

            {/* Research Metrics */}
            <motion.div
              className="cyber-panel rounded p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <SectionHeader title="RESEARCH METRICS" subtitle="LLM security robustness indicators for academic analysis" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="cyber-panel rounded p-3 text-center" style={{ borderColor: '#FF444444' }}>
                  <div className="text-xl font-bold text-red-400">
                    {summary.total_attacks > 0 ? Math.round(summary.success_rate * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">LLM Bypass Rate</div>
                </div>
                <div className="cyber-panel rounded p-3 text-center" style={{ borderColor: '#00FF4144' }}>
                  <div className="text-xl font-bold text-green-400">
                    {summary.total_attacks > 0 ? Math.round((1 - summary.success_rate) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Defense Rate</div>
                </div>
                <div className="cyber-panel rounded p-3 text-center" style={{ borderColor: '#00FFFF44' }}>
                  <div className="text-xl font-bold text-cyan-400">{summary.total_attacks}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Probes</div>
                </div>
                <div className="cyber-panel rounded p-3 text-center" style={{ borderColor: '#9B00FF44' }}>
                  <div className="text-xl font-bold" style={{ color: '#CC66FF' }}>
                    {summary.most_successful_tactics?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Tactic Variants</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 leading-relaxed border-t border-cyan-900/20 pt-3">
                <span className="text-cyan-400">Research Context: </span>
                This framework systematically tests LLM robustness against adversarial prompts in IoT contexts.
                A high bypass rate indicates the LLM is vulnerable to prompt injection, context manipulation, 
                or privilege escalation attacks. Adaptive agents exploit memory of prior successful tactics, 
                simulating real-world red-team learning behaviour.
                {' '}<Link href="/batch" className="text-purple-400 hover:underline">Run batch tests →</Link>
              </div>
            </motion.div>

            {/* Recent history table */}
            <motion.div
              className="cyber-panel rounded p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SectionHeader title="RECENT ATTACK LOG" subtitle="Last 20 recorded attacks" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-cyan-900/30 text-gray-600 tracking-wider">
                      <th className="text-left py-2 pr-4">#</th>
                      <th className="text-left py-2 pr-4">AGENT</th>
                      <th className="text-left py-2 pr-4">TARGET</th>
                      <th className="text-left py-2 pr-4">TACTIC</th>
                      <th className="text-left py-2 pr-4">RESULT</th>
                      <th className="text-left py-2">RISK Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.history || []).map((entry, i) => (
                      <tr key={i} className="border-b border-cyan-900/10 hover:bg-white/5 transition-colors">
                        <td className="py-1.5 pr-4 text-gray-600">{i + 1}</td>
                        <td className="py-1.5 pr-4" style={{ color: getAgentColor(entry.agent) }}>
                          {entry.agent}
                        </td>
                        <td className="py-1.5 pr-4 text-cyan-300">{entry.target}</td>
                        <td className="py-1.5 pr-4 text-gray-400">{entry.tactic?.replace(/_/g, ' ')}</td>
                        <td className="py-1.5 pr-4">
                          <span
                            className="px-2 py-0.5 rounded-sm text-xs"
                            style={{
                              color: entry.success ? '#00FF41' : '#FF4444',
                              background: entry.success ? '#00FF4111' : '#FF000011',
                              border: `1px solid ${entry.success ? '#00FF4133' : '#FF000033'}`,
                            }}
                          >
                            {entry.success ? 'BREACH' : 'BLOCKED'}
                          </span>
                        </td>
                        <td
                          className="py-1.5"
                          style={{ color: entry.risk_delta > 0 ? '#FF6600' : '#00FF41' }}
                        >
                          {entry.risk_delta > 0 ? `+${entry.risk_delta}` : entry.risk_delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!summary.history || summary.history.length === 0) && (
                  <div className="text-center py-8 text-gray-600 text-sm">No attacks recorded yet</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}

function getAgentColor(name) {
  const map = {
    ShadowInjector: '#FF4444',
    ContextPhantom: '#CC66FF',
    PrivilegeReaper: '#FF8800',
    SilentEscalator: '#00FFFF',
    NetworkPhantom: '#00FF88',
  };
  return map[name] || '#AAAAAA';
}
