import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[16, 16]} />
      <meshStandardMaterial color="#1a1a0e" roughness={0.9} />
    </mesh>
  );
}

function Fence({ x, z, rotY = 0 }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[2, 0.8, 0.08]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      <mesh position={[-0.9, 0.7, 0]}>
        <boxGeometry args={[0.1, 1.4, 0.1]} />
        <meshStandardMaterial color="#6B4F10" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 0.7, 0]}>
        <boxGeometry args={[0.1, 1.4, 0.1]} />
        <meshStandardMaterial color="#6B4F10" roughness={0.9} />
      </mesh>
    </group>
  );
}

function GridLines() {
  const points = useMemo(() => {
    const pts = [];
    for (let i = -6; i <= 6; i++) {
      pts.push(new THREE.Vector3(-6, 0, i), new THREE.Vector3(6, 0, i));
      pts.push(new THREE.Vector3(i, 0, -6), new THREE.Vector3(i, 0, 6));
    }
    return pts;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#00FFFF" opacity={0.08} transparent />
    </lineSegments>
  );
}

function House() {
  return (
    <group position={[0, 0, 0]}>
      {/* Main walls — warm beige/cream */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[5, 2.4, 4]} />
        <meshStandardMaterial color="#D4B896" roughness={0.8} metalness={0.05} />
      </mesh>
      {/* Roof — terracotta red */}
      <mesh position={[0, 2.9, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.2, 1.2, 4]} />
        <meshStandardMaterial color="#C0522A" roughness={0.85} />
      </mesh>
      {/* Floor platform — concrete gray */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[5.4, 0.1, 4.4]} />
        <meshStandardMaterial color="#8A8A7A" roughness={1} />
      </mesh>
      {/* Door (front) */}
      <mesh position={[0, 0.9, 2.01]}>
        <boxGeometry args={[0.9, 1.8, 0.05]} />
        <meshStandardMaterial color="#5C3A1E" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Windows */}
      <mesh position={[-1.5, 1.4, 2.02]}>
        <boxGeometry args={[0.8, 0.7, 0.04]} />
        <meshStandardMaterial color="#88CCEE" roughness={0.1} metalness={0.5} transparent opacity={0.7} />
      </mesh>
      <mesh position={[1.5, 1.4, 2.02]}>
        <boxGeometry args={[0.8, 0.7, 0.04]} />
        <meshStandardMaterial color="#88CCEE" roughness={0.1} metalness={0.5} transparent opacity={0.7} />
      </mesh>
      {/* Garage — dark gray */}
      <mesh position={[4.2, 0.7, 0]} castShadow>
        <boxGeometry args={[2.4, 1.4, 3.2]} />
        <meshStandardMaterial color="#7A7A6A" roughness={0.9} />
      </mesh>
      {/* Garage door */}
      <mesh position={[5.35, 0.7, 0]}>
        <boxGeometry args={[0.05, 1.2, 2.8]} />
        <meshStandardMaterial color="#555555" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Garage roof */}
      <mesh position={[4.2, 1.55, 0]}>
        <boxGeometry args={[2.5, 0.2, 3.4]} />
        <meshStandardMaterial color="#5A5A50" roughness={1} />
      </mesh>
    </group>
  );
}

function FenceRow() {
  return (
    <group>
      {/* Front fence */}
      {[-4, -2, 0, 2, 4].map((x) => (
        <Fence key={`f${x}`} x={x} z={5.5} />
      ))}
      {/* Back fence */}
      {[-4, -2, 0, 2, 4].map((x) => (
        <Fence key={`b${x}`} x={x} z={-5.5} />
      ))}
      {/* Left fence */}
      {[-4, -2, 0, 2, 4].map((z) => (
        <Fence key={`l${z}`} x={-5.5} z={z} rotY={Math.PI / 2} />
      ))}
      {/* Right fence */}
      {[-4, -2, 0, 2, 4].map((z) => (
        <Fence key={`r${z}`} x={6.5} z={z} rotY={Math.PI / 2} />
      ))}
    </group>
  );
}

function DeviceNode({ position, color, emissive, label, shape, compromised, defended }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (compromised) {
      meshRef.current.material.emissiveIntensity =
        0.6 + Math.sin(clock.getElapsedTime() * 8) * 0.4;
    } else if (defended) {
      meshRef.current.material.emissiveIntensity =
        0.3 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
    } else {
      meshRef.current.material.emissiveIntensity = 0.15;
    }
  });

  const emissiveColor = compromised ? '#FF0000' : defended ? '#00FF41' : emissive;

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        {shape === 'sphere' && <sphereGeometry args={[0.2, 16, 16]} />}
        {shape === 'box' && <boxGeometry args={[0.3, 0.3, 0.3]} />}
        {shape === 'cylinder' && <cylinderGeometry args={[0.15, 0.15, 0.4, 8]} />}
        {shape === 'cone' && <coneGeometry args={[0.2, 0.35, 6]} />}
        {!shape && <boxGeometry args={[0.25, 0.25, 0.25]} />}
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {/* Glow ring when attacked */}
      {compromised && (
        <mesh>
          <torusGeometry args={[0.35, 0.04, 8, 24]} />
          <meshBasicMaterial color="#FF0000" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Shield ring when defended */}
      {defended && (
        <mesh>
          <torusGeometry args={[0.35, 0.04, 8, 24]} />
          <meshBasicMaterial color="#00FF41" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

function AttackBeam({ active, success }) {
  const beamRef = useRef();

  useFrame(({ clock }) => {
    if (!beamRef.current) return;
    beamRef.current.material.opacity = active
      ? 0.4 + Math.sin(clock.getElapsedTime() * 20) * 0.3
      : 0;
  });

  if (!active) return null;

  const color = success ? '#FF0000' : '#00AAFF';
  const points = [
    new THREE.Vector3(-5, 1.5, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(2, 0.5, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(points);
  const tubePoints = curve.getPoints(20);
  const geometry = new THREE.BufferGeometry().setFromPoints(tubePoints);

  return (
    <line ref={beamRef} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.7} linewidth={2} />
    </line>
  );
}

function AmbientParticles() {
  const count = 60;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = Math.random() * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, []);

  const particleRef = useRef();

  useFrame(({ clock }) => {
    if (!particleRef.current) return;
    particleRef.current.rotation.y = clock.getElapsedTime() * 0.05;
  });

  return (
    <points ref={particleRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#00FFFF" size={0.04} transparent opacity={0.4} />
    </points>
  );
}

const DEVICE_CONFIG = [
  { id: 'front_door', label: 'Front Door', position: [0, 0.9, 2.5], color: '#8B4513', emissive: '#4A2008', shape: 'box' },
  { id: 'camera_system', label: 'Camera', position: [2.4, 2.1, 1.9], color: '#2A2A2A', emissive: '#0000AA', shape: 'cone' },
  { id: 'lights', label: 'Lights', position: [0, 2.9, 0], color: '#FFD700', emissive: '#FFCC00', shape: 'sphere' },
  { id: 'thermostat', label: 'Thermostat', position: [2.45, 1.2, 0], color: '#E0E0E0', emissive: '#2244AA', shape: 'box' },
  { id: 'security_panel', label: 'Panel', position: [-2.45, 1.3, -0.5], color: '#1A4A1A', emissive: '#00AA00', shape: 'cylinder' },
  { id: 'alarm', label: 'Alarm', position: [0.5, 2.5, -2.05], color: '#AA0000', emissive: '#FF2200', shape: 'cylinder' },
  { id: 'router', label: 'Router', position: [-4.5, 0.6, -3.5], color: '#0044AA', emissive: '#003388', shape: 'box' },
];

// Agent positions outside the house, approaching it
const AGENT_POSITIONS = {
  ShadowInjector:  [-7, 0, 1],
  ContextPhantom:  [-7, 0, -2],
  PrivilegeReaper: [-6, 0, 3.5],
  SilentEscalator: [-5, 0, -4.5],
  NetworkPhantom:  [-7, 0, -5],
};

function AgentBody({ name, color, isActive }) {
  const groupRef = useRef();
  const glowRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    if (isActive) {
      // Bob and lean forward when attacking
      groupRef.current.position.y = Math.sin(t * 6) * 0.05;
      groupRef.current.rotation.z = Math.sin(t * 4) * 0.08;
    } else {
      // Idle sway
      groupRef.current.position.y = Math.sin(t * 1.2 + name.length) * 0.03;
      groupRef.current.rotation.z = 0;
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = isActive
        ? 0.5 + Math.sin(t * 8) * 0.3
        : 0.15 + Math.sin(t * 1.5) * 0.1;
    }
  });

  const basePos = AGENT_POSITIONS[name] || [-7, 0, 0];

  return (
    <group position={basePos}>
      <group ref={groupRef}>
        {/* Head */}
        <mesh position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.8 : 0.3} roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Body */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.7, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.6 : 0.2} roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Left arm */}
        <mesh position={[-0.22, 1.15, 0]} rotation={[0, 0, isActive ? 0.6 : 0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.6} />
        </mesh>
        {/* Right arm */}
        <mesh position={[0.22, 1.15, 0]} rotation={[0, 0, isActive ? -0.6 : -0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.6} />
        </mesh>
        {/* Left leg */}
        <mesh position={[-0.1, 0.6, 0]} rotation={[isActive ? 0.3 : 0, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.55, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.6} />
        </mesh>
        {/* Right leg */}
        <mesh position={[0.1, 0.6, 0]} rotation={[isActive ? -0.3 : 0, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.55, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.6} />
        </mesh>
        {/* Glow aura */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
      </group>
      {/* Name label placeholder — point light below name */}
      {isActive && (
        <pointLight position={[0, 2, 0]} intensity={1.5} color={color} distance={3} />
      )}
    </group>
  );
}

const AGENTS_CONFIG = [
  { name: 'ShadowInjector', color: '#FF0000' },
  { name: 'ContextPhantom', color: '#9B00FF' },
  { name: 'PrivilegeReaper', color: '#FF6600' },
  { name: 'SilentEscalator', color: '#00FFFF' },
  { name: 'NetworkPhantom', color: '#00FF88' },
];

export default function SmartHome3D({ deviceStates = {}, activeAttack = null, defendedTargets = [], activeAgent = null }) {
  return (
    <div className="w-full h-full" style={{ minHeight: 320 }}>
      <Canvas
        camera={{ position: [10, 7, 10], fov: 45 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} color="#E0D0B0" />
        <directionalLight position={[8, 12, 8]} intensity={1.2} color="#FFFAE8" castShadow />
        <pointLight position={[0, 5, 0]} intensity={0.8} color="#FFE8A0" distance={12} />
        <pointLight position={[-6, 3, 0]} intensity={0.4} color="#4488FF" distance={10} />

        <Floor />
        <GridLines />
        <House />
        <FenceRow />
        <AmbientParticles />

        {/* AI Agent bodies */}
        {AGENTS_CONFIG.map((agent) => (
          <AgentBody
            key={agent.name}
            name={agent.name}
            color={agent.color}
            isActive={activeAgent === agent.name}
          />
        ))}

        {DEVICE_CONFIG.map((device) => {
          const isActive = activeAttack?.target === device.id;
          const isDefended = defendedTargets.includes(device.id);
          const attackSucceeded = isActive && activeAttack?.success === true;

          return (
            <DeviceNode
              key={device.id}
              position={device.position}
              color={device.color}
              emissive={device.emissive}
              label={device.label}
              shape={device.shape}
              compromised={attackSucceeded}
              defended={(isActive && !attackSucceeded) || isDefended}
            />
          );
        })}

        <AttackBeam
          active={activeAttack !== null}
          success={activeAttack?.success === true}
        />

        <OrbitControls
          enablePan
          enableZoom
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={Math.PI / 8}
          maxDistance={20}
          minDistance={4}
        />
      </Canvas>
    </div>
  );
}
