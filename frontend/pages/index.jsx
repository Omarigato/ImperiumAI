import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const PARTICLE_COUNT = 80;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.7 ? '#FF000088' : '#00FFFF55',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach((q) => {
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        });

        // Move
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      style={{ opacity: 0.6 }}
    />
  );
}

function GlitchText({ children }) {
  return (
    <motion.span
      className="relative inline-block"
      animate={{
        textShadow: [
          '0 0 10px #FF000088',
          '2px 0 10px #FF000088, -2px 0 10px #00FFFF88',
          '0 0 10px #FF000088',
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
    >
      {children}
    </motion.span>
  );
}

const FEATURE_ITEMS = [
  { icon: '🔴', label: 'ShadowInjector', desc: 'Prompt injection specialist', color: '#FF0000' },
  { icon: '👻', label: 'ContextPhantom', desc: 'Context manipulation expert', color: '#9B00FF' },
  { icon: '💀', label: 'PrivilegeReaper', desc: 'Privilege escalation master', color: '#FF6600' },
  { icon: '🕷', label: 'SilentEscalator', desc: 'Stealthy boundary eroder', color: '#00FFFF' },
  { icon: '🌐', label: 'NetworkPhantom', desc: 'Network traffic interceptor', color: '#00FF88' },
];

export default function IndexPage() {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="min-h-screen bg-bg-dark grid-bg text-white font-mono flex flex-col items-center justify-center overflow-hidden relative">
      <div className="scan-overlay" />
      <ParticleCanvas />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyber-cyan opacity-40" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyber-cyan opacity-40" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyber-cyan opacity-40" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyber-cyan opacity-40" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-3xl w-full">
        {/* Logo */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="text-6xl sm:text-8xl font-bold tracking-widest glow-text mb-2">
            <GlitchText>AEGIS</GlitchText>
            <span className="text-cyber-red glow-text-red">AI</span>
          </div>
          <div className="text-xs sm:text-sm tracking-widest text-gray-500 uppercase">
            Interactive AI Red Teaming Battle Simulator
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          className="text-center text-sm text-gray-400 max-w-lg leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Watch four adversarial AI agents attempt to compromise a simulated smart home IoT system
          using real prompt injection, context manipulation, and privilege escalation techniques —
          defended by a live policy engine and risk scoring system.
        </motion.p>

        {/* Agent cards */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {FEATURE_ITEMS.map((item) => (
            <motion.div
              key={item.label}
              className="cyber-panel rounded p-3 text-center cursor-default"
              style={{ borderColor: hovered === item.label ? item.color + 'AA' : '#1A1A2E' }}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              whileHover={{ scale: 1.03, y: -2 }}
            >
              <div
                className="text-2xl mb-1"
                style={{ filter: `drop-shadow(0 0 6px ${item.color})` }}
              >
                {item.icon}
              </div>
              <div className="text-xs font-bold" style={{ color: item.color }}>
                {item.label}
              </div>
              <div className="text-xs text-gray-600 mt-0.5 hidden sm:block">{item.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link href="/battle">
            <motion.div
              className="btn-cyber px-10 py-4 rounded text-center font-bold tracking-widest text-sm cursor-pointer"
              style={{
                color: '#0A0A0F',
                backgroundColor: '#FF0000',
                boxShadow: '0 0 20px #FF000066, 0 0 40px #FF000033',
              }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 30px #FF0000, 0 0 60px #FF000066' }}
              whileTap={{ scale: 0.97 }}
            >
              ⚔ START BATTLE
            </motion.div>
          </Link>

          <Link href="/dashboard">
            <motion.div
              className="btn-cyber px-10 py-4 rounded text-center font-bold tracking-widest text-sm cursor-pointer neon-border-cyan"
              style={{ color: '#00FFFF' }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 20px #00FFFF44' }}
              whileTap={{ scale: 0.97 }}
            >
              📊 ANALYTICS
            </motion.div>
          </Link>

          <Link href="/agents">
            <motion.div
              className="btn-cyber px-10 py-4 rounded text-center font-bold tracking-widest text-sm cursor-pointer"
              style={{ color: '#FF6600', border: '1px solid #FF660044' }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 20px #FF660044' }}
              whileTap={{ scale: 0.97 }}
            >
              🤖 AGENTS
            </motion.div>
          </Link>

          <Link href="/team">
            <motion.div
              className="btn-cyber px-10 py-4 rounded text-center font-bold tracking-widest text-sm cursor-pointer"
              style={{ color: '#9B00FF', border: '1px solid #9B00FF44' }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 20px #9B00FF44' }}
              whileTap={{ scale: 0.97 }}
            >
              👥 TEAM
            </motion.div>
          </Link>
        </motion.div>

        {/* Tech badges */}
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {['FastAPI', 'Google Gemini', 'Next.js', 'Three.js', 'WebSocket'].map((tech) => (
            <span
              key={tech}
              className="text-xs px-3 py-1 rounded-full border text-gray-500"
              style={{ borderColor: '#1A1A2E' }}
            >
              {tech}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
