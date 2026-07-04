'use client';

import { RoundedBox } from '@react-three/drei';
import { Windows } from './Windows';

interface Props {
  position: [number, number, number];
  width?: number;
  depth?: number;
  rotation?: number;
}

/** Hospital — white block with red cross sign. */
export function Hospital({
  position, width = 6, depth = 5, rotation = 0
}: Props) {
  const h = 7;
  return (
    <group position={position} rotation-y={rotation}>
      <RoundedBox args={[width, h, depth]} radius={0.2} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
      </RoundedBox>
      {/* Lit window grid wrapping all four facades — single instanced draw call. */}
      <Windows width={width} height={h} depth={depth} sill={1.2} floorH={1.6} color="#CFE8FF" paneW={0.8} paneH={0.7} />
      {/* Red cross on roof */}
      <group position={[0, h + 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.4, 0.3, 0.4]} />
          <meshStandardMaterial color="#E53C3C" emissive="#E53C3C" emissiveIntensity={0.4} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.3, 1.4]} />
          <meshStandardMaterial color="#E53C3C" emissive="#E53C3C" emissiveIntensity={0.4} />
        </mesh>
      </group>
      {/* Cross sign on facade */}
      <group position={[0, h * 0.85, depth / 2 + 0.1]}>
        <mesh>
          <boxGeometry args={[0.7, 0.18, 0.05]} />
          <meshStandardMaterial color="#E53C3C" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.18, 0.7, 0.05]} />
          <meshStandardMaterial color="#E53C3C" />
        </mesh>
      </group>
    </group>
  );
}
