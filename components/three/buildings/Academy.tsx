'use client';

import { RoundedBox } from '@react-three/drei';
import { Hotspot } from './Hotspot';
import { buildings, hex } from '@/lib/three/theme';
import { VnText as Text } from '../primitives/VnText';

const cfg = buildings.academy;

/** Cute modern academy — peach pastel school with clock tower and rounded windows. */
export function Academy() {
  return (
    <Hotspot position={cfg.position as any} label={cfg.label} sub={cfg.sub} route={cfg.route} hitbox={[12, 12, 10]}>
      {/* Plinth */}
      <RoundedBox args={[13, 0.6, 11]} radius={0.3} smoothness={2} position={[0, 0.3, 0]} receiveShadow>
        <meshStandardMaterial color="#A8D5A8" roughness={0.95} />
      </RoundedBox>

      {/* Main school building (left wing) */}
      <RoundedBox args={[6, 5.5, 7]} radius={0.4} smoothness={2} position={[-3, 3.35, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={hex.pastelPeach} roughness={0.55} />
      </RoundedBox>

      {/* Right wing */}
      <RoundedBox args={[5, 5, 6]} radius={0.4} smoothness={2} position={[3.5, 3.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#FFE0CC" roughness={0.55} />
      </RoundedBox>

      {/* Clock tower */}
      <RoundedBox args={[2.8, 8, 2.8]} radius={0.3} smoothness={2} position={[-3, 7, 2]} castShadow receiveShadow>
        <meshStandardMaterial color={hex.pastelPeach} roughness={0.55} />
      </RoundedBox>
      {/* Clock face */}
      <mesh position={[-3, 9.5, 3.41]}>
        <circleGeometry args={[0.9, 24]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-3, 9.5, 3.42]}>
        <ringGeometry args={[0.85, 0.95, 24]} />
        <meshStandardMaterial color={hex.text} />
      </mesh>
      {/* clock hands */}
      <mesh position={[-3, 9.5, 3.43]} rotation-z={Math.PI / 4}>
        <planeGeometry args={[0.05, 0.6]} />
        <meshStandardMaterial color={hex.text} />
      </mesh>
      <mesh position={[-3, 9.5, 3.43]} rotation-z={-Math.PI / 6}>
        <planeGeometry args={[0.04, 0.45]} />
        <meshStandardMaterial color={hex.text} />
      </mesh>
      {/* Tower roof — cone */}
      <mesh castShadow position={[-3, 11.6, 2]}>
        <coneGeometry args={[1.8, 1.6, 6]} />
        <meshStandardMaterial color={hex.danger} roughness={0.55} />
      </mesh>

      {/* Sloped roof on main wing — rounded prism */}
      <RoundedBox args={[6.2, 0.6, 7.2]} radius={0.15} smoothness={2} position={[-3, 6.2, 0]} castShadow>
        <meshStandardMaterial color={hex.danger} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[5.2, 0.5, 6.2]} radius={0.15} smoothness={2} position={[3.5, 5.65, 0]} castShadow>
        <meshStandardMaterial color={hex.danger} roughness={0.55} />
      </RoundedBox>

      {/* Round windows on main wing */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={`rw-${i}`} position={[-5 + i * 1.5, 4.2, 3.51]}>
          <circleGeometry args={[0.55, 24]} />
          <meshStandardMaterial color="#A8D8F0" emissive="#A8D8F0" emissiveIntensity={0.3} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={`rw-l-${i}`} position={[-5 + i * 1.5, 4.2, 3.52]}>
          <ringGeometry args={[0.5, 0.6, 24]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      ))}

      {/* Square windows on right wing */}
      {Array.from({ length: 2 }).map((_, row) => (
        Array.from({ length: 2 }).map((__, col) => (
          <RoundedBox
            key={`sw-${row}-${col}`}
            args={[0.9, 0.9, 0.05]}
            radius={0.1}
            smoothness={3}
            position={[2 + col * 1.5, 2 + row * 1.5, 3.01]}
          >
            <meshStandardMaterial color="#A8D8F0" emissive="#A8D8F0" emissiveIntensity={0.3} roughness={0.3} />
          </RoundedBox>
        ))
      ))}

      {/* Door */}
      <RoundedBox args={[1.6, 2.4, 0.15]} radius={0.2} smoothness={2} position={[-3, 1.8, 3.55]}>
        <meshStandardMaterial color="#5C3D2A" roughness={0.6} />
      </RoundedBox>

      {/* Sign */}
      <RoundedBox args={[4, 0.8, 0.15]} radius={0.15} smoothness={2} position={[3.5, 4, 3.05]}>
        <meshStandardMaterial color={hex.accent} emissive={hex.accent} emissiveIntensity={0.4} roughness={0.4} />
      </RoundedBox>
      <Text position={[3.5, 4, 3.16]} fontSize={0.32} color="#fff" anchorX="center" anchorY="middle" bold>
        🎓 HỌC VIỆN
      </Text>
    </Hotspot>
  );
}
