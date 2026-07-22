'use client';

import { RoundedBox } from '@react-three/drei';
import { Hotspot } from './Hotspot';
import { buildings, hex } from '@/lib/three/theme';
import { VnText as Text } from '../primitives/VnText';

const cfg = buildings.library;

/** Modern library — mint pastel tower with book-shelf rounded balconies and a glowing sign. */
export function Library() {
  return (
    <Hotspot position={cfg.position as any} label={cfg.label} sub={cfg.sub} route={cfg.route} hitbox={[10, 14, 10]}>
      {/* Plinth / lawn */}
      <RoundedBox args={[12, 0.6, 10]} radius={0.25} smoothness={2} position={[0, 0.3, 0]} receiveShadow>
        <meshStandardMaterial color="#A8D5A8" roughness={0.95} />
      </RoundedBox>

      {/* Lower wing */}
      <RoundedBox args={[10, 4, 7]} radius={0.5} smoothness={2} position={[0, 2.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={hex.pastelMint} roughness={0.5} metalness={0.05} />
      </RoundedBox>

      {/* Main tower */}
      <RoundedBox args={[7.2, 9, 6]} radius={0.5} smoothness={2} position={[0, 8.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={hex.pastelMint} roughness={0.55} />
      </RoundedBox>

      {/* Glass facade panel front */}
      <RoundedBox args={[5.2, 7.5, 0.4]} radius={0.3} smoothness={2} position={[0, 8.6, 3.0]} castShadow>
        <meshPhysicalMaterial
          color="#A8E5D0"
          roughness={0.15}
          metalness={0.2}
          clearcoat={0.9}
          clearcoatRoughness={0.05}
          opacity={0.82}
          transparent
        />
      </RoundedBox>

      {/* Window grid as small rounded boxes (front facade only — performance) */}
      {Array.from({ length: 5 }).map((_, row) => (
        Array.from({ length: 4 }).map((__, col) => (
          <RoundedBox
            key={`win-${row}-${col}`}
            args={[0.7, 0.7, 0.05]}
            radius={0.08}
            smoothness={3}
            position={[-1.5 + col * 1.0, 6 + row * 1.4, 3.22]}
          >
            <meshStandardMaterial
              color="#FFE5A0"
              emissive="#FFE5A0"
              emissiveIntensity={0.3 + Math.random() * 0.3}
              roughness={0.3}
            />
          </RoundedBox>
        ))
      ))}

      {/* Side accent stripes */}
      <RoundedBox args={[7.4, 0.4, 6.2]} radius={0.15} smoothness={2} position={[0, 12.5, 0]} castShadow>
        <meshStandardMaterial color={hex.primary} roughness={0.5} />
      </RoundedBox>

      {/* Rooftop crown */}
      <RoundedBox args={[5.5, 0.8, 4.5]} radius={0.2} smoothness={2} position={[0, 13.4, 0]} castShadow>
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[3, 0.6, 2.5]} radius={0.15} smoothness={2} position={[0, 14.1, 0]} castShadow>
        <meshStandardMaterial color={hex.primary} roughness={0.5} />
      </RoundedBox>

      {/* Sign */}
      <RoundedBox args={[5, 0.9, 0.15]} radius={0.15} smoothness={2} position={[0, 4.8, 3.55]}>
        <meshStandardMaterial color={hex.primary} emissive={hex.primary} emissiveIntensity={0.4} roughness={0.4} />
      </RoundedBox>
      <Text position={[0, 4.8, 3.66]} fontSize={0.4} color="#fff" anchorX="center" anchorY="middle" bold>
        📚 THƯ VIỆN
      </Text>

      {/* Door */}
      <RoundedBox args={[1.6, 2.4, 0.15]} radius={0.2} smoothness={2} position={[0, 1.8, 3.55]}>
        <meshStandardMaterial color="#5C3D2A" roughness={0.6} />
      </RoundedBox>

      {/* Steps */}
      <RoundedBox args={[3, 0.2, 1]} radius={0.05} smoothness={3} position={[0, 0.7, 4]}>
        <meshStandardMaterial color="#E8E0D0" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[3.4, 0.2, 1.2]} radius={0.05} smoothness={3} position={[0, 0.5, 4.5]}>
        <meshStandardMaterial color="#D8CFBE" roughness={0.9} />
      </RoundedBox>
    </Hotspot>
  );
}
