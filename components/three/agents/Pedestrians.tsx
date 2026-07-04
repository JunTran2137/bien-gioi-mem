'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roadAxes } from '@/lib/three/cityLayout';
import { canProceed, clampToStopLine, type SignalAxis } from '@/lib/three/traffic';

/** Junction coordinates along any pavement (the perpendicular grid axes). */
const ROAD_AXES = roadAxes();

interface Segment { from: [number, number]; to: [number, number] }

interface Props {
  count: number;
  segments: Segment[];
  /** Lower-detail render: no facial features, smaller geometry segments. */
  simple?: boolean;
}

const CLOTHES = [
  '#E05C5C', '#4A90D9', '#F4A261', '#2E8B6B',
  '#9C5BC0', '#FFA89C', '#5BA0E0', '#F4C542',
  '#FFB5C5', '#A5E5C8', '#FFFFFF', '#3A3F4A'
];
const SKINS = ['#F0C8A0', '#D8A878', '#E8B890', '#C09060'];
const HAIRS = ['#3A2A1A', '#2A1A0A', '#5A4030', '#1A1A1A', '#8B6B45'];
const PANTS = ['#2A3F5C', '#3A3F4A', '#1F1F2A', '#5C3D2A', '#3A2D1A'];

interface PedConfig {
  segIndex: number;
  speed: number;
  offset: number;
  laneOffset: number;
  cloth: string;
  skin: string;
  hair: string;
  pants: string;
  scale: number;
}

export function Pedestrians({ count, segments, simple = false }: Props) {
  const peds = useMemo<PedConfig[]>(() => {
    const arr: PedConfig[] = [];
    for (let i = 0; i < count; i++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      arr.push({
        segIndex: i % segments.length,
        speed: 0.012 + Math.random() * 0.018,
        offset: Math.random(),
        laneOffset: dir * (1.8 + Math.random() * 0.4),
        cloth: CLOTHES[Math.floor(Math.random() * CLOTHES.length)],
        skin: SKINS[Math.floor(Math.random() * SKINS.length)],
        hair: HAIRS[Math.floor(Math.random() * HAIRS.length)],
        pants: PANTS[Math.floor(Math.random() * PANTS.length)],
        scale: 0.85 + Math.random() * 0.25
      });
    }
    return arr;
  }, [count, segments.length]);

  return (
    <group>
      {peds.map((p, i) => <Pedestrian key={i} cfg={p} segments={segments} simple={simple} />)}
    </group>
  );
}

function Pedestrian({ cfg, segments, simple }: { cfg: PedConfig; segments: Segment[]; simple: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);

  const seg = segments[cfg.segIndex];
  const [ax, az] = seg.from;
  const [bx, bz] = seg.to;
  const vertical = ax === bx;

  // Travel coordinate along the pavement; junctions are the perpendicular axes.
  const cMin = (vertical ? Math.min(az, bz) : Math.min(ax, bx)) + 1;
  const cMax = (vertical ? Math.max(az, bz) : Math.max(ax, bx)) - 1;
  const fixed = vertical ? ax : az;
  const axisName: SignalAxis = vertical ? 'NS' : 'EW';
  const span = Math.max(cMax - cMin, 0.001);

  const cRef = useRef(cMin + (cfg.offset % 1) * span);
  const dirRef = useRef<number>(cfg.laneOffset > 0 ? 1 : -1);
  const vel = 2 * span * cfg.speed;
  const STOP_GAP = 2.6;

  // Throttle to ~30fps on low-detail agents to cut per-frame work in half.
  const acc = useRef(0);
  const interval = simple ? 1 / 30 : 0;

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    let dt = delta;
    if (interval > 0) {
      acc.current += delta;
      if (acc.current < interval) return;
      dt = acc.current;
      acc.current = 0;
    }
    dt = Math.min(dt, 0.06);
    const t = clock.elapsedTime;

    const c = cRef.current;
    let dir = dirRef.current;
    let proposed = c + dir * vel * dt;
    if (proposed >= cMax) { proposed = cMax; dir = -1; }
    else if (proposed <= cMin) { proposed = cMin; dir = 1; }

    // Wait at the kerb before crossing when the light is red for this axis.
    if (!canProceed(axisName, t)) {
      proposed = clampToStopLine(c, proposed, dir, ROAD_AXES, STOP_GAP);
    }
    cRef.current = proposed;
    dirRef.current = dir;
    const moving = Math.abs(proposed - c) > 1e-4;

    const cx = vertical ? fixed - cfg.laneOffset : proposed;
    const cz = vertical ? proposed : fixed + cfg.laneOffset;

    // One sine drives both the vertical bob and the limb swing (frozen if idle).
    const s = Math.sin(clock.elapsedTime * 4 + cfg.offset);
    ref.current.position.set(cx, moving ? Math.abs(s) * 0.04 : 0, cz);
    const vx = vertical ? 0 : dir;
    const vz = vertical ? dir : 0;
    ref.current.rotation.y = Math.atan2(vx, vz);

    // Skip limb articulation entirely for low-detail pedestrians.
    if (simple) return;
    const swing = moving ? s * 0.45 : 0;
    if (armLRef.current) armLRef.current.rotation.x = swing;
    if (armRRef.current) armRRef.current.rotation.x = -swing;
    if (legLRef.current) legLRef.current.rotation.x = -swing;
    if (legRRef.current) legRRef.current.rotation.x = swing;
  });

  // Geometry segments scale with detail level.
  const SS = simple ? 6 : 12; // sphere segments lat
  const SR = simple ? 4 : 10; // sphere segments lon
  const CS = simple ? 6 : 10; // cylinder segments

  return (
    <group ref={ref} scale={cfg.scale}>
      {/* === LEGS (animated) === */}
      <group ref={legLRef} position={[0.11, 0.8, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.085, 0.075, 0.8, CS]} />
          <meshStandardMaterial color={cfg.pants} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.85, 0.05]}>
          <boxGeometry args={[0.16, 0.1, 0.32]} />
          <meshStandardMaterial color="#1A1A1A" />
        </mesh>
      </group>
      <group ref={legRRef} position={[-0.11, 0.8, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.085, 0.075, 0.8, CS]} />
          <meshStandardMaterial color={cfg.pants} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.85, 0.05]}>
          <boxGeometry args={[0.16, 0.1, 0.32]} />
          <meshStandardMaterial color="#1A1A1A" />
        </mesh>
      </group>

      {/* === HIPS === */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.32, 0.18, 0.22]} />
        <meshStandardMaterial color={cfg.pants} roughness={0.75} />
      </mesh>

      {/* === TORSO === */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.21, 0.24, 0.55, CS]} />
        <meshStandardMaterial color={cfg.cloth} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.27, SS, SR]} />
        <meshStandardMaterial color={cfg.cloth} roughness={0.65} />
      </mesh>

      {/* === ARMS (animated) === */}
      <group ref={armLRef} position={[0.3, 1.5, 0]}>
        <mesh position={[0, -0.21, 0]}>
          <cylinderGeometry args={[0.065, 0.06, 0.42, CS]} />
          <meshStandardMaterial color={cfg.cloth} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.38, CS]} />
          <meshStandardMaterial color={cfg.skin} roughness={0.7} />
        </mesh>
        {!simple && (
          <mesh position={[0, -0.82, 0]}>
            <sphereGeometry args={[0.075, SS, SR]} />
            <meshStandardMaterial color={cfg.skin} roughness={0.7} />
          </mesh>
        )}
      </group>
      <group ref={armRRef} position={[-0.3, 1.5, 0]}>
        <mesh position={[0, -0.21, 0]}>
          <cylinderGeometry args={[0.065, 0.06, 0.42, CS]} />
          <meshStandardMaterial color={cfg.cloth} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.06, 0.055, 0.38, CS]} />
          <meshStandardMaterial color={cfg.skin} roughness={0.7} />
        </mesh>
        {!simple && (
          <mesh position={[0, -0.82, 0]}>
            <sphereGeometry args={[0.075, SS, SR]} />
            <meshStandardMaterial color={cfg.skin} roughness={0.7} />
          </mesh>
        )}
      </group>

      {/* === NECK === */}
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.07, 0.085, 0.12, CS]} />
        <meshStandardMaterial color={cfg.skin} roughness={0.7} />
      </mesh>

      {/* === HEAD with face === */}
      <group position={[0, 1.9, 0]}>
        <mesh>
          <sphereGeometry args={[0.18, SS, SR]} />
          <meshStandardMaterial color={cfg.skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.04, -0.02]}>
          <sphereGeometry args={[0.195, SS, SR, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={cfg.hair} roughness={0.9} />
        </mesh>
        {!simple && (
          <>
            <mesh position={[0, 0.05, 0.13]}>
              <sphereGeometry args={[0.075, 8, 6]} />
              <meshStandardMaterial color={cfg.hair} roughness={0.9} />
            </mesh>
            {/* eyes */}
            <mesh position={[0.07, 0.02, 0.155]}>
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[-0.07, 0.02, 0.155]}>
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0.07, 0.02, 0.175]}>
              <sphereGeometry args={[0.012, 6, 4]} />
              <meshBasicMaterial color="#1A1A1A" />
            </mesh>
            <mesh position={[-0.07, 0.02, 0.175]}>
              <sphereGeometry args={[0.012, 6, 4]} />
              <meshBasicMaterial color="#1A1A1A" />
            </mesh>
            {/* nose */}
            <mesh position={[0, -0.025, 0.18]}>
              <coneGeometry args={[0.018, 0.05, 6]} />
              <meshStandardMaterial color={cfg.skin} />
            </mesh>
            {/* mouth */}
            <mesh position={[0, -0.085, 0.165]}>
              <boxGeometry args={[0.06, 0.012, 0.005]} />
              <meshBasicMaterial color="#A04040" />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}
