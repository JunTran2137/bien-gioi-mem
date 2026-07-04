'use client';

import { useState, useRef, useMemo, useLayoutEffect } from 'react';
import { VnText as Text } from '../primitives/VnText';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { theoryContent } from '@/data/theoryContent';
import { hex, palette } from '@/lib/three/theme';
import { Button3D } from '../primitives/Button3D';
import { InteriorRoom } from './parts/InteriorRoom';
import { Person } from './parts/Person';
import { Walker } from './parts/Walker';

const POS: [number, number, number] = [-34, 0, -34];
const ROOM_W = 36;
const ROOM_D = 30;
const ROOM_H = 10;

// Bookshelves rise nearly to the ceiling; their geometric centre sits at SHELF_H/2.
const SHELF_H = 9.4;
const SHELF_Y = SHELF_H / 2;

export function LibraryScene() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = theoryContent[activeIdx];

  // Concise nav labels so chapter buttons never truncate mid-word.
  const NAV_TITLES = [
    'Khái niệm biên giới mềm',
    'Hội nhập kinh tế quốc tế',
    'Việt Nam trong hội nhập',
    'Thách thức & nghịch lý',
    'Giải pháp & tự chủ',
    'Kết luận',
  ];

  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;

  // All bookshelf placements (4 walls + 2 back-to-back middle rows) computed once
  // and rendered as a few InstancedMeshes instead of ~59 React shelves × ~191
  // meshes each (~11k meshes) — that mesh explosion was the dominant build/nav lag.
  const shelfPlacements = useMemo(() => {
    const out: { x: number; y: number; z: number; rot: number }[] = [];
    const Z9 = [-13.33, -10, -6.67, -3.33, 0, 3.33, 6.67, 10, 13.33];
    const X11 = [-16.36, -13.09, -9.82, -6.55, -3.27, 0, 3.27, 6.55, 9.82, 13.09, 16.36];
    const X10 = [-16.36, -13.09, -9.82, -6.55, -3.27, 3.27, 6.55, 9.82, 13.09, 16.36];
    Z9.forEach((z) => out.push({ x: -halfW + 0.4, y: SHELF_Y, z, rot: Math.PI / 2 }));
    Z9.forEach((z) => out.push({ x: halfW - 0.4, y: SHELF_Y, z, rot: -Math.PI / 2 }));
    X11.forEach((x) => out.push({ x, y: SHELF_Y, z: -halfD + 0.4, rot: 0 }));
    X10.forEach((x) => out.push({ x, y: SHELF_Y, z: halfD - 0.4, rot: Math.PI }));
    ([-9, 9] as number[]).forEach((xc) =>
      [-6.8, -3.4, 0, 3.4, 6.8].forEach((z) => {
        out.push({ x: xc + 0.3, y: SHELF_Y, z, rot: Math.PI / 2 });
        out.push({ x: xc - 0.3, y: SHELF_Y, z, rot: -Math.PI / 2 });
      })
    );
    return out;
  }, [halfW, halfD]);

  return (
    <group position={POS}>
      <InteriorRoom
        width={ROOM_W}
        depth={ROOM_D}
        height={ROOM_H}
        floorColor="#7A5A38"
        wallColor="#F4E4C8"
        ceilingColor="#FFFAEC"
      />

      {/* Carpet runner */}
      <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[6, ROOM_D - 2]} />
        <meshStandardMaterial color="#7B2F2F" roughness={0.9} />
      </mesh>

      {/* === Bookshelves on ALL 4 walls + middle rows — one set of InstancedMeshes === */}
      <InstancedShelves placements={shelfPlacements} />

      {/* === Closed double door filling the entrance gap (front wall +Z) === */}
      <group position={[0, 0, halfD - 0.5]}>
        {/* frame: posts + lintel */}
        <mesh position={[-1.75, 2.9, 0]} castShadow><boxGeometry args={[0.3, 5.8, 0.45]} /><meshStandardMaterial color="#3F2A1C" roughness={0.8} /></mesh>
        <mesh position={[1.75, 2.9, 0]} castShadow><boxGeometry args={[0.3, 5.8, 0.45]} /><meshStandardMaterial color="#3F2A1C" roughness={0.8} /></mesh>
        <mesh position={[0, 5.95, 0]} castShadow><boxGeometry args={[3.8, 0.4, 0.45]} /><meshStandardMaterial color="#3F2A1C" roughness={0.8} /></mesh>
        {/* two closed leaves */}
        {[-0.78, 0.78].map((dx, i) => (
          <group key={`leaf-${i}`} position={[dx, 2.85, -0.06]}>
            <mesh castShadow><boxGeometry args={[1.5, 5.5, 0.12]} /><meshStandardMaterial color="#6B4A2E" roughness={0.7} /></mesh>
            <mesh position={[0, 1.15, -0.08]}><boxGeometry args={[1.0, 1.9, 0.04]} /><meshStandardMaterial color="#553A22" /></mesh>
            <mesh position={[0, -1.15, -0.08]}><boxGeometry args={[1.0, 1.9, 0.04]} /><meshStandardMaterial color="#553A22" /></mesh>
            <mesh position={[dx > 0 ? -0.55 : 0.55, 0.1, -0.14]}><sphereGeometry args={[0.1, 12, 8]} /><meshStandardMaterial color="#C9A227" metalness={0.8} roughness={0.3} /></mesh>
          </group>
        ))}
      </group>
      {/* Transom panel above the door — continues the millwork up to shelf height */}
      <mesh position={[0, 7.7, halfD - 0.45]} castShadow><boxGeometry args={[3.6, 3.4, 0.3]} /><meshStandardMaterial color="#5C3D2A" roughness={0.85} /></mesh>

      {/* === 2 middle rows down the room are included in the instanced shelves above === */}

      {/* === One long connected reading table BEHIND content (z=-9) === */}
      <group position={[0, 0, -9]}>
        {/* Tabletop — raised for a proper library reading-table height */}
        <mesh position={[0, 1.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[16, 0.12, 1.6]} />
          <meshStandardMaterial color="#8B5A2A" roughness={0.7} />
        </mesh>
        {/* Table legs */}
        {[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map(x => (
          <group key={`leg-${x}`}>
            <mesh position={[x, 0.51, 0.65]}><boxGeometry args={[0.1, 1.02, 0.1]} /><meshStandardMaterial color="#5C3D2A" /></mesh>
            <mesh position={[x, 0.51, -0.65]}><boxGeometry args={[0.1, 1.02, 0.1]} /><meshStandardMaterial color="#5C3D2A" /></mesh>
          </group>
        ))}
        {/* Books + lamps */}
        {[-6, -3, 0, 3, 6].map((x, i) => (
          <group key={`bk-${i}`} position={[x, 0, 0]}>
            <mesh position={[0, 1.1, 0]} castShadow>
              <boxGeometry args={[0.55, 0.05, 0.4]} />
              <meshStandardMaterial color={['#A05C3C', '#3C5C8C', '#3C8C5C', '#8C3C5C', '#5C3C8C'][i % 5]} />
            </mesh>
            <mesh position={[0.5, 1.29, 0]}><cylinderGeometry args={[0.04, 0.04, 0.5, 8]} /><meshStandardMaterial color="#3a3a3a" /></mesh>
            <mesh position={[0.5, 1.59, 0]}>
              <coneGeometry args={[0.15, 0.18, 12]} />
              <meshStandardMaterial color="#FFE8A0" emissive="#FFE8A0" emissiveIntensity={0.7} />
            </mesh>
          </group>
        ))}
        {/* Seated readers — ZIGZAG: alternate +Z and -Z sides so they don't face each other directly */}
        {[
          { x: -6, side: 1 },   // +Z
          { x: -3, side: -1 },  // -Z
          { x: 0,  side: 1 },
          { x: 3,  side: -1 },
          { x: 6,  side: 1 },
        ].map((r, i) => {
          const cz = r.side * 1.3;
          const bz = r.side * 1.58;
          const rotY = r.side === 1 ? Math.PI : 0;
          return (
            <group key={`rd-${i}`}>
              {/* chair seat top y=0.85 to match Person sit-pose hip height */}
              <mesh position={[r.x, 0.82, cz]}><boxGeometry args={[0.55, 0.06, 0.5]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <mesh position={[r.x, 1.18, bz]}><boxGeometry args={[0.55, 0.6, 0.06]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <mesh position={[r.x + 0.22, 0.41, cz - r.side * 0.18]}><boxGeometry args={[0.04, 0.82, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <mesh position={[r.x - 0.22, 0.41, cz - r.side * 0.18]}><boxGeometry args={[0.04, 0.82, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <mesh position={[r.x + 0.22, 0.41, cz + r.side * 0.18]}><boxGeometry args={[0.04, 0.82, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <mesh position={[r.x - 0.22, 0.41, cz + r.side * 0.18]}><boxGeometry args={[0.04, 0.82, 0.04]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
              <Person position={[r.x, 0, cz]} pose="sit" rotationY={rotY} seed={i * 0.21 + 0.1} />
            </group>
          );
        })}
      </group>

      {/* === Decorative globes on pedestals === */}
      {([[-14, 0, 10], [14, 0, 10], [-14, 0, -10], [14, 0, -10]] as [number,number,number][]).map((p, i) => (
        <group key={`gl-${i}`} position={p}>
          <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.4, 0.5, 1, 12]} /><meshStandardMaterial color="#5C3D2A" /></mesh>
          <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.5, 24, 16]} /><meshStandardMaterial color="#4A90D9" emissive="#1A4A8C" emissiveIntensity={0.3} roughness={0.4} /></mesh>
        </group>
      ))}

      {/* === Hanging chandeliers === */}
      {[-8, 0, 8].map((x, i) => (
        <group key={`ch-${i}`} position={[x, ROOM_H - 0.2, -2]}>
          <mesh position={[0, -0.8, 0]}><cylinderGeometry args={[0.03, 0.03, 1.6, 8]} /><meshStandardMaterial color="#3a3a3a" /></mesh>
          <mesh position={[0, -1.7, 0]}><sphereGeometry args={[0.35, 16, 12]} /><meshStandardMaterial color="#FFE8A0" emissive="#FFE8A0" emissiveIntensity={0.8} /></mesh>
          {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, j) => (
            <mesh key={j} position={[Math.cos(a) * 0.5, -1.7, Math.sin(a) * 0.5]}>
              <sphereGeometry args={[0.12, 12, 8]} />
              <meshStandardMaterial color="#FFE8A0" emissive="#FFE8A0" emissiveIntensity={0.9} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Standing browsers near shelves */}
      <Person position={[-halfW + 2.5, 0, 6]} rotationY={-Math.PI / 2} seed={0.3} />
      <Person position={[halfW - 2.5, 0, -6]} rotationY={Math.PI / 2} seed={0.7} />
      <Person position={[6, 0, -halfD + 2]} rotationY={Math.PI} seed={0.5} />

      {/* Walking visitors browsing the aisles — kept clear of the full-height middle rows (x=±9, z=-8.5..8.5) */}
      <Walker waypoints={[[-12, 11.5], [12, 11.5], [12, 13.5], [-12, 13.5]]} speed={1.0} seed={0.18} phase={0} />
      <Walker waypoints={[[6, 10], [6, -2], [-6, -2], [-6, 10]]} speed={0.9} seed={0.52} phase={0.35} />
      <Walker waypoints={[[-15, -4], [-15, 6], [-11, 6], [-11, -4]]} speed={1.15} seed={0.81} phase={0.6} />
      <Walker waypoints={[[15, 6], [15, -4], [11, -4], [11, 6]]} speed={0.95} seed={0.4} phase={0.15} />

      <pointLight position={[0, 8, 2]} color="#FFE8B8" intensity={1.0} distance={22} decay={2} />
      <pointLight position={[-8, 6, -8]} color="#FFD4A0" intensity={0.7} distance={14} decay={2} />
      <pointLight position={[8, 6, -8]} color="#FFD4A0" intensity={0.7} distance={14} decay={2} />

      {theoryContent.slice(0, 6).map((sec, i) => (
        <Button3D
          key={sec.id}
          position={[-4, 5.85 - i * 0.86, 3]}
          width={2.4}
          height={0.9}
          radius={0.18}
          color={activeIdx === i ? palette.primary : palette.primarySoft}
          emissive={palette.primary}
          onClick={() => setActiveIdx(i)}
          ariaLabel={sec.title}
        >
          <Text position={[0, 0.12, 0.18]} fontSize={0.11} color={activeIdx === i ? '#fff' : '#000'} anchorX="center" anchorY="middle">
            Chương {i + 1}
          </Text>
          <Text position={[0, -0.07, 0.18]} fontSize={0.14} color={activeIdx === i ? '#fff' : '#000'} anchorX="center" anchorY="middle" maxWidth={2.25} lineHeight={1.0} textAlign="center">
            {NAV_TITLES[i]}
          </Text>
        </Button3D>
      ))}

      <ContentPanel section={active} />
    </group>
  );
}

const SHELF_W = 3.4;
const SHELF_D = 0.6;
const BOOK_COLORS = ['#A05C3C', '#3C5C8C', '#8C3C5C', '#3C8C5C', '#8C7C3C', '#5C3C8C', '#B05C3C', '#3C7C9C'];

/**
 * Renders every bookshelf (carcass + shelf boards + books) for the whole library
 * as just THREE InstancedMeshes. Previously each of the ~59 shelves was a React
 * group of ~191 meshes (10 boards + 180 books + carcass) → ~11k meshes rebuilt on
 * every visit to /theory, which dominated reload + navigation lag. All the
 * per-instance transforms are baked once with Matrix4 math.
 */
function InstancedShelves({ placements }: { placements: { x: number; y: number; z: number; rot: number }[] }) {
  const height = SHELF_H;
  const rows = Math.max(3, Math.round(height / 1.05));
  const rowGap = height / rows;
  const nShelf = placements.length;
  const nBoard = nShelf * (rows + 1);
  const nBook = nShelf * rows * 20;

  const carcassRef = useRef<THREE.InstancedMesh>(null);
  const boardRef = useRef<THREE.InstancedMesh>(null);
  const bookRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const carcass = carcassRef.current;
    const board = boardRef.current;
    const book = bookRef.current;
    if (!carcass || !board || !book) return;

    const shelfM = new THREE.Matrix4();
    const localM = new THREE.Matrix4();
    const outM = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const idq = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const lp = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const scl = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();

    let bi = 0;
    let ki = 0;
    placements.forEach((p, si) => {
      e.set(0, p.rot, 0);
      q.setFromEuler(e);
      pos.set(p.x, p.y, p.z);
      shelfM.compose(pos, q, one);
      carcass.setMatrixAt(si, shelfM);

      for (let i = 0; i < rows + 1; i++) {
        lp.set(0, -height / 2 + i * rowGap, 0.05);
        localM.compose(lp, idq, one);
        outM.multiplyMatrices(shelfM, localM);
        board.setMatrixAt(bi++, outM);
      }

      for (let row = 0; row < rows; row++) {
        for (let c = 0; c < 20; c++) {
          const h = 0.55 + ((row * 20 + c) % 4) * 0.07;
          const y = -height / 2 + row * rowGap + h / 2 + 0.05;
          lp.set(-1.5 + c * 0.155, y, 0.32);
          scl.set(1, h, 1);
          localM.compose(lp, idq, scl);
          outM.multiplyMatrices(shelfM, localM);
          book.setMatrixAt(ki, outM);
          book.setColorAt(ki, col.set(BOOK_COLORS[(row * 20 + c) % BOOK_COLORS.length]));
          ki++;
        }
      }
    });

    carcass.instanceMatrix.needsUpdate = true;
    board.instanceMatrix.needsUpdate = true;
    book.instanceMatrix.needsUpdate = true;
    if (book.instanceColor) book.instanceColor.needsUpdate = true;
  }, [placements, height, rows, rowGap]);

  return (
    <>
      <instancedMesh ref={carcassRef} args={[undefined, undefined, nShelf]} frustumCulled={false}>
        <boxGeometry args={[SHELF_W, height, SHELF_D]} />
        <meshStandardMaterial color="#5C3D2A" roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={boardRef} args={[undefined, undefined, nBoard]} frustumCulled={false}>
        <boxGeometry args={[SHELF_W - 0.06, 0.05, SHELF_D - 0.08]} />
        <meshStandardMaterial color="#3F2A1C" />
      </instancedMesh>
      <instancedMesh ref={bookRef} args={[undefined, undefined, nBook]} frustumCulled={false}>
        <boxGeometry args={[0.12, 1, 0.05]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </>
  );
}


function ContentPanel({ section }: { section: any }) {
  // Fixed, flat panel — no per-frame lookAt/bob so it never reads skewed
  // from the low entry angle. Front face (+Z) points straight at the camera.
  return (
    <group position={[2, 3.8, 3]}>
      <RoundedBox args={[7.6, 4.6, 0.25]} radius={0.18} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#fff" transparent opacity={0.99} roughness={0.15} clearcoat={0.7} metalness={0} />
      </RoundedBox>

      <Text position={[0, 2.0, 0.15]} fontSize={0.38} color="#000" anchorX="center" anchorY="top" maxWidth={7.3} textAlign="center" lineHeight={1.05}>
        {section.title}
      </Text>
      {section.intro && (
        <Text position={[0, 1.42, 0.15]} fontSize={0.225} color="#000" anchorX="center" anchorY="top" maxWidth={6.9} textAlign="center" lineHeight={1.12}>
          {section.intro}
        </Text>
      )}

      <Text position={[0, section.intro ? 0.62 : 1.42, 0.15]} fontSize={0.2} color="#000" anchorX="center" anchorY="top" maxWidth={6.9} textAlign="left" lineHeight={1.18}>
        {(section.paragraphs[0] || '').slice(0, 360) + (section.paragraphs[0]?.length > 360 ? '…' : '')}
      </Text>

      {section.callout && (
        <group position={[0, -1.42, 0.05]}>
          <RoundedBox args={[6.9, 1.1, 0.1]} radius={0.12} smoothness={4}>
            <meshStandardMaterial color={hex.primarySoft} />
          </RoundedBox>
          <Text position={[0, 0, 0.1]} fontSize={0.165} color="#000" anchorX="center" anchorY="middle" maxWidth={6.5} fontStyle="italic" textAlign="center" lineHeight={1.12}>
            &quot;{section.callout.text.slice(0, 180)}{section.callout.text.length > 180 ? '…' : ''}&quot;
          </Text>
        </group>
      )}
    </group>
  );
}
