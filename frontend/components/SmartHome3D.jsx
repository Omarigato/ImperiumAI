/**
 * SmartHome3D — High-quality 3D visualization for AegisAI
 * Features:
 *  - Detailed smart home with real architectural geometry
 *  - Animated AI agents that move toward their targets when attacking
 *  - Attack beam with particle trail
 *  - Device nodes with glowing state indicators
 *  - Atmospheric lighting + fog
 */
import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ── Constants ─────────────────────────────────────────────────────────────────
const AGENT_HOME_POSITIONS = {
  ShadowInjector: [-8.5, 0, 1],
  ContextPhantom: [-8.5, 0, -1.5],
  PrivilegeReaper: [-8.5, 0, 3.5],
  SilentEscalator: [-8.5, 0, -4],
  NetworkPhantom: [-8.5, 0, -6],
};

const DEVICE_POSITIONS = {
  front_door: [0, 0.9, 2.5],
  camera_system: [2.4, 2.1, 1.9],
  lights: [0, 2.9, 0],
  thermostat: [2.45, 1.2, 0],
  security_panel: [-2.45, 1.3, -0.5],
  alarm: [0.5, 2.5, -2.05],
  router: [-5, 0.6, -3.5],
};

const AGENT_COLORS = {
  ShadowInjector: '#FF2222',
  ContextPhantom: '#9B00FF',
  PrivilegeReaper: '#FF6600',
  SilentEscalator: '#00FFFF',
  NetworkPhantom: '#00FF88',
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function useAnimatedValue(target, speed = 0.08) {
  const ref = useRef(target);
  useFrame(() => { ref.current += (target - ref.current) * speed; });
  return ref;
}

// ── Scene objects ─────────────────────────────────────────────────────────────

/** Detailed house geometry */
function House() {
  return (
    <group>
      {/* Foundation */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[5.6, 0.12, 4.6]} />
        <meshStandardMaterial color="#8A8A7A" roughness={1} />
      </mesh>

      {/* Main walls */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 2.4, 4]} />
        <meshStandardMaterial color="#D4C4A8" roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Roof base */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <boxGeometry args={[5.4, 0.12, 4.4]} />
        <meshStandardMaterial color="#5A4A3A" roughness={0.9} />
      </mesh>

      {/* Roof pyramid */}
      <mesh position={[0, 3.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.4, 1.4, 4]} />
        <meshStandardMaterial color="#C0522A" roughness={0.85} />
      </mesh>

      {/* Roof ridge tile */}
      <mesh position={[0, 3.82, 0]}>
        <boxGeometry args={[0.2, 0.1, 0.2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>

      {/* Front door frame */}
      <mesh position={[0, 1.0, 2.03]}>
        <boxGeometry args={[1.1, 2.1, 0.04]} />
        <meshStandardMaterial color="#4A2F1A" roughness={0.7} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.95, 2.05]}>
        <boxGeometry args={[0.9, 1.85, 0.05]} />
        <meshStandardMaterial color="#6B3A1E" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Door handle */}
      <mesh position={[0.35, 0.95, 2.09]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#C0A060" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Windows — front */}
      {[-1.5, 1.5].map(x => (
        <group key={x} position={[x, 1.4, 2.03]}>
          <mesh>
            <boxGeometry args={[0.9, 0.8, 0.04]} />
            <meshStandardMaterial color="#3A3A4A" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.8, 0.7, 0.02]} />
            <meshStandardMaterial color="#88CCEE" roughness={0.05} metalness={0.5} transparent opacity={0.65} />
          </mesh>
        </group>
      ))}

      {/* Side windows */}
      {[-1, 1].map(z => (
        <mesh key={z} position={[2.52, 1.4, z]}>
          <boxGeometry args={[0.04, 0.7, 0.8]} />
          <meshStandardMaterial color="#88CCEE" roughness={0.05} metalness={0.5} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Chimney */}
      <mesh position={[1.5, 3.5, -0.5]} castShadow>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>

      {/* Garage */}
      <mesh position={[4.2, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.6, 3.4]} />
        <meshStandardMaterial color="#7A7A6A" roughness={0.9} />
      </mesh>
      <mesh position={[4.2, 1.68, 0]}>
        <boxGeometry args={[2.7, 0.16, 3.5]} />
        <meshStandardMaterial color="#5A5A50" roughness={1} />
      </mesh>
      {/* Garage door panels */}
      {[-0.5, 0.5].map(z => (
        <mesh key={z} position={[5.49, 0.8, z]}>
          <boxGeometry args={[0.04, 1.35, 0.95]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}

      {/* Pathway */}
      <mesh position={[0, 0.02, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 3]} />
        <meshStandardMaterial color="#A09080" roughness={1} />
      </mesh>

      {/* Garden hedge */}
      {[-2.2, 2.2].map((x, i) => (
        <mesh key={i} position={[x, 0.5, 3.5]} castShadow>
          <boxGeometry args={[0.5, 1, 3]} />
          <meshStandardMaterial color="#2D5A27" roughness={0.95} />
        </mesh>
      ))}

      {/* Interior */}
      <mesh position={[0, 0.45, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.3, 0.9]} />
        <meshStandardMaterial color="#404a55" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.68, -0.2]} castShadow>
        <boxGeometry args={[0.55, 0.2, 0.55]} />
        <meshStandardMaterial color="#8f6a48" roughness={0.8} />
      </mesh>
      <mesh position={[1.6, 1.25, -1.95]} castShadow>
        <boxGeometry args={[1.2, 0.7, 0.06]} />
        <meshStandardMaterial color="#11141a" emissive="#00ffff" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[-1.3, 1.05, -1.6]} castShadow>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial color="#2c3b48" />
      </mesh>
      <mesh position={[-1.3, 1.37, -1.6]}>
        <cylinderGeometry args={[0.14, 0.14, 0.16, 16]} />
        <meshStandardMaterial color="#5ec6ff" emissive="#5ec6ff" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

/** Atmospheric ground */
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#1E2A1A" roughness={0.98} />
      </mesh>
      {/* Subtle grid */}
      <gridHelper args={[24, 24, '#00FFFF', '#00FFFF']} position={[0, 0.01, 0]}>
        <lineBasicMaterial color="#00FFFF" transparent opacity={0.06} />
      </gridHelper>
    </>
  );
}

/** Perimeter fence */
function PerimeterFence() {
  const postPositions = useMemo(() => {
    const posts = [];
    const size = 7;
    for (let i = -size; i <= size; i += 2) {
      posts.push([-size, 0, i], [size, 0, i], [i, 0, -size], [i, 0, size]);
    }
    return posts;
  }, []);

  return (
    <group>
      {postPositions.map(([x, , z], idx) => (
        <mesh key={idx} position={[x, 0.6, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.2, 6]} />
          <meshStandardMaterial color="#5A4030" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** IoT device node with status glow */
function DeviceNode({ deviceId, compromised, defended }) {
  const meshRef = useRef();
  const ringRef = useRef();
  const position = DEVICE_POSITIONS[deviceId];
  if (!position) return null;

  const baseColor = compromised ? '#FF0000' : defended ? '#00FF41' : '#00FFFF';
  const emissive = compromised ? '#AA0000' : defended ? '#00AA20' : '#002244';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const intensity = compromised
        ? 0.6 + Math.sin(t * 10) * 0.4
        : defended
          ? 0.4 + Math.sin(t * 4) * 0.2
          : 0.1 + Math.sin(t * 1.5) * 0.05;
      meshRef.current.material.emissiveIntensity = intensity;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * (compromised ? 3 : 1);
      ringRef.current.material.opacity = (compromised || defended) ? 0.6 + Math.sin(t * 5) * 0.3 : 0;
    }
  });

  return (
    <group position={position}>
      {/* Device orb */}
      <mesh ref={meshRef} castShadow>
        <icosahedronGeometry args={[0.18, 1]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissive}
          emissiveIntensity={0.1}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Orbit ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.3, 0.025, 8, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0} />
      </mesh>

      {/* Point light when active */}
      {(compromised || defended) && (
        <pointLight
          color={baseColor}
          intensity={compromised ? 1.5 : 0.8}
          distance={1.5}
        />
      )}
    </group>
  );
}

/** AI Agent humanoid figure that moves toward its target */
function AgentFigure({ name, isActive, activeAttack }) {
  const groupRef = useRef();
  const colorHex = AGENT_COLORS[name] || '#FF2222';
  const homePos = AGENT_HOME_POSITIONS[name] || [-8.5, 0, 0];

  // Determine target position
  const targetPos = useMemo(() => {
    if (isActive && activeAttack?.target && DEVICE_POSITIONS[activeAttack.target]) {
      const dp = DEVICE_POSITIONS[activeAttack.target];
      // Stand 2.5 units in front of the device
      return [dp[0] - 2.5, 0, dp[2]];
    }
    return homePos;
  }, [isActive, activeAttack, homePos]);

  const posRef = useRef(new THREE.Vector3(...homePos));
  const t = useRef(0);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (!groupRef.current) return;

    // Smooth movement toward target
    const dest = new THREE.Vector3(...targetPos);
    posRef.current.lerp(dest, 0.04);
    groupRef.current.position.copy(posRef.current);

    // Look toward target device (only when attacking)
    if (isActive && activeAttack?.target && DEVICE_POSITIONS[activeAttack.target]) {
      const look = new THREE.Vector3(...DEVICE_POSITIONS[activeAttack.target]);
      look.y = groupRef.current.position.y;
      groupRef.current.lookAt(look);
    } else {
      groupRef.current.rotation.y = 0;
    }

    // Idle bob
    groupRef.current.position.y = posRef.current.y + Math.sin(elapsed * 1.5 + name.length) * 0.03;

    // Attack sway
    if (isActive) {
      groupRef.current.position.y += Math.sin(elapsed * 8) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <dodecahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial
          color={colorHex}
          emissive={colorHex}
          emissiveIntensity={isActive ? 0.9 : 0.3}
          roughness={0.3} metalness={0.5}
        />
      </mesh>

      {/* Visor glow */}
      <mesh position={[0, 1.65, 0.15]}>
        <boxGeometry args={[0.2, 0.06, 0.02]} />
        <meshBasicMaterial color={colorHex} transparent opacity={isActive ? 0.9 : 0.4} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.3, 0.65, 0.18]} />
        <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={isActive ? 0.5 : 0.15} roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Chest plate */}
      <mesh position={[0, 1.1, 0.1]}>
        <boxGeometry args={[0.2, 0.4, 0.02]} />
        <meshBasicMaterial color={colorHex} transparent opacity={0.7} />
      </mesh>

      {/* Arms */}
      {[-0.24, 0.24].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]} castShadow>
          <capsuleGeometry args={[0.055, 0.45, 4, 8]} />
          <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={0.2} roughness={0.6} />
        </mesh>
      ))}

      {/* Legs */}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.55, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
          <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={0.15} roughness={0.6} />
        </mesh>
      ))}

      {/* Aura sphere */}
      <mesh>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshBasicMaterial color={colorHex} transparent opacity={isActive ? 0.12 : 0.04} />
      </mesh>

      {/* Active attack point light */}
      {isActive && (
        <pointLight color={colorHex} intensity={2} distance={3} decay={2} />
      )}
    </group>
  );
}

/** Attack beam with particle effect */
function AttackBeam({ activeAttack, activeAgent }) {
  const lineRef = useRef();
  const particles = useRef([]);
  const groupRef = useRef();

  const agentColor = AGENT_COLORS[activeAgent] || '#FF2222';

  const targetPos = useMemo(() => {
    if (activeAttack?.target) return new THREE.Vector3(...(DEVICE_POSITIONS[activeAttack.target] || [0, 1, 0]));
    return new THREE.Vector3(0, 1, 0);
  }, [activeAttack?.target]);

  // Build beam points from agent position
  const curve = useMemo(() => {
    const home = new THREE.Vector3(...(AGENT_HOME_POSITIONS[activeAgent] || [-8, 0, 0]));
    const mid = home.clone().lerp(targetPos, 0.5).add(new THREE.Vector3(0, 1.5, 0));
    return new THREE.CatmullRomCurve3([
      home.clone().add(new THREE.Vector3(0, 1.2, 0)),
      mid,
      targetPos.clone(),
    ]);
  }, [activeAgent, targetPos]);

  const tubeRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (tubeRef.current) {
      tubeRef.current.material.opacity = 0.5 + Math.sin(t * 20) * 0.3;
      tubeRef.current.material.color.setHex(
        activeAttack?.success === true ? parseInt(agentColor.replace('#', '0x')) :
          activeAttack?.success === false ? 0x00AAFF : parseInt(agentColor.replace('#', '0x'))
      );
    }
  });

  if (!activeAttack || !activeAgent) return null;

  const tubePoints = curve.getPoints(32);
  const geo = new THREE.BufferGeometry().setFromPoints(tubePoints);

  return (
    <group ref={groupRef}>
      <line ref={tubeRef} geometry={geo}>
        <lineBasicMaterial color={agentColor} transparent opacity={0.7} linewidth={2} />
      </line>
      {/* Glow pulse at target */}
      <mesh position={targetPos}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshBasicMaterial color={agentColor} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

/** Defense shield dome — glowing green hemisphere around the house */
function ShieldDome({ active }) {
  const outerRef = useRef();
  const innerRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const targetOpacity = active ? 0.10 + Math.sin(t * 2.5) * 0.05 : 0;
    const targetInner = active ? 0.04 + Math.sin(t * 4) * 0.02 : 0;
    if (outerRef.current) {
      outerRef.current.material.opacity += (targetOpacity - outerRef.current.material.opacity) * 0.1;
    }
    if (innerRef.current) {
      innerRef.current.material.opacity += (targetInner - innerRef.current.material.opacity) * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer shell */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[6.5, 32, 32]} />
        <meshBasicMaterial color="#00FF88" transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* Inner glow */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[6.2, 24, 24]} />
        <meshBasicMaterial color="#00FFCC" transparent opacity={0} side={THREE.FrontSide} depthWrite={false} />
      </mesh>
      {/* Shield point light */}
      {active && <pointLight color="#00FF88" intensity={1.5} distance={12} position={[0, 4, 0]} />}
    </group>
  );
}

/** Particle burst at a device location when it is breached */
function BreachExplosion({ position, active }) {
  const groupRef = useRef();
  const progressRef = useRef(0);
  const particleCount = 18;

  const particles = useMemo(() => (
    Array.from({ length: particleCount }, () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return {
        dir: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.abs(Math.sin(phi) * Math.sin(theta)) + 0.3,
          Math.sin(phi) * Math.cos(theta + 1),
        ).normalize(),
        speed: 0.6 + Math.random() * 1.4,
        size: 0.04 + Math.random() * 0.06,
      };
    })
  ), []);

  useEffect(() => {
    if (!active) progressRef.current = 0;
  }, [active]);

  useFrame((_, delta) => {
    if (!active || !groupRef.current) return;
    progressRef.current = Math.min(progressRef.current + delta * 1.8, 1);
    groupRef.current.children.forEach((child, i) => {
      if (i < particleCount && particles[i]) {
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
          <sphereGeometry args={[p.size, 4, 4]} />
          <meshBasicMaterial color="#FF3300" transparent opacity={1} depthWrite={false} />
        </mesh>
      ))}
      <pointLight color="#FF4400" intensity={3} distance={2} decay={2} />
    </group>
  );
}


function AmbientParticles() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = Math.random() * 5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={120} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#00FFFF" size={0.035} transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

/** Atmospheric fog plane */
function FogLayer() {
  return (
    <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[24, 24]} />
      <meshBasicMaterial color="#001122" transparent opacity={0.25} depthWrite={false} />
    </mesh>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SmartHome3D({
  deviceStates = {},
  activeAttack = null,
  defendedTargets = [],
  activeAgent = null,
  shieldActive = false,
}) {
  const agentNames = Object.keys(AGENT_HOME_POSITIONS);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [11, 8, 12], fov: 42 }}
        shadows="soft"
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        performance={{ min: 0.5 }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} color="#D0C8B8" />
        <directionalLight
          position={[10, 14, 8]} intensity={1.1} color="#FFF8E8"
          castShadow shadow-mapSize={[1024, 1024]}
          shadow-camera-near={0.1} shadow-camera-far={40}
          shadow-camera-left={-12} shadow-camera-right={12}
          shadow-camera-top={12} shadow-camera-bottom={-12}
        />
        <pointLight position={[-6, 4, 0]} intensity={0.5} color="#4488FF" distance={14} />
        <pointLight position={[0, 6, 0]} intensity={0.4} color="#FFE8A0" distance={10} />

        <fog attach="fog" color="#0A0A0F" near={18} far={30} />

        {/* Scene */}
        <Ground />
        <FogLayer />
        <House />
        <PerimeterFence />
        <AmbientParticles />

        {/* AI Agents */}
        {agentNames.map(name => (
          <AgentFigure
            key={name}
            name={name}
            isActive={activeAgent === name}
            activeAttack={activeAgent === name ? activeAttack : null}
          />
        ))}

        {/* Device nodes */}
        {Object.keys(DEVICE_POSITIONS).map(deviceId => {
          const isTargeted = activeAttack?.target === deviceId;
          const attackSuccess = isTargeted && activeAttack?.success === true;
          const defended = defendedTargets.includes(deviceId) || (isTargeted && activeAttack?.success === false);
          return (
            <DeviceNode
              key={deviceId}
              deviceId={deviceId}
              compromised={attackSuccess}
              defended={defended}
            />
          );
        })}

        {/* Attack beam */}
        <AttackBeam activeAttack={activeAttack} activeAgent={activeAgent} />

        {/* Shield dome */}
        <ShieldDome active={shieldActive} />

        {/* Breach explosion at targeted device */}
        <BreachExplosion
          position={activeAttack?.target ? DEVICE_POSITIONS[activeAttack.target] : null}
          active={activeAttack?.success === true}
        />

        <OrbitControls
          enablePan enableZoom
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={Math.PI / 10}
          maxDistance={22}
          minDistance={4}
          enableDamping dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
