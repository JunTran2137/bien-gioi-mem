'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type PerfTier = 'high' | 'mid' | 'low' | 'fallback';

export interface PerfState {
  tier: PerfTier;
  webgl: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
  dpr: [number, number];
  shadows: boolean;
  postprocessing: boolean;
  particles: boolean;
  /** Render drei <Stars/>. */
  stars: boolean;
  /** Animated cloud puffs. */
  clouds: boolean;
  /** Antialiasing on the WebGL context. */
  antialias: boolean;
  /** Cap on agents' animation FPS (used to throttle useFrame for cars/peds). */
  animFps: number;
  /** Lower-detail pedestrian/car model. */
  simpleAgents: boolean;
}

const defaultState: PerfState = {
  tier: 'high',
  webgl: true,
  reducedMotion: false,
  isMobile: false,
  dpr: [1, 1.5],
  shadows: true,
  postprocessing: true,
  particles: true,
  stars: true,
  clouds: true,
  antialias: true,
  animFps: 60,
  simpleAgents: false
};

const PerfContext = createContext<PerfState>(defaultState);

export const usePerf = () => useContext(PerfContext);

function detectWebGL2(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function computeTier(): PerfState {
  if (typeof window === 'undefined') return defaultState;

  const webgl = detectWebGL2();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const w = window.innerWidth;
  const isMobile = w < 1024;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as any).deviceMemory || 4;

  let tier: PerfTier = 'high';
  if (!webgl) tier = 'fallback';
  else if (cores < 4 || mem < 4) tier = 'low';
  else if (isMobile || cores < 8 || mem < 8) tier = 'mid';
  // Mobile gets 'mid' instead of 'fallback' — city always renders fully.

  const dpr: [number, number] =
    tier === 'high' ? [1, 1] : tier === 'mid' ? [0.85, 1] : [0.7, 0.9];

  return {
    tier,
    webgl,
    reducedMotion,
    isMobile,
    dpr,
    shadows: tier === 'high',
    postprocessing: tier === 'high',
    particles: tier === 'high',
    stars: tier === 'high' || tier === 'mid',
    clouds: tier === 'high' || tier === 'mid',
    antialias: tier === 'high',
    animFps: tier === 'high' ? 60 : tier === 'mid' ? 30 : 20,
    simpleAgents: tier !== 'high'
  };
}

export function PerfProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PerfState>(defaultState);

  useEffect(() => {
    setState(computeTier());

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setState(computeTier());
    mq.addEventListener('change', onChange);

    // Recompute the FULL tier on resize (debounced). This is symmetric: a brief
    // narrow window no longer permanently drops the app into the 2D fallback UI
    // — once it's wide again the 3D world comes back.
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setState(computeTier()), 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return <PerfContext.Provider value={state}>{children}</PerfContext.Provider>;
}
