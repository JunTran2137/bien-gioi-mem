'use client';

import * as THREE from 'three';
import { VnText as Text } from '../primitives/VnText';
import { useSession, signIn, signOut } from 'next-auth/react';
import { RoundedBox } from '@react-three/drei';
import { Button3D } from '../primitives/Button3D';
import { hex, palette } from '@/lib/three/theme';
import { InteriorRoom } from './parts/InteriorRoom';
import { Person } from './parts/Person';
import { Walker } from './parts/Walker';

const POS: [number, number, number] = [34, 0, 34];
const ROOM_W = 32;
const ROOM_D = 26;
const ROOM_H = 11;
const RED = '#C0202F';

/** A flat 5-pointed star shape (points up) for the Vietnamese flag. */
const STAR_SHAPE = (() => {
  const s = new THREE.Shape();
  const outer = 0.62;
  const inner = 0.26;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) s.moveTo(px, py);
    else s.lineTo(px, py);
  }
  s.closePath();
  return s;
})();

export function TownHallScene() {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(' ').slice(-1)[0] || 'bạn';
  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;

  return (
    <group position={POS}>
      <InteriorRoom
        width={ROOM_W}
        depth={ROOM_D}
        height={ROOM_H}
        floorColor="#D8D0BC"
        wallColor="#F4EDD8"
        ceilingColor="#FFFAEC"
      />

      {/* Red carpet runner down the centre */}
      <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[6, ROOM_D - 3]} />
        <meshStandardMaterial color={RED} roughness={0.85} />
      </mesh>

      {/* Reception desk along back wall — compact, not a runway */}
      <mesh position={[0, 0.6, -halfD + 3]} castShadow receiveShadow>
        <boxGeometry args={[4, 1.2, 1.4]} />
        <meshStandardMaterial color="#5C3D2A" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.32, -halfD + 3]} castShadow>
        <boxGeometry args={[4.2, 0.1, 1.5]} />
        <meshStandardMaterial color="#A0825A" roughness={0.6} />
      </mesh>
      {/* Desk sign — attached to FRONT face of desk so it doesn't block receptionist's face */}
      <mesh position={[0, 0.7, -halfD + 3.75]}>
        <boxGeometry args={[2.6, 0.7, 0.05]} />
        <meshStandardMaterial color={hex.gold} metalness={0.6} roughness={0.3} />
      </mesh>
      <Text position={[0, 0.7, -halfD + 3.78]} fontSize={0.22} color={hex.text} anchorX="center" anchorY="middle" bold>
        🏛️ LỄ TÂN
      </Text>

      {/* Receptionist sitting BEHIND desk, facing +Z toward visitors */}
      <Person position={[0, 0, -halfD + 1.5]} rotationY={0} cloth="#2E5C8B" scale={1.05} seed={0.1} pose="sit" />
      {/* Reception chair — seat under the hips so the figure rests on it */}
      <mesh position={[0, 0.78, -halfD + 1.55]}><boxGeometry args={[0.62, 0.07, 0.6]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 1.18, -halfD + 1.28]}><boxGeometry args={[0.62, 0.7, 0.07]} /><meshStandardMaterial color="#333" /></mesh>
      {([[0.26, 1.3], [-0.26, 1.3], [0.26, 1.8], [-0.26, 1.8]] as [number, number][]).map(([lx, lz], k) => (
        <mesh key={`rcleg-${k}`} position={[lx, 0.37, -halfD + lz]}><cylinderGeometry args={[0.04, 0.04, 0.74, 8]} /><meshStandardMaterial color="#222" /></mesh>
      ))}

      {/* Visitors in lobby — a couple waiting, the rest strolling around */}
      <Person position={[-7, 0, -2]} rotationY={Math.PI / 4} seed={0.3} />
      <Person position={[7, 0, 6]} rotationY={Math.PI * 1.2} seed={0.9} />

      {/* People walking through the hall */}
      <Walker waypoints={[[-9, 8], [9, 8], [9, 2], [-9, 2]]} speed={1.05} seed={0.31} phase={0} />
      <Walker waypoints={[[-4, 9], [-4, 0], [4, 0], [4, 9]]} speed={0.95} seed={0.66} phase={0.3} />
      <Walker waypoints={[[8, 5], [8, -1], [2, -1], [2, 5]]} speed={1.2} seed={0.5} phase={0.55} />
      <Walker waypoints={[[-8, -1], [-8, 6], [-2, 6], [-2, -1]]} speed={1.0} seed={0.78} phase={0.8} />

      {/* Header on back wall above desk — mounted on a proper signboard */}
      <group position={[0, 6, -halfD + 0.18]}>
        {/* board backing */}
        <RoundedBox args={[9, 1.9, 0.22]} radius={0.18} smoothness={4}>
          <meshStandardMaterial color="#244A3A" roughness={0.5} metalness={0.2} />
        </RoundedBox>
        {/* gold trim frame */}
        <mesh position={[0, 0.96, 0.12]}><boxGeometry args={[9.2, 0.1, 0.04]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
        <mesh position={[0, -0.96, 0.12]}><boxGeometry args={[9.2, 0.1, 0.04]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
        <Text position={[0, 0, 0.16]} fontSize={0.5} color="#FFFFFF" anchorX="center" anchorY="middle" bold>
          🏛️  TÒA THỊ CHÍNH
        </Text>
      </group>

      {/* Auth panel — pushed back toward the reception, with ROUNDED corners */}
      <group position={[0, 3.5, -5]}>
        <RoundedBox args={[7.5, 4.8, 0.25]} radius={0.3} smoothness={4} castShadow>
          <meshPhysicalMaterial color="#FFFFFF" roughness={0.3} clearcoat={0.4} />
        </RoundedBox>
        {/* Header strip */}
        <RoundedBox args={[7.5, 0.8, 0.05]} radius={0.15} smoothness={4} position={[0, 2, 0.14]}>
          <meshStandardMaterial color={hex.primary} />
        </RoundedBox>
        <Text position={[0, 2, 0.2]} fontSize={0.25} color="#fff" anchorX="center" anchorY="middle" bold>
          {session ? `Xin chào ${userName}` : 'Đăng nhập để bắt đầu'}
        </Text>

        {!session ? (
          <>
            <Button3D
              position={[0, -0.2, 0.15]}
              width={4.2}
              height={0.95}
              color={palette.primary}
              hoverColor={palette.primaryDark}
              onClick={() => signIn('google')}
            >
              <Text position={[0, 0, 0.18]} fontSize={0.24} color="#fff" anchorX="center" anchorY="middle" bold>
                Đăng nhập với Google
              </Text>
            </Button3D>
          </>
        ) : (
          <>
            <Text position={[0, 1, 0.15]} fontSize={0.16} color={hex.muted} anchorX="center" anchorY="middle" maxWidth={6.5} textAlign="center">
              Quản lý nhóm thi đấu của bạn
            </Text>
            <Button3D
              position={[0, 0, 0.15]}
              width={4.2}
              height={0.85}
              color={palette.primary}
              hoverColor={palette.primaryDark}
              onClick={() => window.dispatchEvent(new CustomEvent('open-group-selector'))}
            >
              <Text position={[0, 0, 0.18]} fontSize={0.22} color="#fff" anchorX="center" anchorY="middle" bold>
                🤝  Chọn / đổi nhóm
              </Text>
            </Button3D>
            <Button3D
              position={[0, -1.2, 0.15]}
              width={3}
              height={0.65}
              color={palette.danger}
              onClick={() => signOut()}
            >
              <Text position={[0, 0, 0.18]} fontSize={0.18} color="#fff" anchorX="center" anchorY="middle">
                Đăng xuất
              </Text>
            </Button3D>
          </>
        )}
      </group>

      {/* === Rich decorations === */}
      {/* Marble columns along sides */}
      {([-halfW + 2, halfW - 2] as number[]).map((x) =>
        [-6, 0, 6].map((z, i) => (
          <group key={`mcol-${x}-${i}`} position={[x, 0, z]}>
            <mesh position={[0, ROOM_H / 2, 0]}><cylinderGeometry args={[0.4, 0.5, ROOM_H, 12]} /><meshStandardMaterial color="#E5DCC8" roughness={0.5} /></mesh>
            <mesh position={[0, ROOM_H - 0.15, 0]}><cylinderGeometry args={[0.6, 0.4, 0.3, 12]} /><meshStandardMaterial color="#D8D0BC" /></mesh>
            <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.5, 0.6, 0.3, 12]} /><meshStandardMaterial color="#D8D0BC" /></mesh>
          </group>
        ))
      )}

      {/* Ceiling chandelier */}
      <group position={[0, ROOM_H - 0.3, 0]}>
        <mesh position={[0, -1, 0]}><cylinderGeometry args={[0.04, 0.04, 2, 8]} /><meshStandardMaterial color="#8B6B3A" /></mesh>
        <mesh position={[0, -2.2, 0]}><sphereGeometry args={[0.6, 16, 12]} /><meshStandardMaterial color="#FFE8A0" emissive="#FFE8A0" emissiveIntensity={0.9} /></mesh>
        {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((a, j) => (
          <mesh key={j} position={[Math.cos(a) * 0.8, -2.2, Math.sin(a) * 0.8]}>
            <sphereGeometry args={[0.2, 12, 8]} />
            <meshStandardMaterial color="#FFE8A0" emissive="#FFE8A0" emissiveIntensity={1.0} />
          </mesh>
        ))}
      </group>

      {/* Paintings on side walls — 4 per side, slotted between the columns (z=-6,0,6) */}
      {[-9, -3, 3, 9].map((z, i) => (
        <group key={`paint-r-${i}`} position={[halfW - 0.12, 5, z]} rotation-y={-Math.PI / 2}>
          <mesh><boxGeometry args={[2.2, 1.5, 0.12]} /><meshStandardMaterial color={hex.gold} metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0, 0, 0.08]}><planeGeometry args={[1.8, 1.2]} /><meshStandardMaterial color={['#A8D8F0', '#F0E8D0', '#D8F0E0', '#F0E0C8'][i]} /></mesh>
        </group>
      ))}
      {[-9, -3, 3, 9].map((z, i) => (
        <group key={`paint-l-${i}`} position={[-halfW + 0.12, 5, z]} rotation-y={Math.PI / 2}>
          <mesh><boxGeometry args={[2.2, 1.5, 0.12]} /><meshStandardMaterial color={hex.gold} metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0, 0, 0.08]}><planeGeometry args={[1.8, 1.2]} /><meshStandardMaterial color={['#D8F0E0', '#A8D8F0', '#F0E8D0', '#E0D8F0'][i]} /></mesh>
        </group>
      ))}

      {/* Two Vietnamese national flags (★) — level with the clocks */}
      {[-12, 12].map((x, i) => (
        <group key={`flag-${i}`} position={[x, 9.1, -halfD + 0.16]}>
          {/* gold frame */}
          <mesh position={[0, 0, -0.02]}><boxGeometry args={[2.9, 2.0, 0.06]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
          {/* red field */}
          <mesh><boxGeometry args={[2.7, 1.8, 0.08]} /><meshStandardMaterial color={RED} roughness={0.6} /></mesh>
          {/* Vietnam — yellow 5-pointed star */}
          <mesh position={[0, 0, 0.06]}>
            <shapeGeometry args={[STAR_SHAPE]} />
            <meshStandardMaterial color="#FFD400" emissive="#FFD400" emissiveIntensity={0.2} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Welcome rug near the entrance */}
      <mesh position={[0, 0.013, 7]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color={RED} roughness={0.9} />
      </mesh>

      {/* Wall sconces along side walls — one above each painting (z=-9,-3,3,9) */}
      {([-9, -3, 3, 9] as number[]).flatMap((z) =>
        ([-halfW + 0.15, halfW - 0.15] as number[]).map((x, k) => (
          <group key={`sconce-${x}-${z}`} position={[x, 6.5, z]}>
            <mesh><sphereGeometry args={[0.22, 12, 8]} /><meshStandardMaterial color="#FFE8A0" emissive="#FFE8A0" emissiveIntensity={0.8} /></mesh>
            <pointLight color="#FFE8B8" intensity={0.3} distance={6} />
          </group>
        ))
      )}

      <pointLight position={[0, ROOM_H - 1, 0]} color="#FFE8B8" intensity={1.4} distance={22} />
      <pointLight position={[0, 4, -halfD + 4]} color="#FFE8B8" intensity={0.8} distance={12} />

      {/* ===== Extra civic furnishings (distinct pieces) ===== */}
      {/* Two large double-leaf doors, set well away from the reception */}
      {([-9.5, 9.5] as number[]).map((x, i) => (
        <group key={`door-${i}`} position={[x, 0, -halfD + 0.18]}>
          {/* frame */}
          <mesh position={[0, 2.9, 0]}><boxGeometry args={[3.8, 5.8, 0.34]} /><meshStandardMaterial color="#6B4A2E" roughness={0.6} /></mesh>
          {/* two door leaves */}
          {([-0.83, 0.83] as number[]).map((lx, j) => (
            <group key={j} position={[lx, 0, 0]}>
              <mesh position={[0, 2.7, 0.2]}><boxGeometry args={[1.5, 5.2, 0.1]} /><meshStandardMaterial color="#8B5A2A" roughness={0.5} /></mesh>
              {/* panel insets */}
              <mesh position={[0, 3.8, 0.27]}><boxGeometry args={[1.05, 1.7, 0.04]} /><meshStandardMaterial color="#7A4D24" roughness={0.6} /></mesh>
              <mesh position={[0, 1.5, 0.27]}><boxGeometry args={[1.05, 1.7, 0.04]} /><meshStandardMaterial color="#7A4D24" roughness={0.6} /></mesh>
              {/* handle near the center gap */}
              <mesh position={[lx < 0 ? 0.6 : -0.6, 2.6, 0.3]}><sphereGeometry args={[0.11, 12, 10]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.2} /></mesh>
            </group>
          ))}
          {/* lintel sign */}
          <mesh position={[0, 6.05, 0.12]}><boxGeometry args={[3.6, 0.6, 0.12]} /><meshStandardMaterial color={hex.primary} roughness={0.4} /></mesh>
          <Text position={[0, 6.05, 0.2]} fontSize={0.24} color="#fff" anchorX="center" anchorY="middle" bold>{i === 0 ? 'PHÒNG HỌP' : 'VĂN PHÒNG'}</Text>
        </group>
      ))}

      {/* Grand entrance — double doors on the front wall (behind the viewer),
          where the wall clock used to hang. Gives the hall a real way in. */}
      <group position={[0, 0, halfD - 0.18]} rotation-y={Math.PI}>
        {/* stone frame */}
        <mesh position={[0, 3.1, 0]}><boxGeometry args={[5.2, 6.4, 0.4]} /><meshStandardMaterial color="#6B4A2E" roughness={0.6} /></mesh>
        {/* two door leaves */}
        {([-1.15, 1.15] as number[]).map((lx, j) => (
          <group key={`ent-${j}`} position={[lx, 0, 0]}>
            <mesh position={[0, 2.9, 0.22]}><boxGeometry args={[2.1, 5.6, 0.12]} /><meshStandardMaterial color="#8B5A2A" roughness={0.5} /></mesh>
            {/* panel insets */}
            <mesh position={[0, 4.1, 0.29]}><boxGeometry args={[1.5, 1.9, 0.04]} /><meshStandardMaterial color="#7A4D24" roughness={0.6} /></mesh>
            <mesh position={[0, 1.7, 0.29]}><boxGeometry args={[1.5, 1.9, 0.04]} /><meshStandardMaterial color="#7A4D24" roughness={0.6} /></mesh>
            {/* handle near the centre gap */}
            <mesh position={[lx < 0 ? 0.85 : -0.85, 2.8, 0.32]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.2} /></mesh>
          </group>
        ))}
        {/* lintel sign */}
        <mesh position={[0, 6.55, 0.14]}><boxGeometry args={[5.0, 0.7, 0.14]} /><meshStandardMaterial color={hex.primary} roughness={0.4} /></mesh>
        <Text position={[0, 6.55, 0.22]} fontSize={0.3} color="#fff" anchorX="center" anchorY="middle" bold>LỐI RA</Text>
      </group>

      {/* Hanging lanterns down the central aisle */}
      {[-7, -2, 3, 8].map((z, i) => (
        <group key={`lan-${i}`} position={[0, ROOM_H - 0.1, z]}>
          <mesh position={[0, -0.45, 0]}><cylinderGeometry args={[0.02, 0.02, 0.9, 6]} /><meshStandardMaterial color="#5C3D2A" /></mesh>
          <mesh position={[0, -1.15, 0]}><boxGeometry args={[0.4, 0.6, 0.4]} /><meshStandardMaterial color={hex.gold} metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[0, -1.15, 0]}><boxGeometry args={[0.28, 0.5, 0.28]} /><meshStandardMaterial color="#FFE8A0" emissive="#FFE8A0" emissiveIntensity={1.1} /></mesh>
          <pointLight position={[0, -1.15, 0]} color="#FFE8B8" intensity={0.4} distance={7} />
        </group>
      ))}

      {/* ===== Service area & greenery ===== */}
      {/* Service desks with attending staff along both side walls */}
      {([
        [-halfW + 2.6, -3, Math.PI / 2, '#2E5C8B', 'QUẦY 1'],
        [-halfW + 2.6, 3, Math.PI / 2, '#3E7C5A', 'QUẦY 2'],
        [halfW - 2.6, -3, -Math.PI / 2, '#8B5A2A', 'QUẦY 3'],
        [halfW - 2.6, 3, -Math.PI / 2, '#6B4A8B', 'QUẦY 4'],
      ] as [number, number, number, string, string][]).map(([x, z, ry, cloth, label], i) => (
        <group key={`svc-${i}`} position={[x, 0, z]} rotation-y={ry}>
          {/* counter */}
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow><boxGeometry args={[2.6, 1.1, 0.9]} /><meshStandardMaterial color="#5C3D2A" roughness={0.7} /></mesh>
          <mesh position={[0, 1.18, 0.05]}><boxGeometry args={[2.8, 0.1, 1.0]} /><meshStandardMaterial color="#A0825A" roughness={0.6} /></mesh>
          {/* desk sign */}
          <mesh position={[0, 0.6, 0.46]}><boxGeometry args={[1.5, 0.5, 0.04]} /><meshStandardMaterial color={hex.primary} roughness={0.4} /></mesh>
          <Text position={[0, 0.6, 0.49]} fontSize={0.2} color="#fff" anchorX="center" anchorY="middle" bold>{label}</Text>
          {/* monitor on the counter */}
          <mesh position={[-0.7, 1.5, -0.1]} rotation-y={0.3}><boxGeometry args={[0.6, 0.4, 0.04]} /><meshStandardMaterial color="#1A2E25" emissive="#4A90D9" emissiveIntensity={0.3} /></mesh>
          {/* seated staff behind — chair seat raised under the hips */}
          <Person position={[0, 0, -0.9]} rotationY={0} cloth={cloth} scale={1.02} seed={0.2 + i * 0.13} pose="sit" />
          <mesh position={[0, 0.78, -0.85]}><boxGeometry args={[0.58, 0.07, 0.6]} /><meshStandardMaterial color="#333" /></mesh>
          <mesh position={[0, 1.18, -1.12]}><boxGeometry args={[0.58, 0.7, 0.07]} /><meshStandardMaterial color="#333" /></mesh>
          {([[0.24, -0.6], [-0.24, -0.6], [0.24, -1.1], [-0.24, -1.1]] as [number, number][]).map(([lx, lz], k) => (
            <mesh key={`svcleg-${k}`} position={[lx, 0.37, lz]}><cylinderGeometry args={[0.04, 0.04, 0.74, 8]} /><meshStandardMaterial color="#222" /></mesh>
          ))}
          {/* visitor standing in front */}
          <Person position={[0, 0, 1.3]} rotationY={Math.PI} seed={0.4 + i * 0.17} scale={1.0} />
        </group>
      ))}

      {/* Tall indoor trees — pushed fully into the four room corners */}
      {([[-halfW + 1.8, halfD - 1.8], [halfW - 1.8, halfD - 1.8], [-halfW + 1.8, -halfD + 1.8], [halfW - 1.8, -halfD + 1.8]] as [number, number][]).map(([x, z], i) => (
        <group key={`tree-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.55, 0.65, 0.7, 16]} /><meshStandardMaterial color="#9C8B6B" roughness={0.7} /></mesh>
          <mesh position={[0, 1.9, 0]} castShadow><cylinderGeometry args={[0.12, 0.16, 2.6, 10]} /><meshStandardMaterial color="#6B4A2E" roughness={0.8} /></mesh>
          <mesh position={[0, 3.4, 0]} castShadow><sphereGeometry args={[0.95, 16, 14]} /><meshStandardMaterial color={hex.primary} roughness={0.85} /></mesh>
          <mesh position={[0.55, 2.9, 0.2]}><sphereGeometry args={[0.6, 14, 12]} /><meshStandardMaterial color="#3E9E72" roughness={0.85} /></mesh>
          <mesh position={[-0.5, 3.0, -0.2]}><sphereGeometry args={[0.62, 14, 12]} /><meshStandardMaterial color="#2E8B6B" roughness={0.85} /></mesh>
          <mesh position={[0, 4.2, 0]}><sphereGeometry args={[0.55, 14, 12]} /><meshStandardMaterial color="#46A87C" roughness={0.85} /></mesh>
        </group>
      ))}

      {/* World-clock wall — different time zones, mounted on back wall */}
      {([
        ['HÀ NỘI', 7, 20],
        ['TOKYO', 9, 20],
        ['LONDON', 0, 20],
        ['NEW YORK', 19, 20],
        ['PARIS', 1, 20],
      ] as [string, number, number][]).map(([city, hr, mn], i) => {
        const x = -8 + i * 4;
        return (
          <WorldClock key={`wc-${i}`} position={[x, 9.1, -halfD + 0.16]} city={city} hour={hr} minute={mn} />
        );
      })}
    </group>
  );
}

/** A wall-mounted clock with static hands for a given time + city label. */
function WorldClock({ position, city, hour, minute }: { position: [number, number, number]; city: string; hour: number; minute: number }) {
  const hourAngle = (((hour % 12) + minute / 60) / 12) * Math.PI * 2;
  const minAngle = (minute / 60) * Math.PI * 2;
  return (
    <group position={position}>
      {/* frame + face */}
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.85, 0.85, 0.14, 32]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0, 0.08]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.72, 0.72, 0.05, 32]} /><meshStandardMaterial color="#FBF7EC" roughness={0.5} /></mesh>
      {/* ticks */}
      {Array.from({ length: 12 }).map((_, h) => {
        const a = (h / 12) * Math.PI * 2;
        return (
          <mesh key={h} position={[Math.sin(a) * 0.6, Math.cos(a) * 0.6, 0.11]}>
            <boxGeometry args={[0.05, 0.1, 0.03]} />
            <meshStandardMaterial color={hex.text} />
          </mesh>
        );
      })}
      {/* hour hand */}
      <mesh position={[Math.sin(hourAngle) * 0.2, Math.cos(hourAngle) * 0.2, 0.13]} rotation-z={-hourAngle}><boxGeometry args={[0.05, 0.42, 0.02]} /><meshStandardMaterial color={hex.text} /></mesh>
      {/* minute hand */}
      <mesh position={[Math.sin(minAngle) * 0.28, Math.cos(minAngle) * 0.28, 0.13]} rotation-z={-minAngle}><boxGeometry args={[0.04, 0.6, 0.02]} /><meshStandardMaterial color={hex.primary} /></mesh>
      <mesh position={[0, 0, 0.15]}><sphereGeometry args={[0.06, 12, 10]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.2} /></mesh>
      {/* city label */}
      <Text position={[0, -1.05, 0.1]} fontSize={0.22} color="#000000" anchorX="center" anchorY="middle" bold>{city}</Text>
    </group>
  );
}

/** A laurel wreath with ribbon + medal, mounted flat on a wall. */
function TownWreath({ position, rotationY, ribbon }: { position: [number, number, number]; rotationY: number; ribbon: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh><torusGeometry args={[0.62, 0.09, 10, 26]} /><meshStandardMaterial color={hex.primary} roughness={0.6} /></mesh>
      <mesh><torusGeometry args={[0.48, 0.035, 8, 26]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[-0.16, -0.82, 0.02]} rotation-z={0.12}><boxGeometry args={[0.14, 0.8, 0.03]} /><meshStandardMaterial color={ribbon} roughness={0.7} /></mesh>
      <mesh position={[0.16, -0.82, 0.02]} rotation-z={-0.12}><boxGeometry args={[0.14, 0.8, 0.03]} /><meshStandardMaterial color={ribbon} roughness={0.7} /></mesh>
      <mesh position={[0, 0, 0.06]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 0.06, 20]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.18} emissive={hex.gold} emissiveIntensity={0.2} /></mesh>
    </group>
  );
}
