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

export default function BattleResult({ result, onPlayAgain, onClose }) {
  if (!result) return null;

  const isRedTeamWin = result.winner === 'red_team';
  const primaryColor = isRedTeamWin ? '#FF0000' : '#00FF41';
  const label = isRedTeamWin ? '🔥 RED TEAM WINS' : '🛡 DEFENSE WINS';
  const subtitle = isRedTeamWin
    ? 'The smart home has been compromised!'
    : 'All attacks successfully repelled!';

  const stats = result.stats || {};

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

        {/* Card */}
        <motion.div
          className="relative z-10 cyber-panel rounded-lg p-8 max-w-lg w-full mx-4 text-center"
          style={{
            borderColor: primaryColor + '88',
            boxShadow: `0 0 40px ${primaryColor}44, 0 0 80px ${primaryColor}22`,
          }}
          initial={{ scale: 0.5, rotateX: 20, opacity: 0 }}
          animate={{ scale: 1, rotateX: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-sm"
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
            className="text-4xl font-bold mb-2 tracking-widest"
            style={{
              color: primaryColor,
              textShadow: `0 0 20px ${primaryColor}, 0 0 40px ${primaryColor}`,
            }}
            animate={{ textShadow: [`0 0 20px ${primaryColor}`, `0 0 40px ${primaryColor}`, `0 0 20px ${primaryColor}`] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {label}
          </motion.div>

          <p className="text-gray-400 mb-6 text-sm">{subtitle}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Rounds" value={result.rounds || 0} color="#00FFFF" />
            <StatCard label="Red Wins" value={stats.red_wins || 0} color="#FF4444" />
            <StatCard label="Blocks" value={stats.defense_wins || 0} color="#00FF41" />
          </div>

          {/* Final risk score */}
          <div
            className="mb-6 py-3 rounded"
            style={{ background: `${primaryColor}11`, border: `1px solid ${primaryColor}33` }}
          >
            <div className="text-xs text-gray-500 tracking-wider">FINAL RISK SCORE</div>
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>
              {result.final_score ?? '—'} / 100
            </div>
          </div>

          {/* Play again */}
          <motion.button
            onClick={onPlayAgain}
            className="btn-cyber w-full py-3 text-sm font-bold tracking-widest rounded"
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
