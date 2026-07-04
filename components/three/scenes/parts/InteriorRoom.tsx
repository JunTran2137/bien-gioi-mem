'use client';

import { ReactNode } from 'react';

interface Props {
  /** Center of the room (matches the scene's POS). */
  position?: [number, number, number];
  width: number;
  depth: number;
  height: number;
  floorColor?: string;
  wallColor?: string;
  ceilingColor?: string;
  /** Add a window strip pattern on walls. */
  windows?: boolean;
  /** Number of windows per side wall (default 4). */
  windowCount?: number;
  /** 0..1 — how far apart the windows spread along the wall (1 = full, smaller = pulled toward centre). */
  windowSpread?: number;
  /** Window pane width (along the wall). Default 2.0. */
  windowW?: number;
  /** Window pane height. Default 2.4. */
  windowH?: number;
  /** Render decorative trim. */
  trim?: boolean;
  children?: ReactNode;
}

/** A 360° enclosed room — 4 walls + ceiling + floor that surround a scene's content. */
export function InteriorRoom({
  position = [0, 0, 0],
  width, depth, height,
  floorColor = '#E5DCC8',
  wallColor = '#F4EAD5',
  ceilingColor = '#FFFFFF',
  windows = false,
  windowCount = 4,
  windowSpread = 1,
  windowW = 2.0,
  windowH = 2.4,
  trim = true,
  children
}: Props) {
  const w = width / 2;
  const d = depth / 2;

  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, 0.005, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, height, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={ceilingColor} roughness={0.95} side={2} />
      </mesh>

      {/* Walls — back, front, left, right */}
      {/* back (-Z) */}
      <mesh position={[0, height / 2, -d]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} side={2} />
      </mesh>
      {/* front (+Z) */}
      <mesh position={[0, height / 2, d]} rotation-y={Math.PI}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} side={2} />
      </mesh>
      {/* left (-X) */}
      <mesh position={[-w, height / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} side={2} />
      </mesh>
      {/* right (+X) */}
      <mesh position={[w, height / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} side={2} />
      </mesh>

      {/* baseboard trim around the floor */}
      {trim && (
        <>
          <mesh position={[0, 0.15, -d + 0.05]}>
            <boxGeometry args={[width, 0.3, 0.08]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.15, d - 0.05]}>
            <boxGeometry args={[width, 0.3, 0.08]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[-w + 0.05, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.3, depth]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[w - 0.05, 0.15, 0]}>
            <boxGeometry args={[0.08, 0.3, depth]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </>
      )}

      {/* Optional window strips on side walls — 5:6 ratio (width 5, height 6) with frame mullions */}
      {windows && (
        <>
          {Array.from({ length: windowCount }).map((_, i) => {
            const denom = Math.max(1, windowCount - 1);
            const z = windowCount === 1 ? 0 : (-d + 1.2 + i * (depth - 2.4) / denom) * windowSpread;
            const yC = height * 0.55;
            const ww = windowW, wh = windowH; // pane size (configurable)
            return (
              <group key={`wL-${i}`} position={[-w + 0.06, 0, z]} rotation-y={Math.PI / 2}>
                {/* glass pane */}
                <mesh position={[0, yC, 0]}>
                  <planeGeometry args={[ww, wh]} />
                  <meshStandardMaterial color="#A8D8F0" emissive="#A8D8F0" emissiveIntensity={0.35} side={2} />
                </mesh>
                {/* outer frame */}
                {[
                  { p: [0, yC + wh / 2 + 0.05, 0.01] as [number, number, number], s: [ww + 0.2, 0.1, 0.04] as [number, number, number] },
                  { p: [0, yC - wh / 2 - 0.05, 0.01] as [number, number, number], s: [ww + 0.2, 0.1, 0.04] as [number, number, number] },
                  { p: [-ww / 2 - 0.05, yC, 0.01] as [number, number, number], s: [0.1, wh, 0.04] as [number, number, number] },
                  { p: [ww / 2 + 0.05, yC, 0.01] as [number, number, number], s: [0.1, wh, 0.04] as [number, number, number] }
                ].map((f, k) => (
                  <mesh key={k} position={f.p}><boxGeometry args={f.s} /><meshStandardMaterial color="#5C4636" /></mesh>
                ))}
                {/* cross mullion */}
                <mesh position={[0, yC, 0.02]}><boxGeometry args={[ww, 0.06, 0.04]} /><meshStandardMaterial color="#5C4636" /></mesh>
                <mesh position={[0, yC, 0.02]}><boxGeometry args={[0.06, wh, 0.04]} /><meshStandardMaterial color="#5C4636" /></mesh>
              </group>
            );
          })}
          {Array.from({ length: windowCount }).map((_, i) => {
            const denom = Math.max(1, windowCount - 1);
            const z = windowCount === 1 ? 0 : (-d + 1.2 + i * (depth - 2.4) / denom) * windowSpread;
            const yC = height * 0.55;
            const ww = windowW, wh = windowH;
            return (
              <group key={`wR-${i}`} position={[w - 0.06, 0, z]} rotation-y={-Math.PI / 2}>
                <mesh position={[0, yC, 0]}>
                  <planeGeometry args={[ww, wh]} />
                  <meshStandardMaterial color="#A8D8F0" emissive="#A8D8F0" emissiveIntensity={0.35} side={2} />
                </mesh>
                {[
                  { p: [0, yC + wh / 2 + 0.05, 0.01] as [number, number, number], s: [ww + 0.2, 0.1, 0.04] as [number, number, number] },
                  { p: [0, yC - wh / 2 - 0.05, 0.01] as [number, number, number], s: [ww + 0.2, 0.1, 0.04] as [number, number, number] },
                  { p: [-ww / 2 - 0.05, yC, 0.01] as [number, number, number], s: [0.1, wh, 0.04] as [number, number, number] },
                  { p: [ww / 2 + 0.05, yC, 0.01] as [number, number, number], s: [0.1, wh, 0.04] as [number, number, number] }
                ].map((f, k) => (
                  <mesh key={k} position={f.p}><boxGeometry args={f.s} /><meshStandardMaterial color="#5C4636" /></mesh>
                ))}
                <mesh position={[0, yC, 0.02]}><boxGeometry args={[ww, 0.06, 0.04]} /><meshStandardMaterial color="#5C4636" /></mesh>
                <mesh position={[0, yC, 0.02]}><boxGeometry args={[0.06, wh, 0.04]} /><meshStandardMaterial color="#5C4636" /></mesh>
              </group>
            );
          })}
        </>
      )}

      {/* ambient lights inside the room */}
      <ambientLight intensity={0.4} color="#FFF6E0" />
      <pointLight position={[0, height - 0.3, 0]} intensity={0.7} distance={Math.max(width, depth)} color="#FFE8B8" />

      {children}
    </group>
  );
}
