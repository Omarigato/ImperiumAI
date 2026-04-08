import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const API = 'http://localhost:8000';

const PROVIDERS = [
  { id: 'openai',     label: 'GPT-4o',    color: '#10B981', icon: '🤖' },
  { id: 'gemini',     label: 'Gemini',    color: '#4285F4', icon: '✨' },
  { id: 'deepseek',   label: 'DeepSeek',  color: '#FF6B35', icon: '🔍' },
  { id: 'simulation', label: 'Simulate',  color: '#6B7280', icon: '⚙' },
];

export default function LLMSwitcher({ activeProvider, onSwitch }) {
  const [availability, setAvailability] = useState({});
  const [switching, setSwitching]       = useState(false);

  // Fetch which providers have API keys configured
  useEffect(() => {
    fetch(`${API}/api/llm/status`)
      .then(r => r.json())
      .then(data => {
        const avail = {};
        Object.entries(data.providers || {}).forEach(([k, v]) => {
          avail[k] = v.available;
        });
        setAvailability(avail);
      })
      .catch(() => {});
  }, []);

  const handleSwitch = async (providerId) => {
    if (providerId === activeProvider || switching) return;
    setSwitching(true);
    try {
      const res  = await fetch(`${API}/api/llm/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();
      if (!data.error) onSwitch(providerId);
    } catch {}
    finally { setSwitching(false); }
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 cyber-panel rounded">
      <span className="text-xs text-gray-600 tracking-wider flex-none">DEFENDER LLM:</span>
      <div className="flex gap-1.5 flex-wrap">
        {PROVIDERS.map(p => {
          const isActive    = activeProvider === p.id;
          const isAvail     = availability[p.id] !== false;
          const color       = isAvail ? p.color : '#374151';

          return (
            <motion.button
              key={p.id}
              onClick={() => handleSwitch(p.id)}
              disabled={switching}
              className="relative flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono tracking-wider transition-all"
              style={{
                background:   isActive ? `${color}22` : 'transparent',
                border:       `1px solid ${isActive ? color : color + '44'}`,
                color:        isActive ? color : color + '99',
                cursor:       switching ? 'wait' : 'pointer',
                opacity:      isAvail ? 1 : 0.5,
              }}
              whileHover={isAvail ? { scale: 1.04 } : {}}
              whileTap={isAvail ? { scale: 0.96 } : {}}
              title={isAvail ? `Use ${p.label}` : `${p.label} — no API key configured`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded pointer-events-none"
                  style={{ boxShadow: `0 0 8px ${color}66` }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {/* Active dot */}
              {isActive && (
                <div
                  className="w-1.5 h-1.5 rounded-full ml-0.5"
                  style={{ background: color }}
                />
              )}
              {/* No-key indicator */}
              {!isAvail && p.id !== 'simulation' && (
                <span className="text-gray-600 ml-0.5" title="No API key">🔒</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
