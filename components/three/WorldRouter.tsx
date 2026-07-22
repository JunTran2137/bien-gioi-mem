'use client';

import { usePathname } from 'next/navigation';
import { Library } from './buildings/Library';
import { Arena } from './buildings/Arena';
import { Academy } from './buildings/Academy';
import { Tower } from './buildings/Tower';
import { TownHall } from './buildings/TownHall';
import { Cinema } from './buildings/Cinema';
import { GlobeMonument } from './buildings/GlobeMonument';
import { AuthModal3D } from './AuthModal3D';
import { LibraryScene } from './scenes/LibraryScene';
import { AcademyScene } from './scenes/AcademyScene';
import { TowerScene } from './scenes/TowerScene';
import { ArenaScene } from './scenes/ArenaScene';
import { DebateScene } from './scenes/DebateScene';
import { TownHallScene } from './scenes/TownHallScene';
import { CinemaScene } from './scenes/CinemaScene';
import { HoverLightProvider } from '@/lib/three/hoverLight';

interface Props {
  authOpen: boolean;
  onAuthOpen: () => void;
  onAuthClose: () => void;
}

export function WorldRouter({ authOpen, onAuthOpen, onAuthClose }: Props) {
  const pathname = usePathname();
  const inCity = pathname === '/';

  return (
    <HoverLightProvider enabled={inCity}>
      {/* Exterior city — only on home route. Hidden when user enters a building. */}
      {inCity && (
        <>
          <GlobeMonument />
          <Library />
          <Arena />
          <Academy />
          <Tower />
          <Cinema />
          <TownHall />
        </>
      )}

      {/* Interior scenes */}
      {pathname === '/theory' && <LibraryScene />}
      {pathname === '/flashcards' && <AcademyScene />}
      {pathname === '/leaderboard' && <TowerScene />}
      {(pathname === '/game' || pathname.startsWith('/game/describe')) && <ArenaScene />}
      {pathname === '/game/debate' && <DebateScene />}
      {pathname === '/townhall' && <TownHallScene />}
      {pathname === '/cinema' && <CinemaScene />}

      <AuthModal3D open={authOpen} onClose={onAuthClose} />
    </HoverLightProvider>
  );
}
