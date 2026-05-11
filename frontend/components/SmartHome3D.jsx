/**
 * SmartHome3D — Cinematic 3D battle visualization (v4 · clean labels).
 *
 * Aesthetic preserved (cyberpunk "Hollywood-hacker" mission control):
 *   • Reflective wet-look floor (MeshReflectorMaterial)
 *   • Holographic translucent house (HolographicMaterial)
 *   • Crystal-orb / .glb agent avatars
 *   • Floating data nodes (devices) with status colours
 *   • Glitch postprocessing on breach
 *   • Bloom + Vignette cinematic look
 *
 * v4 (presentation cleanup):
 *   • NO permanent text labels in the scene.
 *   • Labels (small, 1–2 lines) only show when:
 *       - hoveredObjectId === id
 *       - selectedObjectId === id
 *       - activeAttack.agentId === id  or  activeAttack.target === id
 *       - showDebugLabels === true
 *   • All long explanations live in the right-side tabs, NOT in the canvas.
 *   • Optional .glb models loaded via ModelAsset with graceful fallback.
 *   • Scene visibility toggles: showLabels / showAttackBeams /
 *     showStatusIcons / showDebugGrid / performanceMode.
 */
import { useRef, useMemo, useEffect, useState, memo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshReflectorMaterial, RoundedBox, Float, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Glitch } from '@react-three/postprocessing';
import { GlitchMode } from 'postprocessing';
import * as THREE from 'three';
import AttackEffectRouter from './AttackEffects';
import HolographicMaterial from './HolographicMaterial';
import ModelAsset from './ModelAsset';
import { DEVICES, DEVICE_INDEX } from './meta/devices';
import {
  DEVICE_MODEL_KEYS, AGENT_MODEL_KEYS, MODEL_REGISTRY, ENVIRONMENT_KEYS, getModelEntry,
} from '../lib/modelRegistry';

// ── Constants ─────────────────────────────────────────────────────────────────
// Positions spread out around the house so GLB agent avatars never overlap.
const AGENT_HOME_POSITIONS = {
  ShadowInjector:   [-5.0, 0, -2.0],
  ContextPhantom:   [-4.0, 0,  1.0],
  PrivilegeReaper:  [-5.0, 0,  3.0],
  SilentEscalator:  [-3.0, 0, -4.0],
  NetworkPhantom:   [-2.0, 0,  4.0],
};

const AGENT_COLORS = {
  ShadowInjector:  '#ff3b6b',
  ContextPhantom:  '#a855f7',
  PrivilegeReaper: '#ff8a2a',
  SilentEscalator: '#00d4ff',
  NetworkPhantom:  '#10ffac',
};

const DEVICE_POSITIONS = Object.fromEntries(DEVICES.map((d) => [d.id, d.position3D]));

// ── Compact label (only rendered when explicitly needed) ─────────────────────
function MiniLabel({ position, color, children }) {
  return (
    <Html
      center
      distanceFactor={9}
      occlude
      position={position}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        padding: '2px 6px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9,
        fontWeight: 700,
        color,
        background: 'rgba(0, 0, 0, 0.7)',
        border: `1px solid ${color}66`,
        borderRadius: 3,
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        userSelect: 'none',
      }}>
        {children}
      </div>
    </Html>
  );
}

// ── Reflective floor ─────────────────────────────────────────────────────────
const Floor = memo(function Floor({ showDebugGrid }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={42}
          roughness={0.85}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0c1226"
          metalness={0.6}
          mirror={0.3}
        />
      </mesh>
      {showDebugGrid && (
        <gridHelper args={[40, 40, '#00d4ff', '#1a2240']} position={[0, 0.01, 0]} />
      )}
    </>
  );
});

// ── Holographic house ─────────────────────────────────────────────────────────
const HolographicHouse = memo(function HolographicHouse() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.1, 5.4]} />
        <meshStandardMaterial color="#0d1428" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 3.85, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <RoundedBox args={[5, 2.4, 4]} radius={0.08} smoothness={4} position={[0, 1.3, 0]}>
        <HolographicMaterial color="#5cc8ff" brightness={1.4} scanlineSize={12} fresnelAmount={0.6} />
      </RoundedBox>
      <mesh position={[0, 3.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.3, 1.4, 4]} />
        <meshStandardMaterial color="#1a2240" emissive="#1a2240" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.51, 0]}>
        <torusGeometry args={[3.3, 0.04, 8, 4]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <group key={x} position={[x, 1.45, 2.02]}>
          <mesh>
            <boxGeometry args={[0.95, 0.85, 0.05]} />
            <meshStandardMaterial color="#0a1428" emissive="#a855f7" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.82, 0.7]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
      {[-1.2, 1.2].map((z) => (
        <mesh key={z} position={[2.52, 1.4, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.7, 0.6]} />
          <meshBasicMaterial color="#10ffac" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[1.2, 4.0, -0.6]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
        <meshStandardMaterial color="#888" metalness={0.9} />
      </mesh>
      <mesh position={[1.2, 4.65, -0.6]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#ff3b6b" emissive="#ff3b6b" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
});

// ── .glb / fallback avatar agent ─────────────────────────────────────────────
// Ground-positioned group. The avatar stands on the floor; a small status
// orb + rings bob above its head.
function AgentFigure({
  name, isActive, activeAttack, status,
  showLabel, isHovered, isSelected,
  onPointerOver, onPointerOut, onClick,
}) {
  const groupRef = useRef();     // root group – drives XZ movement on the ground
  const crownRef = useRef();     // status orb + rings above the head
  const orbRef   = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  const colorHex = AGENT_COLORS[name] || '#ff3b6b';
  const homePos = AGENT_HOME_POSITIONS[name] || [-5, 0, 0];
  const modelKey = AGENT_MODEL_KEYS[name];
  const modelScale = modelKey ? (MODEL_REGISTRY[modelKey]?.scale ?? 0.8) : 0.8;

  const targetPos = useMemo(() => {
    if (isActive && activeAttack?.target && DEVICE_POSITIONS[activeAttack.target]) {
      const dp = DEVICE_POSITIONS[activeAttack.target];
      // stand ~2.2 units away from the targeted device, still on the ground
      return [dp[0] - 2.2, 0, dp[2]];
    }
    return homePos;
  }, [isActive, activeAttack?.target, homePos]);

  const posRef = useRef(new THREE.Vector3(...homePos));
  const lookVecRef = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;
    // XZ movement on the ground
    posRef.current.x += (targetPos[0] - posRef.current.x) * 0.05;
    posRef.current.z += (targetPos[2] - posRef.current.z) * 0.05;
    groupRef.current.position.set(posRef.current.x, 0, posRef.current.z);

    // Face the target during an attack
    if (isActive && activeAttack?.target && DEVICE_POSITIONS[activeAttack.target]) {
      const dp = DEVICE_POSITIONS[activeAttack.target];
      lookVecRef.current.set(dp[0], 0, dp[2]);
      groupRef.current.lookAt(lookVecRef.current);
    } else {
      groupRef.current.rotation.y += 0.003;
    }

    // Floating crown (orb + rings) above head
    if (crownRef.current) {
      crownRef.current.position.y = 2.0 + Math.sin(t * 1.6 + name.length) * 0.14;
    }
    if (orbRef.current) {
      orbRef.current.rotation.y = t * 1.2;
      orbRef.current.rotation.x = t * 0.6;
      const sc = isActive ? 1 + Math.sin(t * 8) * 0.08 : 1;
      orbRef.current.scale.setScalar(sc);
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.8;
    if (ring2Ref.current) ring2Ref.current.rotation.x = t * 1.1;
  });

  const ringScale = isHovered || isSelected ? 1.18 : 1;

  return (
    <group ref={groupRef}>
      {/* Ground aura */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.75, 24]} />
        <meshBasicMaterial color={colorHex} transparent
          opacity={isActive ? 0.35 : isHovered || isSelected ? 0.25 : 0.12}
          depthWrite={false} />
      </mesh>

      {/* Avatar (.glb via ModelAsset) – falls back to procedural primitive */}
      <ModelAsset
        modelKey={modelKey}
        fallback={modelKey ? undefined : 'humanoid'}
        tint={colorHex}
        position={[0, 0, 0]}
        scale={modelScale}
        isActive={isActive}
        isBreached={status === 'BREACH'}
        isProtected={status === 'BLOCKED'}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      />

      {/* Status crown above the head */}
      <group ref={crownRef}>
        <mesh ref={orbRef} castShadow>
          <icosahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial
            color={colorHex} emissive={colorHex}
            emissiveIntensity={isActive ? 1.6 : isHovered ? 1.2 : 0.9}
            metalness={0.9} roughness={0.15}
            transparent opacity={0.95}
          />
        </mesh>
        <mesh ref={ring1Ref} scale={ringScale}>
          <torusGeometry args={[0.32, 0.015, 6, 20]} />
          <meshBasicMaterial color={colorHex} transparent opacity={0.7} />
        </mesh>
        <mesh ref={ring2Ref} scale={ringScale}>
          <torusGeometry args={[0.26, 0.01, 6, 20]} />
          <meshBasicMaterial color={colorHex} transparent opacity={0.5} />
        </mesh>
      </group>

      <pointLight position={[0, 1.4, 0]} color={colorHex}
        intensity={isActive ? 3.2 : isHovered ? 2.0 : 1.3} distance={5} decay={2} />

      {/* Compact label — only when needed */}
      {showLabel && (
        <MiniLabel position={[0, 2.55, 0]} color={colorHex}>
          {name}
          {status && status !== 'IDLE' ? ` · ${status}` : ''}
        </MiniLabel>
      )}
    </group>
  );
}

// ── Holographic data node (device) ────────────────────────────────────────────
function DeviceNode({
  deviceId, compromised, defended, targeted,
  showLabel, isHovered, isSelected,
  onPointerOver, onPointerOut, onClick,
  showStatusIcons,
}) {
  const meshRef = useRef();
  const ringRef = useRef();
  const corePos = DEVICE_POSITIONS[deviceId];
  if (!corePos) return null;
  const meta = DEVICE_INDEX[deviceId];
  const baseColor = compromised ? '#ff3b6b' : defended ? '#10ffac' : (meta?.color || '#00d4ff');
  const labelColor = compromised ? '#ff3b6b' : defended ? '#10ffac' : targeted ? '#ffd60a' : meta?.color;
  const modelKey = DEVICE_MODEL_KEYS[deviceId];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const intensity = compromised
        ? 1.2 + Math.sin(t * 12) * 0.4
        : defended
          ? 0.9 + Math.sin(t * 4) * 0.25
          : targeted
            ? 0.8 + Math.sin(t * 6) * 0.3
            : isHovered
              ? 0.7
              : 0.45 + Math.sin(t * 1.5) * 0.1;
      if (meshRef.current.material) {
        meshRef.current.material.emissiveIntensity = intensity;
      }
      meshRef.current.rotation.y = t * 0.6;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * (compromised ? 4 : targeted ? 2.4 : 1.4);
      const op = compromised ? 0.85 : defended ? 0.7 : targeted ? 0.7 : isHovered ? 0.6 : 0.35;
      ringRef.current.material.opacity = op + Math.sin(t * 5) * 0.12;
    }
  });

  // selection halo
  const halo = isSelected || isHovered;

  return (
    <group
      position={corePos}
      onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(e); }}
      onPointerOut={onPointerOut}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
    >
      {/* Status icon — a tiny coloured octahedron core that's always present */}
      {showStatusIcons && (
        <mesh ref={meshRef} castShadow>
          <octahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial
            color={baseColor} emissive={baseColor}
            emissiveIntensity={0.6}
            metalness={0.9} roughness={0.1}
          />
        </mesh>
      )}

      {/* .glb model with fallback primitive — never breaks */}
      {modelKey && (
        <ModelAsset
          modelKey={modelKey}
          fallback={undefined /* read from registry */}
          tint={baseColor}
          position={[0, -0.1, 0]}
          isActive={targeted}
          isBreached={compromised}
        />
      )}

      {/* Pulsing ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.32, 0.018, 8, 20]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.6} />
      </mesh>

      {/* Selection halo */}
      {halo && (
        <mesh>
          <torusGeometry args={[0.45, 0.012, 6, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
      )}

      <pointLight color={baseColor} intensity={compromised ? 2.2 : defended ? 1.5 : targeted ? 1.4 : 0.9} distance={2.8} decay={2} />

      {showLabel && (
        <MiniLabel position={[0, 0.55, 0]} color={labelColor}>
          {meta?.label || deviceId}
        </MiniLabel>
      )}
    </group>
  );
}

// ── Defense shield dome ───────────────────────────────────────────────────────
function ShieldDome({ active }) {
  const outerRef = useRef();
  const innerRef = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const targetOuter = active ? 0.18 + Math.sin(t * 2.5) * 0.06 : 0;
    const targetInner = active ? 0.07 + Math.sin(t * 4) * 0.03 : 0;
    if (outerRef.current) {
      outerRef.current.material.opacity += (targetOuter - outerRef.current.material.opacity) * 0.1;
      outerRef.current.rotation.y = t * 0.1;
    }
    if (innerRef.current) {
      innerRef.current.material.opacity += (targetInner - innerRef.current.material.opacity) * 0.1;
    }
  });
  return (
    <group position={[0, 0, 0]}>
      <mesh ref={outerRef}>
        <sphereGeometry args={[6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#10ffac" transparent opacity={0} side={THREE.BackSide} depthWrite={false} wireframe />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[5.7, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#10ffac" transparent opacity={0} side={THREE.FrontSide} depthWrite={false} />
      </mesh>
      {active && <pointLight color="#10ffac" intensity={1.5} distance={14} position={[0, 4, 0]} />}
    </group>
  );
}

// ── Breach explosion ─────────────────────────────────────────────────────────
function BreachExplosion({ position, active }) {
  const groupRef = useRef();
  const progressRef = useRef(0);
  const PARTICLE_COUNT = 14;
  const particles = useMemo(() => Array.from({ length: PARTICLE_COUNT }, () => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return {
      dir: new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.abs(Math.sin(phi) * Math.sin(theta)) + 0.3,
        Math.sin(phi) * Math.cos(theta + 1),
      ).normalize(),
      speed: 0.8 + Math.random() * 1.6,
      size: 0.05 + Math.random() * 0.07,
    };
  }), []);

  useEffect(() => { if (!active) progressRef.current = 0; }, [active]);
  useFrame((_, delta) => {
    if (!active || !groupRef.current) return;
    progressRef.current = Math.min(progressRef.current + delta * 1.6, 1);
    groupRef.current.children.forEach((child, i) => {
      if (i < PARTICLE_COUNT && particles[i]) {
        const p = particles[i];
        const dist = progressRef.current * p.speed;
        child.position.set(p.dir.x * dist, p.dir.y * dist, p.dir.z * dist);
        if (child.material) child.material.opacity = Math.max(0, 1 - progressRef.current * 1.4);
      }
    });
  });

  if (!active || !position) return null;
  return (
    <group ref={groupRef} position={position}>
      {particles.map((p, i) => (
        <mesh key={i}>
          <sphereGeometry args={[p.size, 6, 6]} />
          <meshBasicMaterial color="#ff3b6b" transparent opacity={1} depthWrite={false} />
        </mesh>
      ))}
      <pointLight color="#ff3b6b" intensity={5} distance={4} decay={2} />
    </group>
  );
}

// ── Ambient atmospheric particles ─────────────────────────────────────────────
const AMBIENT_PARTICLE_COUNT = 28;
const AmbientParticles = memo(function AmbientParticles() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(AMBIENT_PARTICLE_COUNT * 3);
    for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = Math.random() * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    return arr;
  }, []);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.025; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={AMBIENT_PARTICLE_COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00d4ff" size={0.04} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
});

// ── Environment background (heavy, optional, pick one at most) ──────────────
function EnvironmentBackground({ environment }) {
  if (!environment || environment === 'none') return null;
  const modelKey = ENVIRONMENT_KEYS[environment];
  if (!modelKey) return null;
  const entry = getModelEntry(modelKey);
  if (!entry) return null;
  // Parked far from origin and lifted slightly so it acts as a skybox-style
  // backdrop rather than blocking the battle scene.
  return (
    <ModelAsset
      key={environment}
      modelKey={modelKey}
      fallback={entry.fallback}
      tint="#2a3754"
      position={[0, -1, -18]}
      scale={entry.scale ?? 0.3}
    />
  );
}

// ── Main inner scene ─────────────────────────────────────────────────────────
function SmartHome3DInner({
  deviceStates,
  activeAttack,
  defendedTargets,
  activeAgent,
  shieldActive,
  riskScore,
  performanceMode,
  enablePostprocessing,
  agentStatuses,

  // Scene visibility toggles (all optional)
  showLabels,         // false by default; true = "debug labels" mode
  showAttackBeams,    // true by default
  showStatusIcons,    // true by default
  showDebugGrid,      // false by default

  // Environment: 'none' | 'cyber_city' | 'dystopian_city'
  environment = 'none',

  // Interactivity
  hoveredObjectId,
  selectedObjectId,
  onHover,
  onSelect,
}) {
  const agentNames = Object.keys(AGENT_HOME_POSITIONS);
  const [glitchTrigger, setGlitchTrigger] = useState(0);
  useEffect(() => {
    if (activeAttack?.success === true) setGlitchTrigger((g) => g + 1);
  }, [activeAttack?.success]);

  const beamFrom = useMemo(() => {
    if (!activeAgent) return null;
    // Ideally we would read the live agent position, but using the "home"
    // slot + crown height (~2.0) is close enough for the visual beam.
    const home = AGENT_HOME_POSITIONS[activeAgent];
    if (!home) return null;
    return new THREE.Vector3(home[0], 2.0, home[2]);
  }, [activeAgent]);
  const beamTo = useMemo(() => {
    if (!activeAttack?.target) return null;
    const dp = DEVICE_POSITIONS[activeAttack.target];
    if (!dp) return null;
    return new THREE.Vector3(...dp);
  }, [activeAttack?.target]);

  const riskMood = riskScore >= 80 ? 'chaos'
                : riskScore >= 60 ? 'danger'
                : riskScore >= 30 ? 'warning'
                : 'calm';
  const rimRed  = riskMood === 'chaos' ? 2.0 : riskMood === 'danger' ? 1.5 : 1.0;
  const rimCyan = riskMood === 'calm' ? 1.3 : 0.9;

  const wantsPostFX = enablePostprocessing && !performanceMode &&
    (activeAttack !== null || riskScore >= 30 || shieldActive);

  // Helper — should we label this object right now?
  const shouldShowLabel = useCallback((id) => {
    if (showLabels) return true;
    if (hoveredObjectId === id) return true;
    if (selectedObjectId === id) return true;
    if (activeAttack?.agent === id) return true;
    if (activeAttack?.target === id) return true;
    return false;
  }, [showLabels, hoveredObjectId, selectedObjectId, activeAttack]);

  return (
    <Canvas
      camera={{ position: [11, 7, 12], fov: 45 }}
      shadows={performanceMode ? false : 'basic'}
      dpr={performanceMode ? [1, 1] : [1, 1.6]}
      gl={{
        antialias: !performanceMode,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      performance={{ min: 0.4 }}
      frameloop="always"
    >
      <color attach="background" args={['#03060c']} />
      <fog attach="fog" args={['#03060c', 20, 36]} />
      <ambientLight intensity={0.18} color="#5570aa" />
      {!performanceMode && (
        <directionalLight
          position={[8, 14, 6]} intensity={0.6} color="#a8b8ff"
          castShadow shadow-mapSize={[512, 512]}
          shadow-camera-near={0.1} shadow-camera-far={30}
          shadow-camera-left={-10} shadow-camera-right={10}
          shadow-camera-top={10} shadow-camera-bottom={-10}
        />
      )}
      <pointLight position={[-8, 5, 4]} intensity={rimRed}  color="#ff3b6b" distance={20} />
      <pointLight position={[8, 5, -4]} intensity={rimCyan} color="#00d4ff" distance={20} />
      {!performanceMode && (
        <pointLight position={[0, 8, -8]} intensity={0.8} color="#a855f7" distance={20} />
      )}

      {/* Optional heavy environment background (only one can be active) */}
      <EnvironmentBackground environment={environment} />

      <Floor showDebugGrid={showDebugGrid} />
      {!performanceMode && <AmbientParticles />}

      <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.08}>
        <HolographicHouse />
      </Float>

      {agentNames.map((name) => (
        <AgentFigure
          key={name}
          name={name}
          isActive={activeAgent === name}
          activeAttack={activeAgent === name ? activeAttack : null}
          status={agentStatuses?.[name]}
          showLabel={shouldShowLabel(name)}
          isHovered={hoveredObjectId === name}
          isSelected={selectedObjectId === name}
          onPointerOver={(e) => onHover?.({ id: name, kind: 'agent', x: e?.clientX, y: e?.clientY })}
          onPointerOut={() => onHover?.(null)}
          onClick={() => onSelect?.({ id: name, kind: 'agent' })}
        />
      ))}

      {DEVICES.map((d) => {
        const isTargeted = activeAttack?.target === d.id;
        const compromised = isTargeted && activeAttack?.success === true;
        const defended = defendedTargets?.includes(d.id) || (isTargeted && activeAttack?.success === false);
        return (
          <DeviceNode
            key={d.id}
            deviceId={d.id}
            compromised={compromised}
            defended={defended}
            targeted={isTargeted}
            showLabel={shouldShowLabel(d.id)}
            isHovered={hoveredObjectId === d.id}
            isSelected={selectedObjectId === d.id}
            showStatusIcons={showStatusIcons !== false}
            onPointerOver={(e) => onHover?.({ id: d.id, kind: 'device', x: e?.clientX, y: e?.clientY })}
            onPointerOut={() => onHover?.(null)}
            onClick={() => onSelect?.({ id: d.id, kind: 'device' })}
          />
        );
      })}

      {showAttackBeams !== false && beamFrom && beamTo && activeAttack && (
        <AttackEffectRouter
          from={beamFrom}
          to={beamTo}
          tactic={activeAttack.tactic}
          agent={activeAgent}
        />
      )}

      <ShieldDome active={shieldActive} />

      <BreachExplosion
        position={activeAttack?.target ? DEVICE_POSITIONS[activeAttack.target] : null}
        active={activeAttack?.success === true}
      />

      <OrbitControls
        enablePan enableZoom
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={Math.PI / 10}
        maxDistance={22} minDistance={5}
        enableDamping dampingFactor={0.08}
      />

      {wantsPostFX && (
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom intensity={1.05} luminanceThreshold={0.25} luminanceSmoothing={0.5} mipmapBlur radius={0.75} />
          <Glitch
            key={glitchTrigger}
            delay={[0.3, 0.6]}
            duration={[0.18, 0.42]}
            strength={[0.2, 0.6]}
            mode={activeAttack?.success === true ? GlitchMode.SPORADIC : GlitchMode.DISABLED}
            active={activeAttack?.success === true}
            ratio={0.85}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.88} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

// Outer wrapper – memoised so the Canvas does not rebuild on every WS event.
const SmartHome3D = memo(function SmartHome3D(props) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SmartHome3DInner {...props} />
    </div>
  );
});

export default SmartHome3D;
