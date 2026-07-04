'use client';

import { pickArchetype } from '@/lib/three/buildingArchetypes';
import { FacadeBuilding } from './FacadeBuilding';

interface Props {
  position: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  bodyColor?: string;
  rotation?: number;
  /** Lower-detail render: thins out windows and drops minor facade details. */
  simple?: boolean;
}

const ACCENTS = ['#C9D4DE', '#D8C3A5', '#B7C9B0', '#E0C0B0', '#BFC8D6', '#CDBFA0'];

/**
 * A residential / street-scale plot. Each plot is ONE coherent building whose
 * architectural FORM is picked deterministically from the "street" archetype
 * library (brick shophouse, balcony block, classical cornice, industrial loft,
 * hexagonal / octagonal / wedge / round footprints, stepped terrace, domed
 * rotunda…). The geometry itself is built by <FacadeBuilding>.
 */
export function Apartment({
  position, width = 5, depth = 5, height = 9,
  bodyColor = '#FFD8B5', rotation = 0, simple = false,
}: Props) {
  const archetype = pickArchetype(position[0], position[2], height, 'low');
  const accent = ACCENTS[(Math.floor(position[0] * 31.1 + position[2] * 17.7) >>> 0) % ACCENTS.length];
  return (
    <FacadeBuilding
      position={position}
      width={width}
      depth={depth}
      height={height}
      rotation={rotation}
      bodyColor={bodyColor}
      accentColor={accent}
      archetype={archetype}
      simple={simple}
    />
  );
}
