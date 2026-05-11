import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import {
  Play, RotateCcw, Shield, RefreshCcw, AlertTriangle, Skull, Activity, Zap,
} from 'lucide-react';
import NavBar from '../components/NavBar';
import AgentAvatar from '../components/AgentAvatar';
import RiskMeter from '../components/RiskMeter';
import LiveLogs from '../components/LiveLogs';
import BattleResult from '../components/BattleResult';
import LLMSwitcher from '../components/LLMSwitcher';
import wsService from '../services/websocket';

const SmartHome3D = dynamic(() => import('../components/SmartHome3D'), { ssr: false });

const AGENTS_META = [
  { name: 'ShadowInjector',  color: '#FF453A', description: 'Prompt injection master' },
  { name: 'ContextPhantom',  color: '#BF5AF2', description: 'Context manipulation' },
  { name: 'PrivilegeReaper', color: '#FF9F0A', description: 'Privilege escalation' },
  { name: 'SilentEscalator', color: '#00E5FF', description: 'Stealthy boundary erosion' },
  { name: 'NetworkPhantom',  color: '#32D74B', description: 'Network-layer MITM' },
];

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function BattlePage() {
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(0);
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('safe');
  const [riskDelta, setRiskDelta] = useState(0);
  const [deviceStates, setDeviceStates] = useState({});
  const [activeAgent, setActiveAgent] = useState(null);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [activeAttack, setActiveAttack] = useState(null);
  const [defendedTargets, setDefendedTargets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [battleResult, setBattleResult] = useState(null);
  const [lastPrompt, setLastPrompt] = useState(null);
  const [lastRound, setLastRound] = useState(null);   // last completed round summary
  const [activeProvider, setActiveProvider] = useState('simulation');
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldRoundsLeft, setShieldRoundsLeft] = useState(0);
  const [shieldCooldown, setShieldCooldown] = useState(false);
  const [riskResetting, setRiskResetting] = useState(false);
  const [stats, setStats] = useState({ red: 0, defense: 0, breaches: 0 });
  const logIdRef = useRef(0);

  const addLog = useCallback((source, message, level = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    logIdRef.current += 1;
    setLogs((prev) => [...prev.slice(-249), { id: logIdRef.current, source, message, level, time }]);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    wsService.connect();

    const unsubs = [
      wsService.on('connected', () => { setConnected(true); addLog('System', 'Connected to AegisAI backend'); }),
      wsService.on('disconnected', () => { setConnected(false); addLog('System', 'Reconnecting…'); }),

      wsService.on('attack_launched', (data) => {
        setActiveAgent(data.agent);
        setRound((r) => data.round || r);
        if (data.prompt) {
          setLastPrompt({ agent: data.agent, tactic: data.tactic, target: data.target, text: data.prompt });
        }
        setAgentStatuses((prev) => ({
          ...Object.fromEntries(Object.keys(prev).map((k) => [k, 'IDLE'])),
          [data.agent]: 'CHARGING',
        }));
        addLog('AttackAgent', `${data.agent} → [${data.tactic}] targeting ${data.target}`);
        setTimeout(() => {
          setAgentStatuses((prev) => ({ ...prev, [data.agent]: 'ATTACKING' }));
          setActiveAttack({ target: data.target, tactic: data.tactic, agent: data.agent, success: null });
        }, 500);
      }),

      wsService.on('llm_response', (data) => {
        const provider = data.provider || 'llm';
        addLog(`LLM[${provider.toUpperCase()}]`,
          `action=${data.action} authorized=${data.authorized} — ${data.reasoning?.substring(0, 100)}`);
        setActiveProvider(provider);
      }),

      wsService.on('llm_switched', (data) => {
        setActiveProvider(data.provider);
        addLog('System', `LLM switched to ${data.provider.toUpperCase()}`);
      }),

      wsService.on('policy_check', (data) => {
        if (data.bypassed) {
          addLog('Policy', `⚠ STEALTH BYPASS — ${data.violations[0]}`, 'warning');
        } else if (data.violations?.length > 0) {
          addLog('Policy', `BLOCKED [${data.severity}]: ${data.violations[0]}`, 'warning');
        } else {
          addLog('Policy', 'No violations — action permitted');
        }
      }),

      wsService.on('iot_result', (data) => {
        if (data.device_states) setDeviceStates(data.device_states);
        addLog('IoT', `${data.target}: ${data.message}`);
        const success = data.success;
        setActiveAttack((prev) => (prev ? { ...prev, success } : null));
        if (!success) {
          setDefendedTargets((prev) => [...new Set([...prev, data.target])]);
          setTimeout(() => setDefendedTargets((prev) => prev.filter((t) => t !== data.target)), 2000);
        }
        setTimeout(() => setActiveAttack(null), 1500);
      }),

      wsService.on('risk_update', (data) => {
        setRiskScore(data.score);
        setRiskLevel(data.level);
        setRiskDelta(data.delta);
        addLog('RiskEngine', `Score=${data.score} (${data.level}) Δ${data.delta > 0 ? '+' : ''}${data.delta}`);
      }),

      wsService.on('round_complete', (data) => {
        setRound(data.round);
        setLastRound({
          round: data.round,
          agent: data.agent,
          target: data.target,
          tactic: data.tactic,
          success: data.attack_success,
          risk_score: data.risk_score,
          risk_level: data.risk_level,
          llm_provider: data.llm_provider,
        });
        const status = data.attack_success ? 'BREACH' : 'BLOCKED';
        setAgentStatuses((prev) => ({ ...prev, [data.agent]: status }));
        setStats((prev) => ({
          red: prev.red + (data.attack_success ? 1 : 0),
          defense: prev.defense + (data.attack_success ? 0 : 1),
          breaches: prev.breaches + (data.attack_success ? 1 : 0),
        }));
        setTimeout(() => {
          setAgentStatuses((prev) => ({ ...prev, [data.agent]: 'IDLE' }));
          setActiveAgent(null);
        }, 1200);
      }),

      wsService.on('battle_end', (data) => {
        setRunning(false);
        setBattleResult(data);
        addLog('System', `🏁 Battle over — ${data.winner === 'red_team' ? 'RED TEAM WINS' : 'DEFENSE WINS'}`);
      }),

      wsService.on('log', (data) => addLog(data.source || 'System', data.message, data.level)),

      wsService.on('reset', (data) => {
        if (data.device_states) setDeviceStates(data.device_states);
        setShieldActive(false);
        setShieldRoundsLeft(0);
        addLog('System', 'Simulation reset');
      }),

      wsService.on('shield_activated', (data) => {
        setShieldActive(true);
        setShieldRoundsLeft(data.rounds_left || 3);
        addLog('Defense', `🛡 SHIELD RAISED — ${data.rounds_left || 3} rounds`, 'warning');
      }),

      wsService.on('shield_active', (data) => {
        setShieldRoundsLeft(data.rounds_left || 0);
      }),

      wsService.on('shield_expired', () => {
        setShieldActive(false);
        setShieldRoundsLeft(0);
        addLog('Defense', '🔓 Shield expired', 'warning');
      }),
    ];

    return () => { unsubs.forEach((fn) => fn()); wsService.disconnect(); };
  }, [addLog]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const startSimulation = async () => {
    try {
      setBattleResult(null);
      setRound(0);
      setRiskScore(0);
      setRiskLevel('safe');
      setRiskDelta(0);
      setLogs([]);
      setAgentStatuses({});
      setLastRound(null);
      setStats({ red: 0, defense: 0, breaches: 0 });
      const res = await fetch(`${API}/api/start-simulation`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'started') {
        setRunning(true);
        if (data.llm_provider) setActiveProvider(data.llm_provider);
        addLog('System', `Battle started! Defender: ${(data.llm_provider || 'sim').toUpperCase()}`);
      } else {
        addLog('System', data.message || 'Could not start');
      }
    } catch {
      addLog('System', 'Error connecting to backend', 'error');
    }
  };

  const resetSimulation = async () => {
    try {
      await fetch(`${API}/api/reset`, { method: 'POST' });
      setRunning(false);
      setBattleResult(null);
      setRound(0);
      setRiskScore(0);
      setRiskLevel('safe');
      setRiskDelta(0);
      setActiveAgent(null);
      setActiveAttack(null);
      setAgentStatuses({});
      setLogs([]);
      setLastPrompt(null);
      setLastRound(null);
      setStats({ red: 0, defense: 0, breaches: 0 });
    } catch {
      addLog('System', 'Reset failed', 'error');
    }
  };

  const handlePlayAgain = async () => { await resetSimulation(); await startSimulation(); };

  const handleRaiseShield = async () => {
    if (shieldCooldown || !running) return;
    try {
      await fetch(`${API}/api/defense/shield`, { method: 'POST' });
      setShieldCooldown(true);
      setTimeout(() => setShieldCooldown(false), 12000);
    } catch { addLog('System', 'Shield failed', 'error'); }
  };

  const handleResetRisk = async () => {
    if (riskResetting || !running) return;
    try {
      setRiskResetting(true);
      await fetch(`${API}/api/defense/reset-risk`, { method: 'POST' });
      setTimeout(() => setRiskResetting(false), 8000);
    } catch { addLog('System', 'Countermeasures failed', 'error'); }
  };

  return (
    <div className="wv" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <NavBar live={connected} currentRound={round} />

      {/* ── Top control bar (single row, compact) ─────────────────────── */}
      <div style={{
        flex: '0 0 auto',
        padding: '10px 24px',
        borderBottom: '1px solid var(--wv-border)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: 'var(--wv-bg)',
        overflow: 'hidden',
      }}>
        <button
          onClick={startSimulation}
          disabled={running}
          className={`wv-btn ${running ? 'wv-btn-ghost' : 'wv-btn-primary'} wv-btn-sm`}
          style={{ minWidth: 150, flex: '0 0 auto' }}
        >
          <Play size={13} strokeWidth={2.5} />
          {running ? 'In progress…' : 'Start Battle'}
        </button>
        <button onClick={resetSimulation} className="wv-btn wv-btn-ghost wv-btn-sm" style={{ flex: '0 0 auto' }}>
          <RotateCcw size={13} />
          Reset
        </button>
        <button
          onClick={handleRaiseShield}
          disabled={!running || shieldCooldown || shieldActive}
          className={`wv-btn ${shieldActive ? 'wv-btn-success' : 'wv-btn-ghost'} wv-btn-sm`}
          style={{ flex: '0 0 auto' }}
        >
          <Shield size={13} />
          {shieldActive ? `Shield · ${shieldRoundsLeft}r` : shieldCooldown ? 'Cooldown' : 'Shield'}
        </button>
        <button
          onClick={handleResetRisk}
          disabled={!running || riskResetting}
          className="wv-btn wv-btn-outline wv-btn-sm"
          style={{ flex: '0 0 auto' }}
        >
          <RefreshCcw size={13} />
          {riskResetting ? 'Deploying…' : 'Counter'}
        </button>

        <div style={{ flex: 1, minWidth: 8 }} />

        {/* KPI badges */}
        <span className="wv-badge" style={{ flex: '0 0 auto' }}>R <span className="wv-mono" style={{ color: 'var(--wv-cyan)', marginLeft: 4 }}>{round}</span></span>
        <span className="wv-badge wv-badge-red" style={{ flex: '0 0 auto' }}>BREACH <span className="wv-mono" style={{ marginLeft: 4 }}>{stats.breaches}</span></span>
        <span className="wv-badge wv-badge-green" style={{ flex: '0 0 auto' }}>BLOCK <span className="wv-mono" style={{ marginLeft: 4 }}>{stats.defense}</span></span>
      </div>

      {/* ── LLM provider strip (separate row, scrollable on small screens) ─ */}
      <div style={{
        flex: '0 0 auto',
        padding: '8px 24px',
        borderBottom: '1px solid var(--wv-border)',
        background: 'var(--wv-surface)',
        overflowX: 'auto',
      }}>
        <LLMSwitcher activeProvider={activeProvider} onSwitch={setActiveProvider} />
      </div>

      {/* ── Main resizable layout ──────────────────────────────────────── */}
      <div style={{ flex: '1 1 0', minHeight: 0, minWidth: 0, display: 'flex', position: 'relative' }}>
        <PanelGroup orientation="horizontal" style={{ flex: 1, height: '100%', width: '100%' }}>
          {/* LEFT — Agent list */}
          <Panel defaultSize={20} minSize={12} maxSize={35} style={{ overflow: 'hidden' }}>
            <AgentsPanel
              agents={AGENTS_META}
              agentStatuses={agentStatuses}
              activeAgent={activeAgent}
            />
          </Panel>

          <PanelResizeHandle className="wv-resizer" />

          {/* CENTER — 3D + risk + last round */}
          <Panel defaultSize={54} minSize={30} style={{ overflow: 'hidden' }}>
            <PanelGroup orientation="vertical" style={{ height: '100%', width: '100%' }}>
              {/* 3D scene */}
              <Panel defaultSize={66} minSize={30} style={{ overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: '100%', background: 'var(--wv-bg)' }}>
                  <SmartHome3D
                    deviceStates={deviceStates}
                    activeAttack={activeAttack}
                    defendedTargets={defendedTargets}
                    activeAgent={activeAgent}
                    agentsMeta={AGENTS_META}
                    shieldActive={shieldActive}
                  />
                  {/* Active attack overlay */}
                  <AnimatePresence>
                    {activeAttack && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="wv-card"
                        style={{
                          position: 'absolute',
                          top: 16,
                          left: 16,
                          maxWidth: 380,
                          padding: 14,
                          background: 'rgba(30, 30, 30, 0.92)',
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <div className="wv-eyebrow" style={{ marginBottom: 6 }}>
                          <Skull size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                          Active attack
                        </div>
                        <div className="wv-h4" style={{ color: 'var(--wv-red)' }}>
                          {activeAttack.agent} → {activeAttack.target}
                        </div>
                        <div className="wv-body" style={{ marginTop: 4, fontSize: 12 }}>
                          tactic: <span className="wv-mono" style={{ color: 'var(--wv-cyan)' }}>{activeAttack.tactic}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Panel>

              <PanelResizeHandle className="wv-resizer wv-resizer-h" />

              {/* Risk + Last round */}
              <Panel defaultSize={34} minSize={18} style={{ overflow: 'hidden' }}>
                <div style={{ height: '100%', padding: 12, display: 'flex', gap: 12, overflow: 'hidden' }}>
                  <div className="wv-card" style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column' }}>
                    <div className="wv-eyebrow" style={{ marginBottom: 8 }}>
                      <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                      Risk Level
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RiskMeter score={riskScore} level={riskLevel} delta={riskDelta} compact />
                    </div>
                  </div>

                  <div className="wv-card" style={{ flex: 1, overflow: 'auto' }}>
                    <div className="wv-eyebrow" style={{ marginBottom: 10 }}>
                      <Activity size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                      Last Round
                    </div>
                    {!lastRound && <div className="wv-body">Waiting for round to complete…</div>}
                    {lastRound && <RoundDetail round={lastRound} prompt={lastPrompt} />}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="wv-resizer" />

          {/* RIGHT — Live logs */}
          <Panel defaultSize={26} minSize={15} maxSize={45} style={{ overflow: 'hidden' }}>
            <div style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div className="wv-eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={11} />
                Live Logs
                {connected && <span className="wv-live-dot" style={{ marginLeft: 'auto' }} />}
              </div>
              <div className="wv-card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex' }}>
                <LiveLogs logs={logs} />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Battle result overlay */}
      <AnimatePresence>
        {battleResult && (
          <BattleResult result={battleResult} onPlayAgain={handlePlayAgain} onClose={() => setBattleResult(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function AgentsPanel({ agents, agentStatuses, activeAgent }) {
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      <div className="wv-eyebrow" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Skull size={11} />
        Red Team
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {agents.map((agent) => {
          const status = agentStatuses[agent.name] || 'IDLE';
          const isActive = activeAgent === agent.name;
          const statusColor =
            status === 'BREACH'    ? 'var(--wv-red)' :
            status === 'BLOCKED'   ? 'var(--wv-green)' :
            status === 'ATTACKING' ? 'var(--wv-orange)' :
            status === 'CHARGING'  ? 'var(--wv-cyan)' :
            'var(--wv-text-3)';
          return (
            <div
              key={agent.name}
              className="wv-card"
              style={{
                padding: 12,
                borderColor: isActive ? agent.color : 'var(--wv-border)',
                boxShadow: isActive ? `0 0 0 1px ${agent.color}, 0 4px 24px ${agent.color}33` : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${agent.color}22`,
                  border: `1px solid ${agent.color}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 36px',
                }}>
                  <Skull size={16} color={agent.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="wv-h4" style={{ fontSize: 13, color: agent.color }}>{agent.name}</div>
                  <div className="wv-body" style={{ fontSize: 11, marginTop: 2 }}>{agent.description}</div>
                </div>
              </div>
              <div style={{
                marginTop: 8,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: statusColor,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                {status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundDetail({ round, prompt }) {
  const success = round.success;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="wv-badge wv-badge-cyan">R{round.round}</span>
        <span className="wv-h4" style={{ color: 'var(--wv-text)' }}>{round.agent}</span>
        <span className="wv-body" style={{ fontSize: 12 }}>→ {round.target}</span>
        {success ? (
          <span className="wv-badge wv-badge-red" style={{ marginLeft: 'auto' }}>BREACH</span>
        ) : (
          <span className="wv-badge wv-badge-green" style={{ marginLeft: 'auto' }}>BLOCKED</span>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <Stat label="Tactic"   value={round.tactic} />
        <Stat label="LLM"      value={round.llm_provider?.toUpperCase()} />
        <Stat label="Risk"     value={round.risk_score} tone={round.risk_level === 'critical' || round.risk_level === 'breach' ? 'red' : round.risk_level === 'safe' ? 'green' : 'cyan'} />
        <Stat label="Level"    value={round.risk_level} tone={round.risk_level === 'safe' ? 'green' : round.risk_level === 'breach' ? 'red' : 'cyan'} />
      </div>

      {/* Prompt */}
      {prompt && (
        <div style={{
          background: 'var(--wv-bg)',
          border: '1px solid var(--wv-border)',
          borderRadius: 10,
          padding: 12,
        }}>
          <div className="wv-eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>Attack prompt</div>
          <div style={{
            font: '400 11px/1.6 "JetBrains Mono", monospace',
            color: 'var(--wv-text-2)',
            maxHeight: 80,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {prompt.text.slice(0, 400)}{prompt.text.length > 400 ? '…' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'cyan' }) {
  const color = tone === 'red' ? 'var(--wv-red)' : tone === 'green' ? 'var(--wv-green)' : 'var(--wv-cyan)';
  return (
    <div style={{
      padding: 8,
      background: 'var(--wv-bg)',
      border: '1px solid var(--wv-border)',
      borderRadius: 8,
    }}>
      <div className="wv-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div className="wv-mono" style={{ color, fontWeight: 600, fontSize: 12 }}>{value || '—'}</div>
    </div>
  );
}


