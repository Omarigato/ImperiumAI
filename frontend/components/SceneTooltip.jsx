/**
 * SceneTooltip — DOM-level overlay that shows context for the object
 * the user is hovering over inside the 3D scene.
 *
 * `position`  — { x, y } in pixels relative to the scene wrapper, or null.
 * `kind`      — 'device' | 'agent'
 * `objectId`  — device id (e.g. 'front_door') or agent name (e.g. 'ShadowInjector')
 * `deviceState` — current backend state of the hovered device (when kind==='device')
 * `agentStatus` — IDLE / CHARGING / ATTACKING / BREACH / BLOCKED
 * `activeAttack` — currently-running attack (used to highlight if relevant)
 */
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { getDevice } from './meta/devices';
import { AGENTS as AGENT_META } from './meta/agents';

const STATUS_COLORS = {
  CHARGING:  '#00d4ff',
  ATTACKING: '#ff9f0a',
  BREACH:    '#ff3b6b',
  BLOCKED:   '#10ffac',
  IDLE:      '#9aa3b2',
};

export default function SceneTooltip({
  position, kind, objectId, deviceState, agentStatus, activeAttack,
}) {
  const content = useMemo(() => {
    if (!position || !objectId) return null;
    if (kind === 'device') {
      const d = getDevice(objectId);
      if (!d) return null;
      return {
        title: `${d.icon} ${d.label}`,
        color: d.color,
        rows: [
          ['category',   d.category],
          ['risk',       `${d.risk}/5`],
          ['state',      deviceState?.status || 'unknown'],
          ['safe',       (d.safe || []).join(', ')],
          ['dangerous',  (d.dangerous || []).join(', ')],
        ],
        note: d.cyberWhy,
        highlight: activeAttack?.target === objectId,
      };
    }
    if (kind === 'agent') {
      const a = AGENT_META.find((x) => x.name === objectId);
      if (!a) return null;
      return {
        title: `${a.icon} ${a.name}`,
        color: a.color,
        rows: [
          ['category',  a.category],
          ['status',    agentStatus || 'IDLE'],
          ['tactics',   (a.techniques || []).slice(0, 3).join(', ') + (a.techniques?.length > 3 ? '…' : '')],
        ],
        note: a.short,
        highlight: activeAttack?.agent === objectId,
      };
    }
    return null;
  }, [position, kind, objectId, deviceState, agentStatus, activeAttack]);

  return (
    <AnimatePresence>
      {content && position && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'absolute',
            left: Math.min(position.x + 12, 999999),
            top:  Math.min(position.y + 12, 999999),
            zIndex: 40,
            pointerEvents: 'none',
            maxWidth: 280,
            padding: 10,
            borderRadius: 8,
            background: 'rgba(10, 14, 22, 0.92)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${content.color}55`,
            boxShadow: content.highlight
              ? `0 0 0 1px ${content.color}, 0 12px 30px rgba(0,0,0,0.4)`
              : '0 12px 30px rgba(0,0,0,0.4)',
            color: 'var(--wv-text, #e7e9ee)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12,
          }}
        >
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12, fontWeight: 700,
            color: content.color, marginBottom: 6,
          }}>
            {content.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {content.rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                <span style={{ color: 'var(--wv-text-3, #8a93a3)', minWidth: 70 }}>{k}</span>
                <span style={{
                  color: k === 'status' && STATUS_COLORS[String(v).toUpperCase()]
                    ? STATUS_COLORS[String(v).toUpperCase()]
                    : 'var(--wv-text, #e7e9ee)',
                  fontFamily: 'JetBrains Mono, monospace',
                  wordBreak: 'break-word',
                }}>{v}</span>
              </div>
            ))}
          </div>
          {content.note && (
            <div style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid rgba(255,255,255,0.07)',
              fontSize: 11,
              color: 'var(--wv-text-2, #aab)',
              lineHeight: 1.4,
            }}>
              {content.note}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
