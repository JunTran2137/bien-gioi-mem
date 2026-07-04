'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { usePerf } from '@/lib/three/perfContext';
import { WorldRouter } from './WorldRouter';
import { CityProps } from './CityProps';
import { DayNightCycle } from './DayNightCycle';
import { SkySystem } from './SkySystem';
import { CityChromeR3F } from './CityChromeR3F';
import { CameraRig } from './CameraRig';
import { palette, hex } from '@/lib/three/theme';
import * as THREE from 'three';

export function WorldCanvas() {
  const perf = usePerf();
  const pathname = usePathname();
  const inCity = pathname === '/';
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAuthOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('auth-modal-state', { detail: { open: authOpen } }));
  }, [authOpen]);

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        shadows={false}
        dpr={perf.dpr}
        camera={{ position: [0, 5.6, 11], fov: 56, near: 0.5, far: 600 }}
        gl={{ antialias: perf.antialias, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(palette.bg, 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          scene.fog = new THREE.Fog(hex.bg, 80, 220);
          // Shadow casters are static buildings + a slow-moving sun, so we don't
          // need to re-render the shadow map every frame. DayNightCycle flags
          // needsUpdate on its throttled (~10fps) tick — big GPU saving.
          if (perf.shadows) gl.shadowMap.autoUpdate = false;
        }}
      >
        <Suspense fallback={null}>
          <DayNightCycle disabled={perf.reducedMotion} shadows={false} />
          <hemisphereLight args={[hex.bg, '#3a4a3a', 0.4]} />

          <SkySystem disabled={perf.reducedMotion} stars={perf.stars} clouds={perf.clouds} />

          {inCity && <CityProps perf={perf.tier} />}

          <WorldRouter
            authOpen={authOpen}
            onAuthOpen={() => setAuthOpen(true)}
            onAuthClose={() => setAuthOpen(false)}
          />

          <CameraRig disabled={authOpen} />

          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
        </Suspense>
      </Canvas>

      <CityChromeR3F />
    </div>
  );
}
