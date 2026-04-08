import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SOURCE_STYLES = {
  AttackAgent: { color: '#FF4444', prefix: '[ATTACK]' },
  Gemini:      { color: '#CC66FF', prefix: '[GEMINI]' },
  Policy:      { color: '#FFCC00', prefix: '[POLICY]' },
  IoT:         { color: '#00CCFF', prefix: '[IOT]' },
  RiskEngine:  { color: '#FF8800', prefix: '[RISK]' },
  System:      { color: '#00FF41', prefix: '[SYSTEM]' },
};

const MAX_LOGS = 100;

function LogEntry({ log, isNew }) {
  const style = SOURCE_STYLES[log.source] || { color: '#AAAAAA', prefix: `[${log.source || 'LOG'}]` };

  return (
    <motion.div
      className="flex gap-2 py-0.5 text-xs font-mono leading-relaxed"
      initial={isNew ? { opacity: 0, x: -10, backgroundColor: style.color + '22' } : false}
      animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
      transition={{ duration: 0.3 }}
    >
      <span className="opacity-40 shrink-0 text-gray-500">
        {log.time || '00:00:00'}
      </span>
      <span className="shrink-0 font-bold" style={{ color: style.color }}>
        {style.prefix}
      </span>
      <span className="opacity-90 break-all" style={{ color: style.color + 'CC' }}>
        {log.message}
      </span>
    </motion.div>
  );
}

export default function LiveLogs({ logs = [] }) {
  const scrollRef = useRef(null);
  const [prevCount, setPrevCount] = useState(0);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    setPrevCount(logs.length);
  }, [logs.length]);

  const trimmedLogs = logs.slice(-MAX_LOGS);

  return (
    <div className="flex flex-col h-full cyber-panel rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-900/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
          <span className="text-xs tracking-widest glow-text-green font-bold">LIVE LOGS</span>
        </div>
        <span className="text-xs text-gray-600">{trimmedLogs.length} entries</span>
      </div>

      {/* Log body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5"
        style={{ scrollBehavior: 'smooth' }}
      >
        <AnimatePresence initial={false}>
          {trimmedLogs.length === 0 ? (
            <div className="text-xs text-gray-600 italic p-2">
              Awaiting simulation events...
            </div>
          ) : (
            trimmedLogs.map((log, i) => (
              <LogEntry
                key={log.id || i}
                log={log}
                isNew={i >= prevCount - 1}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-cyan-900/20 flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(SOURCE_STYLES).map(([source, cfg]) => (
          <span key={source} className="text-xs" style={{ color: cfg.color }}>
            {cfg.prefix}
          </span>
        ))}
      </div>
    </div>
  );
}
