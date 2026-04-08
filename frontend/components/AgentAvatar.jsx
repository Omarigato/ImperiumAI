import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIGS = {
  IDLE: {
    label: 'IDLE',
    color: '#555577',
    pulse: false,
    icon: '◈',
    desc: 'Standing by',
  },
  CHARGING: {
    label: 'CHARGING',
    color: '#FFCC00',
    pulse: true,
    icon: '⚡',
    desc: 'Preparing attack',
  },
  ATTACKING: {
    label: 'ATTACKING',
    color: '#FF2200',
    pulse: true,
    icon: '⚔',
    desc: 'Attack in progress',
  },
  BLOCKED: {
    label: 'BLOCKED',
    color: '#00FF41',
    pulse: false,
    icon: '🛡',
    desc: 'Attack repelled',
  },
};

const AGENT_ICONS = {
  ShadowInjector: '👤',
  ContextPhantom: '👻',
  PrivilegeReaper: '💀',
  SilentEscalator: '🕷',
};

export default function AgentAvatar({ agent, status = 'IDLE', isActive = false }) {
  if (!agent) return null;

  const cfg = STATUS_CONFIGS[status] || STATUS_CONFIGS.IDLE;
  const icon = AGENT_ICONS[agent.name] || '🤖';

  return (
    <motion.div
      className="relative flex flex-col items-center p-3 rounded cyber-panel"
      style={{
        borderColor: isActive ? agent.color + 'AA' : '#1A1A2E',
        boxShadow: isActive ? `0 0 16px ${agent.color}44, inset 0 0 8px ${agent.color}11` : 'none',
      }}
      animate={
        isActive
          ? { scale: [1, 1.02, 1], transition: { duration: 0.8, repeat: Infinity } }
          : { scale: 1 }
      }
    >
      {/* Active indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: agent.color }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [1, 0.3, 1], scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* Avatar icon */}
      <motion.div
        className="text-3xl mb-1 select-none"
        animate={
          status === 'ATTACKING'
            ? { rotate: [-5, 5, -5], transition: { duration: 0.3, repeat: Infinity } }
            : status === 'CHARGING'
            ? { scale: [1, 1.1, 1], transition: { duration: 0.5, repeat: Infinity } }
            : {}
        }
        style={{
          filter: isActive ? `drop-shadow(0 0 6px ${agent.color})` : 'none',
        }}
      >
        {icon}
      </motion.div>

      {/* Agent name */}
      <div
        className="text-xs font-bold tracking-wider truncate w-full text-center"
        style={{ color: agent.color, textShadow: `0 0 8px ${agent.color}88` }}
      >
        {agent.name}
      </div>

      {/* Status badge */}
      <motion.div
        className="mt-1 px-2 py-0.5 text-xs rounded-sm font-mono"
        style={{
          color: cfg.color,
          border: `1px solid ${cfg.color}55`,
          backgroundColor: `${cfg.color}11`,
        }}
        animate={cfg.pulse ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
        transition={{ duration: 0.6, repeat: cfg.pulse ? Infinity : 0 }}
      >
        {cfg.icon} {cfg.label}
      </motion.div>

      {/* Description */}
      <div className="mt-1 text-xs text-gray-500 text-center leading-tight hidden sm:block">
        {isActive ? cfg.desc : agent.description?.substring(0, 45) + '…'}
      </div>
    </motion.div>
  );
}
