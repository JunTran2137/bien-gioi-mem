'use client';

import { useState, useMemo, useRef } from 'react';
import { VnText as Text } from '../primitives/VnText';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useLeaderboardData, type LeaderboardPeriod } from '@/hooks/useLeaderboardData';
import { hex, palette } from '@/lib/three/theme';
import { Button3D } from '../primitives/Button3D';
import { InteriorRoom } from './parts/InteriorRoom';
import { Person } from './parts/Person';

const POS: [number, number, number] = [0, 0, -34];
const ROOM_W = 32;
const ROOM_D = 26;
const ROOM_H = 12;
const RED = '#C0202F';

export function TowerScene() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('game1');
  const { groups, totalGames, loading } = useLeaderboardData(period);

  const top3 = useMemo(() => groups.slice(0, 3), [groups]);
  const rest = useMemo(() => groups.slice(3, 10), [groups]);
  const maxScore = useMemo(() => Math.max(1, ...groups.map(g => g.total_score)), [groups]);

  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;

  return (
    <group position={POS}>
      {/* Marble monument hall */}
      <InteriorRoom
        width={ROOM_W}
        depth={ROOM_D}
        height={ROOM_H}
        floorColor="#E5E0D5"
        wallColor="#F8F4E8"
        ceilingColor="#FFFAEC"
      />

      {/* Red carpet runner to back wall */}
      <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[4, ROOM_D - 2]} />
        <meshStandardMaterial color="#7B2222" roughness={0.85} />
      </mesh>

      {/* === Period selector pulled FORWARD to float right above the top-3 podium === */}
      <group position={[0, 7.2, -halfD + 4]}>
        <RoundedBox args={[6, 1.1, 0.18]} radius={0.18} smoothness={4} castShadow>
          <meshPhysicalMaterial color="#FFFFFF" roughness={0.25} clearcoat={0.6} />
        </RoundedBox>
        {(['game1', 'game2'] as LeaderboardPeriod[]).map((p, i) => (
          <Button3D
            key={p}
            position={[-1.5 + i * 3, 0, 0.12]}
            width={2.7}
            height={0.7}
            color={period === p ? palette.primary : palette.primarySoft}
            onClick={() => setPeriod(p)}
          >
            <Text position={[0, 0, 0.18]} fontSize={0.16} color={period === p ? '#fff' : hex.text} anchorX="center" anchorY="middle" bold>
              {p === 'game1' ? 'Game 1' : 'Game 2'}
            </Text>
          </Button3D>
        ))}
      </group>

      {/* === Leaderboard pushed AGAINST back wall (z = -halfD + 3) === */}
      {/* Top-3 podium */}
      {top3.length === 0 && !loading && (
        <Text position={[0, 5, -halfD + 4]} fontSize={0.2} color={hex.muted} anchorX="center" anchorY="middle">
          Chưa có dữ liệu xếp hạng
        </Text>
      )}

      <PodiumPlaque rank={2} group={top3[1]} maxScore={maxScore} x={-3} z={-halfD + 4} />
      <PodiumPlaque rank={1} group={top3[0]} maxScore={maxScore} x={0} z={-halfD + 4} center />
      <PodiumPlaque rank={3} group={top3[2]} maxScore={maxScore} x={3} z={-halfD + 4} />

      {/* Rank 4-10 on back wall */}
      {rest.map((g, i) => (
        <group key={g.id} position={[8, 7 - i * 0.7, -halfD + 3]}>
          <RoundedBox args={[5, 0.55, 0.12]} radius={0.08} smoothness={3}>
            <meshStandardMaterial color={i % 2 === 0 ? '#fff' : hex.primarySoft} />
          </RoundedBox>
          <Text position={[-2.1, 0, 0.1]} fontSize={0.18} color={hex.primary} anchorX="left" anchorY="middle" bold>
            #{g.rank}
          </Text>
          <Text position={[-1.5, 0, 0.1]} fontSize={0.13} color={hex.text} anchorX="left" anchorY="middle" maxWidth={2.8}>
            {g.name.slice(0, 18)}
          </Text>
          <Text position={[2.2, 0, 0.1]} fontSize={0.14} color={hex.gold} anchorX="right" anchorY="middle" bold>
            {g.total_score}
          </Text>
        </group>
      ))}

      {/* === Visitors moved CLOSER to the podium so the audience crowds the winners === */}
      {[
        { x: -6, z: 0, rot: Math.PI },
        { x: -3, z: 2, rot: Math.PI },
        { x: 0, z: 1, rot: Math.PI },
        { x: 3, z: 2, rot: Math.PI },
        { x: 6, z: 0, rot: Math.PI },
        { x: -5, z: 4, rot: Math.PI + 0.2 },
        { x: 5, z: 4, rot: Math.PI - 0.2 },
        { x: -2, z: 5, rot: Math.PI },
        { x: 2, z: 5, rot: Math.PI }
      ].map((v, i) => (
        <Person key={`v-${i}`} position={[v.x, 0, v.z]} rotationY={v.rot} seed={i * 0.21 + 0.1} />
      ))}

      {/* === Festive gold & red decorations === */}
      {/* Hanging flags on back wall — evenly spaced, alternating red/gold.
         The middle three (above the results podium) are a touch shorter. */}
      {[-12.25, -8.75, -5.25, -1.75, 1.75, 5.25, 8.75, 12.25].map((x, i) => {
        const h = Math.abs(x) <= 3 ? 3.2 : 4;
        return (
          <group key={`banner-${i}`} position={[x, ROOM_H - 0.2, -halfD + 0.3]}>
            <mesh position={[0, -h / 2, 0]}>
              <boxGeometry args={[1.3, h, 0.05]} />
              <meshStandardMaterial color={i % 2 === 0 ? RED : hex.gold} />
            </mesh>
            <mesh position={[-0.55, -h, 0]}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color={hex.gold} metalness={0.7} /></mesh>
            <mesh position={[0.55, -h, 0]}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color={hex.gold} metalness={0.7} /></mesh>
          </group>
        );
      })}

      {/* Side-wall flags — gold/red, 6 per side */}
      {[-10, -6, -2, 2, 6, 10].map((z, i) => (
        <group key={`sb-l-${i}`} position={[-halfW + 0.2, ROOM_H - 1, z]} rotation-y={Math.PI / 2}>
          <mesh position={[0, -1.5, 0]}><boxGeometry args={[1.2, 3, 0.05]} /><meshStandardMaterial color={i % 2 === 0 ? hex.gold : RED} /></mesh>
        </group>
      ))}
      {[-10, -6, -2, 2, 6, 10].map((z, i) => (
        <group key={`sb-r-${i}`} position={[halfW - 0.2, ROOM_H - 1, z]} rotation-y={-Math.PI / 2}>
          <mesh position={[0, -1.5, 0]}><boxGeometry args={[1.2, 3, 0.05]} /><meshStandardMaterial color={i % 2 === 0 ? RED : hex.gold} /></mesh>
        </group>
      ))}

      {/* Triangular pennant bunting strung along every wall (gold & red) */}

      {/* Spotlights aimed at podium */}
      <pointLight position={[0, 10, -6]} color="#FFE8B8" intensity={1.8} distance={18} />
      <pointLight position={[-6, 8, 0]} color={hex.gold} intensity={0.8} distance={12} />
      <pointLight position={[6, 8, 0]} color={hex.gold} intensity={0.8} distance={12} />
      <pointLight position={[0, 4, 8]} color="#FFF8E0" intensity={0.6} distance={14} />

      {/* Gold trim columns at all four corners */}
      {([
        [-halfW + 1.5, 0, halfD - 1.5], [halfW - 1.5, 0, halfD - 1.5],
        [-halfW + 1.5, 0, -halfD + 1.5], [halfW - 1.5, 0, -halfD + 1.5],
      ] as [number,number,number][]).map((p, i) => (
        <group key={`col-${i}`} position={p}>
          <mesh position={[0, ROOM_H / 2, 0]}><cylinderGeometry args={[0.5, 0.6, ROOM_H, 12]} /><meshStandardMaterial color="#D8D0C0" roughness={0.5} /></mesh>
          <mesh position={[0, ROOM_H - 0.2, 0]}><cylinderGeometry args={[0.7, 0.5, 0.4, 12]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.6, 0.7, 0.4, 12]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
        </group>
      ))}

      {/* Wall plaques gallery frames — gold frames with gold/red inlays */}
      {[-12, -8, -4, 4, 8, 12].map((x, i) => (
        <group key={`fr-${i}`} position={[x, 5.5, -halfD + 0.18]}>
          <mesh><boxGeometry args={[2.2, 1.5, 0.18]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0, 0, 0.1]}><planeGeometry args={[1.8, 1.1]} /><meshStandardMaterial color={i % 2 === 0 ? '#7B1C26' : '#C99A2E'} /></mesh>
        </group>
      ))}

      {/* Top arch above leaderboard — grand entrance feel */}
      <mesh position={[0, ROOM_H - 0.05, -halfD + 0.5]}>
        <torusGeometry args={[8, 0.25, 8, 32, Math.PI]} />
        <meshStandardMaterial color={hex.gold} metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Subtitle removed per request */}

      {/* === Gold trophy cups on pedestals all around the hall === */}
      {([
        [-14, -9], [-14, -4.5], [-14, 0], [-14, 4.5], [-14, 9],
        [14, -9], [14, -4.5], [14, 0], [14, 4.5], [14, 9],
        [-8.5, -9], [8.5, -9],
      ] as [number, number][]).map(([x, z], i) => (
        <TrophyPedestal key={`trophy-${i}`} position={[x, 0, z]} accent={[hex.gold, hex.accent, hex.secondary, hex.primary][i % 4]} seed={i} />
      ))}

      {/* === Hanging laurel wreaths + medals — evenly aligned at one height === */}
      {[-9, -4.5, 0, 4.5, 9].map((z, i) => (
        <Wreath key={`wr-l-${i}`} position={[-halfW + 0.25, 5.5, z]} rotationY={Math.PI / 2} ribbon={i % 2 === 0 ? RED : hex.gold} />
      ))}
      {[-9, -4.5, 0, 4.5, 9].map((z, i) => (
        <Wreath key={`wr-r-${i}`} position={[halfW - 0.25, 5.5, z]} rotationY={-Math.PI / 2} ribbon={i % 2 === 0 ? hex.gold : RED} />
      ))}

      {/* === Grand entrance door on the front wall (behind the viewer) === */}
      <group position={[0, 0, halfD - 0.2]}>
        {/* Gold side pillars */}
        {[-3.1, 3.1].map((x, i) => (
          <group key={`dp-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 4, 0]}><boxGeometry args={[0.8, 8, 0.8]} /><meshStandardMaterial color={hex.gold} metalness={0.75} roughness={0.28} /></mesh>
            <mesh position={[0, 8.1, 0]}><boxGeometry args={[1.0, 0.5, 1.0]} /><meshStandardMaterial color={hex.gold} metalness={0.8} roughness={0.25} /></mesh>
            <mesh position={[0, 0.25, 0]}><boxGeometry args={[1.0, 0.5, 1.0]} /><meshStandardMaterial color={hex.gold} metalness={0.8} roughness={0.25} /></mesh>
          </group>
        ))}
        {/* Lintel + arch */}
        <mesh position={[0, 8.2, 0]}><boxGeometry args={[7.4, 0.8, 0.8]} /><meshStandardMaterial color={hex.gold} metalness={0.8} roughness={0.25} /></mesh>
        <mesh position={[0, 8.6, 0]}><torusGeometry args={[3.1, 0.35, 12, 28, Math.PI]} /><meshStandardMaterial color={hex.gold} metalness={0.85} roughness={0.2} /></mesh>
        {/* Pediment crest */}
        <mesh position={[0, 9.4, 0]}><coneGeometry args={[1.0, 1.2, 4]} /><meshStandardMaterial color={RED} metalness={0.4} roughness={0.5} /></mesh>
        <mesh position={[0, 9.0, 0.1]}><sphereGeometry args={[0.45, 16, 12]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.18} emissive={hex.gold} emissiveIntensity={0.3} /></mesh>
        {/* Twin door panels — dark wood */}
        {[-1.35, 1.35].map((x, i) => (
          <mesh key={`dd-${i}`} position={[x, 3.9, -0.1]} castShadow>
            <boxGeometry args={[2.5, 7.6, 0.25]} />
            <meshStandardMaterial color="#5C2A18" roughness={0.55} metalness={0.15} />
          </mesh>
        ))}
        {/* Gold panel trims on the doors */}
        {[-1.35, 1.35].flatMap((x, i) => [2, 5.2].map((y, j) => (
          <mesh key={`dt-${i}-${j}`} position={[x, y, -0.24]}><boxGeometry args={[1.7, 2.0, 0.06]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
        )))}
        {/* Door handles */}
        {[-0.35, 0.35].map((x, i) => (
          <mesh key={`dh-${i}`} position={[x, 3.8, -0.3]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color={hex.gold} metalness={0.95} roughness={0.15} /></mesh>
        ))}
      </group>
    </group>
  );
}

/** A gold goblet trophy resting on a stone pedestal. */
function TrophyPedestal({ position, accent, seed = 0 }: { position: [number, number, number]; accent: string; seed?: number }) {
  const cupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (cupRef.current) cupRef.current.rotation.y += delta * 0.3; });
  return (
    <group position={position}>
      {/* Pedestal column */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.7, 1.8, 16]} />
        <meshStandardMaterial color="#D8D0C0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.65, 0.55, 0.18, 16]} />
        <meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* The trophy cup */}
      <group ref={cupRef} position={[0, 2.0, 0]}>
        {/* base */}
        <mesh position={[0, 0.08, 0]} castShadow><cylinderGeometry args={[0.28, 0.32, 0.16, 16]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.18} /></mesh>
        {/* stem */}
        <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.07, 0.07, 0.34, 12]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.18} /></mesh>
        {/* bowl */}
        <mesh position={[0, 0.62, 0]} castShadow><cylinderGeometry args={[0.34, 0.18, 0.42, 16]} /><meshStandardMaterial color={hex.gold} metalness={0.95} roughness={0.15} emissive={hex.gold} emissiveIntensity={0.15} /></mesh>
        {/* handles */}
        <mesh position={[-0.34, 0.62, 0]} rotation-z={Math.PI / 2}><torusGeometry args={[0.16, 0.035, 8, 16, Math.PI]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.18} /></mesh>
        <mesh position={[0.34, 0.62, 0]} rotation-z={-Math.PI / 2}><torusGeometry args={[0.16, 0.035, 8, 16, Math.PI]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.18} /></mesh>
        {/* star gem on the cup */}
        <mesh position={[0, 0.62, 0.18]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} metalness={0.6} roughness={0.2} /></mesh>
      </group>
    </group>
  );
}

/** A laurel wreath with hanging ribbon + medal, mounted flat against a wall. */
function Wreath({ position, rotationY, ribbon }: { position: [number, number, number]; rotationY: number; ribbon: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* laurel ring */}
      <mesh><torusGeometry args={[0.7, 0.1, 10, 28]} /><meshStandardMaterial color={hex.primary} roughness={0.6} /></mesh>
      {/* gold inner ring */}
      <mesh><torusGeometry args={[0.55, 0.04, 8, 28]} /><meshStandardMaterial color={hex.gold} metalness={0.7} roughness={0.3} /></mesh>
      {/* ribbon tails */}
      <mesh position={[-0.18, -0.95, 0.02]} rotation-z={0.12}><boxGeometry args={[0.16, 0.9, 0.03]} /><meshStandardMaterial color={ribbon} roughness={0.7} /></mesh>
      <mesh position={[0.18, -0.95, 0.02]} rotation-z={-0.12}><boxGeometry args={[0.16, 0.9, 0.03]} /><meshStandardMaterial color={ribbon} roughness={0.7} /></mesh>
      {/* medal */}
      <mesh position={[0, 0, 0.06]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.22, 0.22, 0.06, 20]} /><meshStandardMaterial color={hex.gold} metalness={0.9} roughness={0.18} emissive={hex.gold} emissiveIntensity={0.2} /></mesh>
    </group>
  );
}

/** A string of triangular pennant flags (gold & red) strung between two points. */
function Bunting({ from, to, count, faceX = 0 }: { from: [number, number, number]; to: [number, number, number]; count: number; faceX?: 0 | 1 | -1 }) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const flags = Array.from({ length: count }).map((_, i) => {
    const t = (i + 0.5) / count;
    const p = start.clone().lerp(end, t);
    const dip = Math.sin(t * Math.PI) * 0.5;
    return { x: p.x, y: p.y - dip, z: p.z, col: i % 2 === 0 ? hex.gold : RED };
  });
  // Pennants on side walls must face inward (rotate around Y); apex points down.
  const rotY = faceX === 1 ? Math.PI / 2 : faceX === -1 ? -Math.PI / 2 : 0;
  return (
    <group>
      {flags.map((f, i) => (
        <mesh key={`pn-${i}`} position={[f.x, f.y - 0.35, f.z]} rotation={[Math.PI, rotY, 0]}>
          <coneGeometry args={[0.18, 0.55, 4]} />
          <meshStandardMaterial color={f.col} metalness={0.3} roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function PodiumPlaque({
  rank, group, maxScore, x, z, center,
}: {
  rank: number; group?: { name: string; total_score: number; member_count: number; avg: number };
  maxScore: number; x: number; z: number; center?: boolean;
}) {
  const baseH = rank === 1 ? 3.5 : rank === 2 ? 2.5 : 1.8;
  const color = rank === 1 ? hex.gold : rank === 2 ? '#B0B7C5' : '#C49060';
  const crownRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => { if (crownRef.current && rank === 1) crownRef.current.rotation.y += delta * 0.5; });

  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[2, baseH, 1.4]} radius={0.12} smoothness={4} position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} emissive={color} emissiveIntensity={0.12} />
      </RoundedBox>
      <Text position={[0, baseH / 2, 0.75]} fontSize={0.7} color="#fff" anchorX="center" anchorY="middle" bold>
        {rank}
      </Text>

      {group && (
        <group position={[0, baseH + 0.7, 0]}>
          <RoundedBox args={[2.6, 1, 0.15]} radius={0.1} smoothness={4}>
            <meshPhysicalMaterial color="#fff" roughness={0.2} clearcoat={0.5} />
          </RoundedBox>
          <Text position={[0, 0.25, 0.1]} fontSize={0.15} color={hex.text} anchorX="center" anchorY="middle" maxWidth={2.3} textAlign="center">
            {group.name.slice(0, 22)}
          </Text>
          <Text position={[0, 0, 0.1]} fontSize={0.2} color={hex.primary} anchorX="center" anchorY="middle" bold>
            {group.total_score}
          </Text>
          <Text position={[0, -0.3, 0.1]} fontSize={0.1} color={hex.muted} anchorX="center" anchorY="middle">
            {group.member_count} thành viên · TB {group.avg}
          </Text>
        </group>
      )}

      {rank === 1 && center && (
        <mesh ref={crownRef} position={[0, baseH + 2, 0]} castShadow>
          <coneGeometry args={[0.5, 0.8, 8]} />
          <meshStandardMaterial color={hex.gold} emissive={hex.gold} emissiveIntensity={0.4} metalness={0.8} roughness={0.25} />
        </mesh>
      )}
    </group>
  );
}
