import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';

const TEAM_MEMBERS = [
  {
    id: 1,
    name: 'Аким Омар Айді',
    nameEn: 'Akim Omar Aidi',
    role: 'Project Lead & Full-Stack Developer',
    studentId: '34732',
    university: 'IITU — International Information Technology University',
    bio: `Дипломдық жобаның жетекшісі және негізгі әзірлеушісі. AegisAI — ақылды үй қауіпсіздігін зерттеуге арналған интерактивті AI Red Teaming Battle Simulator жобасын дайындады.

Specializes in AI systems, cybersecurity research, and interactive 3D visualization. Passionate about exploring how adversarial AI agents can stress-test smart-home IoT security — and how LLMs like Gemini, GPT-4, and Claude respond under prompt injection attacks.`,
    skills: ['Python', 'FastAPI', 'React', 'Next.js', 'Three.js', 'AI/ML', 'Cybersecurity', 'WebSocket'],
    contacts: {
      email: '34732@iitu.edu.kz',
      telegram: 'Telegram: @akim_omar',
      university: 'IITU, Almaty, Kazakhstan',
    },
    gradient: 'from-cyan-900/30 to-blue-900/20',
    borderColor: '#00FFFF',
    accentColor: '#00FFFF',
  },
];

const PROJECT_INFO = {
  title: 'AegisAI — Smart Home Red Teaming Simulator',
  type: 'Diploma Project',
  year: '2025',
  university: 'International Information Technology University (IITU)',
  description:
    'An interactive AI-driven cybersecurity simulator that deploys adversarial AI agents to stress-test a simulated smart-home IoT environment. The system evaluates LLM responses to prompt injection, context manipulation, and privilege escalation attacks — providing real-time risk scoring and analytics.',
  technologies: [
    { name: 'Frontend', tech: 'Next.js 14 + React 18 + Three.js + Framer Motion' },
    { name: 'Backend', tech: 'FastAPI + Python + WebSocket' },
    { name: 'AI/LLM', tech: 'Google Gemini, GPT-4, Claude, DeepSeek' },
    { name: '3D Scene', tech: '@react-three/fiber + @react-three/drei' },
    { name: 'Analytics', tech: 'Recharts + Real-time WebSocket data' },
    { name: 'Security', tech: 'Policy Engine + Risk Scoring System' },
  ],
};

function ContactBadge({ icon, label, href }) {
  const content = (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 rounded text-xs font-mono"
      style={{ background: '#0F0F1A', border: '1px solid #1A1A2E', color: '#00FFFF' }}
      whileHover={{ borderColor: '#00FFFF88', scale: 1.02 }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </motion.div>
  );
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}

function MemberCard({ member, index }) {
  const [photoError, setPhotoError] = useState(false);

  return (
    <motion.div
      className="cyber-panel rounded-xl p-8 max-w-2xl w-full"
      style={{ borderColor: member.borderColor + '44' }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 + 0.3 }}
    >
      {/* Top section: avatar + name */}
      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-6">
        {/* Avatar */}
        <div
          className="relative w-28 h-28 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
          style={{ border: `2px solid ${member.borderColor}55`, boxShadow: `0 0 20px ${member.borderColor}33` }}
        >
          {!photoError ? (
            <img
              src={`/team/${member.id}.jpg`}
              alt={member.nameEn}
              className="w-full h-full object-cover"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl"
              style={{ background: `${member.borderColor}11` }}
            >
              👤
            </div>
          )}
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `inset 0 0 20px ${member.borderColor}22` }}
          />
        </div>

        {/* Name & role */}
        <div className="text-center sm:text-left">
          <h2
            className="text-2xl font-bold tracking-wider mb-1"
            style={{ color: member.borderColor, textShadow: `0 0 12px ${member.borderColor}88` }}
          >
            {member.nameEn}
          </h2>
          <div className="text-lg text-gray-300 mb-1">{member.name}</div>
          <div
            className="text-xs tracking-widest px-3 py-1 rounded-full inline-block"
            style={{ background: `${member.borderColor}11`, border: `1px solid ${member.borderColor}44`, color: member.borderColor }}
          >
            {member.role}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            🎓 {member.university} • Student ID: {member.studentId}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="mb-6">
        <div className="text-xs tracking-widest text-gray-500 mb-2 uppercase">Bio</div>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{member.bio}</p>
      </div>

      {/* Skills */}
      <div className="mb-6">
        <div className="text-xs tracking-widest text-gray-500 mb-2 uppercase">Skills</div>
        <div className="flex flex-wrap gap-2">
          {member.skills.map((skill) => (
            <span
              key={skill}
              className="text-xs px-2 py-1 rounded font-mono"
              style={{ background: '#1A1A2E', border: '1px solid #2A2A4E', color: '#00FFFF88' }}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div>
        <div className="text-xs tracking-widest text-gray-500 mb-2 uppercase">Contacts</div>
        <div className="flex flex-wrap gap-2">
          <ContactBadge icon="✉" label={member.contacts.email} href={`mailto:${member.contacts.email}`} />
          <ContactBadge icon="✈" label={member.contacts.telegram} />
          <ContactBadge icon="🎓" label={member.contacts.university} />
        </div>
      </div>
    </motion.div>
  );
}

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-bg-dark grid-bg text-white font-mono">
      <div className="scan-overlay" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-900/30 bg-bg-panel/80 backdrop-blur-sm z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold glow-text tracking-widest">⚔ AEGISAI</span>
          <span className="text-xs text-gray-600">TEAM</span>
        </div>
        <nav className="flex items-center gap-4 text-xs">
          <Link href="/" className="text-gray-500 hover:text-cyber-cyan transition-colors">HOME</Link>
          <Link href="/battle" className="text-cyber-red hover:text-red-400 transition-colors">⚔ BATTLE</Link>
          <Link href="/agents" className="text-gray-500 hover:text-cyber-cyan transition-colors">AGENTS</Link>
          <Link href="/dashboard" className="text-gray-500 hover:text-cyber-cyan transition-colors">ANALYTICS</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

        {/* Page title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-xs tracking-widest text-gray-600 mb-2 uppercase">Diploma Project</div>
          <h1 className="text-3xl sm:text-4xl font-bold glow-text tracking-widest mb-3">НАША КОМАНДА</h1>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            Meet the team behind AegisAI — an AI-powered smart-home security simulator
          </p>
        </motion.div>

        {/* Team cards */}
        <div className="flex flex-col items-center gap-8">
          {TEAM_MEMBERS.map((member, i) => (
            <MemberCard key={member.id} member={member} index={i} />
          ))}
        </div>

        {/* Project info card */}
        <motion.div
          className="cyber-panel rounded-xl p-8"
          style={{ borderColor: '#9B00FF44' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎓</span>
            <div>
              <h2 className="text-lg font-bold glow-text-purple">{PROJECT_INFO.title}</h2>
              <div className="text-xs text-gray-500">{PROJECT_INFO.type} • {PROJECT_INFO.year} • {PROJECT_INFO.university}</div>
            </div>
          </div>

          <p className="text-sm text-gray-400 leading-relaxed mb-6">{PROJECT_INFO.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROJECT_INFO.technologies.map((item) => (
              <div
                key={item.name}
                className="rounded p-3 text-xs"
                style={{ background: '#1A1A2E', border: '1px solid #2A2A4E' }}
              >
                <div className="text-gray-500 tracking-wider mb-1 uppercase text-xs">{item.name}</div>
                <div className="text-cyan-300">{item.tech}</div>
              </div>
            ))}
          </div>
        </motion.div>

      </main>
    </div>
  );
}
