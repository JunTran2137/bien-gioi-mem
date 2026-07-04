'use client';

import { RoundedBox } from '@react-three/drei';
import { hex } from '@/lib/three/theme';
import { Windows } from './Windows';

interface Props {
  position: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  rotation?: number;
  /** Lower-detail render: drops the outdoor table + umbrella cluster. */
  simple?: boolean;
}

/** Small café — single floor with outdoor table + umbrella. */
export function Cafe({
  position, width = 4, depth = 4, height = 6, rotation = 0, simple = false
}: Props) {
  const h = height;
  return (
    <group position={position} rotation-y={rotation}>
      <RoundedBox args={[width, h, depth]} radius={0.18} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#F4D5A0" roughness={0.65} />
      </RoundedBox>
      {/* big window */}
      <mesh position={[0, h * 0.32, depth / 2 + 0.02]}>
        <boxGeometry args={[width * 0.7, h * 0.34, 0.05]} />
        <meshStandardMaterial color="#3a4f5f" roughness={0.2} metalness={0.5} />
      </mesh>
      {/* upper-floor lit windows on all four sides */}
      <Windows width={width} height={h} depth={depth} sill={Math.min(2.6, h * 0.5)} floorH={1.9} />
      {/* outdoor table + umbrella — decorative, skipped on low-detail tiers */}
      {!simple && (
        <>
          <mesh position={[width * 0.45, 0.4, depth * 0.55]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.05, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[width * 0.45, 0.2, depth * 0.55]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          <mesh position={[width * 0.45, 1.4, depth * 0.55]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
            <meshStandardMaterial color="#8B4A2F" />
          </mesh>
          <mesh position={[width * 0.45, 2.0, depth * 0.55]} castShadow>
            <coneGeometry args={[0.9, 0.5, 8]} />
            <meshStandardMaterial color={hex.danger} roughness={0.6} />
          </mesh>
        </>
      )}
      {/* sign */}
      <mesh position={[0, h * 0.92, depth / 2 + 0.1]}>
        <boxGeometry args={[width * 0.5, 0.25, 0.05]} />
        <meshStandardMaterial color="#5C3D2A" roughness={0.5} />
      </mesh>
      {/* rooftop sign board */}
      <mesh position={[0, h + 0.7, 0]} castShadow>
        <boxGeometry args={[width * 0.6, 0.7, 0.12]} />
        <meshStandardMaterial color={hex.primary} emissive={hex.primary} emissiveIntensity={0.3} roughness={0.5} />
      </mesh>
      {/* projecting blade sign on the +X side */}
      <mesh position={[width / 2 + 0.15, h * 0.68, depth * 0.22]} castShadow>
        <boxGeometry args={[0.07, 0.75, 0.45]} />
        <meshStandardMaterial color={hex.accent} emissive={hex.accent} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}
