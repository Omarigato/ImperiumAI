/**
 * HomeHero3D — Cinematic hero scene for the landing page (self-contained).
 *
 * The only 3D scene that ships with AegisAI. Everything is procedural —
 * no GLB assets are loaded. The scene shows:
 *   • A holographic-style smart home
 *   • 5 crystal agents orbiting around it
 *   • Holographic device nodes
 *   • A simple attack-beam cycler so the scene feels alive
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshReflectorMaterial, RoundedBox, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useMemo, useRef, useState, useEffect, memo } from 'react';

const RADIUS = 5.5;
const AGENT_DEFS = [
  { name: 'ShadowInjector',  color: '#ff3b6b', angle: (0 * Math.PI) / 2.5 },
  { name: 'ContextPhantom',  color: '#a855f7', angle: (1 * Math.PI) / 2.5 },
  { name: 'PrivilegeReaper', color: '#ff8a2a', angle: (2 * Math.PI) / 2.5 },
  { name: 'SilentEscalator', color: '#00d4ff', angle: (3 * Math.PI) / 2.5 },
  { name: 'NetworkPhantom',  color: '#10ffac', angle: (4 * Math.PI) / 2.5 },
];

const DEVICES = [
  { id: 'front_door',     pos: [0, 0.9, 1.7],     color: '#00d4ff' },
  { id: 'camera',         pos: [1.7, 2.0, 1.4],   color: '#a855f7' },
  { id: 'lights',         pos: [0, 2.6, 0],       color: '#ffd60a' },
  { id: 'thermostat',     pos: [1.7, 1.0, 0],     color: '#10ffac' },
  { id: 'security_panel', pos: [-1.7, 1.0, -0.3], color: '#ff3b6b' },
  { id: 'alarm',          pos: [0.5, 2.2, -1.4],  color: '#ff8a2a' },
];

// ── Holographic-style house (no shaders, just materials) ─────────────────────
const HolographicHouseHero = memo(function HolographicHouseHero() {
  return (
    <group>
      {/* Foundation */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[5.0, 0.1, 4.2]} />
        <meshStandardMaterial color="#0d1428" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.85, 3.05, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Walls (semi-transparent holographic look) */}
      <RoundedBox args={[4, 2.0, 3.2]} radius={0.06} smoothness={4} position={[0, 1.1, 0]}>
        <meshStandardMaterial
          color="#5cc8ff"
          emissive="#00d4ff"
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.25}
          transparent
          opacity={0.45}
        />
      </RoundedBox>

      {/* Roof */}
      <mesh position={[0, 2.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.7, 1.1, 4]} />
        <meshStandardMaterial color="#1a2240" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.16, 0]}>
        <torusGeometry args={[2.7, 0.04, 8, 4]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.88, 1.62]}>
        <boxGeometry args={[0.85, 1.62, 0.06]} />
        <meshStandardMaterial color="#0a1428" emissive="#00d4ff" emissiveIntensity={0.5} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Front windows */}
      {[-1.3, 1.3].map((x) => (
        <group key={x} position={[x, 1.4, 1.62]}>
          <mesh>
            <boxGeometry args={[0.8, 0.7, 0.04]} />
            <meshStandardMaterial color="#0a1428" emissive="#a855f7" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.7, 0.6]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

// ── Floating crystal agent ───────────────────────────────────────────────────
function CrystalAgent({ color, angle, breathOffset }) {
  const ref = useRef();
  const ringRef = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ref.current) return;
    const x = Math.cos(angle + t * 0.08) * RADIUS;
    const z = Math.sin(angle + t * 0.08) * RADIUS;
    const y = 1.7 + Math.sin(t * 1.4 + breathOffset) * 0.22;
    ref.current.position.set(x, y, z);
    ref.current.rotation.y = t * 0.6;
    if (ringRef.current) ringRef.current.rotation.z = t * 1.0;
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>
      <mesh castShadow>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} roughness={0.15} metalness={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.5, 0.02, 8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      <pointLight color={color} intensity={1.6} distance={3.5} decay={2} />
    </group>
  );
}

// ── Holographic device node ──────────────────────────────────────────────────
function DeviceNode({ pos, color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.material.emissiveIntensity = 0.7 + Math.sin(t * 2 + pos[0]) * 0.2;
      ref.current.rotation.y = t * 0.6;
    }
  });
  return (
    <mesh ref={ref} position={pos}>
      <octahedronGeometry args={[0.13, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.9} roughness={0.1} />
    </mesh>
  );
}

// ── Auto-rotating cinematic camera ───────────────────────────────────────────
function CinematicCamera() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    const radius = 11;
    camera.position.x = Math.cos(t * 0.07) * radius;
    camera.position.z = Math.sin(t * 0.07) * radius;
    camera.position.y = 5 + Math.sin(t * 0.13) * 0.6;
    camera.lookAt(0, 1.3, 0);
  });
  return null;
}

// ── Lightweight inline attack beam (replaces deleted AttackEffectRouter) ────
function AttackBeam({ from, to, color }) {
  const ref = useRef();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([from, to]);
    return g;
  }, [from, to]);
  useFrame(({ clock }) => {
    if (ref.current) {
      const k = (Math.sin(clock.getElapsedTime() * 6) + 1) * 0.5;
      ref.current.material.opacity = 0.45 + k * 0.45;
    }
  });
  return (
    <group>
      <line ref={ref} geometry={geo}>
        <lineBasicMaterial color={color} transparent opacity={0.8} linewidth={2} />
      </line>
      <mesh position={to}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function HeroAttackCycler() {
  const [attack, setAttack] = useState(null);

  useEffect(() => {
    const cycle = () => {
      const agent = AGENT_DEFS[Math.floor(Math.random() * AGENT_DEFS.length)];
      const device = DEVICES[Math.floor(Math.random() * DEVICES.length)];
      setAttack({ agent, device });
    };
    cycle();
    const id = setInterval(cycle, 3000);
    return () => clearInterval(id);
  }, []);

  if (!attack) return null;
  const angle = attack.agent.angle;
  const from = new THREE.Vector3(Math.cos(angle) * RADIUS, 1.7, Math.sin(angle) * RADIUS);
  const to = new THREE.Vector3(...attack.device.pos);
  return <AttackBeam from={from} to={to} color={attack.agent.color} />;
}

// ── Stars ────────────────────────────────────────────────────────────────────
const STAR_COUNT = 80;
const Stars = memo(function Stars() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 9 + Math.random() * 6;
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
      <pointsMaterial color="#00d4ff" size={0.04} transparent opacity={0.45} sizeAttenuation />
    </points>
  );
});

// ── Reflective floor ─────────────────────────────────────────────────────────
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function HomeHero3D({ height = '100vh', autoRotate = true }) {
  return (
    <div style={{ position: 'absolute', inset: 0, height, width: '100%' }}>
      <Canvas
        camera={{ position: [9, 5, 9], fov: 48 }}
        shadows={false}
        dpr={[1, 1.4]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
        style={{ background: 'transparent' }}
        performance={{ min: 0.4 }}
      >
        <color attach="background" args={['#03060c']} />
        <fog attach="fog" args={['#03060c', 14, 30]} />

        <ambientLight intensity={0.18} color="#5570aa" />
        <pointLight position={[-7, 5, 4]} intensity={1.0} color="#ff3b6b" distance={20} />
        <pointLight position={[7, 5, -4]} intensity={1.0} color="#00d4ff" distance={20} />
        <pointLight position={[0, 8, -6]} intensity={0.7} color="#a855f7" distance={20} />

        <ReflectiveGround />
        <Stars />

        <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.08}>
          <HolographicHouseHero />
        </Float>

        {DEVICES.map((d) => (
          <DeviceNode key={d.id} pos={d.pos} color={d.color} />
        ))}

        {AGENT_DEFS.map((a, i) => (
          <CrystalAgent key={a.name} color={a.color} angle={a.angle} breathOffset={i * 0.7} />
        ))}

        <HeroAttackCycler />

        {autoRotate && <CinematicCamera />}
        {!autoRotate && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            autoRotate
            autoRotateSpeed={0.4}
            maxPolarAngle={Math.PI / 2.1}
            minPolarAngle={Math.PI / 4}
          />
        )}

        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom intensity={1.0} luminanceThreshold={0.25} luminanceSmoothing={0.5} mipmapBlur radius={0.7} />
          <Vignette eskil={false} offset={0.2} darkness={0.9} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
