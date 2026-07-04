'use client';

import { RoundedBox } from '@react-three/drei';
import { Hotspot } from './Hotspot';
import { buildings, hex } from '@/lib/three/theme';
import { VnText as Text } from '../primitives/VnText';

const cfg = buildings.arena;

/** Modern stadium/arena — coral pastel cylinder with rounded LED screens and roof. */
export function Arena() {
  return (
    <Hotspot position={cfg.position as any} label={cfg.label} sub={cfg.sub} route={cfg.route} hitbox={[14, 12, 14]}>
      {/* Ground plinth */}
      <RoundedBox args={[14, 0.6, 14]} radius={0.4} smoothness={2} position={[0, 0.3, 0]} receiveShadow>
        <meshStandardMaterial color="#A8D5A8" roughness={0.95} />
      </RoundedBox>

      {/* Outer ring base — cylinder */}
      <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[6.5, 7, 3, 20]} />
        <meshStandardMaterial color={hex.pastelCoral} roughness={0.55} />
      </mesh>

      {/* Mid ring */}
      <mesh castShadow receiveShadow position={[0, 4, 0]}>
        <cylinderGeometry args={[5.8, 6.5, 3, 20]} />
        <meshStandardMaterial color="#FFC8B5" roughness={0.5} />
      </mesh>

      {/* Top tier */}
      <mesh castShadow receiveShadow position={[0, 6.4, 0]}>
        <cylinderGeometry args={[5.2, 5.8, 1.8, 20]} />
        <meshStandardMaterial color={hex.pastelCoral} roughness={0.5} />
      </mesh>

      {/* Stadium roof — flat dish */}
      <mesh castShadow position={[0, 7.5, 0]}>
        <cylinderGeometry args={[6.2, 5.8, 0.4, 20]} />
        <meshStandardMaterial color={hex.primary} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* LED ring on mid section — accent stripe */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[6.51, 6.51, 0.6, 20, 1, true]} />
        <meshStandardMaterial color={hex.gold} emissive={hex.gold} emissiveIntensity={0.5} side={2} />
      </mesh>

      {/* 4 large LED screens on the outer ring (rounded panels) */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, i) => {
        const x = Math.cos(angle) * 6.7;
        const z = Math.sin(angle) * 6.7;
        return (
          <RoundedBox
            key={i}
            args={[3.5, 1.6, 0.15]}
            radius={0.12}
            smoothness={2}
            position={[x, 5.2, z]}
            rotation-y={angle + Math.PI / 2}
          >
            <meshStandardMaterial color={hex.secondary} emissive={hex.secondary} emissiveIntensity={0.6} roughness={0.3} />
          </RoundedBox>
        );
      })}

      {/* Top spire / flag */}
      <mesh castShadow position={[0, 8.3, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 1.6, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[0.6, 8.7, 0]} castShadow>
        <planeGeometry args={[1.2, 0.7]} />
        <meshStandardMaterial color={hex.danger} roughness={0.6} side={2} />
      </mesh>

      {/* Ticket gates (4 around the base) */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((angle, i) => {
        const x = Math.cos(angle) * 7.0;
        const z = Math.sin(angle) * 7.0;
        return (
          <RoundedBox
            key={`gate-${i}`}
            args={[2, 2.4, 0.4]}
            radius={0.2}
            smoothness={2}
            position={[x, 1.3, z]}
            rotation-y={angle + Math.PI / 2}
            castShadow
          >
            <meshStandardMaterial color="#3A3F4A" roughness={0.6} />
          </RoundedBox>
        );
      })}

      {/* Sign banner above front gate */}
      <RoundedBox args={[5, 0.9, 0.15]} radius={0.15} smoothness={2} position={[0, 9.0, 0]}>
        <meshStandardMaterial color={hex.danger} emissive={hex.danger} emissiveIntensity={0.5} roughness={0.4} />
      </RoundedBox>
      <Text position={[0, 9.0, 0.1]} fontSize={0.45} color="#fff" anchorX="center" anchorY="middle" bold>
        ⚔️ ĐẤU TRƯỜNG
      </Text>
    </Hotspot>
  );
}
