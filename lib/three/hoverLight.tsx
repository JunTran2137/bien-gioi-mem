'use client';

import { createContext, useContext, useRef, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { palette } from './theme';

/**
 * A single shared point light that follows whichever Hotspot is currently
 * hovered. Previously every building shipped its own <pointLight> (intensity 0
 * when idle) — but Three.js still evaluates each light per-fragment regardless
 * of intensity, so 6 idle lights = 6× the lighting cost on every lit surface.
 * Sharing one light keeps the hover glow while cutting the per-fragment light
 * loop dramatically.
 */
interface HoverLightAPI {
  setHover: (pos: [number, number, number] | null) => void;
}

const HoverLightCtx = createContext<HoverLightAPI | null>(null);
export const useHoverLight = () => useContext(HoverLightCtx);

export function HoverLightProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const target = useRef({ pos: new THREE.Vector3(0, 6, 0), active: false });

  const api = useRef<HoverLightAPI>({
    setHover: (pos) => {
      if (pos) {
        target.current.pos.set(pos[0], pos[1] + 6, pos[2]);
        target.current.active = true;
      } else {
        target.current.active = false;
      }
    }
  });

  useFrame((_, delta) => {
    const l = lightRef.current;
    if (!l) return;
    const want = target.current.active ? 0.9 : 0;
    l.intensity = THREE.MathUtils.damp(l.intensity, want, 6, delta);
    if (target.current.active) {
      l.position.lerp(target.current.pos, Math.min(1, delta * 12));
    }
  });

  return (
    <HoverLightCtx.Provider value={api.current}>
      {enabled && (
        <pointLight
          ref={lightRef}
          color={palette.primary}
          intensity={0}
          distance={26}
          decay={2}
          position={[0, 6, 0]}
        />
      )}
      {children}
    </HoverLightCtx.Provider>
  );
}
