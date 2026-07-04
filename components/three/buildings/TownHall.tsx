'use client';

import { RoundedBox } from '@react-three/drei';
import { Hotspot } from './Hotspot';
import { buildings, hex } from '@/lib/three/theme';
import { VnText as Text } from '../primitives/VnText';

const cfg = buildings.townhall;

interface Props {
  onClick?: () => void;
}

/** Modern town hall — sky pastel domed civic building. */
export function TownHall({ onClick }: Props) {
  return (
    <Hotspot
      position={cfg.position as any}
      label={cfg.label}
      sub={cfg.sub}
      route={(cfg as any).route}
      onClick={onClick}
      hitbox={[14, 14, 12]}
    >
      {/* Plinth */}
      <RoundedBox args={[14, 0.6, 12]} radius={0.4} smoothness={2} position={[0, 0.3, 0]} receiveShadow>
        <meshStandardMaterial color="#A8D5A8" roughness={0.95} />
      </RoundedBox>

      {/* Main building */}
      <RoundedBox args={[12, 5, 9]} radius={0.5} smoothness={2} position={[0, 3.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={hex.pastelSky} roughness={0.5} />
      </RoundedBox>

      {/* Upper floor (slightly smaller) */}
      <RoundedBox args={[10, 4, 7.5]} radius={0.45} smoothness={2} position={[0, 7.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={hex.pastelSky} roughness={0.5} />
      </RoundedBox>

      {/* Drum */}
      <mesh castShadow position={[0, 10.4, 0]}>
        <cylinderGeometry args={[2.4, 2.6, 1.2, 20]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>

      {/* Dome — seated on the drum top (y=11) so there is no floating gap */}
      <mesh castShadow position={[0, 11, 0]}>
        <sphereGeometry args={[2.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hex.gold} metalness={0.6} roughness={0.25} />
      </mesh>

      {/* Spire */}
      <mesh castShadow position={[0, 13.6, 0]}>
        <coneGeometry args={[0.25, 1.2, 8]} />
        <meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 14.4, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color={hex.gold} emissive={hex.gold} emissiveIntensity={0.7} metalness={0.7} />
      </mesh>

      {/* Front portico — 6 rounded columns */}
      {Array.from({ length: 6 }).map((_, i) => (
        <RoundedBox
          key={`col-${i}`}
          args={[0.7, 4.5, 0.7]}
          radius={0.18}
          smoothness={3}
          position={[-4 + i * 1.6, 2.85, 4.7]}
          castShadow
        >
          <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
        </RoundedBox>
      ))}
      {/* Capitals */}
      {Array.from({ length: 6 }).map((_, i) => (
        <RoundedBox
          key={`cap-${i}`}
          args={[1, 0.3, 1]}
          radius={0.08}
          smoothness={3}
          position={[-4 + i * 1.6, 5.3, 4.7]}
        >
          <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
        </RoundedBox>
      ))}

      {/* Pediment ribbon */}
      <RoundedBox args={[11, 0.6, 0.4]} radius={0.15} smoothness={2} position={[0, 5.85, 4.85]}>
        <meshStandardMaterial color={hex.gold} roughness={0.3} metalness={0.4} />
      </RoundedBox>

      {/* Big arched windows on upper floor (front) */}
      {Array.from({ length: 5 }).map((_, i) => (
        <RoundedBox
          key={`uw-${i}`}
          args={[1.0, 2.2, 0.05]}
          radius={0.4}
          smoothness={2}
          position={[-3.6 + i * 1.8, 7.6, 3.81]}
        >
          <meshStandardMaterial color="#FFE5A0" emissive="#FFE5A0" emissiveIntensity={0.3} roughness={0.3} />
        </RoundedBox>
      ))}

      {/* Door — large arched */}
      <RoundedBox args={[2.4, 3.6, 0.15]} radius={0.5} smoothness={2} position={[0, 2.5, 4.55]}>
        <meshStandardMaterial color="#5C3D2A" roughness={0.6} />
      </RoundedBox>
      {/* door panels */}
      <RoundedBox args={[2.2, 3.4, 0.05]} radius={0.45} smoothness={2} position={[0, 2.5, 4.62]}>
        <meshStandardMaterial color={hex.gold} emissive={hex.gold} emissiveIntensity={0.15} metalness={0.5} roughness={0.3} />
      </RoundedBox>

      {/* Steps */}
      <RoundedBox args={[7, 0.2, 1.4]} radius={0.05} smoothness={3} position={[0, 0.7, 5.7]}>
        <meshStandardMaterial color="#E8E0D0" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[7.6, 0.2, 1.6]} radius={0.05} smoothness={3} position={[0, 0.5, 6.4]}>
        <meshStandardMaterial color="#D8CFBE" roughness={0.9} />
      </RoundedBox>

      {/* Sign */}
      <RoundedBox args={[5, 0.7, 0.15]} radius={0.15} smoothness={2} position={[0, 9.6, 3.91]}>
        <meshStandardMaterial color={hex.secondary} emissive={hex.secondary} emissiveIntensity={0.4} />
      </RoundedBox>
      <Text position={[0, 9.6, 4.02]} fontSize={0.32} color="#fff" anchorX="center" anchorY="middle" bold>
        🏛️ TÒA THỊ CHÍNH
      </Text>
    </Hotspot>
  );
}
