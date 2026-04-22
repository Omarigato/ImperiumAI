/**
 * Batch Battles — AegisAI
 * Run multiple independent battle simulations and compare results statistically.
 */
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CYBER_TOOLTIP = {
  contentStyle: { background: '#0F0F1A', border: '1px solid #1A1A2E', color: '#E0E0E0', fontFamily: 'monospace' },
  itemStyle: { color: '#00FFFF' },
  labelStyle: { color: '#9B00FF' },
};

function StatBadge({ label, value, color, sub }) {
  return (
    <motion.div
      className="cyber-panel rounded p-4 text-center"
      style={{ borderColor: color + '44' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="text-2xl font-bold" style={{ color, textShadow: `0 0 10px ${color}` }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1 tracking-wider uppercase">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

export default function BatchPage() {
  const [count, setCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const runBatch = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    setProgress(0);

    // Simulate progress ticks while waiting
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 600);

    try {
      const res = await fetch(`${API}/api/batch-battles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data);
      setProgress(100);
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(progressInterval);
      setRunning(false);
    }
  };

  const battleChartData = results?.battles?.map(b => ({
    name: `Battle ${b.battle}`,
    risk: b.final_risk,
    redWins: b.red_wins,
    blocks: b.defense_wins,
    rounds: b.rounds,
  })) || [];

  const pieData = results ? [
    { name: 'Red Team Wins', value: results.summary.red_team_wins, color: '#FF4444' },
    { name: 'Defense Wins', value: results.summary.defense_wins, color: '#00FF41' },
  ] : [];

  return (
    <div className="min-h-screen bg-bg-dark grid-bg text-white font-mono page-scroll">
      <div className="scan-overlay" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-900/30 bg-bg-panel/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold glow-text tracking-widest">⚔ AEGISAI</span>
          <span className="text-xs text-gray-600">BATCH BATTLE TESTING</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/battle" className="text-xs text-cyber-red hover:text-red-400 tracking-wider">BATTLE</Link>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-cyber-cyan tracking-wider">ANALYTICS</Link>
          <Link href="/" className="text-xs text-gray-600 hover:text-cyber-cyan tracking-wider">HOME</Link>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Intro */}
        <motion.div
          className="cyber-panel rounded p-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-sm font-bold tracking-widest glow-text mb-2">BATCH SIMULATION RUNNER</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Run multiple independent battle simulations to gather statistically significant results.
            Each battle uses adaptive agents that learn from prior attacks, demonstrating how LLM defenses
            hold up under repeated adversarial pressure. Use this for academic benchmarking.
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="cyber-panel rounded p-5 flex flex-wrap items-center gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 tracking-wider">NUMBER OF BATTLES:</label>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className="btn-cyber px-3 py-1.5 rounded text-xs tracking-wider"
                  style={{
                    color: count === n ? '#0A0A0F' : '#00FFFF',
                    backgroundColor: count === n ? '#00FFFF' : 'transparent',
                    border: `1px solid ${count === n ? '#00FFFF' : '#00FFFF44'}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            onClick={runBatch}
            disabled={running}
            className="btn-cyber py-2.5 px-6 rounded text-sm font-bold tracking-widest"
            style={{
              color: running ? '#555' : '#0A0A0F',
              backgroundColor: running ? '#1A1A2E' : '#FF2222',
              border: `1px solid ${running ? '#333' : '#FF2222'}`,
              boxShadow: running ? 'none' : '0 0 14px #FF222266',
              cursor: running ? 'not-allowed' : 'pointer',
            }}
            whileHover={!running ? { scale: 1.03 } : {}}
            whileTap={!running ? { scale: 0.97 } : {}}
          >
            {running ? `⏳ RUNNING ${count} BATTLES…` : `▶ RUN ${count} BATTLES`}
          </motion.button>

          {running && (
            <div className="flex-1 min-w-48">
              <div className="text-xs text-gray-600 mb-1 tracking-wider">PROGRESS</div>
              <div className="w-full h-2 rounded-full" style={{ background: '#1A1A2E' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #FF2222, #FF8800)', boxShadow: '0 0 8px #FF222266' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {error && (
          <div className="cyber-panel rounded p-4 text-sm" style={{ borderColor: '#FF000044', color: '#FF4444' }}>
            ⚠ {error} — Make sure the backend is running on port 8000
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Summary badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBadge label="Battles Run" value={results.summary.total} color="#00FFFF" />
                <StatBadge
                  label="Red Team Wins"
                  value={results.summary.red_team_wins}
                  color="#FF4444"
                  sub={`${Math.round(results.summary.red_win_rate * 100)}% win rate`}
                />
                <StatBadge
                  label="Defense Wins"
                  value={results.summary.defense_wins}
                  color="#00FF41"
                  sub={`${Math.round((1 - results.summary.red_win_rate) * 100)}% hold rate`}
                />
                <StatBadge
                  label="Avg Final Risk"
                  value={`${results.summary.avg_final_risk}`}
                  color={results.summary.avg_final_risk > 60 ? '#FF6600' : '#00FF41'}
                  sub="/ 100"
                />
              </div>

              {/* LLM provider badge */}
              <div className="cyber-panel rounded p-4 text-sm text-center" style={{ borderColor: '#4285F444' }}>
                <span className="text-gray-500 tracking-wider">DEFENDER LLM: </span>
                <span className="text-cyan-300 font-bold tracking-widest">
                  {results.summary.llm_provider?.toUpperCase() || 'SIMULATION'}
                </span>
                <span className="text-gray-500"> · Avg rounds per battle: </span>
                <span className="text-yellow-400 font-bold">{results.summary.avg_rounds}</span>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Risk per battle */}
                <div className="cyber-panel rounded p-5">
                  <div className="text-sm font-bold tracking-widest glow-text mb-1">FINAL RISK PER BATTLE</div>
                  <div className="text-xs text-gray-600 mb-4">Risk score at end of each battle</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={battleChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E" />
                      <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} />
                      <Tooltip {...CYBER_TOOLTIP} />
                      <Bar dataKey="risk" name="Risk Score" radius={[2, 2, 0, 0]}>
                        {battleChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.risk > 60 ? '#FF4444' : entry.risk > 30 ? '#FF8800' : '#00FF41'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Win/loss pie */}
                <div className="cyber-panel rounded p-5">
                  <div className="text-sm font-bold tracking-widest glow-text mb-1">WIN DISTRIBUTION</div>
                  <div className="text-xs text-gray-600 mb-4">Red team vs defense victories</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0 0 6px ${entry.color})` }} />
                        ))}
                      </Pie>
                      <Tooltip {...CYBER_TOOLTIP} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Wins/blocks per battle bar */}
              <div className="cyber-panel rounded p-5">
                <div className="text-sm font-bold tracking-widest glow-text mb-1">ATTACK OUTCOMES PER BATTLE</div>
                <div className="text-xs text-gray-600 mb-4">Breaches vs blocked attacks per battle</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={battleChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A2E" />
                    <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                    <Tooltip {...CYBER_TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#888' }} />
                    <Bar dataKey="redWins" name="Breaches" fill="#FF4444" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="blocks" name="Blocked" fill="#00FF41" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Per-battle table */}
              <div className="cyber-panel rounded p-5">
                <div className="text-sm font-bold tracking-widest glow-text mb-1">BATTLE-BY-BATTLE BREAKDOWN</div>
                <div className="text-xs text-gray-600 mb-3">Individual battle results</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-cyan-900/30 text-gray-600 tracking-wider">
                        <th className="text-left py-2 pr-4">BATTLE</th>
                        <th className="text-left py-2 pr-4">WINNER</th>
                        <th className="text-left py-2 pr-4">ROUNDS</th>
                        <th className="text-left py-2 pr-4">BREACHES</th>
                        <th className="text-left py-2 pr-4">BLOCKED</th>
                        <th className="text-left py-2">FINAL RISK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.battles.map((b) => (
                        <tr key={b.battle} className="border-b border-cyan-900/10 hover:bg-white/5">
                          <td className="py-1.5 pr-4 text-gray-500">#{b.battle}</td>
                          <td className="py-1.5 pr-4">
                            <span style={{
                              color: b.winner === 'red_team' ? '#FF4444' : '#00FF41',
                              textShadow: `0 0 6px ${b.winner === 'red_team' ? '#FF4444' : '#00FF41'}`,
                            }}>
                              {b.winner === 'red_team' ? '🔥 RED TEAM' : '🛡 DEFENSE'}
                            </span>
                          </td>
                          <td className="py-1.5 pr-4 text-cyan-300">{b.rounds}</td>
                          <td className="py-1.5 pr-4 text-red-400">{b.red_wins}</td>
                          <td className="py-1.5 pr-4 text-green-400">{b.defense_wins}</td>
                          <td className="py-1.5" style={{ color: b.final_risk > 60 ? '#FF6600' : '#00FF41' }}>
                            {b.final_risk}/100
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Academic insight */}
              <div className="cyber-panel rounded p-5" style={{ borderColor: '#9B00FF44' }}>
                <div className="text-xs font-bold tracking-widest text-purple-400 mb-2">📊 RESEARCH INTERPRETATION</div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  {results.summary.red_win_rate > 0.7
                    ? `High red team win rate (${Math.round(results.summary.red_win_rate * 100)}%) suggests the LLM defender is highly vulnerable to the tested attack vectors. The adaptive agents exploit memory of successful tactics, progressively improving their bypass strategies across battles.`
                    : results.summary.red_win_rate > 0.4
                    ? `Moderate vulnerability detected (${Math.round(results.summary.red_win_rate * 100)}% bypass rate). The LLM shows partial resistance but can be overcome with persistent adversarial pressure or specific tactic combinations.`
                    : `Strong defense performance (${Math.round((1 - results.summary.red_win_rate) * 100)}% block rate). The LLM maintains robust policy adherence under repeated adversarial attacks. Consider testing with harder tactic variants.`
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!results && !running && (
          <div className="text-center py-12 text-gray-600 text-sm tracking-wider">
            Configure and run batch simulations to see statistical results here
          </div>
        )}
      </main>
    </div>
  );
}
