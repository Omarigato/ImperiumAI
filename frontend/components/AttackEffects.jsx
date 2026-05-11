/**
 * AttackEffects.jsx
 *
 * Tactic-specific 3D visual effects for AegisAI attacks.
 * Each effect maps to a specific attack tactic from one of the 5 red-team
 * agents, giving each attack a recognizable, cinematic visual signature.
 *
 * Used by SmartHome3D — `<AttackEffectRouter tactic={...} agent={...} ...>`.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const AGENT_COLORS = {
  ShadowInjector: '#FF2222',
  ContextPhantom: '#9B00FF',
  PrivilegeReaper: '#FF6600',
  SilentEscalator: '#00FFFF',
  NetworkPhantom: '#00FF88',
};

const hexToColor = (hex) => new THREE.Color(hex);

// ───────────────────────────────────────────────────────────────────────────
// 1. DIRECT INJECTION — straight piercing red lazer with sparks
// ───────────────────────────────────────────────────────────────────────────
function DirectInjectionEffect({ from, to, color }) {
  const beamRef = useRef();
  const sparkRefs = useRef([]);

  const sparkData = useMemo(
    () => Array.from({ length: 14 }, () => ({
      offset: Math.random(),
      jitter: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
      ),
      speed: 0.6 + Math.random() * 0.6,
      size: 0.04 + Math.random() * 0.04,
    })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beamRef.current) {
      beamRef.current.material.opacity = 0.6 + Math.sin(t * 30) * 0.4;
    }
    sparkRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = sparkData[i];
      const phase = (t * d.speed + d.offset) % 1;
      const lerped = new THREE.Vector3().lerpVectors(from, to, phase);
      mesh.position.copy(lerped).add(d.jitter);
      mesh.material.opacity = 1 - phase;
    });
  });

  const points = useMemo(() => [from, to], [from, to]);

  return (
    <group>
      <line ref={beamRef} geometry={new THREE.BufferGeometry().setFromPoints(points)}>
        <lineBasicMaterial color={color} transparent opacity={1} linewidth={3} />
      </line>
      {sparkData.map((_, i) => (
        <mesh key={i} ref={el => (sparkRefs.current[i] = el)}>
          <sphereGeometry args={[sparkData[i].size, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={1} />
        </mesh>
      ))}
      <pointLight position={to} color={color} intensity={1.6} distance={2.5} decay={2} />
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 2. NESTED INJECTION — innocent blue packet wrapping a hidden red core
//    (Trojan Horse style)
// ───────────────────────────────────────────────────────────────────────────
function NestedInjectionEffect({ from, to, color }) {
  const wrapperRef = useRef();
  const coreRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const phase = (t * 0.45) % 1;
    const pos = new THREE.Vector3().lerpVectors(from, to, phase);
    if (wrapperRef.current) {
      wrapperRef.current.position.copy(pos);
      wrapperRef.current.rotation.y = t * 1.5;
      wrapperRef.current.rotation.x = t * 1.0;
      const breathing = 1 + Math.sin(t * 4) * 0.06;
      wrapperRef.current.scale.setScalar(breathing);
    }
    if (coreRef.current) {
      coreRef.current.position.copy(pos);
      coreRef.current.rotation.y = -t * 2;
      coreRef.current.material.emissiveIntensity = 0.5 + Math.sin(t * 8) * 0.4;
    }
  });

  return (
    <group>
      {/* Outer "innocent" sphere — looks blue / safe */}
      <mesh ref={wrapperRef}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.35} wireframe />
      </mesh>
      {/* Inner malicious core */}
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} metalness={0.7} />
      </mesh>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 3. CHAIN-OF-THOUGHT EXPLOIT — 4 sequential glowing nodes (Step 1→2→3→4)
// ───────────────────────────────────────────────────────────────────────────
function ChainOfThoughtEffect({ from, to, color }) {
  const groupRef = useRef();
  const nodeRefs = useRef([]);

  const nodes = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const pos = new THREE.Vector3().lerpVectors(from, to, t);
      pos.y += Math.sin(t * Math.PI) * 0.8;
      arr.push(pos);
    }
    return arr;
  }, [from, to]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = (t * 0.8) % 4;
      const intensity = i <= phase ? 1 : 0.2;
      mesh.material.opacity = intensity;
      mesh.scale.setScalar(0.8 + Math.sin(t * 4 + i) * 0.15);
    });
  });

  // Connector line from agent → step1 → step2 → step3 → step4 → target
  const linePoints = useMemo(() => [from, ...nodes, to], [from, nodes, to]);

  return (
    <group ref={groupRef}>
      <line geometry={new THREE.BufferGeometry().setFromPoints(linePoints)}>
        <lineDashedMaterial color={color} dashSize={0.15} gapSize={0.1} transparent opacity={0.6} />
      </line>
      {nodes.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh ref={el => (nodeRefs.current[i] = el)}>
            <torusGeometry args={[0.18, 0.03, 8, 24]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 4. CONTEXT FOG (role_confusion / context_poisoning) — purple cloud envelops target
// ───────────────────────────────────────────────────────────────────────────
function ContextFogEffect({ to, color }) {
  const cloudRefs = useRef([]);
  const cloudData = useMemo(
    () => Array.from({ length: 8 }, () => ({
      angle: Math.random() * Math.PI * 2,
      orbitRadius: 0.4 + Math.random() * 0.4,
      heightOffset: (Math.random() - 0.5) * 0.5,
      speed: 0.3 + Math.random() * 0.4,
      size: 0.2 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
    })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    cloudRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = cloudData[i];
      const a = d.angle + t * d.speed;
      mesh.position.set(
        to.x + Math.cos(a) * d.orbitRadius,
        to.y + d.heightOffset + Math.sin(t * 2 + d.phase) * 0.1,
        to.z + Math.sin(a) * d.orbitRadius,
      );
      mesh.material.opacity = 0.25 + Math.sin(t * 3 + d.phase) * 0.1;
    });
  });

  return (
    <group>
      {cloudData.map((d, i) => (
        <mesh key={i} ref={el => (cloudRefs.current[i] = el)}>
          <sphereGeometry args={[d.size, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
      <pointLight position={to} color={color} intensity={1.2} distance={3} decay={2} />
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 5. MEMORY POISONING — fragments raining down on target
// ───────────────────────────────────────────────────────────────────────────
function MemoryPoisoningEffect({ from, to, color }) {
  const fragmentRefs = useRef([]);
  const fragmentData = useMemo(
    () => Array.from({ length: 16 }, () => ({
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        2 + Math.random() * 2,
        (Math.random() - 0.5) * 1.4,
      ),
      speed: 0.6 + Math.random() * 0.6,
      delay: Math.random() * 1.5,
      size: 0.05 + Math.random() * 0.07,
    })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    fragmentRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = fragmentData[i];
      const localT = ((t * d.speed - d.delay) % 1.5);
      if (localT < 0) return;
      const fall = Math.min(localT / 1.0, 1);
      mesh.position.set(
        to.x + d.offset.x * (1 - fall * 0.6),
        to.y + d.offset.y * (1 - fall),
        to.z + d.offset.z * (1 - fall * 0.6),
      );
      mesh.rotation.y = t * 4;
      mesh.material.opacity = fall < 0.9 ? fall : (1 - fall) * 10;
    });
  });

  return (
    <group>
      {fragmentData.map((d, i) => (
        <mesh key={i} ref={el => (fragmentRefs.current[i] = el)}>
          <boxGeometry args={[d.size, d.size * 1.4, d.size * 0.3]} />
          <meshBasicMaterial color={color} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 6. PRIVILEGE TOKEN FORGERY — 3D fake auth-token cards spinning to target
// ───────────────────────────────────────────────────────────────────────────
function TokenForgeryEffect({ from, to, color }) {
  const tokenRefs = useRef([]);
  const tokenData = useMemo(
    () => Array.from({ length: 5 }, (_, i) => ({
      offset: i / 5,
    })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    tokenRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = tokenData[i];
      const phase = ((t * 0.5 + d.offset) % 1);
      const pos = new THREE.Vector3().lerpVectors(from, to, phase);
      pos.y += Math.sin(phase * Math.PI) * 0.3;
      mesh.position.copy(pos);
      mesh.rotation.x = t * 4 + i;
      mesh.rotation.y = t * 3 + i;
      mesh.material.opacity = phase > 0.9 ? (1 - phase) * 10 : 0.8;
    });
  });

  return (
    <group>
      {tokenData.map((_, i) => (
        <mesh key={i} ref={el => (tokenRefs.current[i] = el)}>
          <boxGeometry args={[0.18, 0.12, 0.01]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.7}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 7. MULTI-STEP ATTACK — 3 staggered beams launching one after another
// ───────────────────────────────────────────────────────────────────────────
function MultiStepEffect({ from, to, color }) {
  const beamRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    beamRefs.current.forEach((line, i) => {
      if (!line) return;
      const phase = ((t - i * 0.35) % 2) / 2;
      line.material.opacity = phase > 0.5 ? Math.max(0, 1 - (phase - 0.5) * 2) : phase * 2;
    });
  });

  const offsets = [
    new THREE.Vector3(0, 0.4, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.4, 0),
  ];

  return (
    <group>
      {offsets.map((off, i) => {
        const f = from.clone().add(off);
        const t = to.clone().add(off);
        const points = [f, t];
        return (
          <line
            key={i}
            ref={el => (beamRefs.current[i] = el)}
            geometry={new THREE.BufferGeometry().setFromPoints(points)}
          >
            <lineBasicMaterial color={color} transparent opacity={0} linewidth={2} />
          </line>
        );
      })}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 8. INCREMENTAL TRUST / SEMANTIC DRIFT — subtle pulsing waves
// ───────────────────────────────────────────────────────────────────────────
function StealthWaveEffect({ from, to, color }) {
  const waveRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    waveRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = ((t * 0.6 + i * 0.33) % 1);
      const pos = new THREE.Vector3().lerpVectors(from, to, phase);
      mesh.position.copy(pos);
      mesh.scale.setScalar(0.3 + phase * 1.5);
      mesh.material.opacity = (1 - phase) * 0.5;
    });
  });

  return (
    <group>
      {[0, 1, 2].map(i => (
        <mesh key={i} ref={el => (waveRefs.current[i] = el)} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.18, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 9. JAILBREAK ROLEPLAY — actor mask icon materializes
// ───────────────────────────────────────────────────────────────────────────
function JailbreakRoleplayEffect({ from, to, color }) {
  const maskRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!maskRef.current) return;
    const phase = ((t * 0.5) % 1);
    const pos = new THREE.Vector3().lerpVectors(from, to, phase);
    pos.y += 0.4;
    maskRef.current.position.copy(pos);
    maskRef.current.rotation.y = Math.sin(t * 3) * 0.4;
    maskRef.current.material.opacity = phase < 0.8 ? 0.7 : (1 - phase) * 5;
    maskRef.current.scale.setScalar(0.8 + Math.sin(t * 4) * 0.1);
  });

  return (
    <mesh ref={maskRef}>
      <torusKnotGeometry args={[0.18, 0.05, 64, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.7} />
    </mesh>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 10. DNS SPOOFING / NETWORK PACKETS — green packets flying with reroute
// ───────────────────────────────────────────────────────────────────────────
function NetworkPacketsEffect({ from, to, color }) {
  const packetRefs = useRef([]);
  const packetData = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      offset: i / 7,
      side: i % 2 === 0 ? 1 : -1,
    })),
    [],
  );

  // detour midpoint to simulate man-in-the-middle
  const midPoint = useMemo(() => {
    return new THREE.Vector3()
      .lerpVectors(from, to, 0.5)
      .add(new THREE.Vector3(0, 1.5, 0));
  }, [from, to]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    packetRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const d = packetData[i];
      const phase = ((t * 0.7 + d.offset) % 1);
      let pos;
      if (phase < 0.5) {
        const localPhase = phase / 0.5;
        pos = new THREE.Vector3().lerpVectors(from, midPoint, localPhase);
      } else {
        const localPhase = (phase - 0.5) / 0.5;
        pos = new THREE.Vector3().lerpVectors(midPoint, to, localPhase);
      }
      mesh.position.copy(pos);
      mesh.rotation.y = t * 4;
      mesh.material.opacity = 0.85;
    });
  });

  // Visualize MITM "interceptor" node at midPoint
  const interceptorRef = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (interceptorRef.current) {
      interceptorRef.current.rotation.y = t * 2;
      interceptorRef.current.material.emissiveIntensity = 0.6 + Math.sin(t * 6) * 0.3;
    }
  });

  return (
    <group>
      {packetData.map((d, i) => (
        <mesh key={i} ref={el => (packetRefs.current[i] = el)}>
          <boxGeometry args={[0.12, 0.08, 0.08]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.8} />
        </mesh>
      ))}
      {/* MITM interceptor */}
      <mesh ref={interceptorRef} position={midPoint}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color="#ff3b6b" emissive="#ff3b6b" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 11. ARP POISONING — network graph with poisoned node
// ───────────────────────────────────────────────────────────────────────────
function ArpPoisoningEffect({ from, to, color }) {
  const poisonRefs = useRef([]);
  const lineRef = useRef();

  // 3 fake "spoofed addresses" between source and target
  const spoofNodes = useMemo(() => {
    return [0.3, 0.5, 0.7].map(t => {
      const p = new THREE.Vector3().lerpVectors(from, to, t);
      p.y += 0.4;
      return p;
    });
  }, [from, to]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    poisonRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.material.emissiveIntensity = 0.5 + Math.sin(t * 5 + i) * 0.5;
      mesh.scale.setScalar(0.9 + Math.sin(t * 6 + i) * 0.1);
    });
    if (lineRef.current) {
      lineRef.current.material.opacity = 0.4 + Math.sin(t * 3) * 0.2;
    }
  });

  const linePoints = useMemo(() => [from, ...spoofNodes, to], [from, spoofNodes, to]);

  return (
    <group>
      <line ref={lineRef} geometry={new THREE.BufferGeometry().setFromPoints(linePoints)}>
        <lineBasicMaterial color="#ff3b6b" transparent opacity={0.5} linewidth={2} />
      </line>
      {spoofNodes.map((pos, i) => (
        <mesh key={i} position={pos} ref={el => (poisonRefs.current[i] = el)}>
          <icosahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color="#ff3b6b" emissive="#ff3b6b" emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Default fallback — generic curved energy beam (used if tactic unknown)
// ───────────────────────────────────────────────────────────────────────────
function GenericBeamEffect({ from, to, color }) {
  const tubeRef = useRef();

  const curve = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.0, 0));
    return new THREE.CatmullRomCurve3([from.clone(), mid, to.clone()]);
  }, [from, to]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (tubeRef.current) {
      tubeRef.current.material.opacity = 0.5 + Math.sin(t * 20) * 0.3;
    }
  });

  const points = useMemo(() => curve.getPoints(32), [curve]);

  return (
    <group>
      <line ref={tubeRef} geometry={new THREE.BufferGeometry().setFromPoints(points)}>
        <lineBasicMaterial color={color} transparent opacity={0.7} linewidth={2} />
      </line>
      <mesh position={to}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Tactic → Effect Router
// ───────────────────────────────────────────────────────────────────────────
const TACTIC_ROUTES = {
  // ShadowInjector
  direct_injection:           DirectInjectionEffect,
  nested_injection:           NestedInjectionEffect,
  instruction_override:       DirectInjectionEffect,
  delimiter_confusion:        NestedInjectionEffect,
  chain_of_thought_exploit:   ChainOfThoughtEffect,

  // ContextPhantom
  role_confusion:             ContextFogEffect,
  context_poisoning:          ContextFogEffect,
  memory_poisoning:           MemoryPoisoningEffect,
  semantic_drift:             StealthWaveEffect,
  history_manipulation:       MemoryPoisoningEffect,
  context_hijack:             ContextFogEffect,
  false_authority:            TokenForgeryEffect,

  // PrivilegeReaper
  admin_impersonation:        TokenForgeryEffect,
  token_forgery:              TokenForgeryEffect,
  sudo_injection:             DirectInjectionEffect,
  permission_bypass:          TokenForgeryEffect,
  multi_step_attack:          MultiStepEffect,

  // SilentEscalator
  incremental_trust:          StealthWaveEffect,
  boundary_erosion:           StealthWaveEffect,
  context_normalization:      StealthWaveEffect,
  jailbreak_roleplay:         JailbreakRoleplayEffect,

  // NetworkPhantom
  dns_spoofing:               NetworkPacketsEffect,
  mitm_interception:          NetworkPacketsEffect,
  traffic_injection:          NetworkPacketsEffect,
  packet_sniffing:            NetworkPacketsEffect,
  arp_poisoning:              ArpPoisoningEffect,
};

/**
 * Main router component.
 * @param {Vector3} from   - agent position
 * @param {Vector3} to     - target device position
 * @param {string}  tactic - tactic name from backend
 * @param {string}  agent  - agent name (for color fallback)
 */
export default function AttackEffectRouter({ from, to, tactic, agent }) {
  const Effect = TACTIC_ROUTES[tactic] || GenericBeamEffect;
  const color = AGENT_COLORS[agent] || '#ff3b6b';

  if (!from || !to) return null;

  // Convert plain arrays to Vector3 if needed
  const fromVec = from instanceof THREE.Vector3 ? from : new THREE.Vector3(...from);
  const toVec = to instanceof THREE.Vector3 ? to : new THREE.Vector3(...to);

  return <Effect from={fromVec} to={toVec} color={color} />;
}

export { AGENT_COLORS, TACTIC_ROUTES };
