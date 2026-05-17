/**
 * ModelAsset.jsx — v5
 *
 * Safely loads a .glb/.gltf from the registry and AUTO-NORMALISES it so:
 *   1. its centre is on the X / Z axis at the parent's origin,
 *   2. its bottom sits on y = 0 (so it stands on the floor),
 *   3. its world-space height matches `desiredHeight` from the registry.
 *
 * Pipeline per model:
 *   useGLTF(path)                       — drei cache + Draco
 *   SkeletonUtils.clone(scene)          — preserves skinned-mesh rigs
 *   Box3.setFromObject → centre / size  — measure the actual bounds
 *   scaleFactor = desiredHeight/size.y  — auto-fit height
 *   position = -centre*S + offsetY      — centre XZ, bottom on y=0
 *
 * Robustness:
 *   - Suspense + GltfErrorBoundary → if the GLB is missing, broken or returns
 *     non-2xx, we render a procedural fallback primitive and log a single
 *     warning. The rest of the scene keeps running.
 *   - Materials are cloned (no mutation of drei's shared cache) – this used
 *     to be the source of the previous "Unhandled error" crash.
 *
 * Debug mode (debug=true):
 *   - draws the model's bounding box,
 *   - calls onDebugInfo({ loaded, path, displayName, size, scaleFactor })
 *     so the parent can render a small label outside the canvas.
 * Безопасная загрузка .glb моделей с:
 * - Lazy loading (тяжёлые модели грузятся только когда нужны)
 * - GltfErrorBoundary (ошибка = fallback, НЕ краш)
 * - SkeletonUtils.clone (безопасный клон, без мутации кэша)
 * - Оптимизированный useFrame только при активных состояниях
 */
import { Suspense, useMemo, useRef, Component, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils';
import { getModelEntry } from '../lib/modelRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// Fallback primitives (rendered when a model is missing or fails to load).
// They are intentionally simple: small mesh count, no textures, no shaders.
// ─────────────────────────────────────────────────────────────────────────────
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
        <sphereGeometry args={[0.16, 8, 8]} />
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
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.7} metalness={0.85} />
      </mesh>
      {[[-0.3, 1.0, -0.3], [0.3, 1.0, -0.3], [-0.3, 1.0, 0.3], [0.3, 1.0, 0.3]].map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 6]} />
            <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.85} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.22, 0.01, 0.02]} />
            <meshStandardMaterial color="#aab" metalness={0.6} />
          </mesh>
        </group>
      ))}
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
        <sphereGeometry args={[0.12, 8, 8]} />
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
        <cylinderGeometry args={[0.08, 0.08, 0.08, 10]} />
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
        <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function FallbackLock({ tint }) {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.12, 0.04, 6, 12, Math.PI]} />
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
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#aab" metalness={0.95} />
      </mesh>
    </group>
  );
}

function FallbackButton({ tint }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.18, 0.22, 0.12, 16]} />
        <meshStandardMaterial color="#222" metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.05, 16]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={1.0} />
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
          <cylinderGeometry args={[0.012, 0.012, 0.2, 5]} />
          <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function FallbackCity() {
  // 16-tower low-poly skyline ring used if a city_bg.glb is missing.
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

const FALLBACK_MAP = {
  humanoid: FallbackHumanoid,
  mech: FallbackMech,
  drone: FallbackDrone,
  stealth: FallbackStealth,
  robot: FallbackRobot,
  camera: FallbackCamera,
  thermostat: FallbackThermostat,
  lock: FallbackLock,
  door: FallbackDoor,
  button: FallbackButton,
  router: FallbackRouter,
  city: FallbackCity,
  box: FallbackBox,
};

function Fallback({ kind, tint }) {
  const Comp = FALLBACK_MAP[kind] || FALLBACK_MAP.box;
  return <Comp tint={tint || '#00d4ff'} />;
}

// ── glTF error boundary ─────────────────────────────────────────────────────
class GltfErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        `[AegisAI] GLB '${this.props.label || '?'}' failed → using fallback:`,
        err?.message || err,
      );
    }
    this.props.onFail?.();
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

// ── Inner loader (auto-normalises + emits debug info) ──────────────────────
function GltfModel({ path, displayName, desiredHeight, scaleMul, rotation, isActive, isBreached, onDebug }) {
  const { scene } = useGLTF(path, true /* draco */);

  // Always clone via SkeletonUtils so skinned-mesh skeletons keep their bindings
  // and the drei-cached scene is never mutated.
  const sceneClone = useMemo(() => {
    try { return skeletonClone(scene); }
    catch { return scene.clone(true); }
  }, [scene]);

  // ── auto-normalise: centre XZ, bottom on y=0, fit to desiredHeight ────────
  const { scaleFactor, offset, size } = useMemo(() => {
    const bbox = new THREE.Box3().setFromObject(sceneClone);
    const sz = bbox.getSize(new THREE.Vector3());
    const ctr = bbox.getCenter(new THREE.Vector3());
    const factor = desiredHeight && sz.y > 0
      ? (desiredHeight / sz.y) * (scaleMul ?? 1)
      : (scaleMul ?? 1);
    // After scaling by `factor`, model points are in scaled units.
    // To put XZ centre at origin we shift by -ctr * factor; to put the bottom
    // on y=0 we shift y by -bbox.min.y * factor.
    return {
      scaleFactor: factor,
      offset: [-ctr.x * factor, -bbox.min.y * factor, -ctr.z * factor],
      size: [sz.x, sz.y, sz.z],
    };
  }, [sceneClone, desiredHeight, scaleMul]);

  // Clone materials and tweak emissive in a SAFE way (we never touch drei cache).
  useEffect(() => {
    const touched = [];
    clonedScene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const list = Array.isArray(obj.material) ? obj.material : [obj.material];
        const cloned = list.map((m) => {
          const c = m.clone();
          touched.push(c);
          if (c.emissive) {
            c.emissiveIntensity = isBreached ? 0.9 : isActive ? 0.55 : 0.2;
          }
          return c;
        });
        obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
      }
    });
    return () => touched.forEach((m) => m.dispose?.());
  }, [sceneClone, isActive, isBreached]);

  // Push debug info up the tree once everything is computed.
  useEffect(() => {
    onDebug?.({
      loaded: true,
      path,
      displayName,
      size,
      scaleFactor,
    });
  }, [onDebug, path, displayName, size, scaleFactor]);

  return (
    <group position={offset} scale={scaleFactor} rotation={rotation}>
      <primitive object={sceneClone} />
    </group>
  );
}

// ── Bounding-box helper rendered only in Asset Debug mode ──────────────────
function DebugBoundingBox({ size, color = '#00ff7f' }) {
  if (!size || size[1] <= 0) return null;
  return (
    <mesh position={[0, size[1] / 2, 0]}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.45} />
    </mesh>
  );
}

// ── Public component ────────────────────────────────────────────────────────
export default function ModelAsset({
  modelKey,
  fallback,
  tint = '#00d4ff',
  position = [0, 0, 0],
  rotation,
  scale,                                             // optional extra multiplier
  isActive = false,
  isBreached = false,
  isProtected = false,
  debug = false,                                      // Asset Debug toggle
  onDebugInfo,                                        // optional (info) => void
  onPointerOver,
  onPointerOut,
  onClick,
}) {
  const groupRef = useRef();
  const entry = getModelEntry(modelKey);
  const fallbackKind = fallback || entry?.fallback || 'box';
  const path = entry?.path;

  const finalRotation = rotation ?? entry?.rotation ?? [0, 0, 0];
  const finalPosition = useMemo(() => {
    const off = entry?.positionOffset ?? [0, 0, 0];
    return [position[0] + off[0], position[1] + off[1], position[2] + off[2]];
  }, [position, entry?.positionOffset]);
  const desiredHeight = entry?.desiredHeight ?? 1.0;
  const scaleMul = (scale ?? 1) * (entry?.scale ?? 1);

  // local cache of latest debug info – exposed via DebugBoundingBox below
  const debugRef = useRef({ loaded: false, path, displayName: entry?.displayName, size: null, scaleFactor: null });

  const handleDebug = (info) => {
    debugRef.current = { ...debugRef.current, ...info };
    onDebugInfo?.(debugRef.current);
  };

  // Subtle idle pulse on the OUTER group (does not affect normalised size).
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (isActive || isBreached || isProtected) {
      const t = clock.getElapsedTime();
      const speed = isBreached ? 9 : isActive ? 4 : 2;
      const amp   = isBreached ? 0.05 : isActive ? 0.04 : 0.025;
      groupRef.current.scale.setScalar(1 + Math.sin(t * speed) * amp);
    } else if (groupRef.current.scale.x !== 1) {
      groupRef.current.scale.setScalar(1);
    }
  });

  const fallbackEl = <Fallback kind={fallbackKind} tint={tint} />;

  return (
    <group
      ref={groupRef}
      position={finalPosition}
      onPointerOver={onPointerOver ? (e) => { e.stopPropagation(); onPointerOver(e); } : undefined}
      onPointerOut={onPointerOut}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(e); } : undefined}
    >
      <GltfErrorBoundary
        label={entry?.displayName || modelKey}
        fallback={fallbackEl}
        onFail={() => handleDebug({ loaded: false, path })}
      >
        <Suspense fallback={fallbackEl}>
          {path
            ? <GltfModel
                path={path}
                displayName={entry?.displayName}
                desiredHeight={desiredHeight}
                scaleMul={scaleMul}
                rotation={finalRotation}
                isActive={isActive}
                isBreached={isBreached}
                onDebug={handleDebug}
              />
            : fallbackEl}
        </Suspense>
      </GltfErrorBoundary>

      {/* Asset Debug overlay — bounding box (only when both debug + size known) */}
      {debug && debugRef.current?.size && (
        <DebugBoundingBox size={debugRef.current.size} />
      )}
    </group>
  );
}
