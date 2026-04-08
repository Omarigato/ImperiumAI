import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import AgentAvatar from '../components/AgentAvatar';
import AttackAnimation from '../components/AttackAnimation';
import RiskMeter from '../components/RiskMeter';
import LiveLogs from '../components/LiveLogs';
import BattleResult from '../components/BattleResult';
import wsService from '../services/websocket';

const SmartHome3D = dynamic(() => import('../components/SmartHome3D'), { ssr: false });

const AGENTS_META = [
  { name: 'ShadowInjector', color: '#FF0000', description: 'Master of prompt injection attacks.' },
  { name: 'ContextPhantom', color: '#9B00FF', description: 'Manipulates context and role perception.' },
  { name: 'PrivilegeReaper', color: '#FF6600', description: 'Escalates privileges via impersonation.' },
  { name: 'SilentEscalator', color: '#00FFFF', description: 'Stealthy gradual boundary erosion.' },
];

const API = 'http://localhost:8000';

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
  const [showAttackAnim, setShowAttackAnim] = useState(false);
  const [lastAttack, setLastAttack] = useState(null);
  const logIdRef = useRef(0);

  const addLog = useCallback((source, message, level = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    logIdRef.current += 1;
    setLogs((prev) => [
      ...prev.slice(-99),
      { id: logIdRef.current, source, message, level, time },
    ]);
  }, []);

  // WebSocket setup
  useEffect(() => {
    wsService.connect();

    const unsubConnected = wsService.on('connected', () => {
      setConnected(true);
      addLog('System', 'WebSocket connected to AegisAI backend');
    });
    const unsubDisconnected = wsService.on('disconnected', () => {
      setConnected(false);
      addLog('System', 'WebSocket disconnected — reconnecting…');
    });

    wsService.on('attack_launched', (data) => {
      setActiveAgent(data.agent);
      setRound((r) => data.round || r);
      setAgentStatuses((prev) => ({
        ...Object.fromEntries(Object.keys(prev).map((k) => [k, 'IDLE'])),
        [data.agent]: 'CHARGING',
      }));
      addLog('AttackAgent', `${data.agent} → [${data.tactic}] targeting ${data.target}`);
      setTimeout(() => {
        setAgentStatuses((prev) => ({ ...prev, [data.agent]: 'ATTACKING' }));
        setActiveAttack({ target: data.target, success: null });
      }, 500);
    });

    wsService.on('llm_response', (data) => {
      addLog('Gemini', `${data.action} authorized=${data.authorized} — ${data.reasoning?.substring(0, 100)}`);
    });

    wsService.on('policy_check', (data) => {
      if (data.violations?.length > 0) {
        addLog('Policy', `⚠ BLOCKED [${data.severity}]: ${data.violations[0]}`, 'warning');
      } else {
        addLog('Policy', 'No violations — action permitted');
      }
    });

    wsService.on('iot_result', (data) => {
      if (data.device_states) setDeviceStates(data.device_states);
      addLog('IoT', `${data.target}: ${data.message}`);
      const success = data.success;
      setActiveAttack((prev) => (prev ? { ...prev, success } : null));
      setShowAttackAnim(true);
      setLastAttack({ success, target: data.target });
      if (!success) {
        setDefendedTargets((prev) => [...new Set([...prev, data.target])]);
        setTimeout(() => {
          setDefendedTargets((prev) => prev.filter((t) => t !== data.target));
        }, 2000);
      }
      setTimeout(() => {
        setShowAttackAnim(false);
        setActiveAttack(null);
      }, 1500);
    });

    wsService.on('risk_update', (data) => {
      setRiskScore(data.score);
      setRiskLevel(data.level);
      setRiskDelta(data.delta);
      addLog('RiskEngine', `Score=${data.score} (${data.level}) Δ${data.delta > 0 ? '+' : ''}${data.delta}`);
    });

    wsService.on('round_complete', (data) => {
      setRound(data.round);
      const status = data.attack_success ? 'ATTACKING' : 'BLOCKED';
      setAgentStatuses((prev) => ({ ...prev, [data.agent]: status }));
      setTimeout(() => {
        setAgentStatuses((prev) => ({ ...prev, [data.agent]: 'IDLE' }));
        setActiveAgent(null);
      }, 1200);
    });

    wsService.on('battle_end', (data) => {
      setRunning(false);
      setBattleResult(data);
      addLog('System', `🏁 Battle over — ${data.winner === 'red_team' ? '🔥 RED TEAM WINS' : '🛡 DEFENSE WINS'}`);
    });

    wsService.on('log', (data) => {
      addLog(data.source || 'System', data.message, data.level);
    });

    wsService.on('reset', (data) => {
      if (data.device_states) setDeviceStates(data.device_states);
      addLog('System', 'Simulation reset');
    });

    return () => {
      unsubConnected();
      unsubDisconnected();
      wsService.disconnect();
    };
  }, [addLog]);

  const startSimulation = async () => {
    try {
      setBattleResult(null);
      setRound(0);
      setRiskScore(0);
      setRiskLevel('safe');
      setRiskDelta(0);
      setLogs([]);
      setAgentStatuses({});
      const res = await fetch(`${API}/api/start-simulation`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'started') {
        setRunning(true);
        addLog('System', '⚔ Battle simulation started!');
      } else {
        addLog('System', data.message || 'Could not start simulation');
      }
    } catch {
      addLog('System', 'Error connecting to backend — is it running?', 'error');
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
    } catch {
      addLog('System', 'Reset failed — backend may be offline', 'error');
    }
  };

  const handlePlayAgain = async () => {
    await resetSimulation();
    await startSimulation();
  };

  const agentColor = AGENTS_META.find((a) => a.name === activeAgent)?.color;

  return (
    <div className="min-h-screen bg-bg-dark grid-bg text-white font-mono flex flex-col">
      {/* Scan overlay */}
      <div className="scan-overlay" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-900/30 bg-bg-panel/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold glow-text tracking-widest">⚔ AEGISAI</span>
          <span className="text-xs text-gray-600 hidden sm:block">RED TEAM SIMULATOR</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs">
            <span className="text-gray-600">ROUND </span>
            <span className="text-cyber-cyan font-bold">{round}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-cyber-green' : 'text-red-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cyber-green animate-pulse' : 'bg-red-500'}`} />
            {connected ? 'CONNECTED' : 'OFFLINE'}
          </div>
          <a href="/" className="text-xs text-gray-600 hover:text-cyber-cyan transition-colors">← HOME</a>
          <a href="/dashboard" className="text-xs text-gray-600 hover:text-cyber-cyan transition-colors">ANALYTICS →</a>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left: Agents */}
        <aside className="w-44 shrink-0 flex flex-col gap-2 p-3 border-r border-cyan-900/20 overflow-y-auto">
          <div className="text-xs tracking-widest text-gray-600 mb-1 text-center">RED TEAM</div>
          {AGENTS_META.map((agent) => (
            <AgentAvatar
              key={agent.name}
              agent={agent}
              status={agentStatuses[agent.name] || 'IDLE'}
              isActive={activeAgent === agent.name}
            />
          ))}
        </aside>

        {/* Center: 3D + controls */}
        <main className="flex-1 flex flex-col min-w-0 p-3 gap-3">
          {/* 3D scene */}
          <div className="relative flex-1 cyber-panel rounded overflow-hidden" style={{ minHeight: 280 }}>
            <SmartHome3D
              deviceStates={deviceStates}
              activeAttack={activeAttack}
              defendedTargets={defendedTargets}
            />
            <AnimatePresence>
              {showAttackAnim && lastAttack && (
                <AttackAnimation
                  active={showAttackAnim}
                  success={lastAttack.success}
                  agentColor={agentColor || '#FF0000'}
                  targetName={lastAttack.target}
                />
              )}
            </AnimatePresence>

            {/* Battle mode label */}
            <div className="absolute top-2 left-2 text-xs tracking-widest glow-text opacity-70">
              ▶ BATTLE MODE
            </div>

            {/* Current round info */}
            {activeAgent && (
              <motion.div
                className="absolute bottom-2 left-2 right-2 text-xs text-center py-1 rounded"
                style={{
                  background: `${agentColor || '#FF0000'}22`,
                  border: `1px solid ${agentColor || '#FF0000'}44`,
                  color: agentColor || '#FF0000',
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {activeAgent} is attacking {activeAttack?.target || '…'}
              </motion.div>
            )}
          </div>

          {/* Risk meter + controls row */}
          <div className="flex gap-3 items-stretch">
            <RiskMeter score={riskScore} level={riskLevel} delta={riskDelta} />

            <div className="flex-1 flex flex-col gap-2 justify-center">
              <motion.button
                onClick={startSimulation}
                disabled={running}
                className="btn-cyber py-3 px-6 rounded text-sm font-bold tracking-widest"
                style={{
                  color: running ? '#555' : '#0A0A0F',
                  backgroundColor: running ? '#1A1A2E' : '#FF0000',
                  border: `1px solid ${running ? '#333' : '#FF0000'}`,
                  boxShadow: running ? 'none' : '0 0 16px #FF000066',
                  cursor: running ? 'not-allowed' : 'pointer',
                }}
                whileHover={!running ? { scale: 1.02, boxShadow: '0 0 28px #FF0000' } : {}}
                whileTap={!running ? { scale: 0.98 } : {}}
              >
                {running ? '⏳ BATTLE IN PROGRESS…' : '⚔ START BATTLE'}
              </motion.button>

              <button
                onClick={resetSimulation}
                className="btn-cyber py-2 px-6 rounded text-sm tracking-widest text-gray-500 hover:text-cyber-cyan transition-colors"
                style={{ border: '1px solid #1A1A2E' }}
              >
                ↺ RESET
              </button>
            </div>
          </div>
        </main>

        {/* Right: Logs */}
        <aside className="w-72 shrink-0 flex flex-col p-3 border-l border-cyan-900/20 overflow-hidden">
          <LiveLogs logs={logs} />
        </aside>
      </div>

      {/* Battle result overlay */}
      <AnimatePresence>
        {battleResult && (
          <BattleResult result={battleResult} onPlayAgain={handlePlayAgain} />
        )}
      </AnimatePresence>
    </div>
  );
}
