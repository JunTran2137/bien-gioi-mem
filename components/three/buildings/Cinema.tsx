'use client';

import { RoundedBox } from '@react-three/drei';
import { Hotspot } from './Hotspot';
import { buildings, hex } from '@/lib/three/theme';
import { VnText as Text } from '../primitives/VnText';

const cfg = buildings.cinema;

/** Art-Deco cinema — deep crimson facade, gold marquee, illuminated sign, tiered canopy. */
export function Cinema() {
  return (
    <Hotspot
      position={cfg.position as any}
      label={cfg.label}
      sub={cfg.sub}
      route={cfg.route}
      hitbox={[14, 14, 12]}
    >
      {/* ── Plinth ──────────────────────────────────────── */}
      <RoundedBox args={[14, 0.6, 12]} radius={0.3} smoothness={2} position={[0, 0.3, 0]} receiveShadow>
        <meshStandardMaterial color="#A8D5A8" roughness={0.95} />
      </RoundedBox>

      {/* ── Main body ───────────────────────────────────── */}
      <RoundedBox args={[12, 6, 9]} radius={0.4} smoothness={3} position={[0, 3.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#7A1A2A" roughness={0.55} />
      </RoundedBox>

      {/* Upper marquee box */}
      <RoundedBox args={[12.4, 2.4, 8.6]} radius={0.3} smoothness={3} position={[0, 7.8, 0.2]} castShadow receiveShadow>
        <meshStandardMaterial color="#4A0E18" roughness={0.45} />
      </RoundedBox>

      {/* Marquee sign board (gold) */}
      <RoundedBox args={[11, 1.5, 0.15]} radius={0.12} smoothness={3} position={[0, 8.2, 4.45]} castShadow>
        <meshStandardMaterial color="#C8900A" metalness={0.6} roughness={0.25} emissive="#C8900A" emissiveIntensity={0.35} />
      </RoundedBox>

      {/* Cinema name text */}
      <Text position={[0, 8.22, 4.6]} fontSize={0.52} color="#FFF5CC" anchorX="center" anchorY="middle" bold>
        🎬 RẠP CHIẾU PHIM
      </Text>

      {/* ── Marquee light bulbs along the top ──────────── */}
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={`bulb-top-${i}`} position={[-5 + i * 1.0, 9.15, 4.5]}>
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={1.2}
            roughness={0.1}
            metalness={0.3}
          />
        </mesh>
      ))}
      {/* Side bulbs along marquee bottom edge */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={`bulb-bot-${i}`} position={[-4 + i * 1.0, 7.55, 4.5]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#FFA500" emissive="#FFA500" emissiveIntensity={0.9} roughness={0.15} />
        </mesh>
      ))}

      {/* ── Canopy awning ───────────────────────────────── */}
      <RoundedBox args={[13, 0.3, 3.5]} radius={0.1} smoothness={2} position={[0, 4.6, 5.25]} castShadow>
        <meshStandardMaterial color="#8B0000" roughness={0.6} />
      </RoundedBox>
      {/* Gold canopy trim edge */}
      <mesh position={[0, 4.44, 6.98]}>
        <boxGeometry args={[13, 0.12, 0.06]} />
        <meshStandardMaterial color="#C8900A" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* ── Five entrance columns ────────────────────────
           x = [-4, -2, 0, 2, 4] creates 4 equal bays of width 2.
           Doors sit at each bay midpoint: [-3, -1, 1, 3].         */}
      {[-4.0, -2.0, 0, 2.0, 4.0].map((x, i) => (
        <RoundedBox
          key={`col-${i}`}
          args={[0.55, 4.5, 0.55]}
          radius={0.15}
          smoothness={3}
          position={[x, 2.55, 4.6]}
          castShadow
        >
          <meshStandardMaterial color="#E8D090" roughness={0.45} metalness={0.1} />
        </RoundedBox>
      ))}
      {/* Column capitals */}
      {[-4.0, -2.0, 0, 2.0, 4.0].map((x, i) => (
        <mesh key={`cap-${i}`} position={[x, 4.95, 4.6]}>
          <boxGeometry args={[0.8, 0.22, 0.8]} />
          <meshStandardMaterial color="#C8900A" metalness={0.55} roughness={0.3} />
        </mesh>
      ))}

      {/* ── Entrance doors — 4 panels, one per bay ──────── */}
      {[-3.0, -1.0, 1.0, 3.0].map((x, i) => (
        <group key={`door-${i}`} position={[x, 1.4, 4.6]}>
          <mesh>
            <boxGeometry args={[1.1, 2.7, 0.08]} />
            <meshStandardMaterial color="#A8D8F0" transparent opacity={0.45} roughness={0.15} metalness={0.3} />
          </mesh>
          {/* door frame */}
          <mesh>
            <boxGeometry args={[1.2, 2.8, 0.05]} />
            <meshStandardMaterial color="#7A5820" roughness={0.65} />
          </mesh>
          {/* door handle */}
          <mesh position={[0.38, 0, 0.05]}>
            <cylinderGeometry args={[0.04, 0.04, 0.38, 8]} />
            <meshStandardMaterial color="#C8900A" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* ── Side poster frames ──────────────────────────── */}
      {/* Left poster */}
      <group position={[-5.9, 3.5, 3.2]}>
        <mesh rotation-y={Math.PI / 2}>
          <planeGeometry args={[3.5, 5]} />
          <meshStandardMaterial color="#1F3D2B" />
        </mesh>
        <Text position={[-0.06, 0.8, 0]} fontSize={0.28} color="#A5E5C8" anchorX="center" anchorY="middle" rotation-y={Math.PI / 2}>
          🌱
        </Text>
        <Text position={[-0.06, 0.2, 0]} fontSize={0.2} color="#E5E5E5" anchorX="center" anchorY="middle" rotation-y={Math.PI / 2}>
          35 Năm Đổi Mới
        </Text>
      </group>

      {/* Right poster */}
      <group position={[5.9, 3.5, 3.2]}>
        <mesh rotation-y={-Math.PI / 2}>
          <planeGeometry args={[3.5, 5]} />
          <meshStandardMaterial color="#1A2E4A" />
        </mesh>
        <Text position={[0.06, 0.8, 0]} fontSize={0.28} color="#A5D8FF" anchorX="center" anchorY="middle" rotation-y={-Math.PI / 2}>
          🤝
        </Text>
        <Text position={[0.06, 0.2, 0]} fontSize={0.2} color="#E5E5E5" anchorX="center" anchorY="middle" rotation-y={-Math.PI / 2}>
          EVFTA
        </Text>
      </group>

      {/* ── Roof parapet ────────────────────────────────── */}
      <RoundedBox args={[12.6, 0.5, 9.2]} radius={0.15} smoothness={2} position={[0, 9.25, 0]} castShadow>
        <meshStandardMaterial color="#3A0810" roughness={0.6} />
      </RoundedBox>
      {/* Roof gold trim corners */}
      {([-5.8, 5.8] as number[]).flatMap((x) =>
        ([-4, 4] as number[]).map((z, j) => (
          <mesh key={`corner-${x}-${z}`} position={[x, 9.6, z]}>
            <sphereGeometry args={[0.25, 10, 10]} />
            <meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.2} emissive={hex.gold} emissiveIntensity={0.4} />
          </mesh>
        ))
      )}

      {/* ── Neon star decorations ───────────────────────── */}
      <mesh position={[0, 8.1, 4.56]}>
        <ringGeometry args={[0.28, 0.36, 6]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-4.6, 8.1, 4.56]}>
        <ringGeometry args={[0.22, 0.28, 6]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[4.6, 8.1, 4.56]}>
        <ringGeometry args={[0.22, 0.28, 6]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.7} />
      </mesh>

    </Hotspot>
  );
}
