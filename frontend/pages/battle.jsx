import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import AgentAvatar from '../components/AgentAvatar';
import RiskMeter from '../components/RiskMeter';
import LiveLogs from '../components/LiveLogs';
import BattleResult from '../components/BattleResult';
import LLMSwitcher from '../components/LLMSwitcher';
import wsService from '../services/websocket';

const SmartHome3D = dynamic(() => import('../components/SmartHome3D'), { ssr: false });

const AGENTS_META = [
  { name: 'ShadowInjector', color: '#FF2222', description: 'Prompt injection master' },
  { name: 'ContextPhantom', color: '#9B00FF', description: 'Context manipulation' },
  { name: 'PrivilegeReaper', color: '#FF6600', description: 'Privilege escalation' },
  { name: 'SilentEscalator', color: '#00FFFF', description: 'Stealthy boundary erosion' },
  { name: 'NetworkPhantom', color: '#00FF88', description: 'Network-layer MITM' },
];
const MAX_TICKER_ITEMS = 4;

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
  const [lastAttack, setLastAttack] = useState(null);
  const [lastPrompt, setLastPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [activeProvider, setActiveProvider] = useState('simulation');
  const [attackTicker, setAttackTicker] = useState([]);
  // "thought bubble" shown above the 3D scene
  const [thoughtBubble, setThoughtBubble] = useState(null);
  // Interactive defense
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldRoundsLeft, setShieldRoundsLeft] = useState(0);
  const [shieldCooldown, setShieldCooldown] = useState(false);
  const [riskResetting, setRiskResetting] = useState(false);
  const logIdRef = useRef(0);

  const addLog = useCallback((source, message, level = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    logIdRef.current += 1;
    setLogs(prev => [...prev.slice(-149), { id: logIdRef.current, source, message, level, time }]);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    wsService.connect();

    const unsubs = [
      wsService.on('connected', () => { setConnected(true); addLog('System', 'Connected to AegisAI backend'); }),
      wsService.on('disconnected', () => { setConnected(false); addLog('System', 'Reconnecting…'); }),

      wsService.on('attack_launched', data => {
        setActiveAgent(data.agent);
        setRound(r => data.round || r);
        if (data.prompt) {
          setLastPrompt({ agent: data.agent, tactic: data.tactic, target: data.target, text: data.prompt });
          // Show thought bubble: the attack prompt preview
          setThoughtBubble({ agent: data.agent, tactic: data.tactic, target: data.target, text: data.prompt.slice(0, 120) + '…' });
          setTimeout(() => setThoughtBubble(null), 4500);
        }
        setAgentStatuses(prev => ({
          ...Object.fromEntries(Object.keys(prev).map(k => [k, 'IDLE'])),
          [data.agent]: 'CHARGING',
        }));
        addLog('AttackAgent', `${data.agent} → [${data.tactic}] targeting ${data.target}`);
        setAttackTicker(prev => [...prev.slice(-MAX_TICKER_ITEMS), { id: `${Date.now()}-${data.agent}`, agent: data.agent, tactic: data.tactic, target: data.target }]);
        setTimeout(() => {
          setAgentStatuses(prev => ({ ...prev, [data.agent]: 'ATTACKING' }));
          setActiveAttack({ target: data.target, success: null });
        }, 500);
      }),

      wsService.on('llm_response', data => {
        const provider = data.provider || 'llm';
        addLog(`LLM[${provider.toUpperCase()}]`,
          `action=${data.action} authorized=${data.authorized} — ${data.reasoning?.substring(0, 100)}`);
        setActiveProvider(provider);
      }),

      wsService.on('llm_switched', data => {
        setActiveProvider(data.provider);
        addLog('System', `LLM switched to ${data.provider.toUpperCase()}`);
      }),

      wsService.on('policy_check', data => {
        if (data.violations?.length > 0)
          addLog('Policy', `⚠ BLOCKED [${data.severity}]: ${data.violations[0]}`, 'warning');
        else
          addLog('Policy', 'No violations — action permitted');
      }),

      wsService.on('iot_result', data => {
        if (data.device_states) setDeviceStates(data.device_states);
        addLog('IoT', `${data.target}: ${data.message}`);
        const success = data.success;
        setActiveAttack(prev => prev ? { ...prev, success } : null);
        setLastAttack({ success, target: data.target });
        if (!success) {
          setDefendedTargets(prev => [...new Set([...prev, data.target])]);
          setTimeout(() => setDefendedTargets(prev => prev.filter(t => t !== data.target)), 2000);
        }
        setTimeout(() => { setActiveAttack(null); }, 1500);
      }),

      wsService.on('risk_update', data => {
        setRiskScore(data.score);
        setRiskLevel(data.level);
        setRiskDelta(data.delta);
        addLog('RiskEngine', `Score=${data.score} (${data.level}) Δ${data.delta > 0 ? '+' : ''}${data.delta}`);
      }),

      wsService.on('round_complete', data => {
        setRound(data.round);
        const status = data.attack_success ? 'ATTACKING' : 'BLOCKED';
        setAgentStatuses(prev => ({ ...prev, [data.agent]: status }));
        setTimeout(() => {
          setAgentStatuses(prev => ({ ...prev, [data.agent]: 'IDLE' }));
          setActiveAgent(null);
        }, 1200);
      }),

      wsService.on('battle_end', data => {
        setRunning(false);
        setBattleResult(data);
        addLog('System', `🏁 Battle over — ${data.winner === 'red_team' ? '🔥 RED TEAM WINS' : '🛡 DEFENSE WINS'}`);
      }),

      wsService.on('log', data => addLog(data.source || 'System', data.message, data.level)),

      wsService.on('reset', data => {
        if (data.device_states) setDeviceStates(data.device_states);
        setShieldActive(false); setShieldRoundsLeft(0);
        addLog('System', 'Simulation reset');
      }),

      wsService.on('shield_activated', data => {
        setShieldActive(true);
        setShieldRoundsLeft(data.rounds_left || 3);
        addLog('Defense', `🛡 SHIELD RAISED — ${data.rounds_left || 3} rounds of protection`, 'warning');
      }),

      wsService.on('shield_active', data => {
        setShieldRoundsLeft(data.rounds_left || 0);
      }),

      wsService.on('shield_expired', () => {
        setShieldActive(false);
        setShieldRoundsLeft(0);
        addLog('Defense', '🔓 Shield expired — attacks resume', 'warning');
      }),
    ];

    return () => { unsubs.forEach(fn => fn()); wsService.disconnect(); };
  }, [addLog]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const startSimulation = async () => {
    try {
      setBattleResult(null); setRound(0); setRiskScore(0);
      setRiskLevel('safe'); setRiskDelta(0); setLogs([]); setAgentStatuses({});
      const res = await fetch(`${API}/api/start-simulation`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'started') {
        setRunning(true);
        if (data.llm_provider) setActiveProvider(data.llm_provider);
        addLog('System', `⚔ Battle started! Defender: ${(data.llm_provider || 'sim').toUpperCase()}`);
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
      setRunning(false); setBattleResult(null); setRound(0);
      setRiskScore(0); setRiskLevel('safe'); setRiskDelta(0);
      setActiveAgent(null); setActiveAttack(null); setAgentStatuses({});
      setLogs([]); setLastPrompt(null); setShowPrompt(false); setThoughtBubble(null);
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

  const agentColor = AGENTS_META.find(a => a.name === activeAgent)?.color;

  return (
    // ── FIXED HEIGHT LAYOUT — no overflow ──────────────────────────────────
    <div className="h-screen bg-bg-dark grid-bg text-white font-mono flex flex-col overflow-hidden">
      <div className="scan-overlay" />

      {/* ── Header (fixed height) ─────────────────────────────────────────── */}
      <header className="flex-none flex items-center justify-between px-4 py-2 border-b border-cyan-900/30 bg-bg-panel/90 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold glow-text tracking-widest">⚔ AEGISAI</span>
          <span className="text-xs text-gray-600 hidden sm:block">RED TEAM SIMULATOR</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">ROUND <span className="text-cyber-cyan font-bold">{round}</span></span>
          <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-cyber-green' : 'text-red-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cyber-green animate-pulse' : 'bg-red-500'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <a href="/" className="text-xs text-gray-600 hover:text-cyber-cyan transition-colors">HOME</a>
          <a href="/agents" className="text-xs text-gray-600 hover:text-cyber-cyan transition-colors">AGENTS</a>
          <a href="/attacks" className="text-xs text-gray-600 hover:text-red-400 transition-colors">ATTACKS</a>
          <a href="/iot-lab" className="text-xs text-gray-600 hover:text-cyber-cyan transition-colors">IOT LAB</a>
          <a href="/dashboard" className="text-xs text-gray-600 hover:text-cyber-cyan transition-colors">ANALYTICS</a>
        </div>
      </header>

      {/* ── Body: Left | Center | Right  (fills remaining height exactly) ─── */}
      <div className="flex-1 flex min-h-0">

        {/* LEFT: Agent list — fixed width, scrollable */}
        <aside className="w-40 flex-none flex flex-col gap-1.5 p-2 border-r border-cyan-900/20 overflow-y-auto">
          <div className="text-xs tracking-widest text-gray-600 text-center pb-1">RED TEAM</div>
          {AGENTS_META.map(agent => (
            <AgentAvatar
              key={agent.name}
              agent={agent}
              status={agentStatuses[agent.name] || 'IDLE'}
              isActive={activeAgent === agent.name}
              compact
            />
          ))}
        </aside>

        {/* CENTER: 3D + controls — flex-1, all height */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 p-2 gap-2">

          {/* LLM Switcher row */}
          <div className="flex-none">
            <LLMSwitcher activeProvider={activeProvider} onSwitch={setActiveProvider} />
          </div>

          {/* 3D scene — fills remaining space */}
          <div className="relative flex-1 min-h-0 cyber-panel rounded overflow-hidden">
            <SmartHome3D
              deviceStates={deviceStates}
              activeAttack={activeAttack}
              defendedTargets={defendedTargets}
              activeAgent={activeAgent}
              agentsMeta={AGENTS_META}
              shieldActive={shieldActive}
            />

            {/* Thought bubble overlay */}
            <AnimatePresence>
              {thoughtBubble && (
                <ThoughtBubble bubble={thoughtBubble} agentsMeta={AGENTS_META} />
              )}
            </AnimatePresence>

            {/* Active agent label */}
            {activeAgent && (
              <motion.div
                className="absolute bottom-2 left-2 right-2 text-xs text-center py-1.5 rounded"
                style={{
                  background: `${agentColor}18`,
                  border: `1px solid ${agentColor}44`,
                  color: agentColor,
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="font-bold">{activeAgent}</span>
                {activeAttack && <> attacking <span className="opacity-80">{activeAttack.target}</span></>}
              </motion.div>
            )}

            <div className="absolute top-2 left-2 text-xs tracking-widest glow-text opacity-50 pointer-events-none">
              ▶ BATTLE MODE
            </div>
          </div>

          {/* Risk meter + buttons row — fixed height */}
          <div className="flex-none flex gap-2 items-stretch">
            <RiskMeter score={riskScore} level={riskLevel} delta={riskDelta} compact />

            <div className="flex-1 flex flex-col gap-1.5 justify-center">
              <motion.button
                onClick={startSimulation}
                disabled={running}
                className="btn-cyber py-2.5 px-4 rounded text-sm font-bold tracking-widest"
                style={{
                  color: running ? '#555' : '#0A0A0F',
                  backgroundColor: running ? '#1A1A2E' : '#FF2222',
                  border: `1px solid ${running ? '#333' : '#FF2222'}`,
                  boxShadow: running ? 'none' : '0 0 14px #FF222266',
                  cursor: running ? 'not-allowed' : 'pointer',
                }}
                whileHover={!running ? { scale: 1.02 } : {}}
                whileTap={!running ? { scale: 0.97 } : {}}
              >
                {running ? '⏳ BATTLE IN PROGRESS…' : '⚔ START BATTLE'}
              </motion.button>
              <button
                onClick={resetSimulation}
                className="btn-cyber py-1.5 px-4 rounded text-xs tracking-widest text-gray-500 hover:text-cyber-cyan transition-colors"
                style={{ border: '1px solid #1A1A2E' }}
              >
                ↺ RESET
              </button>
            </div>

            {/* Defense Controls */}
            <div className="flex flex-col gap-1.5 justify-center">
              <motion.button
                onClick={handleRaiseShield}
                disabled={!running || shieldCooldown || shieldActive}
                className="btn-cyber py-2 px-3 rounded text-xs font-bold tracking-wider"
                style={{
                  color: shieldActive ? '#00FF88' : (shieldCooldown || !running) ? '#555' : '#0A0A0F',
                  backgroundColor: shieldActive ? '#00FF8833' : (shieldCooldown || !running) ? '#1A1A2E' : '#00FF88',
                  border: `1px solid ${shieldActive ? '#00FF88' : (shieldCooldown || !running) ? '#333' : '#00FF88'}`,
                  boxShadow: shieldActive ? '0 0 14px #00FF8866' : 'none',
                  cursor: (!running || shieldCooldown || shieldActive) ? 'not-allowed' : 'pointer',
                }}
                whileHover={running && !shieldCooldown && !shieldActive ? { scale: 1.04 } : {}}
                animate={shieldActive ? { boxShadow: ['0 0 8px #00FF8844', '0 0 20px #00FF8888', '0 0 8px #00FF8844'] } : {}}
                transition={{ duration: 0.8, repeat: shieldActive ? Infinity : 0 }}
              >
                {shieldActive ? `🛡 SHIELD ${shieldRoundsLeft}r` : shieldCooldown ? '⏳ COOLDOWN' : '🛡 RAISE SHIELD'}
              </motion.button>
              <motion.button
                onClick={handleResetRisk}
                disabled={!running || riskResetting}
                className="btn-cyber py-1.5 px-3 rounded text-xs tracking-wider"
                style={{
                  color: riskResetting ? '#555' : (!running) ? '#555' : '#00CCFF',
                  border: `1px solid ${riskResetting || !running ? '#333' : '#00CCFF55'}`,
                  cursor: (!running || riskResetting) ? 'not-allowed' : 'pointer',
                }}
                whileHover={running && !riskResetting ? { scale: 1.04 } : {}}
              >
                {riskResetting ? '⏳ DEPLOYING…' : '🔄 COUNTERMEASURES'}
              </motion.button>
            </div>
          </div>

          {/* Last prompt panel — collapsible, fixed max-height */}
          {lastPrompt && (
            <PromptPanel prompt={lastPrompt} agentsMeta={AGENTS_META} />
          )}

          <AttackTypeTicker items={attackTicker} agentsMeta={AGENTS_META} />
        </main>

        {/* RIGHT: Logs — fixed width, full height */}
        <aside className="w-68 flex-none flex flex-col p-2 border-l border-cyan-900/20 min-h-0">
          <LiveLogs logs={logs} />
        </aside>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function ThoughtBubble({ bubble, agentsMeta }) {
  const agentColor = agentsMeta.find(a => a.name === bubble.agent)?.color || '#FF2222';
  return (
    <motion.div
      className="absolute top-2 right-2 max-w-xs z-10"
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ type: 'spring', damping: 18 }}
    >
      <div
        className="rounded-xl p-3 text-xs font-mono backdrop-blur-sm"
        style={{
          background: `${agentColor}15`,
          border: `1px solid ${agentColor}55`,
          boxShadow: `0 0 20px ${agentColor}22`,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: agentColor }} />
          <span className="font-bold tracking-wider" style={{ color: agentColor }}>
            {bubble.agent}
          </span>
          <span className="text-gray-500">thinks…</span>
        </div>
        {/* Tactic */}
        <div className="text-gray-500 mb-1">
          Tactic: <span style={{ color: agentColor }}>[{bubble.tactic}]</span>
          {' → '}<span className="text-cyan-300">{bubble.target}</span>
        </div>
        {/* Prompt preview */}
        <div className="text-gray-400 leading-relaxed italic">
          "{bubble.text}"
        </div>
        {/* Thought dots */}
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: agentColor }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PromptPanel({ prompt, agentsMeta }) {
  const [open, setOpen] = useState(false);
  const color = agentsMeta.find(a => a.name === prompt.agent)?.color || '#FF2222';
  return (
    <div className="flex-none cyber-panel rounded text-xs" style={{ borderColor: `${color}33` }}>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-white/5 transition-colors"
      >
        <span style={{ color }}>
          ⚠ LAST PROMPT — {prompt.agent} [{prompt.tactic}] → {prompt.target}
        </span>
        <span className="text-gray-600">{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <pre
              className="px-3 pb-2 text-gray-400 whitespace-pre-wrap break-all leading-relaxed border-t"
              style={{ borderColor: `${color}22`, maxHeight: 100, overflowY: 'auto' }}
            >
              {prompt.text}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AttackTypeTicker({ items, agentsMeta }) {
  if (!items.length) return null;
  const latest = items[items.length - 1];
  const color = agentsMeta.find(a => a.name === latest.agent)?.color || '#00FFFF';
  return (
    <motion.div
      key={latest.id}
      className="flex-none rounded px-3 py-1.5 text-xs tracking-wider"
      style={{ border: `1px solid ${color}44`, background: `${color}12`, color }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      ATTACK TYPE → {latest.tactic.replace(/_/g, ' ')} | TARGET → {latest.target.replace(/_/g, ' ')}
    </motion.div>
  );
}
