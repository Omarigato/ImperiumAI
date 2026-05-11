/**
 * SceneTooltip.jsx
 *
 * A compact floating tooltip rendered as a normal DOM overlay on top of the
 * 3D Canvas (NOT inside it). Keeping it out of the Canvas means:
 *   - text stays crisp at any zoom level;
 *   - no per-object Html re-render storm when the scene updates;
 *   - tooltip is automatically clipped by the canvas wrapper.
 *
 * Two presentation modes:
 *   - kind="device" → IoT device card (status, last action, risk).
 *   - kind="agent"  → red-team agent card (tactic, role).
 *
 * The parent passes screen coordinates {x, y} so we can position the card
 * near the hovered element without doing 3D projection ourselves.
 */
import { getDevice, getDeviceIcon } from './meta/devices';
import { getAgent } from './meta/agents';

const STATUS_TONE = {
  protected: '#10ffac',
  safe: '#10ffac',
  locked: '#10ffac',
  closed: '#10ffac',
  active: '#10ffac',
  armed: '#10ffac',
  normal: '#10ffac',
  listening: '#10ffac',
  inactive: '#10ffac',
  off: '#888',
  docked: '#888',
  standby: '#888',
  idle: '#888',
  muted: '#ffd60a',
  disabled: '#ffd60a',
  disarmed: '#ff8a2a',
  unlocked: '#ff3b6b',
  open: '#ff8a2a',
  on: '#ffd60a',
  triggered: '#ff8a2a',
  overridden: '#ff8a2a',
  flooding: '#ff3b6b',
  overloaded: '#ff3b6b',
  critical: '#ff3b6b',
  dns_poisoned: '#ff3b6b',
  compromised: '#ff3b6b',
  cleaning: '#ffd60a',
  playing: '#ffd60a',
};

function statusTone(status) {
  return STATUS_TONE[status] || '#aab';
}

export default function SceneTooltip({
  position,                 // {x, y} in viewport pixels, or null to hide
  kind,                     // 'device' | 'agent'
  objectId,                 // device id or agent name
  deviceState,              // optional: live device state from backend
  activeAttack,             // optional: current attack — to derive "under attack"
  agentStatus,              // optional: agent status string (IDLE/CHARGING/…)
}) {
  if (!position || !objectId || !kind) return null;

  // Position the tooltip with a small offset, keep it inside the wrapper.
  const style = {
    position: 'absolute',
    left: Math.max(8, position.x + 14),
    top:  Math.max(8, position.y + 14),
    zIndex: 40,
    pointerEvents: 'none',
    maxWidth: 240,
    padding: '8px 10px',
    background: 'rgba(8, 12, 22, 0.92)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(0, 212, 255, 0.45)',
    borderRadius: 8,
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.55)',
    fontFamily: 'JetBrains Mono, monospace',
    color: '#e6edf3',
    fontSize: 11,
    lineHeight: 1.45,
  };

  if (kind === 'device') {
    const meta = getDevice(objectId);
    if (!meta) return null;
    const status = deviceState?.status || 'unknown';
    const tone = statusTone(status);
    const underAttack = activeAttack?.target === objectId;
    const lastAction = deviceState?.last_action || '—';
    return (
      <div style={style}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>{getDeviceIcon(objectId)}</span>
          <span style={{ fontWeight: 700, color: meta.color }}>{meta.label}</span>
          <span style={{
            marginLeft: 'auto', padding: '1px 5px', borderRadius: 4,
            fontSize: 9, color: '#aab', border: '1px solid #2b3140',
          }}>R{meta.risk}</span>
        </div>
        <Row label="status" value={status} tone={tone} />
        <Row label="under attack" value={underAttack ? 'yes' : 'no'} tone={underAttack ? '#ff8a2a' : '#888'} />
        <Row label="last action" value={lastAction} tone="#aab" />
        <Row label="dangerous" value={meta.dangerous.join(', ').slice(0, 60) || '—'} tone="#ff8a2a" />
      </div>
    );
  }

  if (kind === 'agent') {
    const meta = getAgent(objectId);
    if (!meta) return null;
    const tone =
      agentStatus === 'BREACH'    ? '#ff3b6b' :
      agentStatus === 'BLOCKED'   ? '#10ffac' :
      agentStatus === 'ATTACKING' ? '#ff8a2a' :
      agentStatus === 'CHARGING'  ? '#00d4ff' :
      '#aab';
    const tactic = activeAttack?.agent === objectId ? activeAttack?.tactic : null;
    return (
      <div style={style}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>{meta.icon}</span>
          <span style={{ fontWeight: 700, color: meta.color }}>{meta.name}</span>
        </div>
        <Row label="role"  value={meta.category} tone="#aab" />
        <Row label="state" value={agentStatus || 'IDLE'} tone={tone} />
        {tactic && <Row label="tactic" value={tactic} tone="#00d4ff" />}
        <Row label="goal"  value={meta.short} tone="#aab" />
      </div>
    );
  }

  return null;
}

function Row({ label, value, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: '#7a8294', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: tone, textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </span>
    </div>
  );
}
