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
}

/** Rạp chiếu phim — a wide low cinema with a glowing marquee + vertical blade sign. */
export function Cinema({ position, width = 6, depth = 5, height = 6.5, rotation = 0 }: Props) {
  const h = height;
  const front = depth / 2;
  return (
    <group position={position} rotation-y={rotation}>
      {/* dark body */}
      <RoundedBox args={[width, h, depth]} radius={0.14} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3A2A40" roughness={0.7} />
      </RoundedBox>
      {/* marquee canopy over the entrance */}
      <mesh position={[0, h * 0.5, front + 0.4]} castShadow>
        <boxGeometry args={[width * 0.96, 0.5, 0.9]} />
        <meshStandardMaterial color={hex.danger} roughness={0.55} />
      </mesh>
      {/* glowing marquee strip (the lit panel) */}
      <mesh position={[0, h * 0.5, front + 0.86]}>
        <boxGeometry args={[width * 0.9, 0.34, 0.05]} />
        <meshStandardMaterial color={hex.gold} emissive={hex.gold} emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
      {/* big title band above the canopy */}
      <mesh position={[0, h * 0.82, front + 0.05]}>
        <boxGeometry args={[width * 0.8, h * 0.3, 0.06]} />
        <meshStandardMaterial color={hex.accent} emissive={hex.accent} emissiveIntensity={0.45} roughness={0.4} />
      </mesh>
      {/* glass doors */}
      <mesh position={[0, h * 0.24, front + 0.02]}>
        <boxGeometry args={[width * 0.5, h * 0.42, 0.05]} />
        <meshStandardMaterial color="#1F2A38" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* lit windows wrapping the upper floors on all sides */}
      <Windows width={width} height={h} depth={depth} sill={Math.min(3.0, h * 0.55)} floorH={1.9} />
      {/* vertical blade sign on the corner */}
      <mesh position={[-width / 2 - 0.05, h * 0.78, front - 0.4]} castShadow>
        <boxGeometry args={[0.12, h * 1.05, 0.7]} />
        <meshStandardMaterial color={hex.secondary} emissive={hex.secondary} emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
      {/* rooftop step */}
      <mesh position={[0, h + 0.18, 0]} castShadow>
        <boxGeometry args={[width * 0.7, 0.36, depth * 0.7]} />
        <meshStandardMaterial color="#2C2030" roughness={0.8} />
      </mesh>
    </group>
  );
}
