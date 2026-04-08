import { motion, AnimatePresence } from 'framer-motion';

function Particle({ color, index }) {
  const angle = (index / 12) * Math.PI * 2;
  const distance = 40 + Math.random() * 60;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full"
      style={{
        backgroundColor: color,
        top: '50%',
        left: '50%',
        boxShadow: `0 0 6px ${color}`,
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  );
}

export default function AttackAnimation({ active, success, agentColor = '#FF0000', targetName = '' }) {
  if (!active) return null;

  const color = success ? agentColor : '#0088FF';
  const label = success ? '⚔ BREACH' : '🛡 BLOCKED';
  const labelColor = success ? agentColor : '#00FF41';

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Attack beam overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, ${color}15 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, times: [0, 0.3, 1] }}
        />

        {/* Central burst */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ duration: 0.4, ease: 'backOut' }}
        >
          {/* Particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Particle key={i} color={color} index={i} />
          ))}

          {/* Central circle */}
          <motion.div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              border: `2px solid ${color}`,
              boxShadow: `0 0 20px ${color}, 0 0 40px ${color}44`,
              background: `${color}22`,
            }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3, repeat: 2 }}
          >
            <span className="text-2xl">{success ? '💥' : '🛡'}</span>
          </motion.div>
        </motion.div>

        {/* Label */}
        <motion.div
          className="absolute bottom-8 text-lg font-bold tracking-widest"
          style={{ color: labelColor, textShadow: `0 0 12px ${labelColor}` }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -10] }}
          transition={{ duration: 1.2, times: [0, 0.2, 0.7, 1] }}
        >
          {label}
          {targetName && (
            <span className="ml-2 text-sm opacity-80">→ {targetName}</span>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
