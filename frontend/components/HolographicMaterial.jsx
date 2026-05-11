/**
 * HolographicMaterial.jsx — custom shader material for hologram effect.
 * Adapted from ektogamat/threejs-holographic-material (MIT) for React Three Fiber.
 *
 * Effects:
 *   • Fresnel glow at silhouette edges
 *   • Animated scanlines
 *   • Subtle alpha flickering for "broadcast signal" feel
 *   • Customizable color, brightness, scanline density
 */
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef } from 'react';

const HoloMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#00d4ff'),
    uFresnelAmount: 0.45,
    uFresnelOpacity: 1.0,
    uScanlineSize: 8.0,
    uHologramBrightness: 1.2,
    uSignalSpeed: 0.45,
    uHologramOpacity: 1.0,
    uBlinkFleckSpeed: 0.6,
    uEnableBlinking: 1.0,
  },
  // vertex
  /* glsl */ `
    varying vec3 vNormalW;
    varying vec3 vViewDirW;
    varying vec2 vUv;

    void main() {
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vNormalW = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vViewDirW = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
      vUv = uv;
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  // fragment
  /* glsl */ `
    uniform float uTime;
    uniform vec3  uColor;
    uniform float uFresnelAmount;
    uniform float uFresnelOpacity;
    uniform float uScanlineSize;
    uniform float uHologramBrightness;
    uniform float uSignalSpeed;
    uniform float uHologramOpacity;
    uniform float uBlinkFleckSpeed;
    uniform float uEnableBlinking;

    varying vec3 vNormalW;
    varying vec3 vViewDirW;
    varying vec2 vUv;

    float fresnelEffect(vec3 normal, vec3 viewDir, float power) {
      return pow((1.0 - clamp(dot(normalize(normal), normalize(viewDir)), 0.0, 1.0)), power);
    }

    void main() {
      // Fresnel: stronger at glancing angles → silhouette glow
      float fresnel = fresnelEffect(vNormalW, vViewDirW, 1.0 + (1.0 - uFresnelAmount) * 4.0);

      // Scanlines moving over time
      float scanline = step(0.5, fract((vUv.y - uTime * uSignalSpeed * 0.05) * uScanlineSize));

      // Random fleck blinking
      float blink = 1.0;
      if (uEnableBlinking > 0.5) {
        float r = sin(uTime * uBlinkFleckSpeed * 25.0) * 0.5 + 0.5;
        blink = mix(0.85, 1.0, smoothstep(0.92, 1.0, r));
      }

      // Combine
      float intensity = (scanline * 0.4 + fresnel * uFresnelOpacity * 1.3 + 0.25) * uHologramBrightness * blink;
      vec3 col = uColor * intensity;

      float alpha = clamp(intensity, 0.05, 1.0) * uHologramOpacity;
      gl_FragColor = vec4(col, alpha);
    }
  `
);

extend({ HoloMaterialImpl });

/**
 * <HolographicMaterial color="#00d4ff" brightness={1.2} scanlineSize={8} />
 *
 * Pass to a <mesh> just like meshStandardMaterial. Animates automatically.
 */
export default function HolographicMaterial({
  color = '#00d4ff',
  brightness = 1.2,
  fresnelAmount = 0.5,
  fresnelOpacity = 1.0,
  scanlineSize = 8.0,
  signalSpeed = 0.45,
  opacity = 1.0,
  enableBlinking = true,
  side = THREE.DoubleSide,
  ...rest
}) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uTime = clock.getElapsedTime();
  });

  return (
    <holoMaterialImpl
      ref={ref}
      uColor={new THREE.Color(color)}
      uHologramBrightness={brightness}
      uFresnelAmount={fresnelAmount}
      uFresnelOpacity={fresnelOpacity}
      uScanlineSize={scanlineSize}
      uSignalSpeed={signalSpeed}
      uHologramOpacity={opacity}
      uEnableBlinking={enableBlinking ? 1.0 : 0.0}
      transparent
      depthWrite={false}
      side={side}
      blending={THREE.AdditiveBlending}
      {...rest}
    />
  );
}
