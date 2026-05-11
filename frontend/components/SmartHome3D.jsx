/**
 * SmartHome3D — Cinematic 3D battle visualization (v2).
 *
 * Aesthetic: cyberpunk "Hollywood-hacker" mission control —
 *   • Reflective wet-look floor (MeshReflectorMaterial)
 *   • Holographic translucent house with scanlines (HolographicMaterial)
 *   • Crystal-orb agents with energy ring auras (no more humanoid sticks)
 *   • Floating data nodes with status colours
 *   • Constant ambient data-stream particles between agents and house
 *   • Glitch postprocessing pass that fires on breach
 *   • Bloom + Vignette for cinematic feel
 */
import { useRef, useMemo, useEffect, useState, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshReflectorMaterial, RoundedBox, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Glitch } from '@react-three/postprocessing';
import { GlitchMode } from 'postprocessing';
import * as THREE from 'three';
import AttackEffectRouter from './AttackEffects';
import HolographicMaterial from './HolographicMaterial';

// ── Constants ─────────────────────────────────────────────────────────────────
const AGENT_HOME_POSITIONS = {
  ShadowInjector:   [-7.5, 0, 1.5],
  ContextPhantom:   [-7.5, 0, -1.5],
  PrivilegeReaper:  [-7.5, 0, 4.0],
  SilentEscalator:  [-7.5, 0, -4.0],
  NetworkPhantom:   [-7.5, 0, -6.5],
};

const DEVICE_POSITIONS = {
  front_door:       [0, 0.9, 2.5],
  camera_system:    [2.4, 2.1, 1.9],
  lights:           [0, 2.9, 0],
  thermostat:       [2.45, 1.2, 0],
  security_panel:   [-2.45, 1.3, -0.5],
  alarm:            [0.5, 2.5, -2.05],
  router:           [-5, 0.6, -3.5],
};

const AGENT_COLORS = {
  ShadowInjector:  '#ff3b6b',
  ContextPhantom:  '#a855f7',
  PrivilegeReaper: '#ff8a2a',
  SilentEscalator: '#00d4ff',
  NetworkPhantom:  '#10ffac',
};

const DEVICE_COLORS = {
  front_door:     '#00d4ff',
  camera_system:  '#a855f7',
  lights:         '#ffd60a',
  thermostat:     '#10ffac',
  security_panel: '#ff3b6b',
  alarm:          '#ff8a2a',
  router:         '#4488ff',
};

// ── Reflective futuristic floor ──────────────────────────────────────────────
const Floor = memo(function Floor() {
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

      {/* Subtle hex-grid overlay */}
      <gridHelper
        args={[40, 40, '#00d4ff', '#1a2240']}
        position={[0, 0.01, 0]}
      />
    </>
  );
});

// ── Holographic house ─────────────────────────────────────────────────────────
const HolographicHouse = memo(function HolographicHouse() {
  return (
    <group>
      {/* Foundation pad — solid dark base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.1, 5.4]} />
        <meshStandardMaterial color="#0d1428" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Glowing edge ring around foundation */}
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 3.85, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* House walls — RoundedBox + holographic material */}
      <RoundedBox
        args={[5, 2.4, 4]}
        radius={0.08}
        smoothness={4}
        position={[0, 1.3, 0]}
      >
        <HolographicMaterial color="#5cc8ff" brightness={1.4} scanlineSize={12} fresnelAmount={0.6} />
      </RoundedBox>

      {/* Roof — pyramid */}
      <mesh position={[0, 3.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.3, 1.4, 4]} />
        <meshStandardMaterial color="#1a2240" emissive="#1a2240" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Roof glow line */}
      <mesh position={[0, 2.51, 0]}>
        <torusGeometry args={[3.3, 0.04, 8, 4]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>

      {/* Front door — glowing portal */}
      <mesh position={[0, 0.9, 2.02]}>
        <boxGeometry args={[0.95, 1.85, 0.06]} />
        <meshStandardMaterial color="#0a1428" emissive="#00d4ff" emissiveIntensity={0.5} metalness={0.8} roughness={0.2} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.9, 2.06]}>
        <planeGeometry args={[0.85, 1.7]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.18} />
      </mesh>

      {/* Front windows — neon panels */}
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

      {/* Side windows */}
      {[-1.2, 1.2].map((z) => (
        <mesh key={z} position={[2.52, 1.4, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.7, 0.6]} />
          <meshBasicMaterial color="#10ffac" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Antenna */}
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

// ── Crystal-orb AI agent (replaces humanoid stick figures) ───────────────────
function AgentFigure({ name, isActive, activeAttack }) {
  const groupRef = useRef();
  const orbRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const colorHex = AGENT_COLORS[name] || '#ff3b6b';
  const homePos = AGENT_HOME_POSITIONS[name] || [-7.5, 0, 0];

  const targetPos = useMemo(() => {
    if (isActive && activeAttack?.target && DEVICE_POSITIONS[activeAttack.target]) {
      const dp = DEVICE_POSITIONS[activeAttack.target];
      return [dp[0] - 2.2, 0, dp[2]];
    }
    return homePos;
  }, [isActive, activeAttack, homePos]);

  const posRef = useRef(new THREE.Vector3(...homePos));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;

    // Smooth movement toward target
    const dest = new THREE.Vector3(...targetPos);
    posRef.current.lerp(dest, 0.05);
    groupRef.current.position.copy(posRef.current);
    groupRef.current.position.y = posRef.current.y + 1.4 + Math.sin(t * 1.6 + name.length) * 0.18;

    // Look toward target while attacking
    if (isActive && activeAttack?.target && DEVICE_POSITIONS[activeAttack.target]) {
      const look = new THREE.Vector3(...DEVICE_POSITIONS[activeAttack.target]);
      look.y = groupRef.current.position.y;
      groupRef.current.lookAt(look);
    } else {
      groupRef.current.rotation.y += 0.005;
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

  return (
    <group ref={groupRef}>
      {/* Outer aura sphere */}
      <mesh>
        <sphereGeometry args={[0.65, 16, 16]} />
        <meshBasicMaterial color={colorHex} transparent opacity={isActive ? 0.12 : 0.06} />
      </mesh>

      {/* Crystal core */}
      <mesh ref={orbRef} castShadow>
        <icosahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={colorHex}
          emissive={colorHex}
          emissiveIntensity={isActive ? 1.6 : 0.9}
          metalness={0.9}
          roughness={0.15}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Energy ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.6, 0.025, 8, 32]} />
        <meshBasicMaterial color={colorHex} transparent opacity={0.7} />
      </mesh>

      {/* Energy ring 2 */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.5, 0.018, 8, 32]} />
        <meshBasicMaterial color={colorHex} transparent opacity={0.5} />
      </mesh>

      {/* Inner core glow */}
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={isActive ? 0.95 : 0.6} />
      </mesh>

      {/* Strong point light */}
      <pointLight color={colorHex} intensity={isActive ? 3.5 : 1.5} distance={5} decay={2} />
    </group>
  );
}

// ── Holographic data node (device) ────────────────────────────────────────────
function DeviceNode({ deviceId, compromised, defended }) {
  const meshRef = useRef();
  const ringRef = useRef();
  const corePos = DEVICE_POSITIONS[deviceId];
  if (!corePos) return null;

  const baseColor = compromised ? '#ff3b6b' : defended ? '#10ffac' : (DEVICE_COLORS[deviceId] || '#00d4ff');

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const intensity = compromised
        ? 1.2 + Math.sin(t * 12) * 0.4
        : defended
          ? 0.9 + Math.sin(t * 4) * 0.25
          : 0.5 + Math.sin(t * 1.5) * 0.15;
      if (meshRef.current.material) {
        meshRef.current.material.emissiveIntensity = intensity;
      }
      meshRef.current.rotation.y = t * 0.6;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * (compromised ? 4 : 1.4);
      const op = compromised ? 0.85 : defended ? 0.7 : 0.45;
      ringRef.current.material.opacity = op + Math.sin(t * 5) * 0.15;
    }
  });

  return (
    <group position={corePos}>
      {/* Octahedron core */}
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Spinning ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.32, 0.018, 8, 24]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.6} />
      </mesh>

      {/* Status point light */}
      <pointLight color={baseColor} intensity={compromised ? 2.2 : defended ? 1.5 : 0.9} distance={2.8} decay={2} />
    </group>
  );
}

// ── Defense shield dome with Fresnel-style glow ───────────────────────────────
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
        <sphereGeometry args={[6, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#10ffac" transparent opacity={0} side={THREE.BackSide} depthWrite={false} wireframe />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[5.7, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#10ffac" transparent opacity={0} side={THREE.FrontSide} depthWrite={false} />
      </mesh>
      {active && <pointLight color="#10ffac" intensity={1.5} distance={14} position={[0, 4, 0]} />}
    </group>
  );
}

// ── Breach explosion (richer particle burst) ─────────────────────────────────
function BreachExplosion({ position, active }) {
  const groupRef = useRef();
  const progressRef = useRef(0);
  const PARTICLE_COUNT = 24;

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

  useEffect(() => {
    if (!active) progressRef.current = 0;
  }, [active]);

  useFrame((_, delta) => {
    if (!active || !groupRef.current) return;
    progressRef.current = Math.min(progressRef.current + delta * 1.6, 1);
    groupRef.current.children.forEach((child, i) => {
      if (i < PARTICLE_COUNT && particles[i]) {
        const p = particles[i];
        const dist = progressRef.current * p.speed;
        child.position.set(p.dir.x * dist, p.dir.y * dist, p.dir.z * dist);
        if (child.material) {
          child.material.opacity = Math.max(0, 1 - progressRef.current * 1.4);
        }
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
const PARTICLE_COUNT = 50;
const AmbientParticles = memo(function AmbientParticles() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = Math.random() * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.025;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={PARTICLE_COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00d4ff" size={0.04} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
});

// ── Main export ───────────────────────────────────────────────────────────────
export default function SmartHome3D({
  deviceStates = {},
  activeAttack = null,
  defendedTargets = [],
  activeAgent = null,
  shieldActive = false,
  enablePostprocessing = true,
}) {
  const agentNames = Object.keys(AGENT_HOME_POSITIONS);

  // Glitch trigger on breach
  const [glitchTrigger, setGlitchTrigger] = useState(0);
  useEffect(() => {
    if (activeAttack?.success === true) {
      setGlitchTrigger((g) => g + 1);
    }
  }, [activeAttack?.success]);

  // Compute beam endpoints for tactic-specific effect router
  const beamFrom = useMemo(() => {
    if (!activeAgent) return null;
    const home = AGENT_HOME_POSITIONS[activeAgent];
    if (!home) return null;
    return new THREE.Vector3(home[0], home[1] + 1.4, home[2]);
  }, [activeAgent]);

  const beamTo = useMemo(() => {
    if (!activeAttack?.target) return null;
    const dp = DEVICE_POSITIONS[activeAttack.target];
    if (!dp) return null;
    return new THREE.Vector3(...dp);
  }, [activeAttack?.target]);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [11, 7, 12], fov: 45 }}
        shadows="basic"
        dpr={[1, 1.6]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        style={{ background: 'transparent' }}
        performance={{ min: 0.4 }}
      >
        {/* Lighting — neon palette, no warm tones */}
        <color attach="background" args={['#03060c']} />
        <fog attach="fog" args={['#03060c', 20, 36]} />
        <ambientLight intensity={0.18} color="#5570aa" />
        <directionalLight
          position={[8, 14, 6]} intensity={0.6} color="#a8b8ff"
          castShadow shadow-mapSize={[512, 512]}
          shadow-camera-near={0.1} shadow-camera-far={30}
          shadow-camera-left={-10} shadow-camera-right={10}
          shadow-camera-top={10} shadow-camera-bottom={-10}
        />
        {/* Three coloured rim lights for moodiness */}
        <pointLight position={[-8, 5, 4]} intensity={1.0} color="#ff3b6b" distance={20} />
        <pointLight position={[8, 5, -4]} intensity={1.0} color="#00d4ff" distance={20} />
        <pointLight position={[0, 8, -8]} intensity={0.8} color="#a855f7" distance={20} />

        {/* Reflective floor */}
        <Floor />

        {/* Ambient particles */}
        <AmbientParticles />

        {/* House — glowing hologram */}
        <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.08}>
          <HolographicHouse />
        </Float>

        {/* AI Agents — crystal orbs */}
        {agentNames.map((name) => (
          <AgentFigure
            key={name}
            name={name}
            isActive={activeAgent === name}
            activeAttack={activeAgent === name ? activeAttack : null}
          />
        ))}

        {/* Device nodes */}
        {Object.keys(DEVICE_POSITIONS).map((deviceId) => {
          const isTargeted = activeAttack?.target === deviceId;
          const compromised = isTargeted && activeAttack?.success === true;
          const defended = defendedTargets.includes(deviceId) || (isTargeted && activeAttack?.success === false);
          return (
            <DeviceNode
              key={deviceId}
              deviceId={deviceId}
              compromised={compromised}
              defended={defended}
            />
          );
        })}

        {/* Tactic-specific attack effect */}
        {beamFrom && beamTo && activeAttack && (
          <AttackEffectRouter
            from={beamFrom}
            to={beamTo}
            tactic={activeAttack.tactic}
            agent={activeAgent}
          />
        )}

        {/* Shield dome */}
        <ShieldDome active={shieldActive} />

        {/* Breach explosion */}
        <BreachExplosion
          position={activeAttack?.target ? DEVICE_POSITIONS[activeAttack.target] : null}
          active={activeAttack?.success === true}
        />

        <OrbitControls
          enablePan
          enableZoom
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={Math.PI / 10}
          maxDistance={22}
          minDistance={5}
          enableDamping
          dampingFactor={0.08}
        />

        {/* Postprocessing */}
        {enablePostprocessing && (
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
    </div>
  );
}
