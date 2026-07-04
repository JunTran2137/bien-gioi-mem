'use client';

import { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  width: number;
  height: number;
  depth: number;
  /** Y of the lowest window row, measured from the building base. */
  sill?: number;
  /** Vertical spacing between window rows. */
  floorH?: number;
  /** Keep windows this far below the roof. */
  topGap?: number;
  /** Emissive tint (the glow colour at night). */
  color?: string;
  /** Window pane size. */
  paneW?: number;
  paneH?: number;
}

/**
 * Emissive window grid wrapping ALL FOUR facades of a box building, rendered
 * as a SINGLE instanced draw call. The panes are emissive (toneMapped off) so
 * they read as lit windows once the DayNightCycle dims the scene at night.
 *
 * Place this inside a group whose origin sits at the building's ground centre.
 */
export function Windows({
  width, height, depth,
  sill = 1.7, floorH = 2.0, topGap = 0.9,
  color = '#9FB8D8', paneW = 0.5, paneH = 0.62,
}: Props) {
  const items = useMemo(() => {
    const arr: { x: number; y: number; z: number; rotY: number; color: THREE.Color }[] = [];
    const base = new THREE.Color(color);
    const warm = new THREE.Color('#FFE6AE');
    const maxY = height - topGap;
    const rows = Math.max(1, Math.floor((maxY - sill) / floorH) + 1);
    for (let face = 0; face < 4; face++) {
      const isLR = face === 1 || face === 3;
      const fw = isLR ? depth : width;
      // Even, tidy grid — one pane per ~2.6 units (fewer instances = cheaper),
      // padded off the corners.
      const cols = Math.max(1, Math.round((fw - 1.0) / 2.6));
      const span = fw - 1.4;
      const cw = span / cols;
      for (let r = 0; r < rows; r++) {
        const y = sill + r * floorH;
        if (y > maxY) continue;
        for (let c = 0; c < cols; c++) {
          const u = -span / 2 + cw * (c + 0.5);
          // A few windows glow warm (lights on); the rest are cool glass.
          const on = Math.random() > 0.78;
          const col = on ? warm.clone() : base.clone().multiplyScalar(0.8 + Math.random() * 0.2);
          let x = 0, z = 0, rotY = 0;
          if (face === 0) { x = u; z = depth / 2 + 0.02; rotY = 0; }
          else if (face === 1) { x = width / 2 + 0.02; z = -u; rotY = Math.PI / 2; }
          else if (face === 2) { x = -u; z = -depth / 2 - 0.02; rotY = Math.PI; }
          else { x = -width / 2 - 0.02; z = u; rotY = -Math.PI / 2; }
          arr.push({ x, y, z, rotY, color: col });
        }
      }
    }
    return arr;
  }, [width, height, depth, sill, floorH, topGap, color]);

  if (items.length === 0) return null;

  return (
    <Instances limit={items.length} range={items.length}>
      <planeGeometry args={[paneW, paneH]} />
      <meshStandardMaterial
        emissive="#FFE6AE"
        emissiveIntensity={0.22}
        roughness={0.25}
        metalness={0.3}
        toneMapped={false}
      />
      {items.map((w, i) => (
        <Instance key={i} position={[w.x, w.y, w.z]} rotation={[0, w.rotY, 0]} color={w.color} />
      ))}
    </Instances>
  );
}
