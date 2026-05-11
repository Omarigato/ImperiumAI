import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PROVIDERS = [
  { id: 'groq',       label: 'Groq',       color: '#F55036', icon: '⚡', free: true,  hint: 'Llama 3.3 70B / Mixtral — ultra-fast' },
  { id: 'gemini',     label: 'Gemini',     color: '#4285F4', icon: '✨', free: true,  hint: 'Google Gemini 2.0 Flash' },
  { id: 'openrouter', label: 'OpenRouter', color: '#A855F7', icon: '🌐', free: true,  hint: 'Free Llama / Mistral / Gemma' },
  { id: 'openai',     label: 'GPT-4o',     color: '#10B981', icon: '🤖', free: false, hint: 'OpenAI (paid)' },
  { id: 'deepseek',   label: 'DeepSeek',   color: '#FF6B35', icon: '🔍', free: false, hint: 'DeepSeek (paid)' },
  { id: 'simulation', label: 'Sim',        color: '#6B7280', icon: '⚙',  free: true,  hint: 'Offline deterministic mode' },
];

export default function LLMSwitcher({ activeProvider, onSwitch }) {
  const [availability, setAvailability] = useState({});
  const [multiLLM, setMultiLLM] = useState(true);
  const [agentAssignments, setAgentAssignments] = useState({});
  const [switching, setSwitching] = useState(false);

  // Fetch backend status (which providers have API keys + multi-LLM state)
  const refreshStatus = () => {
    fetch(`${API}/api/llm/status`)
      .then(r => r.json())
      .then(data => {
        const avail = {};
        Object.entries(data.providers || {}).forEach(([k, v]) => {
          avail[k] = v.available;
        });
        setAvailability(avail);
        if (typeof data.multi_llm === 'boolean') setMultiLLM(data.multi_llm);
        if (data.agent_assignments) setAgentAssignments(data.agent_assignments);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSwitch = async (providerId) => {
    if (providerId === activeProvider || switching) return;
    setSwitching(true);
    try {
      const res = await fetch(`${API}/api/llm/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();
      if (!data.error) onSwitch(providerId);
    } catch {}
    finally { setSwitching(false); }
  };

  const toggleMultiLLM = async () => {
    const next = !multiLLM;
    setMultiLLM(next);
    try {
      await fetch(`${API}/api/llm/multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
    } catch {}
  };

  const assignedProviders = new Set(Object.values(agentAssignments).map(a => a.provider));

  return (
    <div className="flex flex-col gap-1.5 py-1.5 px-2 cyber-panel rounded">
      {/* Top row: provider chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-600 tracking-wider flex-none">
          {multiLLM ? 'AGENTS USE:' : 'DEFENDER LLM:'}
        </span>
        <div className="flex gap-1.5 flex-wrap flex-1">
          {PROVIDERS.map(p => {
            const isActive = !multiLLM && activeProvider === p.id;
            const isAvail = availability[p.id] !== false;
            const isAssigned = multiLLM && assignedProviders.has(p.id);
            const color = isAvail ? p.color : '#374151';
            const highlighted = isActive || isAssigned;

            return (
              <motion.button
                key={p.id}
                onClick={() => handleSwitch(p.id)}
                disabled={switching || multiLLM}
                className="relative flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono tracking-wider transition-all"
                style={{
                  background: highlighted ? `${color}22` : 'transparent',
                  border: `1px solid ${highlighted ? color : color + '44'}`,
                  color: highlighted ? color : color + '99',
                  cursor: switching ? 'wait' : multiLLM ? 'default' : 'pointer',
                  opacity: isAvail ? 1 : 0.5,
                }}
                whileHover={isAvail && !multiLLM ? { scale: 1.04 } : {}}
                whileTap={isAvail && !multiLLM ? { scale: 0.96 } : {}}
                title={isAvail ? p.hint : `${p.label} — no API key configured`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                {p.free && isAvail && (
                  <span
                    className="text-[9px] px-1 rounded"
                    style={{ background: '#10ffac22', color: '#10ffac', border: '1px solid #10ffac44' }}
                  >
                    FREE
                  </span>
                )}
                {highlighted && (
                  <motion.div
                    className="absolute inset-0 rounded pointer-events-none"
                    style={{ boxShadow: `0 0 8px ${color}66` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                {!isAvail && p.id !== 'simulation' && (
                  <span className="text-gray-600 ml-0.5" title="No API key">🔒</span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Multi-LLM toggle */}
        <motion.button
          onClick={toggleMultiLLM}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono tracking-wider transition-all"
          style={{
            background: multiLLM ? '#a855f733' : 'transparent',
            border: `1px solid ${multiLLM ? '#a855f7' : '#a855f744'}`,
            color: multiLLM ? '#d8b4fe' : '#a855f799',
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title={multiLLM ? 'Multi-LLM mode: each agent uses its own model' : 'Single-LLM mode'}
        >
          <span>{multiLLM ? '🧠×5' : '🧠'}</span>
          <span>{multiLLM ? 'MULTI-LLM' : 'SINGLE-LLM'}</span>
        </motion.button>
      </div>

      {/* Agent → model assignment row (visible in multi-LLM mode) */}
      {multiLLM && Object.keys(agentAssignments).length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono pt-0.5 border-t border-gray-800">
          {Object.entries(agentAssignments).map(([agent, info]) => {
            const provider = PROVIDERS.find(p => p.id === info.provider);
            const color = availability[info.provider] === false ? '#6B728088' : (provider?.color || '#888');
            const modelShort = (info.model || '').split('/').pop().split(':')[0].slice(0, 18);
            return (
              <div
                key={agent}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{
                  background: `${color}11`,
                  border: `1px solid ${color}44`,
                }}
              >
                <span style={{ color }}>{agent.replace(/Injector|Phantom|Reaper|Escalator/g, '').slice(0, 6) || agent.slice(0, 6)}</span>
                <span className="text-gray-600">→</span>
                <span style={{ color }}>{provider?.icon}</span>
                <span style={{ color: color + 'cc' }}>{modelShort}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
