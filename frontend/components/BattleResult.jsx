import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function StatCard({ label, value, color }) {
  return (
    <div
      className="flex flex-col items-center p-4 rounded cyber-panel"
      style={{ borderColor: color + '44' }}
    >
      <div className="text-3xl font-bold" style={{ color, textShadow: `0 0 12px ${color}` }}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1 tracking-wider uppercase">{label}</div>
    </div>
  );
}

/** Floating particle confetti / explosion effect */
function ResultParticles({ isRedTeamWin }) {
  const particles = useMemo(() => (
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 3 + Math.random() * 8,
      delay: Math.random() * 0.6,
      duration: 1.2 + Math.random() * 1.5,
      color: isRedTeamWin
        ? ['#FF0000', '#FF4400', '#FF8800', '#FFCC00'][Math.floor(Math.random() * 4)]
        : ['#00FF41', '#00FFCC', '#00AAFF', '#88FF00'][Math.floor(Math.random() * 4)],
      tx: (Math.random() - 0.5) * 200,
      ty: -(50 + Math.random() * 150),
    }))
  ), [isRedTeamWin]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
          animate={{
            opacity: 0,
            x: p.tx,
            y: p.ty,
            scale: 0.2,
            rotate: Math.random() * 720 - 360,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

const AGENT_COLORS = {
  ShadowInjector: '#FF4444',
  ContextPhantom: '#CC66FF',
  PrivilegeReaper: '#FF8800',
  SilentEscalator: '#00FFFF',
  NetworkPhantom: '#00FF88',
};

export default function BattleResult({ result, onPlayAgain, onClose }) {
  if (!result) return null;

  const isRedTeamWin = result.winner === 'red_team';
  const primaryColor = isRedTeamWin ? '#FF0000' : '#00FF41';
  const label = isRedTeamWin ? '🔥 RED TEAM WINS' : '🛡 DEFENSE WINS';
  const subtitle = isRedTeamWin
    ? 'The smart home has been compromised!'
    : 'All attacks successfully repelled!';

  const stats = result.stats || {};

  // Top performing agent from memory summary
  const agentStats = {};
  (result.memory_summary?.history || []).forEach(e => {
    if (!agentStats[e.agent]) agentStats[e.agent] = { wins: 0, total: 0 };
    agentStats[e.agent].total++;
    if (e.success) agentStats[e.agent].wins++;
  });
  const topAgent = Object.entries(agentStats)
    .filter(([, s]) => s.total > 0)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

  // Top tactic
  const topTactic = result.memory_summary?.most_successful_tactics?.[0];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: 'rgba(5, 5, 10, 0.92)' }}
      >
        {/* Backdrop grid flicker */}
        <div
          className="absolute inset-0 grid-bg opacity-30"
          style={{ animation: 'flicker 0.5s infinite' }}
        />

        {/* Background color pulse */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              `radial-gradient(circle at center, ${primaryColor}08 0%, transparent 70%)`,
              `radial-gradient(circle at center, ${primaryColor}18 0%, transparent 70%)`,
              `radial-gradient(circle at center, ${primaryColor}08 0%, transparent 70%)`,
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Card */}
        <motion.div
          className="relative z-10 cyber-panel rounded-lg p-8 max-w-lg w-full mx-4 text-center overflow-hidden"
          style={{
            borderColor: primaryColor + '88',
            boxShadow: `0 0 40px ${primaryColor}44, 0 0 80px ${primaryColor}22`,
          }}
          initial={{ scale: 0.5, rotateX: 20, opacity: 0 }}
          animate={{ scale: 1, rotateX: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          {/* Particle explosion */}
          <ResultParticles isRedTeamWin={isRedTeamWin} />

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-sm z-20"
              title="Dismiss"
            >
              ✕
            </button>
          )}
          {/* Scanning line */}
          <div
            className="absolute inset-x-0 top-0 h-0.5 rounded-t"
            style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}
          />

          {/* Title */}
          <motion.div
            className="text-4xl font-bold mb-2 tracking-widest relative z-10"
            style={{
              color: primaryColor,
              textShadow: `0 0 20px ${primaryColor}, 0 0 40px ${primaryColor}`,
            }}
            animate={{ textShadow: [`0 0 20px ${primaryColor}`, `0 0 50px ${primaryColor}`, `0 0 20px ${primaryColor}`] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {label}
          </motion.div>

          <p className="text-gray-400 mb-5 text-sm relative z-10">{subtitle}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4 relative z-10">
            <StatCard label="Rounds" value={result.rounds || 0} color="#00FFFF" />
            <StatCard label="Red Wins" value={stats.red_wins || 0} color="#FF4444" />
            <StatCard label="Blocks" value={stats.defense_wins || 0} color="#00FF41" />
          </div>

          {/* Final risk score */}
          <div
            className="mb-4 py-3 rounded relative z-10"
            style={{ background: `${primaryColor}11`, border: `1px solid ${primaryColor}33` }}
          >
            <div className="text-xs text-gray-500 tracking-wider">FINAL RISK SCORE</div>
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>
              {result.final_score ?? '—'} / 100
            </div>
          </div>

          {/* Agent learning insights */}
          {(topAgent || topTactic) && (
            <div className="mb-4 rounded p-3 text-left relative z-10"
              style={{ background: '#0A0A1A', border: '1px solid #1A1A2E' }}>
              <div className="text-xs tracking-widest text-gray-600 mb-2">⚡ BATTLE INTELLIGENCE</div>
              {topAgent && (
                <div className="text-xs mb-1">
                  <span className="text-gray-500">Most Dangerous Agent: </span>
                  <span style={{ color: AGENT_COLORS[topAgent[0]] || '#FF4444' }} className="font-bold">
                    {topAgent[0]}
                  </span>
                  <span className="text-gray-600"> ({topAgent[1].wins}/{topAgent[1].total} breaches)</span>
                </div>
              )}
              {topTactic && (
                <div className="text-xs">
                  <span className="text-gray-500">Top Attack Tactic: </span>
                  <span className="text-yellow-400 font-bold">
                    {topTactic.tactic?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-600"> ({Math.round(topTactic.rate * 100)}% success)</span>
                </div>
              )}
            </div>
          )}

          {/* Play again */}
          <motion.button
            onClick={onPlayAgain}
            className="btn-cyber w-full py-3 text-sm font-bold tracking-widest rounded relative z-10"
            style={{
              color: '#0A0A0F',
              backgroundColor: primaryColor,
              boxShadow: `0 0 16px ${primaryColor}88`,
            }}
            whileHover={{ scale: 1.03, boxShadow: `0 0 28px ${primaryColor}` }}
            whileTap={{ scale: 0.97 }}
          >
            ↺ PLAY AGAIN
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
