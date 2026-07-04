'use client';

import { RoundedBox } from '@react-three/drei';
import { hex } from '@/lib/three/theme';
import { Windows } from './Windows';

interface Props {
  position: [number, number, number];
  width?: number;
  depth?: number;
  height?: number;
  awningColor?: string;
  bodyColor?: string;
  rotation?: number;
}

/** Small 1-2 floor shop with awning + sign. */
export function Shop({
  position, width = 4, depth = 4, height = 4,
  awningColor = hex.danger, bodyColor = '#FFE5C4', rotation = 0
}: Props) {
  return (
    <group position={position} rotation-y={rotation}>
      {/* base */}
      <RoundedBox args={[width, height, depth]} radius={0.15} smoothness={3} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </RoundedBox>
      {/* awning strip on +Z facade */}
      <mesh position={[0, height * 0.55, depth / 2 + 0.05]} castShadow>
        <boxGeometry args={[width * 0.85, 0.4, 0.5]} />
        <meshStandardMaterial color={awningColor} roughness={0.6} />
      </mesh>
      {/* shop window (dark glass) */}
      <mesh position={[0, height * 0.3, depth / 2 + 0.02]}>
        <boxGeometry args={[width * 0.7, height * 0.4, 0.05]} />
        <meshStandardMaterial color="#2a3a4f" roughness={0.2} metalness={0.5} />
      </mesh>
      {/* upper-floor lit windows on all four sides */}
      <Windows width={width} height={height} depth={depth} sill={Math.min(2.4, height * 0.5)} floorH={1.9} />
      {/* sign */}
      <mesh position={[0, height * 0.85, depth / 2 + 0.1]}>
        <boxGeometry args={[width * 0.6, 0.3, 0.05]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.2} />
      </mesh>
      {/* rooftop billboard on two posts */}
      <mesh position={[-width * 0.22, height + 0.2, 0]}>
        <boxGeometry args={[0.09, 0.6, 0.09]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[width * 0.22, height + 0.2, 0]}>
        <boxGeometry args={[0.09, 0.6, 0.09]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[0, height + 0.65, 0]} castShadow>
        <boxGeometry args={[width * 0.72, 0.85, 0.12]} />
        <meshStandardMaterial color={awningColor} emissive={awningColor} emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      {/* projecting blade sign on the +X side */}
      <mesh position={[width / 2 + 0.16, height * 0.68, depth * 0.18]} castShadow>
        <boxGeometry args={[0.08, 0.95, 0.5]} />
        <meshStandardMaterial color={hex.secondary} emissive={hex.secondary} emissiveIntensity={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}
