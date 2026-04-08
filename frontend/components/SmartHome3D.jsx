import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#0a0a14" roughness={0.8} />
    </mesh>
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
      {/* Main walls */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[5, 2.4, 4]} />
        <meshStandardMaterial color="#111122" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.9, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.2, 1.2, 4]} />
        <meshStandardMaterial color="#0D0D1A" roughness={0.95} />
      </mesh>
      {/* Floor platform */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[5.4, 0.1, 4.4]} />
        <meshStandardMaterial color="#0f0f20" roughness={1} />
      </mesh>
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
  { id: 'front_door', label: 'Front Door', position: [-2.5, 0.5, 2.1], color: '#886644', emissive: '#443322', shape: 'box' },
  { id: 'camera_system', label: 'Camera', position: [2.4, 2.1, 1.9], color: '#334455', emissive: '#001133', shape: 'cone' },
  { id: 'lights', label: 'Lights', position: [0, 2.3, 0], color: '#FFEE99', emissive: '#FFCC44', shape: 'sphere' },
  { id: 'thermostat', label: 'Thermostat', position: [2.4, 1.0, 0], color: '#445566', emissive: '#224466', shape: 'box' },
  { id: 'security_panel', label: 'Panel', position: [-2.4, 1.2, -1], color: '#334433', emissive: '#002200', shape: 'cylinder' },
  { id: 'alarm', label: 'Alarm', position: [0, 2.5, -2], color: '#664444', emissive: '#440000', shape: 'cylinder' },
];

export default function SmartHome3D({ deviceStates = {}, activeAttack = null, defendedTargets = [] }) {
  return (
    <div className="w-full h-full" style={{ minHeight: 320 }}>
      <Canvas
        camera={{ position: [7, 6, 7], fov: 45 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} color="#101030" />
        <directionalLight position={[5, 8, 5]} intensity={0.8} color="#8888FF" castShadow />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#00FFFF" distance={8} />

        <Floor />
        <GridLines />
        <House />
        <AmbientParticles />

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
              defended={isActive && !attackSucceeded || isDefended}
            />
          );
        })}

        <AttackBeam
          active={activeAttack !== null}
          success={activeAttack?.success === true}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
    </div>
  );
}
