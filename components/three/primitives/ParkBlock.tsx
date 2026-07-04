'use client';

import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { hex } from '@/lib/three/theme';

interface Props {
  position: [number, number, number];
  width?: number;
  depth?: number;
  rotation?: number;
}

/** Park block: grass plot with central fountain + benches + trees. */
export function ParkBlock({
  position, width = 11, depth = 11, rotation = 0
}: Props) {
  const trees = useMemo(() => {
    const arr: { x: number; z: number; s: number; type: number }[] = [];
    const seed = Math.floor((position[0] + 100) * 7 + (position[2] + 100) * 13);
    let s = seed;
    const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < 6; i++) {
      arr.push({
        x: (rng() - 0.5) * (width - 2),
        z: (rng() - 0.5) * (depth - 2),
        s: 0.5 + rng() * 0.5,
        type: Math.floor(rng() * 2)
      });
    }
    return arr;
  }, [position, width, depth]);

  return (
    <group position={position} rotation-y={rotation}>
      {/* grass base */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#7CB867" roughness={0.95} />
      </mesh>
      {/* path cross */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.025}>
        <planeGeometry args={[width * 0.95, 1.2]} />
        <meshStandardMaterial color={hex.sidewalk} roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.026}>
        <planeGeometry args={[1.2, depth * 0.95]} />
        <meshStandardMaterial color={hex.sidewalk} roughness={0.9} />
      </mesh>
      {/* fountain center */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.4, 0.3, 24]} />
        <meshStandardMaterial color="#A0B5C8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.05, 24]} />
        <meshStandardMaterial color="#5BA0D9" transparent opacity={0.7} roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.8, 8]} />
        <meshStandardMaterial color="#C0C7CC" />
      </mesh>
      {/* bench */}
      <mesh position={[width * 0.3, 0.25, depth * 0.3]} castShadow>
        <boxGeometry args={[1.4, 0.1, 0.3]} />
        <meshStandardMaterial color="#5C3D2A" />
      </mesh>
      <mesh position={[-width * 0.3, 0.25, -depth * 0.3]} castShadow>
        <boxGeometry args={[1.4, 0.1, 0.3]} />
        <meshStandardMaterial color="#5C3D2A" />
      </mesh>
      {/* trees */}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh castShadow position-y={0.5}>
            <cylinderGeometry args={[0.15, 0.18, 1, 6]} />
            <meshStandardMaterial color="#6B4F2C" />
          </mesh>
          {t.type === 0 ? (
            <mesh castShadow position-y={1.4}>
              <sphereGeometry args={[0.85, 10, 8]} />
              <meshStandardMaterial color="#5BA070" roughness={0.85} />
            </mesh>
          ) : (
            <mesh castShadow position-y={1.7}>
              <coneGeometry args={[0.8, 1.6, 8]} />
              <meshStandardMaterial color="#4A8B5C" roughness={0.85} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
