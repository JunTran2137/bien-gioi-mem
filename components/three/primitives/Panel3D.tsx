'use client';

import { ReactNode } from 'react';
import * as THREE from 'three';
import { palette } from '@/lib/three/theme';

interface Props {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: THREE.Color | string | number;
  opacity?: number;
  glass?: boolean;
  children?: ReactNode;
}

/** Glass-style 3D panel for backdrops behind floating text. */
export function Panel3D({
  width = 4,
  height = 2,
  depth = 0.08,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = '#ffffff',
  opacity = 0.85,
  glass = true,
  children
}: Props) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        {glass ? (
          <meshPhysicalMaterial
            color={color as any}
            transparent
            opacity={opacity}
            roughness={0.15}
            metalness={0.0}
            transmission={0.4}
            thickness={0.4}
            clearcoat={0.6}
          />
        ) : (
          <meshStandardMaterial color={color as any} transparent opacity={opacity} roughness={0.55} />
        )}
      </mesh>
      {/* thin border edge */}
      <mesh position={[0, 0, depth / 2 + 0.001]}>
        <ringGeometry args={[Math.min(width, height) / 2 - 0.04, Math.min(width, height) / 2 - 0.02, 32]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.0} />
      </mesh>
      {children}
    </group>
  );
}
