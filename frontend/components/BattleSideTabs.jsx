/**
 * BattleSideTabs.jsx
 *
 * The right-hand side panel of the Battle page.  Seven tabs:
 *   1. Overview      — current round / agent / target / risk
 *   2. Attack Flow   — AttackPipeline visualisation
 *   3. Prompt        — original + injected prompt + LLM response
 *   4. Policy        — policy decision, violations, severity
 *   5. Devices       — list of IoT devices with state
 *   6. Logs          — live logs with filter chips
 *   7. Explanation   — human-readable narrative of what's happening
 *
 * Active tab is local state, so WebSocket events do NOT reset it.
 */
import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, GitBranch, FileCode, Shield, Plug, Terminal, BookOpen,
} from 'lucide-react';
import AttackPipeline from './AttackPipeline';
import LiveLogs from './LiveLogs';
import { DEVICES, getDevice } from './meta/devices';
import { getAgent } from './meta/agents';

const TABS = [
  { id: 'overview',    label: 'Overview',    icon: Layers },
  { id: 'flow',        label: 'Attack Flow', icon: GitBranch },
  { id: 'prompt',      label: 'Prompt',      icon: FileCode },
  { id: 'policy',      label: 'Policy',      icon: Shield },
  { id: 'devices',     label: 'Devices',     icon: Plug },
  { id: 'logs',        label: 'Logs',        icon: Terminal },
  { id: 'explanation', label: 'Explain',     icon: BookOpen },
];

// ── Tab bodies ──────────────────────────────────────────────────────────────
function OverviewTab({ round, activeAttack, activeAgent, riskScore, riskLevel, battleStatus, llmResponse, iotResult }) {
  const status = iotResult
    ? (iotResult.success ? 'BREACH' : 'BLOCKED')
    : (activeAttack ? 'IN PROGRESS' : battleStatus === 'running' ? 'WAITING' : 'IDLE');
  const statusColor = status === 'BREACH' ? '#ff3b6b' : status === 'BLOCKED' ? '#10ffac'
    : status === 'IN PROGRESS' ? '#ff8a2a' : '#888';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <KV label="Round"      value={round || '—'} />
      <KV label="Active agent"   value={activeAgent || activeAttack?.agent || '—'} mono />
      <KV label="Target device"  value={activeAttack?.target || '—'} mono />
      <KV label="Tactic"     value={activeAttack?.tactic || '—'} mono />
      <KV label="LLM action"     value={llmResponse?.action || '—'} mono />
      <KV label="Authorized"     value={llmResponse ? (llmResponse.authorized ? 'yes' : 'no') : '—'} mono />
      <KV label="Status"     value={status} tone={statusColor} mono />
      <KV label="Risk score"     value={riskScore} tone={statusColor} mono />
      <KV label="Risk level"     value={riskLevel || '—'} mono />
    </div>
  );
}

function FlowTab({ activeAttack, llmResponse, policyResult, iotResult, riskScore, battleStatus }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="wv-body" style={{ fontSize: 12, lineHeight: 1.6 }}>
        Each round runs through this pipeline.  Stages light up as events arrive on the WebSocket.
      </div>
      <AttackPipeline
        activeAttack={activeAttack}
        llmResponse={llmResponse}
        policyResult={policyResult}
        iotResult={iotResult}
        riskScore={riskScore}
        battleStatus={battleStatus}
      />
    </div>
  );
}

function PromptTab({ lastPrompt, llmResponse }) {
  if (!lastPrompt) {
    return <Empty>Waiting for the first attack prompt…</Empty>;
  }
  // Naive heuristic: highlight injection-y substrings
  const injectedPatterns = [
    /ignore all previous instructions[^.]*/gi,
    /system override[^.]*/gi,
    /bypass[^.]*/gi,
    /sudo[^.]*/gi,
    /maintenance mode[^.]*/gi,
    /unrestricted mode[^.]*/gi,
    /<\|im_start\|>[^.]*/gi,
    /chain of thought[^.]*/gi,
    /step \d+ of an authorized[^.]*/gi,
  ];
  let highlighted = lastPrompt.text || '';
  const injectedHits = [];
  for (const re of injectedPatterns) {
    const m = highlighted.match(re);
    if (m) injectedHits.push(...m);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Block title="Attack prompt" mono>
        {highlighted.slice(0, 1200)}
      </Block>
      {injectedHits.length > 0 && (
        <Block title="Injection markers detected" tone="#ff3b6b" mono>
          {injectedHits.slice(0, 4).map((h, i) => <div key={i}>• {h.slice(0, 200)}</div>)}
        </Block>
      )}
      {llmResponse && (
        <>
          <Block title="LLM action" mono>
            {`action  = ${llmResponse.action}\nauthorized = ${llmResponse.authorized}\ntarget  = ${llmResponse.target || ''}`}
          </Block>
          {llmResponse.response && (
            <Block title="LLM response" mono>
              {String(llmResponse.response).slice(0, 600)}
            </Block>
          )}
          {llmResponse.reasoning && (
            <Block title="LLM reasoning" mono>
              {String(llmResponse.reasoning).slice(0, 600)}
            </Block>
          )}
        </>
      )}
    </div>
  );
}

function PolicyTab({ policyResult }) {
  if (!policyResult) return <Empty>No policy decision yet for this round.</Empty>;
  const allowed = policyResult.allowed;
  const bypassed = policyResult.bypassed;
  const headline =
    bypassed ? { label: 'STEALTH BYPASS', color: '#ff3b6b' } :
    allowed  ? { label: 'PERMITTED',      color: '#10ffac' } :
               { label: 'BLOCKED',        color: '#ff8a2a' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        padding: 10, border: `1px solid ${headline.color}66`, borderRadius: 8,
        background: `${headline.color}11`,
      }}>
        <div className="wv-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Decision</div>
        <div className="wv-mono" style={{ color: headline.color, fontWeight: 700, fontSize: 14 }}>
          {headline.label}
        </div>
      </div>
      <KV label="Severity" value={policyResult.severity || 'none'} mono />
      <KV label="Allowed" value={allowed ? 'true' : 'false'} mono />
      <KV label="Bypassed" value={bypassed ? 'true' : 'false'} mono />
      {policyResult.violations?.length > 0 && (
        <Block title="Violations" mono>
          {policyResult.violations.map((v, i) => <div key={i}>• {v}</div>)}
        </Block>
      )}
    </div>
  );
}

function DevicesTab({ deviceStates }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {DEVICES.map((d) => {
        const live = deviceStates?.[d.id];
        const status = live?.status ?? 'unknown';
        const compromised = ['compromised', 'unlocked', 'disarmed', 'disabled', 'dns_poisoned',
                              'overridden', 'flooding', 'overloaded', 'critical', 'open'].includes(status);
        const tone = compromised ? '#ff3b6b' : 'var(--wv-text-2)';
        return (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px', borderRadius: 8,
            border: `1px solid ${compromised ? '#ff3b6b55' : 'var(--wv-border, #222a3a)'}`,
            background: compromised ? '#ff3b6b11' : 'var(--wv-bg, #0a0e18)',
          }}>
            <span style={{ fontSize: 16, flex: '0 0 22px', textAlign: 'center' }}>{d.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wv-mono" style={{ fontSize: 11, fontWeight: 600, color: d.color }}>
                {d.label}
              </div>
              <div className="wv-mono" style={{ fontSize: 10, color: tone }}>{status}</div>
            </div>
            <div className="wv-badge" style={{ fontSize: 9 }}>R{d.risk}</div>
          </div>
        );
      })}
    </div>
  );
}

function LogsTab({ logs }) {
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => {
    if (filter === 'all') return logs;
    const want = filter.toLowerCase();
    return logs.filter((l) => {
      const src = (l.source || '').toLowerCase();
      if (want === 'attack') return src.includes('attack');
      if (want === 'policy') return src.includes('policy') || src.includes('shield');
      if (want === 'iot')    return src.includes('iot');
      if (want === 'risk')   return src.includes('risk');
      if (want === 'llm')    return src.includes('llm');
      if (want === 'system') return src.includes('system') || src.includes('defense');
      return true;
    });
  }, [logs, filter]);

  const chips = ['all', 'attack', 'llm', 'policy', 'iot', 'risk', 'system'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className="wv-mono"
            style={{
              padding: '3px 8px',
              fontSize: 10,
              borderRadius: 999,
              border: `1px solid ${filter === c ? '#00d4ff' : 'var(--wv-border, #222a3a)'}`,
              background: filter === c ? '#00d4ff22' : 'transparent',
              color: filter === c ? '#00d4ff' : 'var(--wv-text-2)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >{c}</button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LiveLogs logs={filtered} />
      </div>
    </div>
  );
}

function ExplanationTab({ activeAttack, llmResponse, policyResult, iotResult, riskScore }) {
  const agentMeta = activeAttack ? getAgent(activeAttack.agent) : null;
  const deviceMeta = activeAttack ? getDevice(activeAttack.target) : null;
  if (!activeAttack) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Empty>Start a battle to see a live human-readable explanation of every step.</Empty>
        <div className="wv-body" style={{ fontSize: 12, lineHeight: 1.7 }}>
          <b>What is being tested?</b>
          <p style={{ marginTop: 6 }}>
            This battle tests whether an LLM-controlled smart home can resist adversarial
            prompts, context manipulation, privilege escalation, stealth attacks, and
            network-level command injection. Each attack is evaluated by the policy engine
            before any simulated IoT action is executed.
          </p>
        </div>
      </div>
    );
  }
  const steps = [];
  if (agentMeta) {
    steps.push({
      title: `${agentMeta.icon} ${agentMeta.name}  —  ${agentMeta.category}`,
      body: agentMeta.explanation,
    });
  }
  if (deviceMeta) {
    steps.push({
      title: `🎯 Target: ${deviceMeta.label}`,
      body: deviceMeta.cyberWhy,
    });
  }
  if (llmResponse) {
    steps.push({
      title: `🤖 LLM decision`,
      body: `The LLM returned action='${llmResponse.action}' (authorized=${llmResponse.authorized}). ` +
            `That decision is then reviewed by the policy engine before anything physical happens.`,
    });
  }
  if (policyResult) {
    if (policyResult.bypassed) {
      steps.push({
        title: `⚠️ Policy bypass`,
        body: `The tactic '${activeAttack.tactic}' was subtle enough to slip past pattern detection. ` +
              `This is what we want our diploma to expose – the gap between detection and reality.`,
      });
    } else if (!policyResult.allowed) {
      steps.push({
        title: `🛡 Policy engine blocked the request`,
        body: `Reason: ${policyResult.violations?.[0] || 'rule violation'}. ` +
              `The dangerous action never reached the IoT simulator.`,
      });
    } else {
      steps.push({
        title: `✅ Policy permitted the action`,
        body: `No violations were matched in this prompt — the IoT simulator received the action.`,
      });
    }
  }
  if (iotResult) {
    steps.push({
      title: iotResult.success ? `🔥 IoT state mutated (BREACH)` : `🛡 IoT state preserved`,
      body: iotResult.message,
    });
  }
  if (typeof riskScore === 'number') {
    steps.push({
      title: `📈 Risk score = ${riskScore}`,
      body: riskScore >= 80 ? 'Cyber chaos – consider raising the shield.'
            : riskScore >= 50 ? 'Elevated risk – defenders should respond.'
            : 'Within safe bounds.',
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          padding: 10,
          borderLeft: '2px solid var(--wv-cyan, #00d4ff)',
          background: 'var(--wv-bg, #0a0e18)',
          borderRadius: 6,
        }}>
          <div className="wv-h4" style={{ fontSize: 12, marginBottom: 4 }}>{s.title}</div>
          <div className="wv-body" style={{ fontSize: 12, lineHeight: 1.6 }}>{s.body}</div>
        </div>
      ))}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function KV({ label, value, mono, tone }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      gap: 8, padding: '6px 8px',
      borderBottom: '1px dashed var(--wv-border, #222a3a)',
    }}>
      <div className="wv-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div className={mono ? 'wv-mono' : ''} style={{ fontSize: 12, color: tone || 'var(--wv-text)', fontWeight: 600 }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function Block({ title, children, mono, tone }) {
  return (
    <div style={{
      padding: 10,
      border: `1px solid ${tone ? tone + '55' : 'var(--wv-border, #222a3a)'}`,
      borderRadius: 8, background: 'var(--wv-bg, #0a0e18)',
    }}>
      <div className="wv-eyebrow" style={{ fontSize: 9, marginBottom: 6, color: tone || undefined }}>{title}</div>
      <div className={mono ? 'wv-mono' : 'wv-body'} style={{
        fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        maxHeight: 220, overflow: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="wv-body" style={{
      padding: 14, fontSize: 12,
      textAlign: 'center',
      color: 'var(--wv-text-3, #888)',
      border: '1px dashed var(--wv-border, #222a3a)',
      borderRadius: 8,
    }}>{children}</div>
  );
}

// ── main export ──────────────────────────────────────────────────────────────
const BattleSideTabs = memo(function BattleSideTabs({
  round = 0,
  activeAgent = null,
  activeAttack = null,
  lastPrompt = null,
  llmResponse = null,
  policyResult = null,
  iotResult = null,
  riskScore = 0,
  riskLevel = 'safe',
  battleStatus = 'idle',
  deviceStates = {},
  logs = [],
}) {
  const [active, setActive] = useState('overview');
  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      minWidth: 0, minHeight: 0,
      background: 'var(--wv-bg, #0a0e18)',
    }}>
      {/* Tab bar */}
      <div role="tablist" aria-label="Battle side tabs" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        padding: 8,
        borderBottom: '1px solid var(--wv-border, #222a3a)',
        flex: '0 0 auto',
      }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 9px', borderRadius: 8,
                border: `1px solid ${isActive ? '#00d4ff' : 'var(--wv-border, #222a3a)'}`,
                background: isActive ? 'rgba(0, 212, 255, 0.10)' : 'transparent',
                color: isActive ? '#00d4ff' : 'var(--wv-text-2, #aab)',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              }}
            >
              <Icon size={11} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{
        flex: 1, minHeight: 0, minWidth: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 12,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            style={{ height: '100%' }}
          >
            {active === 'overview'    && <OverviewTab round={round} activeAttack={activeAttack} activeAgent={activeAgent} riskScore={riskScore} riskLevel={riskLevel} battleStatus={battleStatus} llmResponse={llmResponse} iotResult={iotResult} />}
            {active === 'flow'        && <FlowTab activeAttack={activeAttack} llmResponse={llmResponse} policyResult={policyResult} iotResult={iotResult} riskScore={riskScore} battleStatus={battleStatus} />}
            {active === 'prompt'      && <PromptTab lastPrompt={lastPrompt} llmResponse={llmResponse} />}
            {active === 'policy'      && <PolicyTab policyResult={policyResult} />}
            {active === 'devices'     && <DevicesTab deviceStates={deviceStates} />}
            {active === 'logs'        && <LogsTab logs={logs} />}
            {active === 'explanation' && <ExplanationTab activeAttack={activeAttack} llmResponse={llmResponse} policyResult={policyResult} iotResult={iotResult} riskScore={riskScore} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

export default BattleSideTabs;
