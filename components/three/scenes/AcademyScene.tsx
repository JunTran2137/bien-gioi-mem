'use client';

import { useState, useEffect, useRef } from 'react';
import { VnText as Text } from '../primitives/VnText';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useSession } from 'next-auth/react';
import { flashcardsData } from '@/data/flashcardsData';
import { hex } from '@/lib/three/theme';
import { Button3D } from '../primitives/Button3D';
import { shuffle } from '@/lib/utils';
import { InteriorRoom } from './parts/InteriorRoom';
import { Person } from './parts/Person';

const POS: [number, number, number] = [-34, 0, 34];
const ROOM_W = 22;
const ROOM_D = 18;
const ROOM_H = 8.5;

type Status = 'known' | 'unknown';

export function AcademyScene() {
  const { data: session } = useSession();
  const storageKey = `flashcard-progress:${(session?.user as any)?.uid || 'anon'}`;

  const [progress, setProgress] = useState<Record<string, Status>>({});
  const [order, setOrder] = useState(() => flashcardsData.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setProgress(JSON.parse(stored));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {}
  }, [progress, storageKey]);

  const card = flashcardsData[order[index]];

  const next = () => { setFlipped(false); setIndex(i => Math.min(i + 1, order.length - 1)); };
  const prev = () => { setFlipped(false); setIndex(i => Math.max(i - 1, 0)); };
  const mark = (status: Status) => {
    if (!card) return;
    setProgress(p => ({ ...p, [card.id]: status }));
    setTimeout(next, 200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); }
      else if (e.key === '1') mark('unknown');
      else if (e.key === '2') mark('known');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, order, card]);

  const knownCount = Object.values(progress).filter(s => s === 'known').length;
  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;

  return (
    <group position={POS}>
      <InteriorRoom
        width={ROOM_W}
        depth={ROOM_D}
        height={ROOM_H}
        floorColor="#C8B080"
        wallColor="#F4F0E0"
        ceilingColor="#FFFFFF"
        windows
        windowCount={2}
        windowSpread={0.55}
        windowW={8}
        windowH={2}
      />

      {/* Two exit doors on the back wall (+Z), behind the class */}
      {[-5, 5].map((x, i) => (
        <group key={`door-${i}`} position={[x, 0, halfD - 0.12]}>
          {/* frame */}
          <mesh position={[0, 2.35, 0]}><boxGeometry args={[2.0, 4.7, 0.18]} /><meshStandardMaterial color="#7A5638" roughness={0.7} /></mesh>
          {/* door leaf */}
          <mesh position={[0, 2.2, -0.06]}><boxGeometry args={[1.7, 4.2, 0.1]} /><meshStandardMaterial color="#5C3D2A" roughness={0.6} /></mesh>
          {/* handle */}
          <mesh position={[0.6, 2.2, -0.14]}><sphereGeometry args={[0.1, 12, 8]} /><meshStandardMaterial color={hex.gold} metalness={0.6} roughness={0.3} /></mesh>
          {/* EXIT sign */}
          <mesh position={[0, 4.85, -0.02]}><planeGeometry args={[1.0, 0.34]} /><meshStandardMaterial color={hex.primary} emissive={hex.primary} emissiveIntensity={0.5} /></mesh>
        </group>
      ))}

      {/* Front-wall world map / poster */}
      <mesh position={[6.5, 4.5, -halfD + 0.15]}>
        <planeGeometry args={[3.2, 2]} />
        <meshStandardMaterial color="#A8D8F0" />
      </mesh>
      <Text position={[6.5, 4.5, -halfD + 0.18]} fontSize={0.18} color={hex.text} anchorX="center" anchorY="middle">
        🌏 BẢN ĐỒ THẾ GIỚI
      </Text>

      {/* Wall clock — mounted directly ABOVE the chalkboard, centered */}
      <group position={[0, 7.4, -halfD + 0.2]}>
        <mesh position={[0, 0, -0.01]}><circleGeometry args={[0.7, 32]} /><meshStandardMaterial color="#1A2E25" /></mesh>
        <mesh><circleGeometry args={[0.6, 32]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0, 0, 0.01]}><ringGeometry args={[0.6, 0.7, 32]} /><meshStandardMaterial color="#1A2E25" /></mesh>
        <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.04, 0.4, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
        <mesh position={[0, 0, 0.02]} rotation-z={-Math.PI / 3}><boxGeometry args={[0.03, 0.28, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
        <mesh position={[0, 0, 0.04]}><circleGeometry args={[0.05, 16]} /><meshStandardMaterial color="#333" /></mesh>
      </group>

      {/* Motivational posters on side walls */}
      {[-5, 0, 5].map((z, i) => (
        <group key={`poster-l-${i}`} position={[-halfW + 0.12, 5, z]} rotation-y={Math.PI / 2}>
          <mesh><planeGeometry args={[1.6, 1.1]} /><meshStandardMaterial color={['#E8F5F0', '#FFF3E0', '#F3E5F5'][i]} /></mesh>
          <Text position={[0, 0, 0.02]} fontSize={0.12} color={hex.primary} anchorX="center" anchorY="middle" maxWidth={1.5} textAlign="center">
            {['💡 Tri thức là sức mạnh', '🌱 Học hỏi mỗi ngày', '🎯 Kiên trì là chìa khóa'][i]}
          </Text>
        </group>
      ))}

      {/* Potted plants in corners */}
      {([[-halfW + 1.2, 0, -halfD + 1.2], [halfW - 1.2, 0, -halfD + 1.2], [-halfW + 1.2, 0, halfD - 1.2], [halfW - 1.2, 0, halfD - 1.2]] as [number, number, number][]).map((p, i) => (
        <group key={`plant-${i}`} position={p}>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.25, 0.3, 0.6, 12]} /><meshStandardMaterial color="#8B5A2A" /></mesh>
          <mesh position={[0, 0.75, 0]}><sphereGeometry args={[0.4, 12, 8]} /><meshStandardMaterial color="#3A8C4A" /></mesh>
        </group>
      ))}

      {/* Teacher's desk close to chalkboard, students start right after */}
      <mesh position={[-3, 0.5, -6]} castShadow>
        <boxGeometry args={[2.2, 1.0, 1.0]} />
        <meshStandardMaterial color="#5C3D2A" roughness={0.7} />
      </mesh>
      {/* Teacher BEHIND desk, facing students (+Z) */}
      <Person position={[-3, 0, -7]} rotationY={0} cloth="#2E5C8B" scale={1.0} seed={0.9} />

      {/* Rows of student desks — pushed back from the teacher so they aren't crowding the board */}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => {
          const x = -4.4 + col * 2.2;
          const z = -0.8 + row * 2.1;
          return (
            <group key={`s-${row}-${col}`} position={[x, 0, z]}>
              {/* Desk — raised */}
              <mesh position={[0, 1.0, -0.5]} castShadow>
                <boxGeometry args={[1.2, 0.08, 0.6]} />
                <meshStandardMaterial color="#A0825A" roughness={0.7} />
              </mesh>
              {/* Desk legs */}
              <mesh position={[0.5, 0.5, -0.35]}><boxGeometry args={[0.06, 1.0, 0.06]} /><meshStandardMaterial color="#5C3D2A" /></mesh>
              <mesh position={[-0.5, 0.5, -0.35]}><boxGeometry args={[0.06, 1.0, 0.06]} /><meshStandardMaterial color="#5C3D2A" /></mesh>
              <mesh position={[0.5, 0.5, -0.65]}><boxGeometry args={[0.06, 1.0, 0.06]} /><meshStandardMaterial color="#5C3D2A" /></mesh>
              <mesh position={[-0.5, 0.5, -0.65]}><boxGeometry args={[0.06, 1.0, 0.06]} /><meshStandardMaterial color="#5C3D2A" /></mesh>
              {/* Book on desk */}
              <mesh position={[0, 1.07, -0.5]}>
                <boxGeometry args={[0.4, 0.04, 0.3]} />
                <meshStandardMaterial color={['#A05C3C', '#3C5C8C', '#3C8C5C', '#8C7C3C'][(row + col) % 4]} />
              </mesh>
              {/* Chair — seat top at y=0.85 (matches Person.sit hip height) */}
              <mesh position={[0, 0.82, 0.18]}><boxGeometry args={[0.5, 0.06, 0.45]} /><meshStandardMaterial color="#4A3520" /></mesh>
              <mesh position={[0, 1.18, 0.4]}><boxGeometry args={[0.5, 0.6, 0.06]} /><meshStandardMaterial color="#4A3520" /></mesh>
              {/* Chair legs — floor to seat (0→0.82) */}
              <mesh position={[0.22, 0.41, 0.0]}><boxGeometry args={[0.04, 0.82, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <mesh position={[-0.22, 0.41, 0.0]}><boxGeometry args={[0.04, 0.82, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <mesh position={[0.22, 0.41, 0.36]}><boxGeometry args={[0.04, 0.82, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <mesh position={[-0.22, 0.41, 0.36]}><boxGeometry args={[0.04, 0.82, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              {/* Student seated, facing front (-Z). Person.sit hip at y≈0.86 → sits on chair seat */}
              <Person position={[0, 0, 0.18]} rotationY={Math.PI} pose="sit" seed={row * 5 + col + 0.1} scale={0.85} />
            </group>
          );
        })
      )}

      {/* Lighting */}
      <pointLight position={[0, 7, -5]} color="#E8F4FF" intensity={1.2} distance={14} />
      <pointLight position={[0, 4.5, 3]} color="#FFE8B8" intensity={0.7} distance={10} />

      {/* Chalkboard mounted on front wall — CENTERED */}
      <mesh position={[0, 4.5, -halfD + 0.2]} castShadow receiveShadow>
        <boxGeometry args={[10, 4, 0.2]} />
        <meshStandardMaterial color="#1A2E25" roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.5, -halfD + 0.32]}>
        <planeGeometry args={[9.6, 3.6]} />
        <meshStandardMaterial color="#2E4636" roughness={0.95} />
      </mesh>
      {/* Chalk tray */}
      <mesh position={[0, 2.4, -halfD + 0.4]}>
        <boxGeometry args={[6.5, 0.15, 0.25]} />
        <meshStandardMaterial color="#1A2E25" />
      </mesh>

      <Text position={[0, 5.7, -halfD + 0.35]} fontSize={0.14} color="#9CC5A8" anchorX="center" anchorY="middle">
        Đã thuộc: {knownCount} / {flashcardsData.length}
      </Text>

      {/* Flashcard 3D — CENTERED on chalkboard */}
      <FlashCard3D
        position={[0, 4.0, -halfD + 0.8]}
        flipped={flipped}
        onClick={() => setFlipped(f => !f)}
        front={{ title: card?.front || '', sub: card?.category?.replace('_', ' ') || '' }}
        back={{ title: card?.back?.slice(0, 220) || '', sub: '' }}
      />

      {/* Index display */}
      <Text position={[0, 6.6, -halfD + 0.35]} fontSize={0.16} color={hex.muted} anchorX="center" anchorY="middle">
        Thẻ {index + 1} / {order.length}
      </Text>

      {/* Controls — rounded buttons just in front of teacher's desk */}
      <group position={[0, 0, -4]}>
        <RoundedButton position={[-4, 1.6, 0]} width={1.4} height={0.7} color={hex.muted} onClick={prev} disabled={index === 0} label="← Trước" />
        <RoundedButton position={[-2.2, 1.6, 0]} width={1.6} height={0.7} color={hex.danger} onClick={() => mark('unknown')} label="✗ Chưa thuộc" />
        <RoundedButton position={[0, 1.6, 0]} width={1.6} height={0.7} color={hex.primary} onClick={() => mark('known')} label="✓ Đã thuộc" />
        <RoundedButton position={[2.2, 1.6, 0]} width={1.4} height={0.7} color={hex.accent} onClick={() => { setOrder(shuffle(order)); setIndex(0); setFlipped(false); }} label="⇄ Xáo" />
        <RoundedButton position={[4, 1.6, 0]} width={1.4} height={0.7} color={hex.secondary} onClick={next} disabled={index >= order.length - 1} label="Sau →" />
      </group>

      <Text position={[0, 0.4, -3]} fontSize={0.12} color={hex.muted} anchorX="center" anchorY="middle">
        Click thẻ hoặc Space để lật · ← → chuyển · 1 / 2 đánh dấu
      </Text>
    </group>
  );
}

/** Rounded button using RoundedBox */
function RoundedButton({ position, width, height, color, onClick, label, disabled }: {
  position: [number, number, number]; width: number; height: number; color: string;
  onClick: () => void; label: string; disabled?: boolean;
}) {
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}>
      <RoundedBox args={[width, height, 0.2]} radius={0.12} smoothness={4} castShadow>
        <meshStandardMaterial color={disabled ? '#999' : color} roughness={0.5} />
      </RoundedBox>
      <Text position={[0, 0, 0.14]} fontSize={0.16} color="#fff" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

function FlashCard3D({
  position, flipped, onClick, front, back
}: {
  position: [number, number, number]; flipped: boolean; onClick: () => void;
  front: { title: string; sub: string }; back: { title: string; sub: string };
}) {
  const grpRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!grpRef.current) return;
    const target = flipped ? Math.PI : 0;
    grpRef.current.rotation.y = THREE.MathUtils.damp(grpRef.current.rotation.y, target, 2.5, delta);
  });

  // ONE solid slab. Face graphics live on thin single-sided panels offset
  // just outside each face (+Z front, -Z back) so there is never a pair of
  // coplanar surfaces fighting for the same depth — that z-fight was the
  // "cloth ripple" artifact while flipping.
  return (
    <group ref={grpRef} position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* Solid card body */}
      <RoundedBox args={[4, 2.6, 0.16]} radius={0.15} smoothness={4} castShadow>
        <meshStandardMaterial color="#EFE6D2" roughness={0.5} />
      </RoundedBox>

      {/* FRONT face (+Z) */}
      <group>
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[3.86, 2.46]} />
          <meshStandardMaterial color="#FAF4E8" roughness={0.4} />
        </mesh>
        <Text position={[0, 0.5, 0.1]} fontSize={0.34} color={hex.primary} anchorX="center" anchorY="middle" maxWidth={3.6} textAlign="center">
          {front.title}
        </Text>
        <Text position={[0, -0.4, 0.1]} fontSize={0.13} color={hex.muted} anchorX="center" anchorY="middle">
          {front.sub}
        </Text>
        <Text position={[0, -0.95, 0.1]} fontSize={0.1} color={hex.muted} anchorX="center" anchorY="middle">
          (click để xem định nghĩa)
        </Text>
      </group>

      {/* BACK face (-Z) — panel + text rotated to read correctly from behind */}
      <group rotation-y={Math.PI}>
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[3.86, 2.46]} />
          <meshStandardMaterial color={hex.primarySoft} roughness={0.4} />
        </mesh>
        <Text position={[0, 0.5, 0.1]} fontSize={0.16} color={hex.text} anchorX="center" anchorY="middle" maxWidth={3.6} textAlign="center" lineHeight={1.4}>
          {back.title}
        </Text>
        <Text position={[0, -0.6, 0.1]} fontSize={0.11} color={hex.muted} anchorX="center" anchorY="middle" maxWidth={3.4} textAlign="center" fontStyle="italic">
          {back.sub}
        </Text>
      </group>
    </group>
  );
}
