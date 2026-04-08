import { useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SOURCE_STYLES = {
  AttackAgent: { color: '#FF4444', prefix: '[ATTACK]' },
  // LLM providers — dynamic prefix handled below
  'LLM[OPENAI]': { color: '#10B981', prefix: '[GPT-4o]' },
  'LLM[GEMINI]': { color: '#4285F4', prefix: '[GEMINI]' },
  'LLM[DEEPSEEK]': { color: '#FF6B35', prefix: '[DEEPSK]' },
  'LLM[SIMULATION]': { color: '#6B7280', prefix: '[SIM]' },
  Gemini: { color: '#4285F4', prefix: '[GEMINI]' },
  Policy: { color: '#FFCC00', prefix: '[POLICY]' },
  IoT: { color: '#00CCFF', prefix: '[IOT]' },
  RiskEngine: { color: '#FF8800', prefix: '[RISK]' },
  System: { color: '#00FF41', prefix: '[SYS]' },
};

function getStyle(source) {
  if (SOURCE_STYLES[source]) return SOURCE_STYLES[source];
  // Handle dynamic LLM[*] sources
  if (source?.startsWith('LLM[')) return { color: '#CC66FF', prefix: `[${source.slice(4, -1)}]` };
  return { color: '#888888', prefix: `[${(source || 'LOG').slice(0, 6)}]` };
}

// Memoized single log row — prevents full list re-render
const LogRow = memo(function LogRow({ log }) {
  const style = getStyle(log.source);
  return (
    <div className="flex gap-1.5 py-0.5 text-xs font-mono leading-relaxed">
      <span className="shrink-0 text-gray-600 tabular-nums">{log.time}</span>
      <span className="shrink-0 font-bold" style={{ color: style.color }}>{style.prefix}</span>
      <span className="break-all opacity-90" style={{ color: style.color + 'CC' }}>{log.message}</span>
    </div>
  );
});

export default function LiveLogs({ logs = [] }) {
  const scrollRef = useRef(null);
  const prevLen = useRef(0);
  const [count, setCount] = useState(0);

  // Auto-scroll only when new entries arrive
  useEffect(() => {
    if (logs.length !== prevLen.current) {
      prevLen.current = logs.length;
      setCount(logs.length);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full min-h-0 cyber-panel rounded overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-3 py-1.5 border-b border-cyan-900/30">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
          <span className="text-xs tracking-widest glow-text-green font-bold">LIVE LOGS</span>
        </div>
        <span className="text-xs text-gray-600">{count}</span>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-px">
        {logs.length === 0
          ? <div className="text-xs text-gray-600 italic p-1">Awaiting events…</div>
          : logs.map((log, i) => <LogRow key={log.id ?? i} log={log} />)
        }
      </div>

      {/* Source legend */}
      <div className="flex-none px-2 py-1 border-t border-cyan-900/20 flex flex-wrap gap-x-2 gap-y-0.5">
        {[
          { color: '#FF4444', label: 'ATK' },
          { color: '#10B981', label: 'LLM' },
          { color: '#FFCC00', label: 'POL' },
          { color: '#00CCFF', label: 'IOT' },
          { color: '#FF8800', label: 'RSK' },
          { color: '#00FF41', label: 'SYS' },
        ].map(s => (
          <span key={s.label} className="text-xs opacity-70" style={{ color: s.color }}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}
