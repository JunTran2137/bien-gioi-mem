'use client';

import { RoundedBox } from '@react-three/drei';
import { hex } from '@/lib/three/theme';
import { Windows } from './Windows';

interface Props {
  position: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  bodyColor?: string;
  accentColor?: string;
  rotation?: number;
  /** Lower-detail render: drops the outdoor stools. */
  simple?: boolean;
}

/** Quán ăn — a cosy single-floor eatery with a striped awning + lantern sign. */
export function Restaurant({
  position, width = 4, depth = 4, height = 6,
  bodyColor = '#FFE0C2', accentColor = hex.danger, rotation = 0, simple = false
}: Props) {
  const h = height;
  const front = depth / 2;
  return (
    <group position={position} rotation-y={rotation}>
      {/* body */}
      <RoundedBox args={[width, h, depth]} radius={0.16} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </RoundedBox>
      {/* flat roof slab */}
      <mesh position={[0, h + 0.12, 0]} castShadow>
        <boxGeometry args={[width + 0.3, 0.24, depth + 0.3]} />
        <meshStandardMaterial color="#6E4A33" roughness={0.7} />
      </mesh>
      {/* striped awning over the entrance */}
      <mesh position={[0, h * 0.6, front + 0.18]} rotation-x={-0.32} castShadow>
        <boxGeometry args={[width * 0.86, 0.12, 0.7]} />
        <meshStandardMaterial color={accentColor} roughness={0.55} />
      </mesh>
      {/* warm window */}
      <mesh position={[0, h * 0.26, front + 0.02]}>
        <boxGeometry args={[width * 0.66, h * 0.3, 0.05]} />
        <meshStandardMaterial color="#FFE08A" emissive="#FFD060" emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
      {/* upper-floor lit windows on all four sides */}
      <Windows width={width} height={h} depth={depth} sill={Math.min(2.6, h * 0.5)} floorH={1.9} />
      {/* door */}
      <mesh position={[0, h * 0.22, front + 0.04]}>
        <boxGeometry args={[width * 0.22, h * 0.44, 0.05]} />
        <meshStandardMaterial color="#5C3A26" roughness={0.6} />
      </mesh>
      {/* hanging lantern sign */}
      <mesh position={[width * 0.36, h * 0.78, front + 0.22]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.42, 8]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.4} roughness={0.5} />
      </mesh>
      {/* sign board */}
      <mesh position={[0, h * 0.9, front + 0.12]}>
        <boxGeometry args={[width * 0.5, 0.3, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.18} />
      </mesh>
      {/* outdoor stools — decorative, dropped on low tiers */}
      {!simple && (
        <>
          <mesh position={[-width * 0.34, 0.32, front + 0.7]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 12]} />
            <meshStandardMaterial color={accentColor} />
          </mesh>
          <mesh position={[-width * 0.34, 0.16, front + 0.7]}>
            <cylinderGeometry args={[0.04, 0.04, 0.32, 6]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          <mesh position={[width * 0.05, 0.32, front + 0.85]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 12]} />
            <meshStandardMaterial color={accentColor} />
          </mesh>
          <mesh position={[width * 0.05, 0.16, front + 0.85]}>
            <cylinderGeometry args={[0.04, 0.04, 0.32, 6]} />
            <meshStandardMaterial color="#444" />
          </mesh>
        </>
      )}
    </group>
  );
}
