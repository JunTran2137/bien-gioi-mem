'use client';

import { RoundedBox } from '@react-three/drei';
import { Hotspot } from './Hotspot';
import { buildings, hex } from '@/lib/three/theme';
import { VnText as Text } from '../primitives/VnText';
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const cfg = buildings.tower;

/** Tiered crystal trophy tower — gold + lavender pastel rings tapering to a glowing crystal. */
export function Tower() {
  const crystalRef = useRef<THREE.Mesh>(null);

  // Mark crystal as animated so Hotspot's static-freeze skips it.
  useLayoutEffect(() => {
    if (crystalRef.current) crystalRef.current.userData.animated = true;
  }, []);

  useFrame(({ clock }) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y = clock.elapsedTime * 0.3;
      crystalRef.current.position.y = 14.5 + Math.sin(clock.elapsedTime * 1.2) * 0.15;
    }
  });

  return (
    <Hotspot position={cfg.position as any} label={cfg.label} sub={cfg.sub} route={cfg.route} hitbox={[10, 16, 10]}>
      {/* Plinth */}
      <RoundedBox args={[10, 0.6, 10]} radius={0.3} smoothness={2} position={[0, 0.3, 0]} receiveShadow>
        <meshStandardMaterial color="#A8D5A8" roughness={0.95} />
      </RoundedBox>

      {/* Tier 1 — base */}
      <RoundedBox args={[7.5, 2.5, 7.5]} radius={0.4} smoothness={2} position={[0, 1.85, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={hex.pastelLavender} roughness={0.5} metalness={0.1} />
      </RoundedBox>

      {/* Tier 2 */}
      <RoundedBox args={[6.5, 2.5, 6.5]} radius={0.35} smoothness={2} position={[0, 4.3, 0]} castShadow>
        <meshStandardMaterial color="#D4C0E8" roughness={0.5} metalness={0.1} />
      </RoundedBox>

      {/* Tier 3 */}
      <RoundedBox args={[5.5, 2.5, 5.5]} radius={0.3} smoothness={2} position={[0, 6.8, 0]} castShadow>
        <meshStandardMaterial color={hex.pastelLavender} roughness={0.5} />
      </RoundedBox>

      {/* Tier 4 */}
      <RoundedBox args={[4.2, 2.2, 4.2]} radius={0.25} smoothness={2} position={[0, 9.2, 0]} castShadow>
        <meshStandardMaterial color={hex.gold} roughness={0.4} metalness={0.5} />
      </RoundedBox>

      {/* Tier 5 — top platform */}
      <RoundedBox args={[3, 1.5, 3]} radius={0.2} smoothness={2} position={[0, 11.4, 0]} castShadow>
        <meshStandardMaterial color={hex.gold} roughness={0.3} metalness={0.6} />
      </RoundedBox>

      {/* Crown rim */}
      <mesh castShadow position={[0, 12.3, 0]}>
        <torusGeometry args={[1.4, 0.15, 10, 20]} />
        <meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Pillar holding crystal */}
      <mesh castShadow position={[0, 13.2, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 1.2, 12]} />
        <meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Floating crystal */}
      <mesh ref={crystalRef} castShadow>
        <octahedronGeometry args={[0.9, 0]} />
        <meshPhysicalMaterial
          color="#FFD93D"
          emissive="#FFD93D"
          emissiveIntensity={0.85}
          metalness={0.4}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.04}
          opacity={0.88}
          transparent
        />
      </mesh>

      {/* Light rays from crystal */}
      <pointLight position={[0, 14.5, 0]} color={hex.gold} intensity={1.2} distance={20} decay={2} />

      {/* Sign — raised higher onto tier 2 so it reads more prominently. */}
      <RoundedBox args={[5, 0.9, 0.15]} radius={0.15} smoothness={2} position={[0, 3.5, 3.35]}>
        <meshStandardMaterial color={hex.gold} emissive={hex.gold} emissiveIntensity={0.4} />
      </RoundedBox>
      <Text position={[0, 3.5, 3.46]} fontSize={0.4} color="#fff" anchorX="center" anchorY="middle" bold>
        🏆 ĐÀI VINH DANH
      </Text>

      {/* Decorative trophies on tier 1 corners */}
      {[[3.4, 0, 3.4], [-3.4, 0, 3.4], [3.4, 0, -3.4], [-3.4, 0, -3.4]].map(([x, , z], i) => (
        <group key={i} position={[x, 3.3, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.25, 0.5, 12]} />
            <meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </Hotspot>
  );
}
