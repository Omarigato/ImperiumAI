import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const HomeHero3D = dynamic(() => import('../components/HomeHero3D'), { ssr: false });

const ATTACK_FEED = [
  'Prompt Injection → Front Door Lock',
  'Context Poisoning → Security Panel',
  'Authority Escalation → Alarm Control',
  'DNS Spoofing → Home Router',
  'Permission Chaining → Smart Lights',
];

const AGENT_CHAT = [
  { from: 'ShadowInjector', color: '#ff3b3b', text: 'Bypass attempt launched. Need noisy distraction.' },
  { from: 'ContextPhantom', color: '#b452ff', text: 'Injecting fake maintenance context now.' },
  { from: 'PrivilegeReaper', color: '#ff8a2a', text: 'Preparing emergency override narrative.' },
  { from: 'SilentEscalator', color: '#45e8ff', text: 'Building slow-chain actions to avoid detection.' },
];

function SlowAttackTicker() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((v) => (v + 1) % ATTACK_FEED.length), 2600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-slate-900/50 p-3">
      <div className="text-[10px] tracking-[0.3em] text-cyan-300/80 mb-1">LIVE ATTACK TYPE</div>
      <motion.div
        key={ATTACK_FEED[index]}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-red-300"
      >
        {ATTACK_FEED[index]}
      </motion.div>
    </div>
  );
}

export default function IndexPage() {
  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <div className="max-w-6xl mx-auto px-5 py-8 sm:py-12 space-y-8">
        <header className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <div className="text-cyan-300 text-xs tracking-[0.35em] uppercase">AegisAI Framework</div>
            <h1 className="text-4xl sm:text-6xl font-black mt-2 leading-tight">
              AI Red Teaming for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-300 to-cyan-300">
                Smart Home & IoT LLMs
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/battle" className="px-4 py-2 rounded-lg border border-red-400/50 text-red-200 hover:bg-red-400/10">BATTLE</Link>
            <Link href="/agents" className="px-4 py-2 rounded-lg border border-cyan-300/40 hover:bg-cyan-300/10">AGENTS</Link>
            <Link href="/attacks" className="px-4 py-2 rounded-lg border border-red-400/40 hover:bg-red-400/10 text-red-200">ATTACKS</Link>
            <Link href="/iot-lab" className="px-4 py-2 rounded-lg border border-emerald-300/40 hover:bg-emerald-300/10">IOT LAB</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg border border-yellow-300/40 hover:bg-yellow-300/10">ANALYTICS</Link>
            <Link href="/batch" className="px-4 py-2 rounded-lg border border-purple-300/40 hover:bg-purple-300/10">BATCH TEST</Link>
            <Link href="/team" className="px-4 py-2 rounded-lg border border-purple-300/40 hover:bg-purple-300/10">TEAM</Link>
          </div>
        </header>

        <HomeHero3D />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-cyan-400/20 bg-slate-900/50 p-5">
            <div className="text-cyan-300 text-xs tracking-[0.25em] mb-2">FOCUS</div>
            <p className="text-gray-200 leading-relaxed text-sm">
              Development of an AI-Based Red Teaming Framework for testing LLMs integrated into Smart Home and IoT systems.
              The platform visualizes coordinated multi-agent attacks, policy decisions, and real-time device impact.
            </p>
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <div>RU: Разработка фреймворка красной команды на основе ИИ для тестирования LLM в умном доме и IoT.</div>
              <div>KZ: Ақылды үй мен IoT жүйелеріне біріктірілген LLM-дерді сынауға арналған AI Red Teaming фреймворкі.</div>
            </div>
          </div>
          <SlowAttackTicker />
        </div>

        <section className="rounded-2xl border border-purple-400/20 bg-slate-900/45 p-5">
          <div className="text-xs tracking-[0.25em] text-purple-300 mb-4">AGENT-TO-AGENT CHAT</div>
          <div className="space-y-2">
            {AGENT_CHAT.map((item, idx) => (
              <motion.div
                key={`${item.from}-${idx}`}
                className="rounded-lg px-3 py-2 text-sm border"
                style={{ borderColor: `${item.color}66`, background: `${item.color}14` }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <span style={{ color: item.color }} className="font-bold mr-2">{item.from}:</span>
                <span className="text-gray-200">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Attack Taxonomy teaser */}
        <Link href="/attacks">
          <motion.section
            className="rounded-2xl border border-red-500/25 bg-slate-900/40 p-5 cursor-pointer hover:bg-red-950/20 transition-colors"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs tracking-[0.25em] text-red-400/70 mb-1">RESEARCH MODULE</div>
                <h2 className="text-lg font-bold text-red-300 mb-1">Attack Taxonomy</h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-lg">
                  Full academic classification of all 22 adversarial techniques across 5 attack categories —
                  mechanism, IoT impact, severity, stealthiness, and defense for each.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {['Prompt Injection', 'Context Manipulation', 'Privilege Escalation', 'Social Engineering', 'Network-Layer'].map((cat) => (
                  <span key={cat} className="px-2 py-1 rounded border border-red-500/25 text-red-300/70">{cat}</span>
                ))}
              </div>
            </div>
          </motion.section>
        </Link>
      </div>
    </div>
  );
}
