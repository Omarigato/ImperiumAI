/**
 * ModelAsset.jsx
 *
 * Safely loads a .glb/.gltf from the registry. If the file is missing or
 * fails to load, a stylised low-poly fallback primitive is rendered in its
 * place so the scene NEVER crashes.
 *
 * Why this is safe:
 *   - All useGLTF calls live under <Suspense>, and <Suspense> itself lives
 *     under a GltfErrorBoundary that swallows any non-promise throw.
 *   - Models are cloned via SkeletonUtils.clone → skinned meshes keep their
 *     skeleton bindings, and drei's shared cached scene is NEVER mutated.
 *     (That mutation was the root cause of the previous "Unhandled error".)
 *   - Materials are cloned when we need to tweak opacity/emissive on hover
 *     so the cached originals stay pristine.
 *   - Draco decompression is enabled so Draco-compressed GLBs just work.
 */
import { Suspense, useMemo, useRef, Component, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils';
import { getModelEntry } from '../lib/modelRegistry';

// ── Fallback primitives ──────────────────────────────────────────────────────
function FallbackHouse({ tint }) {
  return (
    <group>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.6, 1.4, 1.2]} />
        <meshStandardMaterial color={tint} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.7, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.2, 0.8, 4]} />
        <meshStandardMaterial color="#1a2240" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function FallbackHumanoid({ tint }) {
  return (
    <group>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.6} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <capsuleGeometry args={[0.18, 0.55, 4, 8]} />
        <meshStandardMaterial color="#1a2240" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.28, 1.0, 0]} rotation={[0, 0, 0.4]}>
        <capsuleGeometry args={[0.07, 0.45, 4, 6]} />
        <meshStandardMaterial color={tint} metalness={0.6} />
      </mesh>
      <mesh position={[0.28, 1.0, 0]} rotation={[0, 0, -0.4]}>
        <capsuleGeometry args={[0.07, 0.45, 4, 6]} />
        <meshStandardMaterial color={tint} metalness={0.6} />
      </mesh>
      <mesh position={[-0.12, 0.3, 0]}>
        <capsuleGeometry args={[0.08, 0.45, 4, 6]} />
        <meshStandardMaterial color="#0e1428" metalness={0.7} />
      </mesh>
      <mesh position={[0.12, 0.3, 0]}>
        <capsuleGeometry args={[0.08, 0.45, 4, 6]} />
        <meshStandardMaterial color="#0e1428" metalness={0.7} />
      </mesh>
    </group>
  );
}

function FallbackStealth({ tint }) {
  return (
    <group>
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.4, 1.2, 8]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.45} metalness={0.85} roughness={0.3} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive={tint} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function FallbackRobot({ tint }) {
  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.5} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.5, 0.7, 0.35]} />
        <meshStandardMaterial color="#1a2240" metalness={0.7} />
      </mesh>
      <mesh position={[-0.32, 0.95, 0]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={tint} metalness={0.6} />
      </mesh>
      <mesh position={[0.32, 0.95, 0]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color={tint} metalness={0.6} />
      </mesh>
      <mesh position={[-0.12, 0.25, 0]}>
        <boxGeometry args={[0.14, 0.4, 0.14]} />
        <meshStandardMaterial color="#0e1428" />
      </mesh>
      <mesh position={[0.12, 0.25, 0]}>
        <boxGeometry args={[0.14, 0.4, 0.14]} />
        <meshStandardMaterial color="#0e1428" />
      </mesh>
    </group>
  );
}

function FallbackMech({ tint }) {
  return (
    <group>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.45]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.5} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.75, 0.7, 0.55]} />
        <meshStandardMaterial color="#0e1428" metalness={0.75} />
      </mesh>
      <mesh position={[-0.4, 0.85, 0]}>
        <boxGeometry args={[0.18, 0.55, 0.25]} />
        <meshStandardMaterial color={tint} metalness={0.7} />
      </mesh>
      <mesh position={[0.4, 0.85, 0]}>
        <boxGeometry args={[0.18, 0.55, 0.25]} />
        <meshStandardMaterial color={tint} metalness={0.7} />
      </mesh>
      <mesh position={[-0.18, 0.22, 0]}>
        <boxGeometry args={[0.18, 0.45, 0.3]} />
        <meshStandardMaterial color="#0a1220" metalness={0.8} />
      </mesh>
      <mesh position={[0.18, 0.22, 0]}>
        <boxGeometry args={[0.18, 0.45, 0.3]} />
        <meshStandardMaterial color="#0a1220" metalness={0.8} />
      </mesh>
    </group>
  );
}

function FallbackDrone({ tint }) {
  return (
    <group>
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.7} metalness={0.85} />
      </mesh>
      {[[-0.3, 1.0, -0.3], [0.3, 1.0, -0.3], [-0.3, 1.0, 0.3], [0.3, 1.0, 0.3]].map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 8]} />
            <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.85} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.22, 0.01, 0.02]} />
            <meshStandardMaterial color="#aab" metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.22, 0.01, 0.02]} />
            <meshStandardMaterial color="#aab" metalness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FallbackCamera({ tint }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.25, 0.18, 0.32]} />
        <meshStandardMaterial color={tint} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />
        <meshStandardMaterial color="#000" emissive={tint} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function FallbackThermostat({ tint }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.35, 0.5, 0.05]} />
        <meshStandardMaterial color="#1a2240" metalness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function FallbackLock({ tint }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.12, 0.04, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#888" metalness={0.9} />
      </mesh>
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[0.28, 0.22, 0.1]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.5} metalness={0.7} />
      </mesh>
    </group>
  );
}

function FallbackDoor({ tint }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.5, 1.05, 0.06]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.4} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0.16, 0, 0.04]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#aab" metalness={0.95} />
      </mesh>
    </group>
  );
}

function FallbackButton({ tint }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.18, 0.22, 0.12, 24]} />
        <meshStandardMaterial color="#222" metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.05, 24]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={1.0} />
      </mesh>
    </group>
  );
}

function FallbackGarage({ tint }) {
  return (
    <mesh>
      <boxGeometry args={[0.9, 0.7, 0.08]} />
      <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.3} />
    </mesh>
  );
}

function FallbackPanel({ tint }) {
  return (
    <mesh>
      <boxGeometry args={[0.4, 0.55, 0.05]} />
      <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.5} />
    </mesh>
  );
}

function FallbackAlarm({ tint }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 0.18, 16]} />
        <meshStandardMaterial color="#222" metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <coneGeometry args={[0.17, 0.16, 16]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function FallbackSensor({ tint }) {
  return (
    <mesh>
      <icosahedronGeometry args={[0.12, 0]} />
      <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.6} metalness={0.7} />
    </mesh>
  );
}

function FallbackValve({ tint }) {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 12]} />
        <meshStandardMaterial color="#666" metalness={0.9} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.18, 0.04, 8, 16]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function FallbackLight({ tint }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#fff" emissive={tint} emissiveIntensity={1.2} />
      </mesh>
      <pointLight color={tint} intensity={0.6} distance={2} />
    </group>
  );
}

function FallbackTV({ tint }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.7, 0.45, 0.05]} />
        <meshStandardMaterial color="#0a0a14" emissive={tint} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.62, 0.38]} />
        <meshBasicMaterial color={tint} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function FallbackSpeaker({ tint }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.12, 0.15, 0.32, 16]} />
        <meshStandardMaterial color="#222" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <torusGeometry args={[0.08, 0.02, 8, 24]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function FallbackRouter({ tint }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.55, 0.12, 0.32]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-0.15, 0, 0.15].map((x) => (
        <mesh key={x} position={[x, 0.12, 0.1]}>
          <cylinderGeometry args={[0.012, 0.012, 0.2, 6]} />
          <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function FallbackTree({ tint }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 1, 8]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <coneGeometry args={[0.5, 1, 8]} />
        <meshStandardMaterial color={tint} />
      </mesh>
    </group>
  );
}

function FallbackCity() {
  // Simple low-poly skyline ring — used if a city_bg.glb is missing.
  const towers = useMemo(() => Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const r = 28 + Math.random() * 6;
    const h = 3 + Math.random() * 7;
    return { pos: [Math.cos(angle) * r, h / 2, Math.sin(angle) * r], h, w: 1.4 + Math.random() * 1.4 };
  }), []);
  return (
    <group>
      {towers.map((t, i) => (
        <mesh key={i} position={t.pos}>
          <boxGeometry args={[t.w, t.h, t.w]} />
          <meshStandardMaterial color="#1a1d30" emissive="#00d4ff" emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

function FallbackBox({ tint }) {
  return (
    <mesh>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.4} metalness={0.6} />
    </mesh>
  );
}

const FALLBACK_PRIMITIVES = {
  house: FallbackHouse,
  humanoid: FallbackHumanoid,
  stealth: FallbackStealth,
  robot: FallbackRobot,
  mech: FallbackMech,
  drone: FallbackDrone,
  camera: FallbackCamera,
  thermostat: FallbackThermostat,
  lock: FallbackLock,
  door: FallbackDoor,
  button: FallbackButton,
  garage: FallbackGarage,
  panel: FallbackPanel,
  alarm: FallbackAlarm,
  sensor: FallbackSensor,
  valve: FallbackValve,
  light: FallbackLight,
  tv: FallbackTV,
  speaker: FallbackSpeaker,
  router: FallbackRouter,
  tree: FallbackTree,
  city: FallbackCity,
  box: FallbackBox,
};

function Fallback({ kind, tint }) {
  const Comp = FALLBACK_PRIMITIVES[kind] || FALLBACK_PRIMITIVES.box;
  return <Comp tint={tint || '#00d4ff'} />;
}

// ── glTF error boundary ─────────────────────────────────────────────────────
// Catches non-promise throws (missing file, parse error, etc.).  The fallback
// prop is rendered in place of the broken model.
class GltfErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    if (typeof window !== 'undefined') {
      // Single concise warning – avoids log spam.
      // eslint-disable-next-line no-console
      console.warn('[AegisAI] GLB failed to load, using fallback:', error?.message || error);
    }
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

// ── Inner loader ────────────────────────────────────────────────────────────
function GltfModel({ path, isActive, isBreached }) {
  const { scene } = useGLTF(path, true /* draco */);

  // Clone with SkeletonUtils so animated / skinned meshes keep their rigs.
  // This also protects the shared cached scene from mutation.
  const sceneClone = useMemo(() => {
    try {
      return skeletonClone(scene);
    } catch {
      return scene.clone(true);
    }
  }, [scene]);

  // Gentle outline by adjusting emissive of cloned materials (safe – we
  // clone materials first so the cached scene is untouched).
  useEffect(() => {
    const touched = [];
    sceneClone.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        obj.material = mats.map((m) => {
          const cloned = m.clone();
          touched.push(cloned);
          if (cloned.emissive) {
            cloned.emissiveIntensity = isBreached ? 0.9 : isActive ? 0.55 : 0.2;
          }
          return cloned;
        });
        if (!Array.isArray(obj.material)) obj.material = obj.material[0];
      }
    });
    return () => { touched.forEach((m) => m.dispose?.()); };
  }, [sceneClone, isActive, isBreached]);

  return <primitive object={sceneClone} />;
}

// ── Public component ────────────────────────────────────────────────────────
export default function ModelAsset({
  modelKey,
  fallback,
  tint = '#00d4ff',
  position = [0, 0, 0],
  rotation,
  scale,
  isActive = false,
  isBreached = false,
  isProtected = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) {
  const groupRef = useRef();
  const entry = getModelEntry(modelKey);
  const finalScale = scale ?? entry?.scale ?? 1;
  const finalRotation = rotation ?? entry?.rotation ?? [0, 0, 0];
  const finalPosition = position ?? entry?.position ?? [0, 0, 0];
  const fallbackKind = fallback || entry?.fallback || 'box';
  const path = entry?.path;

  // Subtle idle pulse on active/breached/protected state
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    if (isActive || isBreached || isProtected) {
      const speed = isBreached ? 9 : isActive ? 4 : 2;
      const amp = isBreached ? 0.05 : isActive ? 0.04 : 0.025;
      groupRef.current.scale.setScalar(finalScale * (1 + Math.sin(t * speed) * amp));
    } else if (groupRef.current.scale.x !== finalScale) {
      groupRef.current.scale.setScalar(finalScale);
    }
  });

  const fallbackElement = <Fallback kind={fallbackKind} tint={tint} />;

  return (
    <group
      ref={groupRef}
      position={finalPosition}
      rotation={finalRotation}
      scale={finalScale}
      onPointerOver={onPointerOver ? (e) => { e.stopPropagation(); onPointerOver(e); } : undefined}
      onPointerOut={onPointerOut}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(e); } : undefined}
    >
      <GltfErrorBoundary fallback={fallbackElement}>
        <Suspense fallback={fallbackElement}>
          {path
            ? <GltfModel path={path} isActive={isActive} isBreached={isBreached} />
            : fallbackElement}
        </Suspense>
      </GltfErrorBoundary>
    </group>
  );
}
