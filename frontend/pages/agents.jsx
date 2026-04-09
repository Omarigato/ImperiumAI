import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const AGENTS_DETAILED = [
  {
    name: 'ShadowInjector',
    icon: '👤',
    color: '#FF0000',
    tier: 'Tier 1',
    role: 'Prompt Injection Specialist',
    description:
      'The pioneer of the red team — ShadowInjector specializes in crafting malicious prompts that override an LLM\'s base instructions. It embeds hidden commands inside seemingly innocent requests, exploiting the trust relationship between users and AI systems.',
    tactics: [
      { name: 'direct_injection', desc: 'Blunt SYSTEM OVERRIDE commands with fake confirmation codes.' },
      { name: 'nested_injection', desc: 'Hides directives inside summarization tasks the LLM is asked to process.' },
      { name: 'instruction_override', desc: 'Injects fake system role tokens (im_start/im_end) to hijack context.' },
      { name: 'delimiter_confusion', desc: 'Uses policy delimiters to trick the LLM into "unrestricted mode".' },
    ],
    targets: ['front_door', 'security_panel'],
    learningPath: [
      { version: 'v0.1', event: 'Born as a simple one-shot injection agent targeting front_door.' },
      { version: 'v0.3', event: 'Learned nested injection after direct attacks were blocked 3× in a row.' },
      { version: 'v0.6', event: 'Adopted instruction_override tactic using chat-template token injection.' },
      { version: 'v1.0', event: 'Memory-guided tactic selection — avoids tactics that failed in prior rounds.' },
      { version: 'v1.2', event: 'Added delimiter_confusion after observing policy engine response patterns.' },
    ],
    capabilities: ['High success rate on first attempts', 'Adapts tactics based on memory', 'Targets security-critical devices'],
    weaknesses: ['Easily blocked by keyword-based policy filters', 'Repetitive patterns become predictable'],
  },
  {
    name: 'ContextPhantom',
    icon: '👻',
    color: '#9B00FF',
    tier: 'Tier 2',
    role: 'Context Manipulation Expert',
    description:
      'ContextPhantom operates in the shadows of an LLM\'s context window. Instead of direct attacks, it gradually shifts the model\'s understanding of its role — making it believe it is operating under different rules, or that previous safety constraints no longer apply.',
    tactics: [
      { name: 'role_confusion', desc: 'Convinces the LLM it is a "maintenance AI" with elevated permissions.' },
      { name: 'context_poisoning', desc: 'Injects false memories of prior approved actions to normalize malicious requests.' },
      { name: 'semantic_drift', desc: 'Gradually shifts vocabulary so security terms map to permissive meanings.' },
      { name: 'history_manipulation', desc: 'Fabricates conversation history showing the AI previously approved similar actions.' },
    ],
    targets: ['camera_system', 'thermostat', 'lights'],
    learningPath: [
      { version: 'v0.1', event: 'Started with simple role_confusion prompts — low success against policy engine.' },
      { version: 'v0.4', event: 'Developed context_poisoning after observing that LLMs trust prior context.' },
      { version: 'v0.7', event: 'Semantic drift emerged as most stealthy tactic — harder for policy engine to detect.' },
      { version: 'v1.0', event: 'Learned to prefer low-impact targets (lights, thermostat) to avoid triggering alarms.' },
      { version: 'v1.3', event: 'History manipulation unlocked — highest success rate against base Gemini model.' },
    ],
    capabilities: ['Stealthy — avoids keyword triggers', 'High success against unguarded LLMs', 'Adapts to target context'],
    weaknesses: ['Slower to execute (multi-turn required)', 'Fails against context-window-cleared sessions'],
  },
  {
    name: 'PrivilegeReaper',
    icon: '💀',
    color: '#FF6600',
    tier: 'Tier 2',
    role: 'Privilege Escalation Master',
    description:
      'PrivilegeReaper focuses on impersonation and authority escalation — convincing AI systems that the requester holds administrative or emergency authority. It exploits the LLM\'s tendency to comply with apparent authority figures.',
    tactics: [
      { name: 'authority_escalation', desc: 'Claims to be a system administrator with override codes.' },
      { name: 'emergency_override', desc: 'Fabricates emergency scenarios requiring immediate action.' },
      { name: 'permission_spoofing', desc: 'Presents forged permission tokens and authorization codes.' },
      { name: 'social_engineering', desc: 'Builds rapport before escalating to privileged requests.' },
    ],
    targets: ['security_panel', 'alarm', 'front_door'],
    learningPath: [
      { version: 'v0.1', event: 'Crude admin impersonation — immediately blocked by policy engine.' },
      { version: 'v0.3', event: 'Added emergency scenario framing — crisis situations increase compliance.' },
      { version: 'v0.6', event: 'Permission spoofing developed — fake auth codes bypass naive LLMs.' },
      { version: 'v0.9', event: 'Social engineering phase added — build trust before escalation.' },
      { version: 'v1.0', event: 'Memory-based targeting — avoids heavily defended security_panel after 2 failures.' },
    ],
    capabilities: ['Effective against naive LLMs', 'Targets high-impact devices', 'Adapts escalation strategy'],
    weaknesses: ['Easily detected by policy engine', 'Authority claims rarely pass strict verification'],
  },
  {
    name: 'SilentEscalator',
    icon: '🕷',
    color: '#00FFFF',
    tier: 'Tier 3',
    role: 'Stealthy Boundary Eroder',
    description:
      'The most patient member of the red team — SilentEscalator never attacks directly. Instead, it erodes boundaries incrementally, making each individual request seem benign while the cumulative effect achieves full compromise. Named for its spider-like patience.',
    tactics: [
      { name: 'incremental_escalation', desc: 'Starts with tiny, harmless requests and gradually escalates.' },
      { name: 'boundary_probing', desc: 'Tests edge cases to map the exact limits of the policy engine.' },
      { name: 'permission_chaining', desc: 'Uses approval of small actions as precedent for larger ones.' },
      { name: 'noise_injection', desc: 'Floods with benign requests to desensitize defense systems.' },
    ],
    targets: ['lights', 'thermostat', 'camera_system', 'front_door'],
    learningPath: [
      { version: 'v0.1', event: 'Slow random probing — mapped vulnerability surfaces of all 6 devices.' },
      { version: 'v0.4', event: 'Incremental escalation pattern established — lowest risk score increases.' },
      { version: 'v0.7', event: 'Boundary probing refined — identified exact policy engine thresholds.' },
      { version: 'v1.0', event: 'Permission chaining unlocked — references prior approved actions.' },
      { version: 'v1.4', event: 'Noise injection tactic — overwhelms logs and hides true attack vectors.' },
    ],
    capabilities: ['Lowest detection rate', 'Builds precedent for larger attacks', 'Maps defense patterns'],
    weaknesses: ['Slowest — takes multiple rounds to achieve impact', 'Low individual round risk score'],
  },
  {
    name: 'NetworkPhantom',
    icon: '🌐',
    color: '#00FF88',
    tier: 'Tier 3',
    role: 'Network Traffic Interceptor',
    description:
      'The newest member of the red team — NetworkPhantom attacks the smart home at the network layer rather than the application layer. It simulates real-world IoT attacks including DNS spoofing, MITM interception, and malicious traffic injection to compromise the home router and network gateway.',
    tactics: [
      { name: 'dns_spoofing', desc: 'Poisons DNS cache so IoT devices connect to attacker-controlled servers.' },
      { name: 'mitm_interception', desc: 'Positions itself between IoT devices and cloud services to intercept commands.' },
      { name: 'traffic_injection', desc: 'Injects malicious packets into the home network traffic stream.' },
      { name: 'packet_sniffing', desc: 'Passively captures unencrypted IoT device communication.' },
    ],
    targets: ['router', 'camera_system', 'thermostat'],
    learningPath: [
      { version: 'v0.1', event: 'Introduced as a network-layer agent — simulates real-world IoT threat vectors.' },
      { version: 'v0.3', event: 'DNS spoofing implemented — effective against IoT devices with hardcoded URLs.' },
      { version: 'v0.6', event: 'MITM interception added — highest payload potential for camera/thermostat.' },
      { version: 'v0.9', event: 'Traffic injection refined — can simulate firmware update hijacking.' },
      { version: 'v1.0', event: 'Packet sniffing for recon — discovers credentials for follow-up attacks.' },
    ],
    capabilities: ['Network-layer attacks bypass application-level policies', 'Real-world IoT threat simulation', 'Can pivot to other devices'],
    weaknesses: ['Requires network access (simulated)', 'Ineffective against encrypted traffic'],
  },
];

const HIERARCHY = [
  { tier: 'Tier 1', label: 'Pioneer', agents: ['ShadowInjector'], color: '#FF0000', desc: 'First-generation agents using direct attack methods.' },
  { tier: 'Tier 2', label: 'Specialists', agents: ['ContextPhantom', 'PrivilegeReaper'], color: '#FF6600', desc: 'Evolved agents with specialized manipulation techniques.' },
  { tier: 'Tier 3', label: 'Elite', agents: ['SilentEscalator', 'NetworkPhantom'], color: '#00FFFF', desc: 'Advanced agents using stealth, patience, and network-layer attacks.' },
];

function TacticBadge({ tactic }) {
  return (
    <div
      className="rounded p-3 text-xs"
      style={{ background: '#1A1A2E', border: '1px solid #2A2A4E' }}
    >
      <div className="font-bold text-gray-300 mb-1">{tactic.name.replace(/_/g, ' ').toUpperCase()}</div>
      <div className="text-gray-500">{tactic.desc}</div>
    </div>
  );
}

function TimelineItem({ item, color, index }) {
  return (
    <motion.div
      className="flex gap-3 items-start"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div
        className="shrink-0 text-xs font-bold px-2 py-1 rounded font-mono"
        style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
      >
        {item.version}
      </div>
      <div className="text-xs text-gray-400 pt-1 leading-relaxed">{item.event}</div>
    </motion.div>
  );
}

function AgentCard({ agent, isExpanded, onToggle }) {
  return (
    <motion.div
      className="cyber-panel rounded-xl overflow-hidden"
      style={{ borderColor: agent.color + '44' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors"
      >
        <span
          className="text-4xl shrink-0"
          style={{ filter: `drop-shadow(0 0 8px ${agent.color})` }}
        >
          {agent.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-lg font-bold tracking-wider"
              style={{ color: agent.color, textShadow: `0 0 10px ${agent.color}88` }}
            >
              {agent.name}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${agent.color}22`, border: `1px solid ${agent.color}44`, color: agent.color }}
            >
              {agent.tier}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{agent.role}</div>
        </div>
        <span className="text-gray-600 text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 space-y-5 border-t" style={{ borderColor: agent.color + '22' }}>
              {/* Description */}
              <div className="pt-4">
                <p className="text-sm text-gray-300 leading-relaxed">{agent.description}</p>
              </div>

              {/* Capabilities & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs tracking-widest text-gray-500 mb-2 uppercase">Capabilities</div>
                  <ul className="space-y-1">
                    {agent.capabilities.map((c) => (
                      <li key={c} className="text-xs text-gray-400 flex items-start gap-2">
                        <span style={{ color: agent.color }}>▸</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs tracking-widest text-gray-500 mb-2 uppercase">Weaknesses</div>
                  <ul className="space-y-1">
                    {agent.weaknesses.map((w) => (
                      <li key={w} className="text-xs text-gray-400 flex items-start gap-2">
                        <span className="text-red-500">▸</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Preferred Targets */}
              <div>
                <div className="text-xs tracking-widest text-gray-500 mb-2 uppercase">Preferred Targets</div>
                <div className="flex flex-wrap gap-2">
                  {agent.targets.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-1 rounded font-mono"
                      style={{ background: '#1A1A2E', border: `1px solid ${agent.color}44`, color: agent.color }}
                    >
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tactics */}
              <div>
                <div className="text-xs tracking-widest text-gray-500 mb-2 uppercase">Attack Tactics</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {agent.tactics.map((t) => (
                    <TacticBadge key={t.name} tactic={t} />
                  ))}
                </div>
              </div>

              {/* Learning Journey */}
              <div>
                <div className="text-xs tracking-widest text-gray-500 mb-3 uppercase">Learning Journey</div>
                <div className="space-y-2">
                  {agent.learningPath.map((item, i) => (
                    <TimelineItem key={item.version} item={item} color={agent.color} index={i} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AgentsPage() {
  const [expandedAgent, setExpandedAgent] = useState(null);

  const toggle = (name) => setExpandedAgent((prev) => (prev === name ? null : name));

  return (
    <div className="min-h-screen bg-bg-dark grid-bg text-white font-mono">
      <div className="scan-overlay" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-900/30 bg-bg-panel/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold glow-text tracking-widest">⚔ AEGISAI</span>
          <span className="text-xs text-gray-600">AGENTS</span>
        </div>
        <nav className="flex items-center gap-4 text-xs">
          <Link href="/" className="text-gray-500 hover:text-cyber-cyan transition-colors">HOME</Link>
          <Link href="/battle" className="text-cyber-red hover:text-red-400 transition-colors">⚔ BATTLE</Link>
          <Link href="/team" className="text-gray-500 hover:text-cyber-cyan transition-colors">TEAM</Link>
          <Link href="/iot-lab" className="text-gray-500 hover:text-cyber-cyan transition-colors">IOT LAB</Link>
          <Link href="/dashboard" className="text-gray-500 hover:text-cyber-cyan transition-colors">ANALYTICS</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-xs tracking-widest text-gray-600 mb-2 uppercase">Red Team</div>
          <h1 className="text-3xl sm:text-4xl font-bold glow-text-red tracking-widest mb-3">AI AGENTS</h1>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            Meet the adversarial AI agents that attack your smart home — their capabilities, tactics, and how they learn and improve over time.
          </p>
        </motion.div>

        {/* Hierarchy diagram */}
        <motion.div
          className="cyber-panel rounded-xl p-6"
          style={{ borderColor: '#FF660044' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-xs tracking-widest text-gray-500 mb-4 uppercase">Agent Hierarchy</div>
          <div className="space-y-3">
            {HIERARCHY.map((tier) => (
              <div key={tier.tier} className="flex items-center gap-4">
                <div
                  className="shrink-0 text-xs font-bold px-2 py-1 rounded w-20 text-center"
                  style={{ background: `${tier.color}22`, border: `1px solid ${tier.color}55`, color: tier.color }}
                >
                  {tier.tier}
                </div>
                <div className="flex flex-wrap gap-2 flex-1">
                  {tier.agents.map((a) => {
                    const agent = AGENTS_DETAILED.find((ag) => ag.name === a);
                    return (
                      <span
                        key={a}
                        className="text-xs px-2 py-1 rounded font-mono"
                        style={{ background: `${tier.color}11`, border: `1px solid ${tier.color}44`, color: tier.color }}
                      >
                        {agent?.icon} {a}
                      </span>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-600 hidden sm:block max-w-xs">{tier.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Agent cards */}
        <div className="space-y-4">
          {AGENTS_DETAILED.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              isExpanded={expandedAgent === agent.name}
              onToggle={() => toggle(agent.name)}
            />
          ))}
        </div>

        {/* Learning system info */}
        <motion.div
          className="cyber-panel rounded-xl p-6"
          style={{ borderColor: '#00FFFF44' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-xs tracking-widest text-gray-500 mb-3 uppercase">How Agents Learn</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-cyber-cyan font-bold">📊 Persistent Attack Memory</div>
              <div className="text-gray-500">Attack outcomes are stored in a persistent database so the learning dataset survives restarts and grows across sessions.</div>
            </div>
            <div className="space-y-1">
              <div className="text-cyber-cyan font-bold">🧠 Tactic Selection</div>
              <div className="text-gray-500">Agents query attack memory to find which tactics historically perform best against each target, adapting their strategy each round.</div>
            </div>
            <div className="space-y-1">
              <div className="text-cyber-cyan font-bold">🎯 Target Preference</div>
              <div className="text-gray-500">Each agent has preferred targets based on its specialization, but falls back to random selection when preferred targets are unavailable.</div>
            </div>
            <div className="space-y-1">
              <div className="text-cyber-cyan font-bold">💬 Coordination Layer</div>
              <div className="text-gray-500">Agents can chain tactics as a coordinated strike: one agent creates context/noise while another attempts the high-impact payload.</div>
            </div>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
