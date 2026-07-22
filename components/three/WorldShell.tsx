'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { PerfProvider } from '@/lib/three/perfContext';
import { TextInputProvider } from '@/lib/three/useTextInput';

const WorldCanvas = dynamic(() => import('./WorldCanvas').then((m) => m.WorldCanvas), {
  ssr: false,
  loading: () => <Loader />
});

/**
 * Routes that are intentionally rendered as a full-screen 2D experience on
 * every tier (not hidden behind the 3D world). The camera page is a standalone
 * capture device.
 */
const TWO_D_ROUTES = ['/camera', '/game/describe/camera', '/dev-login'];

/**
 * Routes that keep the live 3D world as their background and float their DOM
 * page on top as a popup overlay (e.g. the Quiz board game over the arena).
 */
const OVERLAY_ROUTES: string[] = ['/game/describe', '/game/debate'];

function Loader() {
  return (
    <div className="fixed inset-0 z-0 grid place-items-center bg-bg">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
        <div className="text-muted text-sm font-mono">Đang dựng thành phố…</div>
      </div>
    </div>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Hold a solid cover over the canvas whenever the route changes (initial
  // reload AND client-side navigation between the city and the interior pages),
  // hiding the camera settling-in / scene-rebuild transient. The cover appears
  // instantly on every navigation and fades out once the camera entry reports
  // it has started running at real FPS (`world-ready`) or a safety timeout.
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    setWarm(false); // re-show the cover on every route change
    const onReady = () => setWarm(true);
    // Fired synchronously by navigation triggers (the click), BEFORE the heavy
    // route push, so the cover paints first instead of after the new scene has
    // already started building.
    const onLoading = () => setWarm(false);
    window.addEventListener('world-ready', onReady);
    window.addEventListener('world-loading', onLoading);
    const t = setTimeout(() => setWarm(true), 4500); // safety net
    return () => {
      window.removeEventListener('world-ready', onReady);
      window.removeEventListener('world-loading', onLoading);
      clearTimeout(t);
    };
  }, [pathname]);

  if (!mounted) {
    return <Loader />;
  }

  const isOverlay =
    OVERLAY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/')) ||
    (pathname === '/game' && (searchParams.get('play') === 'describe' || searchParams.get('play') === 'quiz' || searchParams.get('play') === 'debate'));
  // Full-screen 2D routes (board game + camera) — always visible on every tier.
  if (TWO_D_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return <div className="relative z-10 min-h-screen bg-bg">{children}</div>;
  }

  return (
    <>
      <WorldCanvas />
      {/* Route-change warm-up cover: appears instantly on navigation, fades out
          when the new scene/camera is ready. */}
      <div
        className={`pointer-events-none fixed inset-0 z-[55] grid place-items-center bg-bg ${warm ? 'opacity-0 transition-opacity duration-700' : 'opacity-100'}`}
        aria-hidden="true"
      >
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
      {/* Children rendered hidden — accessible markup + SEO + JS-disabled visibility.
          On overlay routes (e.g. the Quiz board game) the page floats visibly on
          top of the live 3D world as a popup instead of replacing it. */}
      {isOverlay ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#0a1410]/45 backdrop-blur-[2px]">
          {children}
        </div>
      ) : (
        <div className="sr-only" aria-hidden="false">
          {children}
        </div>
      )}
    </>
  );
}

export function WorldShell({ children }: { children: React.ReactNode }) {
  return (
    <PerfProvider>
      <TextInputProvider>
        <Suspense fallback={<Loader />}>
          <Inner>{children}</Inner>
        </Suspense>
      </TextInputProvider>
    </PerfProvider>
  );
}
