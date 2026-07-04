'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { roadAxes } from '@/lib/three/cityLayout';
import { canProceed, clampToStopLine, type SignalAxis } from '@/lib/three/traffic';

/** Junction coordinates along any road (the perpendicular grid axes). */
const ROAD_AXES = roadAxes();

interface Segment { from: [number, number]; to: [number, number] }

interface Props {
  count: number;
  segments: Segment[];
  /** Lower-detail render: skip wheel spin, headlights, windshield. */
  simple?: boolean;
}

const CAR_COLORS = [
  '#E05C5C', '#4A90D9', '#F4A261', '#2E8B6B',
  '#F4C542', '#9C5BC0', '#FFA89C', '#5BA0E0',
  '#FFFFFF', '#3A3F4A'
];

interface CarConfig {
  segIndex: number;
  startPad: number;
  endPad: number;
  color: string;
  speed: number;
  offset: number;
  laneOffset: number;
}

/** Cars driving along provided road segments. Forward / backward ping-pong. */
export function Cars({ count, segments, simple = false }: Props) {
  const cars = useMemo<CarConfig[]>(() => {
    const arr: CarConfig[] = [];
    for (let i = 0; i < count; i++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      arr.push({
        segIndex: i % segments.length,
        startPad: 4,
        endPad: 4,
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        speed: 0.014 + Math.random() * 0.018,
        offset: Math.random(),
        laneOffset: dir * 1.0
      });
    }
    return arr;
  }, [count, segments.length]);

  return (
    <group>
      {cars.map((c, i) => <Car key={i} cfg={c} segments={segments} simple={simple} />)}
    </group>
  );
}

function Car({ cfg, segments, simple }: { cfg: CarConfig; segments: Segment[]; simple: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);

  const seg = segments[cfg.segIndex];
  const [ax, az] = seg.from;
  const [bx, bz] = seg.to;
  const vertical = ax === bx;

  // Travel coordinate `c` runs along the road's main axis (z for vertical roads,
  // x for horizontal ones). Junctions sit at the perpendicular grid axes.
  const cMin = (vertical ? Math.min(az, bz) : Math.min(ax, bx)) + cfg.startPad;
  const cMax = (vertical ? Math.max(az, bz) : Math.max(ax, bx)) - cfg.endPad;
  const fixed = vertical ? ax : az;
  const axisName: SignalAxis = vertical ? 'NS' : 'EW';
  const span = Math.max(cMax - cMin, 0.001);

  const cRef = useRef(cMin + (cfg.offset % 1) * span);
  const dirRef = useRef<number>(cfg.laneOffset > 0 ? 1 : -1);
  const vel = 2 * span * cfg.speed; // world units / sec (≈ the old ping-pong rate)
  const STOP_GAP = 3.0;

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    const c = cRef.current;
    let dir = dirRef.current;
    let proposed = c + dir * vel * dt;

    // Ping-pong at the ends of the (possibly pruned) segment.
    if (proposed >= cMax) { proposed = cMax; dir = -1; }
    else if (proposed <= cMin) { proposed = cMin; dir = 1; }

    // Hold at the stop line before the next junction while the light is red.
    if (!canProceed(axisName, t)) {
      proposed = clampToStopLine(c, proposed, dir, ROAD_AXES, STOP_GAP);
    }

    cRef.current = proposed;
    dirRef.current = dir;

    const cx = vertical ? fixed + cfg.laneOffset : proposed;
    const cz = vertical ? proposed : fixed + cfg.laneOffset;
    ref.current.position.set(cx, 0.35, cz);

    const vx = vertical ? 0 : dir;
    const vz = vertical ? dir : 0;
    ref.current.rotation.y = Math.atan2(-vz, vx);

    if (!simple) {
      const moving = Math.abs(proposed - c) > 1e-4;
      if (moving) {
        const spin = clock.elapsedTime * 8 * dir;
        for (const w of wheelRefs.current) {
          if (w) w.rotation.x = spin;
        }
      }
    }
  });

  return (
    <group ref={ref}>
      {/* Body */}
      <RoundedBox args={[1.6, 0.5, 0.8]} radius={0.18} smoothness={3} position={[0, 0.25, 0]}>
        <meshStandardMaterial color={cfg.color} roughness={0.4} metalness={0.5} />
      </RoundedBox>
      {/* Cabin */}
      <RoundedBox args={[0.9, 0.45, 0.7]} radius={0.15} smoothness={3} position={[-0.1, 0.7, 0]}>
        <meshStandardMaterial color={cfg.color} roughness={0.3} metalness={0.6} />
      </RoundedBox>
      {!simple && (
        <RoundedBox args={[0.85, 0.42, 0.66]} radius={0.13} smoothness={3} position={[-0.08, 0.7, 0]}>
          <meshStandardMaterial color="#1B2333" roughness={0.2} metalness={0.4} transparent opacity={0.65} />
        </RoundedBox>
      )}
      {/* Wheels */}
      {[
        [0.5, 0.15, 0.4],
        [0.5, 0.15, -0.4],
        [-0.5, 0.15, 0.4],
        [-0.5, 0.15, -0.4]
      ].map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) wheelRefs.current[i] = el; }}
          position={[p[0], p[1], p[2]]}
          rotation-z={Math.PI / 2}
        >
          <cylinderGeometry args={[0.18, 0.18, 0.12, 8]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.9} />
        </mesh>
      ))}
      {!simple && (
        <>
          {/* Headlights */}
          <mesh position={[0.82, 0.3, 0.25]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshBasicMaterial color="#FFE8A0" />
          </mesh>
          <mesh position={[0.82, 0.3, -0.25]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshBasicMaterial color="#FFE8A0" />
          </mesh>
          {/* Tail lights */}
          <mesh position={[-0.82, 0.3, 0.25]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshBasicMaterial color="#E05C5C" />
          </mesh>
          <mesh position={[-0.82, 0.3, -0.25]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshBasicMaterial color="#E05C5C" />
          </mesh>
        </>
      )}
    </group>
  );
}
