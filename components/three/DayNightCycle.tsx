'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { palette } from '@/lib/three/theme';
import { setNightFactor } from '@/lib/three/nightWindows';

interface Props {
  disabled?: boolean;
  cycleSeconds?: number;
  shadows?: boolean;
}

const CYCLE = 90; // 90s full day

const dawn = { sunPos: new THREE.Vector3(80, 8, 30), sunColor: new THREE.Color('#FFB07A'), sunIntensity: 0.65, ambient: 0.45, fog: new THREE.Color('#FFD9C2') };
const noon = { sunPos: new THREE.Vector3(40, 70, 30), sunColor: new THREE.Color('#FFFAE9'), sunIntensity: 1.4, ambient: 0.55, fog: new THREE.Color('#F0F7F4') };
const dusk = { sunPos: new THREE.Vector3(-60, 12, 20), sunColor: new THREE.Color('#FF8A5C'), sunIntensity: 0.85, ambient: 0.4, fog: new THREE.Color('#F2B89A') };
const night = { sunPos: new THREE.Vector3(-30, -20, 10), sunColor: new THREE.Color('#5A78AA'), sunIntensity: 0.18, ambient: 0.18, fog: new THREE.Color('#1F2D45') };

const keys = [dawn, noon, dusk, night, dawn];

// Scratch objects reused every frame to avoid GC churn.
const _sunPos = new THREE.Vector3();
const _sunCol = new THREE.Color();
const _fogCol = new THREE.Color();

function applyLerpedKey(t: number, outSun: THREE.Vector3, outColor: THREE.Color, outFog: THREE.Color): { sunIntensity: number; ambient: number } {
  const segCount = keys.length - 1;
  const u = t * segCount;
  const i = Math.min(Math.floor(u), segCount - 1);
  const k = u - i;
  const a = keys[i];
  const b = keys[i + 1];
  outSun.lerpVectors(a.sunPos, b.sunPos, k);
  outColor.copy(a.sunColor).lerp(b.sunColor, k);
  outFog.copy(a.fog).lerp(b.fog, k);
  return {
    sunIntensity: THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, k),
    ambient: THREE.MathUtils.lerp(a.ambient, b.ambient, k)
  };
}

export function DayNightCycle({ disabled = false, cycleSeconds = CYCLE, shadows = true }: Props) {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const elapsed = useRef(disabled ? 0.25 * cycleSeconds : 0);
  const tick = useRef(0);
  const { scene, gl } = useThree();

  useFrame((_, delta) => {
    if (!disabled) {
      elapsed.current = (elapsed.current + delta) % cycleSeconds;
    }
    // Throttle: only recompute lighting ~10 times per second; visually identical.
    tick.current += delta;
    if (tick.current < 0.1) return;
    tick.current = 0;

    const t = elapsed.current / cycleSeconds;
    const { sunIntensity, ambient } = applyLerpedKey(t, _sunPos, _sunCol, _fogCol);
    if (sunRef.current) {
      sunRef.current.position.copy(_sunPos);
      sunRef.current.color.copy(_sunCol);
      sunRef.current.intensity = sunIntensity;
    }
    if (ambRef.current) ambRef.current.intensity = ambient;
    // Light every building's windows as the sun fades. Map sun intensity
    // (≈1.4 noon → 0.18 night) to a 0..1 night factor with a soft dusk ramp.
    setNightFactor(THREE.MathUtils.clamp((0.92 - sunIntensity) / 0.7, 0, 1));
    if (scene.fog && (scene.fog as THREE.Fog).color) {
      (scene.fog as THREE.Fog).color.copy(_fogCol);
    }
    // gl.shadowMap.autoUpdate is disabled (see WorldCanvas) — refresh the shadow
    // map only on this throttled tick instead of every rendered frame.
    if (shadows && !gl.shadowMap.autoUpdate) {
      gl.shadowMap.needsUpdate = true;
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.45} color={palette.bg} />
      <directionalLight
        ref={sunRef}
        position={[40, 30, 20]}
        intensity={1.2}
        color="#fff5e0"
        castShadow={shadows}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0008}
      />
    </>
  );
}
