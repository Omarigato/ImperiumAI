import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';

const AGENTS = [
  { name: 'ShadowInjector', color: '#ff3b3b', position: [-3.8, 1.1, 2.4] },
  { name: 'ContextPhantom', color: '#b452ff', position: [-3.8, 1.3, -0.1] },
  { name: 'PrivilegeReaper', color: '#ff8a2a', position: [-3.8, 1.1, -2.6] },
];

function HomeModel() {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[4.8, 0.16, 4]} />
        <meshStandardMaterial color="#8d8c83" roughness={1} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.3, 2.2, 3.4]} />
        <meshStandardMaterial color="#dac7aa" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.8, 1.2, 4]} />
        <meshStandardMaterial color="#a64a24" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.85, 1.72]}>
        <boxGeometry args={[0.9, 1.7, 0.06]} />
        <meshStandardMaterial color="#5f351f" roughness={0.6} />
      </mesh>
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 1.45, 1.73]}>
          <boxGeometry args={[0.8, 0.7, 0.04]} />
          <meshStandardMaterial color="#8fd2ff" transparent opacity={0.65} />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 3.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.1, 2.6]} />
        <meshStandardMaterial color="#a2907f" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Lightning({ from, to, color }) {
  const ref = useRef();
  const points = useMemo(() => {
    const [x1, y1, z1] = from;
    const [x2, y2, z2] = to;
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3((x1 + x2) / 2, y1 + 0.6, (z1 + z2) / 2),
      new THREE.Vector3(x2, y2, z2),
    ]);
  }, [from, to]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.opacity = 0.25 + Math.abs(Math.sin(clock.getElapsedTime() * 6)) * 0.6;
  });

  return (
    <line ref={ref} geometry={points}>
      <lineBasicMaterial color={color} transparent opacity={0.8} />
    </line>
  );
}

function Agent({ agent }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = agent.position[1] + Math.sin(clock.getElapsedTime() * 1.8 + agent.position[2]) * 0.15;
  });
  return (
    <group ref={ref} position={agent.position}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={0.6} />
      </mesh>
      <pointLight color={agent.color} intensity={1.4} distance={2.8} />
    </group>
  );
}

export default function HomeHero3D() {
  return (
    <div className="w-full h-[460px] rounded-3xl overflow-hidden border border-cyan-400/20 bg-black/30">
      <Canvas camera={{ position: [7, 5, 7], fov: 44 }} shadows gl={{ antialias: true }}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[8, 10, 6]} intensity={1.1} castShadow />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#7ec8ff" />
        <fog attach="fog" args={['#06070d', 9, 18]} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[26, 26]} />
          <meshStandardMaterial color="#0f1a17" />
        </mesh>

        <HomeModel />
        {AGENTS.map((agent) => (
          <Agent key={agent.name} agent={agent} />
        ))}
        {AGENTS.map((agent) => (
          <Lightning key={agent.name} from={agent.position} to={[0, 1.15, 1.6]} color={agent.color} />
        ))}

        <OrbitControls enablePan={false} minDistance={6} maxDistance={12} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
}
