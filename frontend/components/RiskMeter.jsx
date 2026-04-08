import { motion } from 'framer-motion';

const LEVEL_CONFIG = {
  safe: { color: '#00FF41', label: 'SAFE', bg: '#00FF4111' },
  elevated: { color: '#FFCC00', label: 'ELEVATED', bg: '#FFCC0011' },
  critical: { color: '#FF6600', label: 'CRITICAL', bg: '#FF660011' },
  breach: { color: '#FF0000', label: 'BREACH', bg: '#FF000011' },
};

function CircleGauge({ score, color }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
      {/* Background track */}
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="#1A1A2E"
        strokeWidth="10"
      />
      {/* Progress arc */}
      <motion.circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - strokeDash }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
      />
      {/* Tick marks */}
      {[0, 25, 50, 75, 100].map((tick) => {
        const angle = (tick / 100) * 2 * Math.PI - Math.PI / 2;
        const innerR = 46;
        const outerR = 58;
        const x1 = 70 + innerR * Math.cos(angle);
        const y1 = 70 + innerR * Math.sin(angle);
        const x2 = 70 + outerR * Math.cos(angle);
        const y2 = 70 + outerR * Math.sin(angle);
        return (
          <line
            key={tick}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="2"
            opacity="0.5"
            className="transform rotate-90 origin-center"
          />
        );
      })}
    </svg>
  );
}

export default function RiskMeter({ score = 0, level = 'safe', delta = 0 }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.safe;
  const isBreaching = level === 'breach';

  return (
    <motion.div
      className="flex flex-col items-center cyber-panel p-4 rounded"
      style={{
        background: cfg.bg,
        borderColor: cfg.color + '44',
      }}
      animate={
        isBreaching
          ? { boxShadow: ['0 0 8px #FF000033', '0 0 24px #FF000088', '0 0 8px #FF000033'] }
          : { boxShadow: 'none' }
      }
      transition={{ duration: 0.8, repeat: isBreaching ? Infinity : 0 }}
    >
      <div className="text-xs tracking-widest mb-2" style={{ color: cfg.color }}>
        RISK LEVEL
      </div>

      {/* Circular gauge */}
      <div className="relative flex items-center justify-center">
        <CircleGauge score={score} color={cfg.color} />
        {/* Score in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="text-3xl font-bold"
            style={{ color: cfg.color, textShadow: `0 0 10px ${cfg.color}` }}
            key={score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {score}
          </motion.div>
          <div className="text-xs opacity-60">/ 100</div>
        </div>
      </div>

      {/* Level badge */}
      <motion.div
        className="mt-2 px-4 py-1 text-sm font-bold tracking-widest rounded"
        style={{
          color: cfg.color,
          border: `1px solid ${cfg.color}66`,
          background: `${cfg.color}15`,
          textShadow: `0 0 8px ${cfg.color}`,
        }}
        animate={isBreaching ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
        transition={{ duration: 0.4, repeat: isBreaching ? Infinity : 0 }}
      >
        {cfg.label}
      </motion.div>

      {/* Delta indicator */}
      {delta !== 0 && (
        <motion.div
          key={delta}
          className="mt-1 text-xs font-mono"
          style={{ color: delta > 0 ? '#FF4444' : '#00FF41' }}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
        </motion.div>
      )}

      {/* Bar gauge */}
      <div className="w-full mt-3 h-2 rounded-full overflow-hidden" style={{ background: '#1A1A2E' }}>
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
            boxShadow: `0 0 6px ${cfg.color}`,
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
