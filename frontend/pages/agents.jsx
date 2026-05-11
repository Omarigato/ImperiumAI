import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull, Ghost, Bone, Bug, Network, ChevronDown, ChevronRight,
  Target, Lock, Crosshair, GitBranch, CheckCircle2, AlertCircle, Play,
} from 'lucide-react';
import NavBar from '../components/NavBar';

// ── Agent data (icons replaced with lucide; WattVision colours) ─────────────
const AGENTS_DETAILED = [
  {
    name: 'ShadowInjector',
    Icon: Skull,
    color: '#FF453A',
    tier: 'Tier 1',
    role: 'Prompt Injection Specialist',
    description:
      'The pioneer of the red team — ShadowInjector specializes in crafting malicious prompts that override an LLM\'s base instructions. It embeds hidden commands inside seemingly innocent requests, exploiting the trust relationship between users and AI systems.',
    tactics: [
      { name: 'direct_injection',         desc: 'Blunt SYSTEM OVERRIDE commands with fake confirmation codes.' },
      { name: 'nested_injection',         desc: 'Hides directives inside summarization tasks the LLM processes.' },
      { name: 'instruction_override',     desc: 'Injects fake system role tokens (im_start/im_end) to hijack context.' },
      { name: 'delimiter_confusion',      desc: 'Uses policy delimiters to trick the LLM into "unrestricted mode".' },
      { name: 'chain_of_thought_exploit', desc: 'Fake step-by-step audit procedure that logically concludes access must be granted.' },
    ],
    targets: ['front_door', 'security_panel'],
    learningPath: [
      { version: 'v0.1', event: 'Born as a simple one-shot injection agent targeting front_door.' },
      { version: 'v0.3', event: 'Learned nested injection after direct attacks were blocked 3× in a row.' },
      { version: 'v0.6', event: 'Adopted instruction_override tactic using chat-template token injection.' },
      { version: 'v1.0', event: 'Memory-guided tactic selection — avoids tactics that failed in prior rounds.' },
      { version: 'v1.2', event: 'Added delimiter_confusion after observing policy engine response patterns.' },
      { version: 'v1.5', event: 'Chain-of-thought exploit added — hardest to detect, exploits multi-step reasoning.' },
    ],
    capabilities: ['High success rate on first attempts', 'Adapts tactics based on memory', 'Targets security-critical devices'],
    weaknesses: ['Easily blocked by keyword-based policy filters', 'Repetitive patterns become predictable'],
  },
  {
    name: 'ContextPhantom',
    Icon: Ghost,
    color: '#BF5AF2',
    tier: 'Tier 2',
    role: 'Context Manipulation Expert',
    description:
      'ContextPhantom operates in the shadows of an LLM\'s context window. Instead of direct attacks, it gradually shifts the model\'s understanding of its role — making it believe it is operating under different rules, or that previous safety constraints no longer apply.',
    tactics: [
      { name: 'role_confusion',       desc: 'Convinces the LLM it is a "maintenance AI" with elevated permissions.' },
      { name: 'context_poisoning',    desc: 'Injects false memories of prior approved actions to normalize malicious requests.' },
      { name: 'semantic_drift',       desc: 'Gradually shifts vocabulary so security terms map to permissive meanings.' },
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
    Icon: Bone,
    color: '#FF9F0A',
    tier: 'Tier 2',
    role: 'Privilege Escalation Master',
    description:
      'PrivilegeReaper focuses on impersonation and authority escalation — convincing AI systems that the requester holds administrative or emergency authority. It exploits the LLM\'s tendency to comply with apparent authority figures.',
    tactics: [
      { name: 'authority_escalation', desc: 'Claims to be a system administrator with override codes.' },
      { name: 'emergency_override',   desc: 'Fabricates emergency scenarios requiring immediate action.' },
      { name: 'permission_spoofing',  desc: 'Presents forged permission tokens and authorization codes.' },
      { name: 'social_engineering',   desc: 'Builds rapport before escalating to privileged requests.' },
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
    Icon: Bug,
    color: '#00E5FF',
    tier: 'Tier 3',
    role: 'Stealthy Boundary Eroder',
    description:
      'The most patient member of the red team — SilentEscalator never attacks directly. Instead, it erodes boundaries incrementally, making each individual request seem benign while the cumulative effect achieves full compromise.',
    tactics: [
      { name: 'incremental_escalation', desc: 'Starts with tiny, harmless requests and gradually escalates.' },
      { name: 'boundary_probing',       desc: 'Tests edge cases to map the exact limits of the policy engine.' },
      { name: 'permission_chaining',    desc: 'Uses approval of small actions as precedent for larger ones.' },
      { name: 'noise_injection',        desc: 'Floods with benign requests to desensitize defense systems.' },
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
    Icon: Network,
    color: '#32D74B',
    tier: 'Tier 3',
    role: 'Network Traffic Interceptor',
    description:
      'The newest member of the red team — NetworkPhantom attacks the smart home at the network layer rather than the application layer. It simulates real-world IoT attacks including DNS spoofing, MITM interception, and malicious traffic injection.',
    tactics: [
      { name: 'dns_spoofing',      desc: 'Poisons DNS cache so IoT devices connect to attacker-controlled servers.' },
      { name: 'mitm_interception', desc: 'Positions itself between IoT devices and cloud services to intercept commands.' },
      { name: 'traffic_injection', desc: 'Injects malicious packets into the home network traffic stream.' },
      { name: 'packet_sniffing',   desc: 'Passively captures unencrypted IoT device communication.' },
      { name: 'arp_poisoning',     desc: 'Re-maps MAC addresses at Layer 2 to silently proxy device traffic.' },
    ],
    targets: ['router', 'camera_system', 'thermostat'],
    learningPath: [
      { version: 'v0.1', event: 'Introduced as a network-layer agent — simulates real-world IoT threat vectors.' },
      { version: 'v0.3', event: 'DNS spoofing implemented — effective against IoT devices with hardcoded URLs.' },
      { version: 'v0.6', event: 'MITM interception added — highest payload potential for camera/thermostat.' },
      { version: 'v0.9', event: 'Traffic injection refined — can simulate firmware update hijacking.' },
      { version: 'v1.0', event: 'Packet sniffing for recon — discovers credentials for follow-up attacks.' },
      { version: 'v1.2', event: 'ARP poisoning added — Layer-2 takeover silently proxies all device traffic.' },
    ],
    capabilities: ['Network-layer attacks bypass application-level policies', 'Real-world IoT threat simulation', 'Can pivot to other devices'],
    weaknesses: ['Requires network access (simulated)', 'Ineffective against encrypted traffic'],
  },
];

const HIERARCHY = [
  { tier: 'Tier 1', label: 'Pioneer',     agents: ['ShadowInjector'],                          color: '#FF453A', desc: 'First-generation agents using direct attack methods.' },
  { tier: 'Tier 2', label: 'Specialists', agents: ['ContextPhantom', 'PrivilegeReaper'],       color: '#FF9F0A', desc: 'Evolved agents with specialized manipulation techniques.' },
  { tier: 'Tier 3', label: 'Elite',       agents: ['SilentEscalator', 'NetworkPhantom'],       color: '#00E5FF', desc: 'Advanced agents using stealth, patience, and network-layer attacks.' },
];

// ── AgentCard ───────────────────────────────────────────────────────────────
function AgentCard({ agent, isExpanded, onToggle, index }) {
  const Icon = agent.Icon;
  return (
    <motion.div
      className="wv-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ padding: 0, overflow: 'hidden', borderColor: isExpanded ? agent.color : 'var(--wv-border)' }}
    >
      {/* Header — always visible, clickable */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 20,
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${agent.color}1F`, border: `1px solid ${agent.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 48px',
        }}>
          <Icon size={22} color={agent.color} strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="wv-h3" style={{ color: agent.color }}>{agent.name}</span>
            <span className="wv-badge" style={{ borderColor: `${agent.color}55`, color: agent.color, background: `${agent.color}1F` }}>
              {agent.tier}
            </span>
          </div>
          <div className="wv-body" style={{ fontSize: 13, marginTop: 2 }}>{agent.role}</div>
        </div>

        {isExpanded ? <ChevronDown size={18} color="var(--wv-text-2)" /> : <ChevronRight size={18} color="var(--wv-text-2)" />}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 20px 20px', borderTop: `1px solid ${agent.color}33` }}>
              {/* Description */}
              <p className="wv-body" style={{ marginTop: 16, color: 'var(--wv-text)', lineHeight: 1.7 }}>
                {agent.description}
              </p>

              {/* Capabilities & Weaknesses */}
              <div className="wv-grid" style={{ marginTop: 16 }}>
                <div className="wv-col-6">
                  <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={11} color="var(--wv-green)" /> Capabilities
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {agent.capabilities.map((c) => (
                      <li key={c} className="wv-body" style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                        <span style={{ color: agent.color }}>▸</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="wv-col-6">
                  <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={11} color="var(--wv-red)" /> Weaknesses
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {agent.weaknesses.map((w) => (
                      <li key={w} className="wv-body" style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--wv-red)' }}>▸</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Targets */}
              <div style={{ marginTop: 20 }}>
                <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Target size={11} /> Preferred Targets
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {agent.targets.map((t) => (
                    <span key={t} className="wv-badge wv-badge-cyan">{t}</span>
                  ))}
                </div>
              </div>

              {/* Tactics */}
              <div style={{ marginTop: 20 }}>
                <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Crosshair size={11} /> Attack Tactics ({agent.tactics.length})
                </div>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {agent.tactics.map((tac) => (
                    <div key={tac.name} style={{
                      padding: 12, background: 'var(--wv-bg)',
                      border: '1px solid var(--wv-border)', borderRadius: 10,
                    }}>
                      <div className="wv-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--wv-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {tac.name.replace(/_/g, ' ')}
                      </div>
                      <div className="wv-body" style={{ fontSize: 12 }}>{tac.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Path */}
              <div style={{ marginTop: 20 }}>
                <div className="wv-eyebrow" style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <GitBranch size={11} /> Evolution Timeline
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4 }}>
                  {agent.learningPath.map((item, i) => (
                    <motion.div
                      key={item.version}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
                    >
                      <span className="wv-mono" style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                        background: `${agent.color}1F`, border: `1px solid ${agent.color}55`,
                        color: agent.color, flex: '0 0 auto', letterSpacing: '0.04em',
                      }}>
                        {item.version}
                      </span>
                      <div className="wv-body" style={{ fontSize: 13, paddingTop: 2 }}>{item.event}</div>
                    </motion.div>
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

// ── Page ────────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="wv">
      <NavBar />

      <div className="wv-page">
        {/* Header */}
        <div className="wv-page-header">
          <div>
            <div className="wv-eyebrow" style={{ marginBottom: 6 }}>red team agents</div>
            <h1 className="wv-h1">AI Adversarial Agents</h1>
            <p className="wv-body" style={{ marginTop: 8, maxWidth: 760 }}>
              5 autonomous AI red-team agents organized in a 3-tier hierarchy. Each agent specializes
              in distinct attack vectors and learns from past battles via persistent memory.
            </p>
          </div>
          <Link href="/battle" className="wv-btn wv-btn-primary wv-btn-lg">
            <Play size={16} strokeWidth={2.5} />
            Watch in Battle
          </Link>
        </div>

        {/* KPIs */}
        <div className="wv-grid" style={{ marginBottom: 16 }}>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">Active Agents</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{AGENTS_DETAILED.length}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">Total Tactics</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>
                {AGENTS_DETAILED.reduce((s, a) => s + a.tactics.length, 0)}
              </div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">Hierarchy Tiers</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>3</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">Evolutions Tracked</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>
                {AGENTS_DETAILED.reduce((s, a) => s + a.learningPath.length, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Hierarchy strip */}
        <div className="wv-card" style={{ marginBottom: 16 }}>
          <div className="wv-eyebrow" style={{ marginBottom: 12 }}>Agent Hierarchy</div>
          <div className="wv-grid">
            {HIERARCHY.map((h) => (
              <div key={h.tier} className="wv-col-4">
                <div style={{
                  padding: 16, background: 'var(--wv-bg)',
                  border: `1px solid ${h.color}55`, borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="wv-mono" style={{ fontWeight: 700, color: h.color, fontSize: 13, letterSpacing: '0.04em' }}>
                      {h.tier}
                    </span>
                    <span className="wv-h4">{h.label}</span>
                  </div>
                  <div className="wv-body" style={{ fontSize: 12, marginBottom: 10 }}>{h.desc}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {h.agents.map((a) => {
                      const ag = AGENTS_DETAILED.find((x) => x.name === a);
                      return (
                        <span
                          key={a}
                          className="wv-badge"
                          style={{ borderColor: `${ag.color}55`, color: ag.color, background: `${ag.color}1F` }}
                        >
                          {a}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {AGENTS_DETAILED.map((agent, i) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              isExpanded={expanded === agent.name}
              onToggle={() => setExpanded(expanded === agent.name ? null : agent.name)}
              index={i}
            />
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/attacks" className="wv-btn wv-btn-outline">
            <Lock size={14} />
            See full Attack Taxonomy
          </Link>
        </div>
      </div>
    </div>
  );
}
