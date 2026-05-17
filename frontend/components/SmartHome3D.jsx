/**
 * SmartHome3D — procedural Three.js scene used by the Battle page.
 *
 * Zero GLB assets: every device, every agent and the house itself is built
 * from primitive geometries inside react-three-fiber. The component is
 * fully driven by the props streamed from the WebSocket battle pipeline:
 *
 *   • deviceStates       — current backend status of each device
 *   • activeAttack       — currently-attacking agent + target + tactic
 *   • defendedTargets    — devices that just blocked an attack
 *   • agentStatuses      — IDLE / CHARGING / ATTACKING / BREACH / BLOCKED
 *   • shieldActive       — global defense shield
 *   • onHover / onSelect — UI callbacks (kind: 'device' | 'agent')
 *   • hoveredObjectId / selectedObjectId — sync with overlay tooltip
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshReflectorMaterial, RoundedBox, Float, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useMemo, useRef, useState, memo, useEffect } from 'react';

import { DEVICES, getDevice } from './meta/devices';
import { AGENTS as AGENT_META } from './meta/agents';

// ── Layout constants ────────────────────────────────────────────────────────
const RADIUS = 6.5;
const HOUSE_RADIUS = 3.0;

const AGENT_ANGLES = {
  ShadowInjector:  (0 * Math.PI) / 2.5,
  ContextPhantom:  (1 * Math.PI) / 2.5,
  PrivilegeReaper: (2 * Math.PI) / 2.5,
  SilentEscalator: (3 * Math.PI) / 2.5,
  NetworkPhantom:  (4 * Math.PI) / 2.5,
};

// Status colour palette (mirrors SmartHomeBoard.statusTone but for 3D).
const STATUS_COLORS = {
  safe:   '#10ffac',
  warn:   '#ff9f0a',
  breach: '#ff3b6b',
  idle:   '#5b6678',
};

function statusTone(status) {
  if (!status) return 'idle';
  const s = String(status).toLowerCase();
  if (['compromised', 'dns_poisoned', 'unlocked', 'disabled', 'disarmed',
       'overridden', 'critical', 'open', 'overloaded', 'flooding',
       'triggered'].includes(s)) return 'breach';
  if (['active', 'armed', 'locked', 'closed', 'secure', 'normal',
       'listening', 'on', 'standby', 'idle', 'docked', 'playing',
       'inactive'].includes(s)) return 'safe';
  return 'warn';
}

// ── Holographic house (cribbed from HomeHero3D, slightly bigger) ────────────
const HolographicHouse = memo(function HolographicHouse() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[5.6, 0.1, 4.8]} />
        <meshStandardMaterial color="#0d1428" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.15, 3.35, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      <RoundedBox args={[4.4, 2.1, 3.6]} radius={0.07} smoothness={4} position={[0, 1.15, 0]}>
        <meshStandardMaterial
          color="#5cc8ff"
          emissive="#00d4ff"
          emissiveIntensity={0.32}
          metalness={0.5}
          roughness={0.25}
          transparent
          opacity={0.42}
        />
      </RoundedBox>

      <mesh position={[0, 2.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.95, 1.2, 4]} />
        <meshStandardMaterial color="#1a2240" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <torusGeometry args={[2.95, 0.04, 8, 4]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>
    </group>
  );
});

// ── Reflective floor ────────────────────────────────────────────────────────
const ReflectiveGround = memo(function ReflectiveGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[80, 80]} />
      <MeshReflectorMaterial
        blur={[300, 80]}
        resolution={384}
        mixBlur={1}
        mixStrength={32}
        roughness={0.9}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#04060e"
        metalness={0.5}
        mirror={0.25}
      />
    </mesh>
  );
});

// ── Stars ───────────────────────────────────────────────────────────────────
const STAR_COUNT = 120;
const Stars = memo(function Stars() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 10 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.5;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.015;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={STAR_COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#9bc8ff" size={0.04} transparent opacity={0.45} sizeAttenuation />
    </points>
  );
});

// ── Device node ─────────────────────────────────────────────────────────────
function DeviceNode({
  device, status, attacking, defended, hovered, selected,
  showLabel, onHover, onSelect,
}) {
  const ref = useRef();
  const ringRef = useRef();
  const tone = statusTone(status);
  const statusColor = STATUS_COLORS[tone];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = t * 0.6;
      // breathing scale for attacked / hovered / defended
      const k =
        attacking ? 1.0 + Math.sin(t * 8) * 0.18 :
        defended  ? 1.0 + Math.sin(t * 5) * 0.10 :
        hovered   ? 1.10 :
        selected  ? 1.08 :
        1.0;
      ref.current.scale.setScalar(k);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.2;
      ringRef.current.material.opacity = 0.45 + Math.sin(t * 3) * 0.15;
    }
  });

  const pos = device.position3D;

  return (
    <group position={pos}>
      {/* core */}
      <mesh
        ref={ref}
        onPointerOver={(e) => { e.stopPropagation(); onHover?.({ id: device.id, kind: 'device', x: e.clientX, y: e.clientY }); }}
        onPointerOut={(e)  => { e.stopPropagation(); onHover?.(null); }}
        onPointerMove={(e) => { e.stopPropagation(); onHover?.({ id: device.id, kind: 'device', x: e.clientX, y: e.clientY }); }}
        onClick={(e) => { e.stopPropagation(); onSelect?.({ id: device.id, kind: 'device' }); }}
      >
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color={device.color}
          emissive={tone === 'breach' ? statusColor : device.color}
          emissiveIntensity={tone === 'breach' ? 1.4 : 0.75}
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>

      {/* outer ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.42, 0.018, 8, 32]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.55} />
      </mesh>

      {/* attack pulse */}
      {attacking && (
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color="#ff3b6b" transparent opacity={0.18} />
        </mesh>
      )}

      {/* defended flash */}
      {defended && (
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color="#10ffac" transparent opacity={0.18} />
        </mesh>
      )}

      {(showLabel || hovered || selected || attacking) && (
        <Html distanceFactor={9} position={[0, 0.55, 0]} center>
          <div style={{
            pointerEvents: 'none',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, fontWeight: 700,
            color: statusColor,
            background: 'rgba(0,0,0,0.65)',
            padding: '2px 6px',
            borderRadius: 4,
            border: `1px solid ${statusColor}55`,
            whiteSpace: 'nowrap',
          }}>
            {device.icon} {device.label}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Crystal agent (orbit) ───────────────────────────────────────────────────
function CrystalAgent({
  agent, angle, status, breathOffset, hovered, selected, attacking,
  onHover, onSelect, setAgentWorldPos,
}) {
  const ref = useRef();
  const ringRef = useRef();
  const isAttacking = attacking || status === 'CHARGING' || status === 'ATTACKING';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ref.current) return;
    const x = Math.cos(angle + t * 0.06) * RADIUS;
    const z = Math.sin(angle + t * 0.06) * RADIUS;
    const y = 1.9 + Math.sin(t * 1.4 + breathOffset) * 0.22;
    ref.current.position.set(x, y, z);
    ref.current.rotation.y = t * 0.5;
    if (ringRef.current) ringRef.current.rotation.z = t * 1.0;
    // expose world position to parent so beams can use it
    setAgentWorldPos?.(agent.name, new THREE.Vector3(x, y, z));
  });

  const auraOpacity = isAttacking ? 0.22 : hovered || selected ? 0.18 : 0.10;

  return (
    <group
      ref={ref}
      onPointerOver={(e) => { e.stopPropagation(); onHover?.({ id: agent.name, kind: 'agent', x: e.clientX, y: e.clientY }); }}
      onPointerOut={(e)  => { e.stopPropagation(); onHover?.(null); }}
      onPointerMove={(e) => { e.stopPropagation(); onHover?.({ id: agent.name, kind: 'agent', x: e.clientX, y: e.clientY }); }}
      onClick={(e) => { e.stopPropagation(); onSelect?.({ id: agent.name, kind: 'agent' }); }}
    >
      <mesh>
        <sphereGeometry args={[0.62, 16, 16]} />
        <meshBasicMaterial color={agent.color} transparent opacity={auraOpacity} />
      </mesh>

      <mesh castShadow>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color={agent.color}
          emissive={agent.color}
          emissiveIntensity={isAttacking ? 2.0 : 1.3}
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>

      <mesh ref={ringRef}>
        <torusGeometry args={[0.58, 0.022, 8, 32]} />
        <meshBasicMaterial color={agent.color} transparent opacity={0.6} />
      </mesh>

      <pointLight color={agent.color} intensity={isAttacking ? 2.2 : 1.4} distance={4} decay={2} />

      {(hovered || selected || isAttacking) && (
        <Html distanceFactor={9} position={[0, 0.85, 0]} center>
          <div style={{
            pointerEvents: 'none',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, fontWeight: 700,
            color: agent.color,
            background: 'rgba(0,0,0,0.7)',
            padding: '3px 7px',
            borderRadius: 5,
            border: `1px solid ${agent.color}aa`,
            whiteSpace: 'nowrap',
          }}>
            {agent.icon} {agent.name} · {status || 'IDLE'}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Attack beam (real-time, animated) ───────────────────────────────────────
function AttackBeam({ from, to, color, blocked }) {
  const lineRef = useRef();
  const haloRef = useRef();
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints([from, to]), [from, to]);
  useFrame(({ clock }) => {
    if (lineRef.current) {
      const k = (Math.sin(clock.getElapsedTime() * 7) + 1) * 0.5;
      lineRef.current.material.opacity = 0.5 + k * 0.45;
    }
    if (haloRef.current) {
      const k = (Math.sin(clock.getElapsedTime() * 4) + 1) * 0.5;
      haloRef.current.scale.setScalar(1 + k * 0.4);
    }
  });
  const beamColor = blocked ? '#10ffac' : color;
  return (
    <group>
      <line ref={lineRef} geometry={geo}>
        <lineBasicMaterial color={beamColor} transparent opacity={0.85} />
      </line>
      <mesh position={to}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color={beamColor} transparent opacity={0.45} />
      </mesh>
      <mesh ref={haloRef} position={to}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshBasicMaterial color={beamColor} transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

// ── Shield dome ─────────────────────────────────────────────────────────────
function ShieldDome({ visible }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.rotation.y = t * 0.15;
      ref.current.material.opacity = 0.18 + Math.sin(t * 2) * 0.06;
    }
  });
  if (!visible) return null;
  return (
    <mesh ref={ref} position={[0, 1.2, 0]}>
      <sphereGeometry args={[5.2, 32, 32]} />
      <meshBasicMaterial color="#00d4ff" transparent opacity={0.22} wireframe />
    </mesh>
  );
}

// ── Camera rig ──────────────────────────────────────────────────────────────
function CinematicCamera({ enabled }) {
  useFrame(({ camera, clock }) => {
    if (!enabled) return;
    const t = clock.getElapsedTime();
    const radius = 13;
    camera.position.x = Math.cos(t * 0.06) * radius;
    camera.position.z = Math.sin(t * 0.06) * radius;
    camera.position.y = 6 + Math.sin(t * 0.13) * 0.5;
    camera.lookAt(0, 1.5, 0);
  });
  return null;
}

// ── Scene contents (must live inside Canvas) ────────────────────────────────
function Scene({
  deviceStates, activeAttack, defendedTargets, agentStatuses, shieldActive,
  performanceMode, showLabels,
  hoveredObjectId, selectedObjectId,
  onHover, onSelect,
  autoOrbit,
}) {
  // Track each agent's current world position so we can draw beams to devices.
  const agentPositions = useRef({});
  const setAgentWorldPos = (name, v) => { agentPositions.current[name] = v; };

  // Compute beam endpoints for the currently-active attack.
  const beam = useMemo(() => {
    if (!activeAttack?.agent || !activeAttack?.target) return null;
    const targetDev = getDevice(activeAttack.target);
    if (!targetDev) return null;
    const to = new THREE.Vector3(...targetDev.position3D);
    const agentPos = agentPositions.current[activeAttack.agent];
    if (!agentPos) {
      // fall back to static angle
      const a = AGENT_ANGLES[activeAttack.agent] ?? 0;
      const from = new THREE.Vector3(Math.cos(a) * RADIUS, 1.9, Math.sin(a) * RADIUS);
      const agentMeta = AGENT_META.find((m) => m.name === activeAttack.agent);
      return { from, to, color: agentMeta?.color || '#ff3b6b' };
    }
    const agentMeta = AGENT_META.find((m) => m.name === activeAttack.agent);
    return { from: agentPos.clone(), to, color: agentMeta?.color || '#ff3b6b' };
  }, [activeAttack]);

  const blocked = activeAttack?.success === false;

  return (
    <>
      <color attach="background" args={['#03060c']} />
      <fog attach="fog" args={['#03060c', 16, 36]} />

      <ambientLight intensity={0.2} color="#5570aa" />
      <pointLight position={[-7, 6, 4]} intensity={1.0} color="#ff3b6b" distance={22} />
      <pointLight position={[7, 6, -4]}  intensity={1.0} color="#00d4ff" distance={22} />
      <pointLight position={[0, 9, -6]}  intensity={0.7} color="#a855f7" distance={22} />

      {!performanceMode && <ReflectiveGround />}
      {!performanceMode && <Stars />}

      <Float speed={1.0} rotationIntensity={0.03} floatIntensity={0.06}>
        <HolographicHouse />
      </Float>

      {/* Devices */}
      {DEVICES.map((d) => (
        <DeviceNode
          key={d.id}
          device={d}
          status={deviceStates?.[d.id]?.status}
          attacking={activeAttack?.target === d.id}
          defended={defendedTargets.includes(d.id)}
          hovered={hoveredObjectId === d.id}
          selected={selectedObjectId === d.id}
          showLabel={!!showLabels}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      {/* Agents */}
      {AGENT_META.map((a, i) => (
        <CrystalAgent
          key={a.name}
          agent={a}
          angle={AGENT_ANGLES[a.name] ?? (i * Math.PI * 2) / AGENT_META.length}
          status={agentStatuses?.[a.name] || 'IDLE'}
          breathOffset={i * 0.7}
          hovered={hoveredObjectId === a.name}
          selected={selectedObjectId === a.name}
          attacking={activeAttack?.agent === a.name}
          onHover={onHover}
          onSelect={onSelect}
          setAgentWorldPos={setAgentWorldPos}
        />
      ))}

      {beam && <AttackBeam from={beam.from} to={beam.to} color={beam.color} blocked={blocked} />}

      <ShieldDome visible={!!shieldActive} />

      <CinematicCamera enabled={autoOrbit} />
      {!autoOrbit && (
        <OrbitControls
          enablePan
          enableZoom
          minDistance={6}
          maxDistance={24}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={Math.PI / 6}
        />
      )}
    </>
  );
}

// ── Public component ────────────────────────────────────────────────────────
export default function SmartHome3D({
  deviceStates = {},
  activeAttack = null,
  defendedTargets = [],
  agentStatuses = {},
  shieldActive = false,
  performanceMode = false,
  showLabels = false,
  hoveredObjectId = null,
  selectedObjectId = null,
  onHover,
  onSelect,
  autoOrbit = false,
}) {
  return (
    <Canvas
      camera={{ position: [11, 6.5, 11], fov: 50 }}
      shadows={false}
      dpr={performanceMode ? [0.8, 1] : [1, 1.5]}
      gl={{
        antialias: !performanceMode,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      performance={{ min: 0.4 }}
      style={{ background: 'transparent', height: '100%', width: '100%' }}
    >
      <Scene
        deviceStates={deviceStates}
        activeAttack={activeAttack}
        defendedTargets={defendedTargets}
        agentStatuses={agentStatuses}
        shieldActive={shieldActive}
        performanceMode={performanceMode}
        showLabels={showLabels}
        hoveredObjectId={hoveredObjectId}
        selectedObjectId={selectedObjectId}
        onHover={onHover}
        onSelect={onSelect}
        autoOrbit={autoOrbit}
      />

      {!performanceMode && (
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.5} mipmapBlur radius={0.7} />
          <Vignette eskil={false} offset={0.2} darkness={0.85} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
