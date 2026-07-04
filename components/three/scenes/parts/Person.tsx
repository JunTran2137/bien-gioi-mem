'use client';

import { useMemo } from 'react';

const CLOTHES = [
  '#E05C5C', '#4A90D9', '#F4A261', '#2E8B6B', '#9C5BC0', '#FFA89C',
  '#5BA0E0', '#F4C542', '#FFB5C5', '#A5E5C8', '#FFFFFF', '#3A3F4A',
  '#7AB87A', '#D45050', '#5680C2', '#E08C3A'
];
const SKINS = ['#F5D0A8', '#E8B890', '#D8A878', '#C99068', '#B07A5A'];
const HAIRS = ['#1A1A1A', '#2A1A0A', '#3A2A1A', '#5A4030', '#8B6B45', '#3A2520'];
const PANTS = ['#2A3F5C', '#3A3F4A', '#1F1F2A', '#5C3D2A', '#3A2D1A', '#4A4A55'];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(Math.floor(seed * 1000)) % arr.length];
}

export interface PersonProps {
  position: [number, number, number];
  rotationY?: number;
  cloth?: string;
  skin?: string;
  hair?: string;
  pants?: string;
  scale?: number;
  pose?: 'stand' | 'sit';
  gender?: 'male' | 'female' | 'auto';
  seed?: number;
}

/**
 * Realistic humanoid: proper 7.5-head proportions, tapered torso,
 * detailed face (eyes/nose/mouth/ears/brows), hands with finger hints,
 * shoes with toe/heel, hair volume. Body faces +Z.
 */
export function Person({
  position, rotationY = 0,
  cloth, skin, hair, pants,
  scale = 1, pose = 'stand', gender = 'auto', seed = Math.random()
}: PersonProps) {
  const c = useMemo(() => cloth || pick(CLOTHES, seed), [cloth, seed]);
  const sk = useMemo(() => skin || pick(SKINS, seed * 1.3), [skin, seed]);
  const hr = useMemo(() => hair || pick(HAIRS, seed * 1.7), [hair, seed]);
  const pn = useMemo(() => pants || pick(PANTS, seed * 2.1), [pants, seed]);
  const g = gender === 'auto' ? (seed > 0.5 ? 'female' : 'male') : gender;

  return (
    <group position={position} rotation-y={rotationY} scale={scale}>
      <Body cloth={c} skin={sk} hair={hr} pants={pn} pose={pose} gender={g} seed={seed} />
    </group>
  );
}

function Body({
  cloth, skin, hair, pants, pose, gender, seed
}: {
  cloth: string; skin: string; hair: string; pants: string;
  pose: 'stand' | 'sit'; gender: 'male' | 'female'; seed: number;
}) {
  const sit = pose === 'sit';
  // Female slightly shorter & narrower shoulders, longer hair
  const shoulderW = gender === 'female' ? 0.36 : 0.42;
  const hipW = gender === 'female' ? 0.32 : 0.30;
  const longHair = gender === 'female' && (seed * 7 % 1) > 0.4;

  return (
    <>
      {/* === SHOES === */}
      {sit ? (
        <>
          <Shoe x={0.11} y={0.05} z={0.78} />
          <Shoe x={-0.11} y={0.05} z={0.78} />
        </>
      ) : (
        <>
          <Shoe x={0.11} y={0.04} z={0.08} />
          <Shoe x={-0.11} y={0.04} z={0.08} />
        </>
      )}

      {/* === LEGS === */}
      {sit ? (
        <>
          {/* upper legs (thighs) horizontal forward */}
          <Limb fromX={0.11} fromY={0.86} fromZ={0.05} toX={0.11} toY={0.78} toZ={0.55} r1={0.095} r2={0.085} color={pants} />
          <Limb fromX={-0.11} fromY={0.86} fromZ={0.05} toX={-0.11} toY={0.78} toZ={0.55} r1={0.095} r2={0.085} color={pants} />
          {/* lower legs vertical */}
          <Limb fromX={0.11} fromY={0.78} fromZ={0.55} toX={0.11} toY={0.12} toZ={0.7} r1={0.082} r2={0.07} color={pants} />
          <Limb fromX={-0.11} fromY={0.78} fromZ={0.55} toX={-0.11} toY={0.12} toZ={0.7} r1={0.082} r2={0.07} color={pants} />
        </>
      ) : (
        <>
          <Limb fromX={0.11} fromY={0.82} fromZ={0} toX={0.11} toY={0.08} toZ={0} r1={0.1} r2={0.075} color={pants} />
          <Limb fromX={-0.11} fromY={0.82} fromZ={0} toX={-0.11} toY={0.08} toZ={0} r1={0.1} r2={0.075} color={pants} />
        </>
      )}

      {/* === HIPS / BELT === */}
      <mesh position={[0, sit ? 0.92 : 0.88, sit ? 0.05 : 0]} castShadow>
        <boxGeometry args={[hipW + 0.04, 0.18, 0.26]} />
        <meshStandardMaterial color={pants} roughness={0.75} />
      </mesh>
      {/* belt strip */}
      <mesh position={[0, sit ? 1.0 : 0.96, sit ? 0.16 : 0.13]}>
        <boxGeometry args={[hipW + 0.045, 0.04, 0.01]} />
        <meshStandardMaterial color="#2A2018" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* === TORSO === tapered (broader top, narrower waist) */}
      {/* Lower torso */}
      <mesh position={[0, sit ? 1.18 : 1.13, sit ? 0.05 : 0]} castShadow>
        <cylinderGeometry args={[hipW * 0.95, hipW, 0.4, 16]} />
        <meshStandardMaterial color={cloth} roughness={0.7} />
      </mesh>
      {/* Upper torso (chest) */}
      <mesh position={[0, sit ? 1.46 : 1.42, sit ? 0.05 : 0]} castShadow>
        <cylinderGeometry args={[shoulderW * 0.9, hipW * 0.95, 0.45, 16]} />
        <meshStandardMaterial color={cloth} roughness={0.7} />
      </mesh>
      {/* Shoulder caps */}
      <mesh position={[shoulderW * 0.78, sit ? 1.58 : 1.55, sit ? 0.05 : 0]} castShadow>
        <sphereGeometry args={[0.13, 14, 12]} />
        <meshStandardMaterial color={cloth} roughness={0.7} />
      </mesh>
      <mesh position={[-shoulderW * 0.78, sit ? 1.58 : 1.55, sit ? 0.05 : 0]} castShadow>
        <sphereGeometry args={[0.13, 14, 12]} />
        <meshStandardMaterial color={cloth} roughness={0.7} />
      </mesh>
      {/* Collar / shirt opening */}
      <mesh position={[0, sit ? 1.66 : 1.63, sit ? 0.13 : 0.08]}>
        <boxGeometry args={[0.13, 0.07, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>

      {/* === ARMS === */}
      {/* Upper arm L (cloth) */}
      <Limb fromX={shoulderW * 0.85} fromY={sit ? 1.55 : 1.5} fromZ={sit ? 0.05 : 0}
            toX={shoulderW * 0.85} toY={sit ? 1.15 : 1.1} toZ={sit ? 0.05 : 0}
            r1={0.075} r2={0.065} color={cloth} />
      <Limb fromX={-shoulderW * 0.85} fromY={sit ? 1.55 : 1.5} fromZ={sit ? 0.05 : 0}
            toX={-shoulderW * 0.85} toY={sit ? 1.15 : 1.1} toZ={sit ? 0.05 : 0}
            r1={0.075} r2={0.065} color={cloth} />
      {/* Forearm L (skin) */}
      <Limb fromX={shoulderW * 0.85} fromY={sit ? 1.15 : 1.1} fromZ={sit ? 0.05 : 0}
            toX={shoulderW * 0.85} toY={sit ? 0.78 : 0.75} toZ={sit ? 0.05 : 0}
            r1={0.065} r2={0.055} color={skin} />
      <Limb fromX={-shoulderW * 0.85} fromY={sit ? 1.15 : 1.1} fromZ={sit ? 0.05 : 0}
            toX={-shoulderW * 0.85} toY={sit ? 0.78 : 0.75} toZ={sit ? 0.05 : 0}
            r1={0.065} r2={0.055} color={skin} />
      {/* Hands */}
      <Hand x={shoulderW * 0.85} y={sit ? 0.73 : 0.7} z={sit ? 0.05 : 0} skin={skin} />
      <Hand x={-shoulderW * 0.85} y={sit ? 0.73 : 0.7} z={sit ? 0.05 : 0} skin={skin} />

      {/* === NECK === */}
      <mesh position={[0, sit ? 1.75 : 1.72, sit ? 0.05 : 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.085, 0.12, 12]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>

      {/* === HEAD === */}
      <Head skin={skin} hair={hair} y={sit ? 1.98 : 1.95} z={sit ? 0.05 : 0} longHair={longHair} />
    </>
  );
}

/** Tapered cylinder connecting two points — for arms/legs. */
function Limb({
  fromX, fromY, fromZ, toX, toY, toZ, r1, r2, color
}: {
  fromX: number; fromY: number; fromZ: number;
  toX: number; toY: number; toZ: number;
  r1: number; r2: number; color: string;
}) {
  const dx = toX - fromX, dy = toY - fromY, dz = toZ - fromZ;
  const len = Math.hypot(dx, dy, dz);
  const mx = (fromX + toX) / 2;
  const my = (fromY + toY) / 2;
  const mz = (fromZ + toZ) / 2;
  // Cylinder default points up (+Y). Rotation: up × v
  const vx = dx / len, vy = dy / len, vz = dz / len;
  const ax = vz;          // (0,1,0) × (vx,vy,vz) = (vz, 0, -vx)
  const ay = 0;
  const az = -vx;
  const axisLen = Math.hypot(ax, ay, az);
  const angle = Math.acos(Math.max(-1, Math.min(1, vy)));
  const q: [number, number, number, number] = axisLen > 1e-5
    ? [Math.sin(angle / 2) * ax / axisLen, Math.sin(angle / 2) * ay / axisLen, Math.sin(angle / 2) * az / axisLen, Math.cos(angle / 2)]
    : [0, 0, 0, 1];

  return (
    <group position={[mx, my, mz]} quaternion={q}>
      <mesh castShadow>
        <cylinderGeometry args={[r2, r1, len, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Hand({ x, y, z, skin }: { x: number; y: number; z: number; skin: string }) {
  return (
    <group position={[x, y, z]}>
      {/* palm */}
      <mesh castShadow>
        <boxGeometry args={[0.07, 0.11, 0.05]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      {/* finger hint clusters */}
      <mesh position={[0, -0.075, 0]} castShadow>
        <boxGeometry args={[0.065, 0.05, 0.04]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      {/* thumb */}
      <mesh position={[x > 0 ? 0.035 : -0.035, -0.02, 0]} castShadow>
        <sphereGeometry args={[0.022, 8, 6]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Shoe({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      {/* heel block */}
      <mesh position={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[0.15, 0.07, 0.14]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.4} />
      </mesh>
      {/* toe cap (slightly raised + tapered) */}
      <mesh position={[0, 0.01, 0.08]} castShadow>
        <boxGeometry args={[0.15, 0.08, 0.16]} />
        <meshStandardMaterial color="#0D0D0D" roughness={0.35} />
      </mesh>
      {/* sole */}
      <mesh position={[0, -0.04, 0.01]}>
        <boxGeometry args={[0.16, 0.025, 0.32]} />
        <meshStandardMaterial color="#5A4030" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Head({
  skin, hair, y, z, longHair
}: { skin: string; hair: string; y: number; z: number; longHair: boolean }) {
  return (
    <group position={[0, y, z]}>
      {/* === SKULL === slightly elongated for human proportions */}
      <mesh castShadow scale={[1, 1.15, 1.05]}>
        <sphereGeometry args={[0.16, 20, 16]} />
        <meshStandardMaterial color={skin} roughness={0.65} />
      </mesh>
      {/* jaw / chin */}
      <mesh position={[0, -0.12, 0.02]} scale={[0.85, 0.6, 0.9]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color={skin} roughness={0.65} />
      </mesh>

      {/* === HAIR === */}
      <mesh position={[0, 0.06, -0.015]} scale={[1.05, 1.0, 1.1]}>
        <sphereGeometry args={[0.17, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={hair} roughness={0.95} />
      </mesh>
      {/* Side hair sweep */}
      <mesh position={[0.11, 0.02, 0.05]} scale={[0.5, 0.7, 0.5]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color={hair} roughness={0.95} />
      </mesh>
      <mesh position={[-0.11, 0.02, 0.05]} scale={[0.5, 0.7, 0.5]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color={hair} roughness={0.95} />
      </mesh>
      {/* Fringe over forehead */}
      <mesh position={[0, 0.07, 0.13]} scale={[1.0, 0.5, 0.6]}>
        <sphereGeometry args={[0.085, 10, 8]} />
        <meshStandardMaterial color={hair} roughness={0.95} />
      </mesh>
      {/* Long hair (back, optional) */}
      {longHair && (
        <mesh position={[0, -0.08, -0.08]} scale={[1.1, 1.6, 0.5]}>
          <sphereGeometry args={[0.16, 14, 12]} />
          <meshStandardMaterial color={hair} roughness={0.95} />
        </mesh>
      )}

      {/* === EYES === */}
      {/* eye sockets (slight indent) */}
      <mesh position={[0.06, 0.02, 0.15]}>
        <sphereGeometry args={[0.032, 12, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>
      <mesh position={[-0.06, 0.02, 0.15]}>
        <sphereGeometry args={[0.032, 12, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>
      {/* iris */}
      <mesh position={[0.06, 0.02, 0.175]}>
        <sphereGeometry args={[0.017, 10, 8]} />
        <meshStandardMaterial color="#3A4A6B" />
      </mesh>
      <mesh position={[-0.06, 0.02, 0.175]}>
        <sphereGeometry args={[0.017, 10, 8]} />
        <meshStandardMaterial color="#3A4A6B" />
      </mesh>
      {/* pupil */}
      <mesh position={[0.06, 0.02, 0.185]}>
        <sphereGeometry args={[0.009, 8, 6]} />
        <meshStandardMaterial color="#0A0A0A" />
      </mesh>
      <mesh position={[-0.06, 0.02, 0.185]}>
        <sphereGeometry args={[0.009, 8, 6]} />
        <meshStandardMaterial color="#0A0A0A" />
      </mesh>
      {/* eyelids (slight darker arc above) */}
      <mesh position={[0.06, 0.045, 0.17]}>
        <boxGeometry args={[0.06, 0.008, 0.01]} />
        <meshStandardMaterial color={shade(skin, -0.2)} />
      </mesh>
      <mesh position={[-0.06, 0.045, 0.17]}>
        <boxGeometry args={[0.06, 0.008, 0.01]} />
        <meshStandardMaterial color={shade(skin, -0.2)} />
      </mesh>

      {/* === EYEBROWS === */}
      <mesh position={[0.06, 0.075, 0.165]} rotation-z={0.05}>
        <boxGeometry args={[0.05, 0.014, 0.014]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      <mesh position={[-0.06, 0.075, 0.165]} rotation-z={-0.05}>
        <boxGeometry args={[0.05, 0.014, 0.014]} />
        <meshStandardMaterial color={hair} />
      </mesh>

      {/* === NOSE === bridge + tip */}
      <mesh position={[0, -0.005, 0.17]} scale={[0.6, 1.5, 1]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshStandardMaterial color={shade(skin, -0.05)} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.04, 0.19]}>
        <sphereGeometry args={[0.025, 10, 8]} />
        <meshStandardMaterial color={shade(skin, -0.05)} roughness={0.7} />
      </mesh>

      {/* === MOUTH === lips */}
      <mesh position={[0, -0.085, 0.17]} scale={[1, 0.5, 0.6]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshStandardMaterial color="#9C4040" roughness={0.4} />
      </mesh>

      {/* === EARS === */}
      <mesh position={[0.165, 0.005, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.6]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[-0.165, 0.005, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.6]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Darken/lighten a hex color by amount in [-1, 1]. */
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n + amt * 255)));
  return '#' + [f(r), f(g), f(b)].map(n => n.toString(16).padStart(2, '0')).join('');
}
