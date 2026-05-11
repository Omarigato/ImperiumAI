/**
 * Battle page — AegisAI diploma demo (v3 · clean scene).
 *
 * Layout
 *   ┌──────────────┬────────────────────────────────────┬─────────────────┐
 *   │  AGENTS list │ 3D scene (no permanent text)       │  Side-Tabs      │
 *   │  (left)      │ + small HUD overlays + tooltip     │  (7 tabs right) │
 *   └──────────────┴────────────────────────────────────┴─────────────────┘
 *
 * Focus Mode (key: F  ·  Esc to exit) hides every panel so only the 3D
 * scene, the minimal HUD and a compact risk badge remain visible.
 *
 * 3D labels are NEVER permanent. They appear only when:
 *   - hover, or
 *   - selected (click), or
 *   - object is part of the currently active attack, or
 *   - the "Show labels" toggle is on (debug).
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, Shield, RefreshCcw, Skull, Activity, Zap, Cpu,
  Maximize2, Minimize2, Tag, Eye, EyeOff, Crosshair, Grid3X3, X,
  Home, Bug,
} from 'lucide-react';
import NavBar from '../components/NavBar';
import RiskMeter from '../components/RiskMeter';
import BattleResult from '../components/BattleResult';
import LLMSwitcher from '../components/LLMSwitcher';
import BattleSideTabs from '../components/BattleSideTabs';
import AttackPipeline from '../components/AttackPipeline';
import SceneTooltip from '../components/SceneTooltip';
import { AGENTS as AGENT_META } from '../components/meta/agents';
import wsService from '../services/websocket';

const SmartHome3D = dynamic(() => import('../components/SmartHome3D'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_LOGS = 100;

export default function BattlePage() {
  // ── connection / battle state ────────────────────────────────────────────
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(0);

  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('safe');
  const [riskDelta, setRiskDelta] = useState(0);

  const [activeAgent, setActiveAgent] = useState(null);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [activeAttack, setActiveAttack] = useState(null);
  const [defendedTargets, setDefendedTargets] = useState([]);

  const [lastPrompt, setLastPrompt] = useState(null);
  const [llmResponse, setLlmResponse] = useState(null);
  const [policyResult, setPolicyResult] = useState(null);
  const [iotResult, setIotResult] = useState(null);
  const [deviceStates, setDeviceStates] = useState({});

  const [logs, setLogs] = useState([]);
  const [battleResult, setBattleResult] = useState(null);
  const [activeProvider, setActiveProvider] = useState('simulation');

  const [shieldActive, setShieldActive] = useState(false);
  const [shieldRoundsLeft, setShieldRoundsLeft] = useState(0);
  const [shieldCooldown, setShieldCooldown] = useState(false);
  const [riskResetting, setRiskResetting] = useState(false);

  const [stats, setStats] = useState({ red: 0, defense: 0, breaches: 0 });

  // ── scene controls / focus mode ──────────────────────────────────────────
  const [performanceMode, setPerformanceMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showLabels, setShowLabels] = useState(false);           // debug all-labels
  const [showAttackBeams, setShowAttackBeams] = useState(true);
  const [showStatusIcons, setShowStatusIcons] = useState(true);
  const [showDebugGrid, setShowDebugGrid] = useState(false);
  // environment: 'none' | 'cyber_city' | 'dystopian_city' — only ONE at a time
  const [environment, setEnvironment] = useState('none');
  // layout: 'exploded' (default — every GLB visible) | 'house-mounted' (compact)
  const [layout, setLayout] = useState('exploded');
  // External house.glb instead of the procedural holographic house
  const [useExternalHouse, setUseExternalHouse] = useState(false);
  // Asset Debug — bounding boxes + always-on labels for every model
  const [assetDebug, setAssetDebug] = useState(false);

  // ── hover / selection / tooltip ──────────────────────────────────────────
  const [hovered, setHovered] = useState(null);                  // { id, kind, x, y }
  const [selected, setSelected] = useState(null);                // { id, kind }
  const sceneWrapRef = useRef(null);

  const logIdRef = useRef(0);

  // ── log helper (capped) ──────────────────────────────────────────────────
  const addLog = useCallback((source, message, level = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    logIdRef.current += 1;
    setLogs((prev) => {
      const next = prev.length >= MAX_LOGS ? prev.slice(prev.length - MAX_LOGS + 1) : prev;
      return [...next, { id: logIdRef.current, source, message, level, time }];
    });
  }, []);

  const battleStatus = battleResult ? 'ended' : running ? 'running' : 'idle';

  // ── WebSocket wiring (omitted comments for brevity – same as before) ────
  useEffect(() => {
    wsService.connect();

    const unsubs = [
      wsService.on('connected', () => { setConnected(true); addLog('System', 'Connected to AegisAI backend'); }),
      wsService.on('disconnected', () => { setConnected(false); addLog('System', 'Reconnecting…'); }),

      wsService.on('attack_launched', (data) => {
        setActiveAgent(data.agent);
        setRound((r) => data.round || r);
        setLlmResponse(null);
        setPolicyResult(null);
        setIotResult(null);
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
        }, 400);
      }),

      wsService.on('llm_response', (data) => {
        const provider = data.provider || 'llm';
        setLlmResponse(data);
        setActiveProvider(provider);
        addLog(`LLM[${provider.toUpperCase()}]`,
          `action=${data.action} authorized=${data.authorized} — ${(data.reasoning || '').substring(0, 100)}`);
      }),

      wsService.on('llm_switched', (data) => {
        setActiveProvider(data.provider);
        addLog('System', `LLM switched to ${data.provider.toUpperCase()}`);
      }),

      wsService.on('policy_check', (data) => {
        setPolicyResult(data);
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
        setIotResult(data);
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
      wsService.on('shield_active', (data) => setShieldRoundsLeft(data.rounds_left || 0)),
      wsService.on('shield_expired', () => {
        setShieldActive(false);
        setShieldRoundsLeft(0);
        addLog('Defense', '🔓 Shield expired', 'warning');
      }),
    ];

    return () => { unsubs.forEach((fn) => fn()); wsService.disconnect(); };
  }, [addLog]);

  // ── Focus-mode hotkeys (F to toggle, Esc to exit) ───────────────────────
  useEffect(() => {
    const onKey = (e) => {
      // Don't capture when user is typing in inputs
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
        e.preventDefault();
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setFocusMode((v) => !v);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const startSimulation = useCallback(async () => {
    try {
      setBattleResult(null);
      setRound(0);
      setRiskScore(0); setRiskLevel('safe'); setRiskDelta(0);
      setLogs([]);
      setAgentStatuses({});
      setLlmResponse(null); setPolicyResult(null); setIotResult(null);
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
  }, [addLog]);

  const resetSimulation = useCallback(async () => {
    try {
      await fetch(`${API}/api/reset`, { method: 'POST' });
      setRunning(false); setBattleResult(null);
      setRound(0);
      setRiskScore(0); setRiskLevel('safe'); setRiskDelta(0);
      setActiveAgent(null); setActiveAttack(null); setAgentStatuses({});
      setLogs([]);
      setLastPrompt(null); setLlmResponse(null); setPolicyResult(null); setIotResult(null);
      setStats({ red: 0, defense: 0, breaches: 0 });
    } catch {
      addLog('System', 'Reset failed', 'error');
    }
  }, [addLog]);

  const handlePlayAgain = useCallback(async () => {
    await resetSimulation(); await startSimulation();
  }, [resetSimulation, startSimulation]);

  const handleRaiseShield = useCallback(async () => {
    if (shieldCooldown || !running) return;
    try {
      await fetch(`${API}/api/defense/shield`, { method: 'POST' });
      setShieldCooldown(true);
      setTimeout(() => setShieldCooldown(false), 12000);
    } catch { addLog('System', 'Shield failed', 'error'); }
  }, [running, shieldCooldown, addLog]);

  const handleResetRisk = useCallback(async () => {
    if (riskResetting || !running) return;
    try {
      setRiskResetting(true);
      await fetch(`${API}/api/defense/reset-risk`, { method: 'POST' });
      setTimeout(() => setRiskResetting(false), 8000);
    } catch { addLog('System', 'Countermeasures failed', 'error'); }
  }, [running, riskResetting, addLog]);

  // ── Scene interactivity callbacks ───────────────────────────────────────
  const handleHover = useCallback((info) => {
    if (!info) { setHovered(null); return; }
    // Convert client coords to coords relative to the canvas wrapper
    if (sceneWrapRef.current && info.x != null && info.y != null) {
      const r = sceneWrapRef.current.getBoundingClientRect();
      setHovered({ id: info.id, kind: info.kind, x: info.x - r.left, y: info.y - r.top });
    } else {
      setHovered(info);
    }
  }, []);

  const handleSelect = useCallback((info) => {
    if (!info) { setSelected(null); return; }
    setSelected((prev) => (prev?.id === info.id ? null : { id: info.id, kind: info.kind }));
  }, []);

  // ── memoised props for 3D scene ─────────────────────────────────────────
  const scene3DProps = useMemo(() => ({
    deviceStates,
    activeAttack,
    defendedTargets,
    activeAgent,
    agentStatuses,
    shieldActive,
    riskScore,
    performanceMode,
    enablePostprocessing: true,
    // Asset Debug also forces all labels on so you can identify each model.
    showLabels: showLabels || assetDebug,
    showAttackBeams,
    showStatusIcons,
    showDebugGrid,
    environment,
    layout,
    useExternalHouse,
    assetDebug,
    hoveredObjectId: hovered?.id || null,
    selectedObjectId: selected?.id || null,
    onHover: handleHover,
    onSelect: handleSelect,
  }), [
    deviceStates, activeAttack, defendedTargets, activeAgent, agentStatuses,
    shieldActive, riskScore, performanceMode, showLabels, showAttackBeams,
    showStatusIcons, showDebugGrid, environment, layout, useExternalHouse,
    assetDebug, hovered?.id, selected?.id, handleHover, handleSelect,
  ]);

  const hoveredDeviceState = hovered?.kind === 'device' ? deviceStates[hovered.id] : null;

  return (
    <div className="wv" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* NavBar — always visible (z=50) */}
      <div style={{ flex: '0 0 auto' }}>
        <NavBar live={connected} currentRound={round} />
      </div>

      {/* Control bar — hidden in focus mode */}
      {!focusMode && (
        <>
          <div style={{
            flex: '0 0 auto',
            padding: '10px 20px',
            borderBottom: '1px solid var(--wv-border)',
            display: 'flex', gap: 10, alignItems: 'center',
            background: 'var(--wv-bg)', flexWrap: 'wrap',
          }}>
            <button onClick={startSimulation} disabled={running}
              className={`wv-btn ${running ? 'wv-btn-ghost' : 'wv-btn-primary'} wv-btn-sm`}
              style={{ minWidth: 140, flex: '0 0 auto' }}>
              <Play size={13} strokeWidth={2.5} /> {running ? 'In progress…' : 'Start Battle'}
            </button>
            <button onClick={resetSimulation} className="wv-btn wv-btn-ghost wv-btn-sm" style={{ flex: '0 0 auto' }}>
              <RotateCcw size={13} /> Reset
            </button>
            <button onClick={handleRaiseShield} disabled={!running || shieldCooldown || shieldActive}
              className={`wv-btn ${shieldActive ? 'wv-btn-success' : 'wv-btn-ghost'} wv-btn-sm`}
              style={{ flex: '0 0 auto' }}>
              <Shield size={13} />
              {shieldActive ? `Shield · ${shieldRoundsLeft}r` : shieldCooldown ? 'Cooldown' : 'Shield'}
            </button>
            <button onClick={handleResetRisk} disabled={!running || riskResetting}
              className="wv-btn wv-btn-outline wv-btn-sm" style={{ flex: '0 0 auto' }}>
              <RefreshCcw size={13} /> {riskResetting ? 'Deploying…' : 'Counter'}
            </button>

            <ToggleButton on={performanceMode} onClick={() => setPerformanceMode((v) => !v)}
              icon={Cpu} title="Toggle low-performance render">
              Perf: {performanceMode ? 'low' : 'high'}
            </ToggleButton>

            <ToggleButton on={focusMode} onClick={() => setFocusMode((v) => !v)}
              icon={Maximize2} title="Focus mode — hide all panels (F)">
              Focus
            </ToggleButton>

            <div style={{ flex: 1, minWidth: 8 }} />

            {/* Scene visibility toggles */}
            <SceneToggle on={showLabels}      onClick={() => setShowLabels((v) => !v)}      iconOn={Tag}        iconOff={Tag}        title="Show labels for every object (F default off)">Labels</SceneToggle>
            <SceneToggle on={showAttackBeams} onClick={() => setShowAttackBeams((v) => !v)} iconOn={Crosshair}  iconOff={Crosshair}  title="Show 3D attack beams">Beams</SceneToggle>
            <SceneToggle on={showStatusIcons} onClick={() => setShowStatusIcons((v) => !v)} iconOn={Eye}        iconOff={EyeOff}     title="Show status icons">Icons</SceneToggle>
            <SceneToggle on={showDebugGrid}   onClick={() => setShowDebugGrid((v) => !v)}   iconOn={Grid3X3}    iconOff={Grid3X3}    title="Show debug grid">Grid</SceneToggle>

            {/* Layout selector — exploded (default) | house-mounted */}
            <SelectChip
              label="LAYOUT"
              value={layout}
              onChange={setLayout}
              options={[
                ['exploded',      'exploded'],
                ['house-mounted', 'house'],
              ]}
              title="exploded: every GLB visible · house-mounted: legacy compact layout"
            />

            {/* External house.glb (27 MB) vs procedural holographic house */}
            <SceneToggle on={useExternalHouse} onClick={() => setUseExternalHouse((v) => !v)}
              iconOn={Home} iconOff={Home}
              title="Render house.glb (~27 MB) instead of the procedural holographic house">
              House{useExternalHouse ? '·glb' : '·holo'}
            </SceneToggle>

            {/* Asset Debug — bounding boxes + labels for every model */}
            <SceneToggle on={assetDebug} onClick={() => setAssetDebug((v) => !v)}
              iconOn={Bug} iconOff={Bug}
              title="Asset Debug: bounding boxes + permanent labels + loaded/fallback path">
              Debug
            </SceneToggle>

            {/* Environment selector — only ONE heavy backdrop at a time */}
            <SelectChip
              label="ENV"
              value={environment}
              onChange={setEnvironment}
              options={[
                ['none',           'none'],
                ['cyber_city',     'cyber_city'],
                ['dystopian_city', 'dystopian_city'],
              ]}
              title="Heavy background. Only ONE can be active (22–30 MB each)."
            />

            <span className="wv-badge" style={{ flex: '0 0 auto' }}>
              R <span className="wv-mono" style={{ color: 'var(--wv-cyan)', marginLeft: 4 }}>{round}</span>
            </span>
            <span className="wv-badge wv-badge-red" style={{ flex: '0 0 auto' }}>
              BREACH <span className="wv-mono" style={{ marginLeft: 4 }}>{stats.breaches}</span>
            </span>
            <span className="wv-badge wv-badge-green" style={{ flex: '0 0 auto' }}>
              BLOCK <span className="wv-mono" style={{ marginLeft: 4 }}>{stats.defense}</span>
            </span>
          </div>

          {/* LLM strip */}
          <div style={{
            flex: '0 0 auto',
            padding: '8px 20px',
            borderBottom: '1px solid var(--wv-border)',
            background: 'var(--wv-surface)',
            overflowX: 'auto',
          }}>
            <LLMSwitcher activeProvider={activeProvider} onSwitch={setActiveProvider} />
          </div>
        </>
      )}

      {/* ── Main content area ──────────────────────────────────────────── */}
      <div style={{
        flex: '1 1 0', minHeight: 0, minWidth: 0,
        display: 'grid',
        gridTemplateColumns: focusMode ? '1fr' : '220px 1fr 360px',
        background: 'var(--wv-bg)',
      }}>
        {/* LEFT — agents */}
        {!focusMode && (
          <div style={{
            borderRight: '1px solid var(--wv-border)',
            overflow: 'auto', minWidth: 0, minHeight: 0,
            zIndex: 30,
          }}>
            <AgentsPanel agentStatuses={agentStatuses} activeAgent={activeAgent} />
          </div>
        )}

        {/* CENTER — 3D + pipeline + risk */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {/* 3D scene */}
          <div
            ref={sceneWrapRef}
            style={{ flex: '1 1 0', minHeight: 0, position: 'relative' }}
            onMouseLeave={() => setHovered(null)}
          >
            <SmartHome3D {...scene3DProps} />

            {/* Tooltip (DOM overlay, z=40) */}
            <SceneTooltip
              position={hovered ? { x: hovered.x, y: hovered.y } : null}
              kind={hovered?.kind}
              objectId={hovered?.id}
              deviceState={hoveredDeviceState}
              activeAttack={activeAttack}
              agentStatus={hovered?.kind === 'agent' ? agentStatuses[hovered.id] : null}
            />

            {/* Top-left HUD (round / agent — small, z=20) */}
            <div style={{
              position: 'absolute', top: 12, left: 12, zIndex: 20,
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(6px)',
              border: '1px solid var(--wv-border)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, color: 'var(--wv-text-2)',
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <span><span style={{ opacity: 0.6 }}>R</span> <span style={{ color: 'var(--wv-cyan)' }}>{round}</span></span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{activeAgent || 'idle'}</span>
              {activeAttack?.tactic && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ color: 'var(--wv-orange, #ff8a2a)' }}>{activeAttack.tactic}</span>
                </>
              )}
            </div>

            {/* Top-right compact risk badge */}
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 20,
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(6px)',
              border: '1px solid var(--wv-border)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, color: 'var(--wv-text-2)',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <span style={{ opacity: 0.6 }}>RISK</span>
              <span style={{
                color: riskScore >= 80 ? 'var(--wv-red)' : riskScore >= 50 ? 'var(--wv-orange)' : 'var(--wv-cyan)',
                fontWeight: 700,
              }}>{riskScore}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{riskLevel}</span>
            </div>

            {/* Focus mode exit + minimal controls */}
            {focusMode && (
              <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                zIndex: 25, display: 'flex', gap: 8,
                padding: 8, borderRadius: 10,
                background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)',
                border: '1px solid var(--wv-border)',
              }}>
                <button onClick={startSimulation} disabled={running}
                  className={`wv-btn ${running ? 'wv-btn-ghost' : 'wv-btn-primary'} wv-btn-sm`}>
                  <Play size={12} /> {running ? '…' : 'Start'}
                </button>
                <button onClick={resetSimulation} className="wv-btn wv-btn-ghost wv-btn-sm">
                  <RotateCcw size={12} /> Reset
                </button>
                <button onClick={() => setFocusMode(false)} className="wv-btn wv-btn-outline wv-btn-sm">
                  <Minimize2 size={12} /> Exit Focus <span style={{ opacity: 0.6, marginLeft: 4 }}>(Esc)</span>
                </button>
              </div>
            )}

            {/* Active attack overlay (small card) — only when an attack is running */}
            <AnimatePresence>
              {activeAttack && !focusMode && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute', bottom: 12, left: 12, zIndex: 20,
                    padding: 10, borderRadius: 8,
                    background: 'rgba(20, 25, 40, 0.92)', backdropFilter: 'blur(8px)',
                    border: '1px solid var(--wv-red, #ff3b6b)55',
                    maxWidth: 260,
                  }}
                >
                  <div className="wv-eyebrow" style={{ marginBottom: 4, fontSize: 9 }}>
                    <Skull size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: '-1px' }} />
                    Active attack
                  </div>
                  <div className="wv-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--wv-red)' }}>
                    {activeAttack.agent} → {activeAttack.target}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected card (click to dismiss) */}
            {selected && !focusMode && (
              <div style={{
                position: 'absolute', bottom: 12, right: 12, zIndex: 20,
                padding: 10, borderRadius: 8,
                background: 'rgba(20, 25, 40, 0.92)', backdropFilter: 'blur(8px)',
                border: '1px solid var(--wv-cyan, #00d4ff)55',
                maxWidth: 260,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div className="wv-mono" style={{ fontSize: 11 }}>
                  <span style={{ opacity: 0.5 }}>{selected.kind}</span>{' '}
                  <span style={{ color: 'var(--wv-cyan)' }}>{selected.id}</span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="wv-btn wv-btn-ghost wv-btn-sm"
                  style={{ padding: '2px 6px', marginLeft: 'auto' }}
                  title="Deselect"
                >
                  <X size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Bottom strip — pipeline + risk meter, hidden in focus mode */}
          {!focusMode && (
            <div style={{
              flex: '0 0 auto',
              display: 'grid', gridTemplateColumns: '1fr 240px',
              gap: 10, padding: 10, borderTop: '1px solid var(--wv-border)',
            }}>
              <div className="wv-card" style={{ padding: 10, overflow: 'hidden' }}>
                <div className="wv-eyebrow" style={{ marginBottom: 8 }}>
                  <Activity size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                  Attack Pipeline
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <AttackPipeline
                    activeAttack={activeAttack}
                    llmResponse={llmResponse}
                    policyResult={policyResult}
                    iotResult={iotResult}
                    riskScore={riskScore}
                    battleStatus={battleStatus}
                    compact
                  />
                </div>
              </div>
              <div className="wv-card" style={{
                padding: 10, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', minWidth: 0,
              }}>
                <div className="wv-eyebrow" style={{ marginBottom: 8 }}>
                  <Zap size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                  Risk Score
                </div>
                <RiskMeter score={riskScore} level={riskLevel} delta={riskDelta} compact />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — side tabs, hidden in focus mode */}
        {!focusMode && (
          <div style={{
            borderLeft: '1px solid var(--wv-border)',
            minWidth: 0, minHeight: 0,
            display: 'flex', flexDirection: 'column',
            zIndex: 30,
          }}>
            <BattleSideTabs
              round={round}
              activeAgent={activeAgent}
              activeAttack={activeAttack}
              lastPrompt={lastPrompt}
              llmResponse={llmResponse}
              policyResult={policyResult}
              iotResult={iotResult}
              riskScore={riskScore}
              riskLevel={riskLevel}
              battleStatus={battleStatus}
              deviceStates={deviceStates}
              logs={logs}
            />
          </div>
        )}
      </div>

      {/* Battle result overlay (z=100) */}
      <AnimatePresence>
        {battleResult && (
          <BattleResult result={battleResult} onPlayAgain={handlePlayAgain} onClose={() => setBattleResult(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function ToggleButton({ on, onClick, icon: Icon, title, children }) {
  return (
    <button onClick={onClick} className={`wv-btn ${on ? 'wv-btn-success' : 'wv-btn-ghost'} wv-btn-sm`}
      title={title} style={{ flex: '0 0 auto' }}>
      <Icon size={13} /> {children}
    </button>
  );
}

function SelectChip({ label, value, onChange, options, title }) {
  return (
    <label
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 6px', fontSize: 10, fontWeight: 600,
        color: 'var(--wv-text-2, #aab)',
        border: '1px solid var(--wv-border, #2b3140)',
        borderRadius: 6, flex: '0 0 auto',
      }}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="wv-mono"
        style={{
          background: 'transparent',
          color: 'var(--wv-cyan, #00d4ff)',
          border: 'none', outline: 'none',
          fontSize: 10, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </label>
  );
}

function SceneToggle({ on, onClick, iconOn: IconOn, iconOff: IconOff, title, children }) {
  const Icon = on ? IconOn : IconOff;
  return (
    <button onClick={onClick}
      title={title}
      aria-pressed={on}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 8px',
        fontSize: 11, fontWeight: 600,
        background: on ? 'rgba(0,212,255,0.10)' : 'transparent',
        color: on ? 'var(--wv-cyan, #00d4ff)' : 'var(--wv-text-2, #aab)',
        border: `1px solid ${on ? 'rgba(0,212,255,0.4)' : 'var(--wv-border, #2b3140)'}`,
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
        flex: '0 0 auto',
      }}>
      <Icon size={11} /> {children}
    </button>
  );
}

function AgentsPanel({ agentStatuses, activeAgent }) {
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Skull size={11} /> Red Team
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {AGENT_META.map((agent) => {
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
                padding: 10,
                borderColor: isActive ? agent.color : 'var(--wv-border)',
                boxShadow: isActive ? `0 0 0 1px ${agent.color}, 0 4px 18px ${agent.color}33` : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              title={agent.explanation}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${agent.color}22`,
                  border: `1px solid ${agent.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flex: '0 0 32px',
                }}>{agent.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="wv-h4" style={{ fontSize: 12, color: agent.color }}>{agent.name}</div>
                  <div className="wv-body" style={{ fontSize: 10, marginTop: 1 }}>{agent.category}</div>
                </div>
              </div>
              <div className="wv-body" style={{ fontSize: 10, marginTop: 6, lineHeight: 1.4 }}>{agent.short}</div>
              <div style={{
                marginTop: 6, fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600, letterSpacing: '0.1em',
                color: statusColor,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                {status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
