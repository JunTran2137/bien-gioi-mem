'use client';

import { pickArchetype } from '@/lib/three/buildingArchetypes';
import { FacadeBuilding } from './FacadeBuilding';

interface Props {
  width: number;
  height: number;
  depth: number;
  position?: [number, number, number];
  bodyColor: string;
  accentColor?: string;
  windowColor?: string;
  /** Kept for type compatibility; the form's roof is decided by its archetype. */
  roof?: 'flat' | 'dome' | 'antenna' | 'sign';
  signText?: string;
  /** Kept for type compatibility; superseded by the archetype system. */
  massing?: string;
  cornerRadius?: number;
  /** World-space [x, z] used to deterministically pick the building form. */
  seed?: [number, number];
  rotation?: number;
}

/**
 * A high-rise plot. Each plot is ONE coherent tower whose architectural FORM is
 * picked deterministically from the "tower" archetype library (glass curtain
 * wall, cylindrical, tapered, twisted, slant-topped, finned, concrete grid,
 * setback crown, podium-and-shaft, diagrid, hexagonal, balcony hotel…). The
 * geometry is built by <FacadeBuilding>. HighRise is mounted inside a group that
 * already applies the world position/rotation, so `seed` carries the world
 * coordinates needed to decorrelate neighbouring plots.
 */
export function HighRise({
  width, height, depth,
  position = [0, 0, 0],
  bodyColor,
  accentColor = '#C9D4DE',
  windowColor = '#AFC6DE',
  seed,
  rotation = 0,
}: Props) {
  const sx = seed ? seed[0] : position[0];
  const sz = seed ? seed[1] : position[2];
  const archetype = pickArchetype(sx, sz, height, 'tall');
  return (
    <FacadeBuilding
      position={position}
      width={width}
      depth={depth}
      height={height}
      rotation={rotation}
      bodyColor={bodyColor}
      accentColor={accentColor}
      windowColor={windowColor}
      archetype={archetype}
    />
  );
}
