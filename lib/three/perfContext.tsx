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
  // Mobile / narrow window gets the lighter 'mid' scene (fewer buildings = less
  // lag) — but it now still renders crisp (native DPR + antialiasing below).

  // DPR strategy: render at the display's NATIVE ratio — never force it UP.
  // Many browsers run at devicePixelRatio < 1 (zoomed-out window, e.g. 0.8);
  // forcing min=1 there SUPERSAMPLES (renders ~56% more pixels than the screen
  // can show) = pure lag for almost no visible gain. So the min follows the
  // device down to its native ratio, and the max only CAPS Hi-DPI/Retina so a
  // 2× screen doesn't quadruple fill-rate. Crispness of hard building/road
  // edges is handled by antialias (below) — cheap MSAA, not expensive upscaling.
  const dpr: [number, number] =
    tier === 'high' ? [0.8, 1.5] : tier === 'mid' ? [0.75, 1.25] : [0.66, 1.0];

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
    // Antialiasing is the single biggest perceived-quality lever for a city full
    // of hard building/road edges. It's cheap MSAA (no post-process pass) and at
    // these pixel counts costs almost nothing, so enable it down to the low tier.
    antialias: tier !== 'fallback',
    animFps: tier === 'high' ? 60 : tier === 'mid' ? 30 : 20,
    simpleAgents: tier === 'low' || tier === 'fallback'
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
