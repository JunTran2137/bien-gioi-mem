'use client';

import { useMemo } from 'react';
import { VnText as Text } from '../primitives/VnText';
import { hex } from '@/lib/three/theme';
import { Person } from './parts/Person';

const POS: [number, number, number] = [34, 0, -34];

/** Debate arena — visual shell only. The full debate UI is rendered as a 2D page. */
export function DebateScene() {
  const audience = useMemo(() => {
    const arr: { x: number; z: number; y: number; rot: number; seed: number }[] = [];
    const tiers = [
      { r: 11, count: 22, y: 0.5 },
      { r: 13, count: 28, y: 1.4 }
    ];
    let s = 0;
    for (const t of tiers) {
      for (let i = 0; i < t.count; i++) {
        const a = (i / t.count) * Math.PI * 2;
        arr.push({ x: Math.cos(a) * t.r, z: Math.sin(a) * t.r, y: t.y, rot: -a + Math.PI / 2 + Math.PI, seed: ++s * 0.137 });
      }
    }
    return arr;
  }, []);

  return (
    <group position={POS}>
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[16, 16, 16, 32, 1, true]} />
        <meshStandardMaterial color="#3A4F6B" side={2} roughness={0.9} />
      </mesh>
      <mesh position={[0, 16, 0]}>
        <sphereGeometry args={[16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2A3A50" side={2} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[10, 48]} />
        <meshStandardMaterial color="#D4A86A" roughness={0.85} />
      </mesh>
      {audience.map((a, i) => (
        <Person key={`aud-${i}`} position={[a.x, a.y, a.z]} rotationY={a.rot} pose="sit" seed={a.seed} scale={0.85} />
      ))}
      <pointLight position={[0, 6, 4]} color="#E8F4FF" intensity={1.2} distance={18} />
      <Text position={[0, 5, -0.5]} fontSize={0.35} color={hex.primary} anchorX="center" anchorY="middle" bold>
        NGHỊ TRƯỜNG
      </Text>
      <Text position={[0, 4.4, -0.5]} fontSize={0.17} color={hex.muted} anchorX="center" anchorY="middle">
        /game/debate
      </Text>
    </group>
  );
}
