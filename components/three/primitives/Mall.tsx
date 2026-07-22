'use client';

import { RoundedBox, Instances, Instance } from '@react-three/drei';
import { useMemo } from 'react';
import { hex } from '@/lib/three/theme';
import { Windows } from './Windows';

interface Props {
  position: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  bodyColor?: string;
  rotation?: number;
  /** Lower-detail render: drops the rooftop signage cluster. */
  simple?: boolean;
}

/** Trung tâm thương mại — a broad glass-fronted mall with banded windows,
 *  an entrance canopy and a rooftop sign box. */
export function Mall({
  position, width = 7, depth = 6, height = 7,
  bodyColor = '#EAF1F7', rotation = 0, simple = false
}: Props) {
  const front = depth / 2;
  const floors = Math.max(2, Math.round(height / 2.6));

  // Horizontal glass bands across the front facade, one per floor — instanced.
  const bands = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let f = 0; f < floors; f++) {
      const y = (f + 0.55) * (height / floors);
      out.push([0, y, front + 0.03]);
    }
    return out;
  }, [floors, height, front]);

  return (
    <group position={position} rotation-y={rotation}>
      {/* body */}
      <RoundedBox args={[width, height, depth]} radius={0.2} smoothness={3} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.1} />
      </RoundedBox>

      {/* glass window bands (1 draw call) */}
      <Instances frames={1} limit={Math.max(bands.length, 1)} range={bands.length}>
        <boxGeometry args={[width * 0.86, (height / floors) * 0.5, 0.06]} />
        <meshStandardMaterial color="#9FC6E8" emissive="#7FB0DC" emissiveIntensity={0.18} roughness={0.15} metalness={0.5} />
        {bands.map((p, i) => (
          <Instance key={`mb-${i}`} position={p} />
        ))}
      </Instances>

      {/* side glass band (+X) for a wraparound look */}
      <mesh position={[width / 2 + 0.03, height * 0.5, 0]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[depth * 0.8, height * 0.5, 0.05]} />
        <meshStandardMaterial color="#9FC6E8" roughness={0.15} metalness={0.5} />
      </mesh>

      {/* lit windows wrapping every facade so the mall glows at night */}
      <Windows width={width} height={height} depth={depth} sill={1.6} floorH={2.2} color="#BFE0FF" paneW={0.8} paneH={0.95} />

      {/* entrance canopy */}
      <mesh position={[0, height * 0.2, front + 0.55]} castShadow>
        <boxGeometry args={[width * 0.5, 0.22, 1.1]} />
        <meshStandardMaterial color={hex.primary} roughness={0.5} />
      </mesh>
      {/* glass entrance doors */}
      <mesh position={[0, height * 0.16, front + 0.02]}>
        <boxGeometry args={[width * 0.46, height * 0.3, 0.05]} />
        <meshStandardMaterial color="#243445" roughness={0.2} metalness={0.6} />
      </mesh>

      {/* parapet trim */}
      <mesh position={[0, height + 0.12, 0]} castShadow>
        <boxGeometry args={[width + 0.2, 0.24, depth + 0.2]} />
        <meshStandardMaterial color="#CBD8E2" roughness={0.7} />
      </mesh>

      {/* rooftop sign box */}
      {!simple && (
        <mesh position={[0, height + 0.7, 0]} castShadow>
          <boxGeometry args={[width * 0.5, 0.7, 0.4]} />
          <meshStandardMaterial color={hex.secondary} emissive={hex.secondary} emissiveIntensity={0.4} roughness={0.4} />
        </mesh>
      )}
    </group>
  );
}
