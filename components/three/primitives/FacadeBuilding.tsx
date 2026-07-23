'use client';

import { useEffect, useMemo, useRef } from 'react';
import { RoundedBox, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import type { Archetype } from '@/lib/three/buildingArchetypes';
import { registerGlassMaterial, unregisterGlassMaterial } from '@/lib/three/nightWindows';

interface Props {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  rotation?: number;
  bodyColor: string;
  accentColor?: string;
  windowColor?: string;
  archetype: Archetype;
  /** Lower-detail render: thins out windows + drops minor trim. */
  simple?: boolean;
}

/* One soft RoundedBox volume in the silhouette (x/z let wings sit off-centre). */
type Mass = { y: number; h: number; w: number; d: number; r: number; color: string; x: number; z: number };
/* One framed window pane. */
type Pane = { x: number; y: number; z: number; rotY: number; sx: number; sy: number; warm: boolean };

type RoofKind =
  | 'pyramid' | 'hip' | 'spire' | 'gable'
  | 'flatStack' | 'parapet' | 'mech' | 'antenna'
  | 'dome' | 'tank';

/* Lively roof tones — the landmarks lean on warm terracotta / blue / green
 * roofs, which is most of what makes them read as "architecture". */
const ROOF_COLORS = ['#E05C5C', '#C97D40', '#4A90D9', '#2E8B6B', '#B5654A', '#7C6E8C', '#D98C5F', '#5E8C61'];

/* deterministic hash so every choice is stable across reloads. */
function hash(px: number, pz: number, salt: number): number {
  let a = (Math.floor(px * 73.1 + pz * 41.7) | 0) ^ (salt * 0x9e3779b1);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}

/* mix a hex colour toward white by t (0..1) for soft trim tiers. */
function lighten(hexColor: string, t: number): string {
  const n = parseInt(hexColor.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `#${((1 << 24) + (mix(r) << 16) + (mix(g) << 8) + mix(b)).toString(16).slice(1)}`;
}

/* Compose the silhouette as a stack of centred soft tiers (single coherent
 * building — exactly how the landmark towers are built). */
function buildMasses(W: number, D: number, H: number, sil: Archetype['silhouette'], body: string, trim: string, seed: number): Mass[] {
  const baseR = Math.min(0.55, Math.min(W, D) * 0.14);
  const m = (y: number, h: number, w: number, d: number, color: string, r = baseR, x = 0, z = 0): Mass => ({ y, h, w, d, r, color, x, z });
  switch (sil) {
    case 'taper': {
      const n = 5, out: Mass[] = [];
      let y = 0;
      for (let i = 0; i < n; i++) {
        const f = 1 - i * 0.13;
        const hh = H * (0.27 - i * 0.03);
        out.push(m(y, hh + 0.02, W * f, D * f, i % 2 ? trim : body));
        y += hh;
      }
      return out;
    }
    case 'stepped':
      return [
        m(0, H * 0.42, W, D, body),
        m(H * 0.42, H * 0.3, W * 0.74, D * 0.74, trim),
        m(H * 0.72, H * 0.28, W * 0.5, D * 0.5, body),
      ];
    case 'setbackCrown':
    case 'twist':
      return [
        m(0, H * 0.74, W, D, body),
        m(H * 0.74, H * 0.26, W * 0.62, D * 0.62, trim),
      ];
    case 'podiumShaft':
      return [
        m(0, H * 0.2, W, D, trim),
        m(H * 0.2, H * 0.8, W * 0.62, D * 0.68, body),
      ];
    default: {
      // straight / slantTop: articulate the volume so it is never a plain box.
      const v = Math.floor(seed * 6) % 6;
      switch (v) {
        case 0: // L-shape: tall main block + lower side wing
          return [
            m(0, H, W * 0.64, D, body, baseR, -W * 0.18, 0),
            m(0, H * 0.74, W * 0.5, D * 0.6, body, baseR, W * 0.27, D * 0.18),
          ];
        case 1: // projecting entrance bay breaking the front facade
          return [
            m(0, H, W, D, body),
            m(0, H * 0.62, W * 0.36, D * 0.3, trim, baseR, 0, D * 0.36),
          ];
        case 2: // twin blocks of unequal height, joined down the middle
          return [
            m(0, H, W * 0.5, D, body, baseR, -W * 0.24, 0),
            m(0, H * 0.72, W * 0.5, D * 0.9, trim, baseR, W * 0.24, -D * 0.04),
          ];
        case 3: // set-back front terrace + main slab behind
          return [
            m(0, H, W, D * 0.66, body, baseR, 0, -D * 0.16),
            m(0, H * 0.46, W * 0.9, D * 0.34, trim, baseR, 0, D * 0.33),
          ];
        case 4: // asymmetric crown pushed to one corner
          return [
            m(0, H * 0.68, W, D, body),
            m(H * 0.68, H * 0.32, W * 0.52, D * 0.52, trim, baseR, -W * 0.2, -D * 0.18),
          ];
        default: // plain block (kept rare)
          return [m(0, H, W, D, body)];
      }
    }
  }
}

/* Framed window grid across each tier's four faces. */
function buildPanes(masses: Mass[], style: Archetype['window'], simple: boolean): Pane[] {
  if (style === 'none') return [];
  const ribbon = style === 'ribbon' || style === 'curtain';
  const big = style === 'factory';
  const stepX = ribbon ? 0 : big ? 2.6 : simple ? 2.3 : 1.7;
  const stepY = big ? 2.6 : simple ? 2.5 : 2.0;
  const pw = big ? 1.7 : 1.0;
  const ph = ribbon ? 0.85 : big ? 1.5 : 1.2;
  const out: Pane[] = [];
  for (const s of masses) {
    const rows = Math.max(1, Math.floor((s.h - 1.6) / stepY));
    if (rows < 1) continue;
    const y0 = 1.3;
    const ySpan = s.h - 2.0;

    const faces: [number, number, number][] = [
      [0, s.d / 2, s.w], [Math.PI, s.d / 2, s.w],
      [Math.PI / 2, s.w / 2, s.d], [-Math.PI / 2, s.w / 2, s.d],
    ];
    for (const [rotY, off, faceW] of faces) {
      const nx = Math.sin(rotY), nz = Math.cos(rotY);
      const cx0 = s.x + nx * (off + 0.06), cz0 = s.z + nz * (off + 0.06);
      const tdx = Math.cos(rotY), tdz = -Math.sin(rotY);
      if (ribbon) {
        const sx = Math.max(0.6, faceW - 1.0);
        for (let r = 0; r < rows; r++) {
          const y = y0 + (ySpan * (r + 0.5)) / rows;
          out.push({ x: cx0, y: s.y + y, z: cz0, rotY, sx, sy: ph, warm: Math.random() > 0.8 });
        }
        continue;
      }
      const cols = Math.max(1, Math.floor((faceW - 0.9) / stepX));
      for (let r = 0; r < rows; r++) {
        const y = y0 + (ySpan * (r + 0.5)) / rows;
        for (let c = 0; c < cols; c++) {
          const u = (-(cols - 1) / 2 + c) * stepX;
          out.push({ x: cx0 + tdx * u, y: s.y + y, z: cz0 + tdz * u, rotY, sx: pw, sy: ph, warm: Math.random() > 0.82 });
        }
      }
    }
  }
  return out;
}

/* Choose a roof for this plot — biased by finish + tier, varied by hash. */
function pickRoof(a: Archetype, seed: number): RoofKind {
  if (a.details.includes('dome' as never)) return 'dome';
  // A curved/round body must never get a flat roof — pick a rounded crown so
  // the silhouette stays coherent (no flat lid on a cylinder).
  if (a.footprint === 'round') {
    const roundPool: RoofKind[] = ['dome', 'tank', 'spire', 'dome'];
    return roundPool[Math.floor(seed * roundPool.length) % roundPool.length];
  }
  const tall = a.tier === 'tall';
  let pool: RoofKind[];
  if (tall) {
    pool = ['parapet', 'antenna', 'mech', 'flatStack', 'parapet'];
  } else if (a.finish === 'brick' || a.finish === 'timber') {
    pool = ['gable', 'hip', 'spire', 'tank'];
  } else if (a.finish === 'glass' || a.finish === 'metal') {
    pool = ['parapet', 'flatStack', 'mech', 'antenna'];
  } else {
    pool = ['hip', 'pyramid', 'flatStack', 'parapet', 'gable'];
  }
  return pool[Math.floor(seed * pool.length) % pool.length];
}

export function FacadeBuilding({
  position, width, depth, height, rotation = 0,
  bodyColor, accentColor = '#C9D4DE', windowColor = '#AFC6DE',
  archetype, simple = false,
}: Props) {
  const seed = hash(position[0], position[2], 7);
  const trim = useMemo(() => lighten(bodyColor, 0.32), [bodyColor]);
  const roofColor = useMemo(
    () => ROOF_COLORS[Math.floor(hash(position[0], position[2], 13) * ROOF_COLORS.length) % ROOF_COLORS.length],
    [position],
  );
  // Round-footprint plots used to render as an oval capsule; the desired look
  // is a crisp rectangular box, so never use the capsule rounding.
  const capsule = false;

  const masses = useMemo(
    () => buildMasses(width, depth, height, archetype.silhouette, bodyColor, trim, seed),
    [width, depth, height, archetype.silhouette, bodyColor, trim, seed],
  );
  const panes = useMemo(() => buildPanes(masses, archetype.window, simple), [masses, archetype.window, simple]);
  const roof = useMemo(() => pickRoof(archetype, seed), [archetype, seed]);

  const glassRef = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(() => {
    const m = glassRef.current;
    if (!m) return;
    registerGlassMaterial(m);
    return () => unregisterGlassMaterial(m);
  }, []);

  const top = masses[masses.length - 1];
  const topW = top.w, topD = top.d, topY = top.y + top.h;
  const topX = top.x, topZ = top.z;
  const minTop = Math.min(topW, topD);
  const hasGround = !simple || height < 9;

  // Actual front face of the building in local space — the maximum +Z extent
  // across all mass tiers. Using depth/2 is wrong when masses have z offsets.
  const frontZ = useMemo(
    () => masses.reduce((mx, s) => Math.max(mx, s.z + s.d / 2), 0),
    [masses],
  );

  return (
    <group position={position} rotation-y={rotation}>
      {/* Plinth / kerb the building sits on (landmark signature). */}
      <RoundedBox args={[width + 1.0, 0.5, depth + 1.0]} radius={0.25} smoothness={1} position={[0, 0.25, 0]} receiveShadow>
        <meshStandardMaterial color="#CFC6B4" roughness={0.95} />
      </RoundedBox>

      {/* Soft stacked body tiers. */}
      {masses.map((s, i) => (
        <RoundedBox
          key={`m-${i}`}
          args={[s.w, s.h, s.d]}
          radius={capsule ? Math.min(s.w, s.d) / 2 : s.r}
          smoothness={capsule ? 3 : simple ? 1 : 2}
          position={[s.x, s.y + s.h / 2 + 0.4, s.z]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={s.color}
            roughness={archetype.finish === 'glass' ? 0.2 : archetype.finish === 'metal' ? 0.4 : 0.7}
            metalness={archetype.finish === 'glass' ? 0.3 : archetype.finish === 'metal' ? 0.5 : 0.04}
          />
        </RoundedBox>
      ))}

      {/* Cornice band just under the roof (crisp finished edge). */}
      <RoundedBox args={[topW + 0.3, 0.45, topD + 0.3]} radius={0.12} smoothness={1} position={[topX, topY + 0.4, topZ]} castShadow>
        <meshStandardMaterial color={trim} roughness={0.6} />
      </RoundedBox>

      {/* Window frames (light) behind the glass — one instanced draw call. */}
      {panes.length > 0 && (
        <Instances frames={1} limit={panes.length} range={panes.length}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color={trim} roughness={0.7} />
          {panes.map((p, i) => (
            <Instance key={i} position={[p.x * 0.995, p.y + 0.4, p.z * 0.995]} rotation={[0, p.rotY, 0]} scale={[p.sx + 0.28, p.sy + 0.28, 1]} />
          ))}
        </Instances>
      )}

      {/* Glass panes — one instanced draw call. */}
      {panes.length > 0 && (
        <Instances frames={1} limit={panes.length} range={panes.length}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial ref={glassRef} emissive="#FFE6AE" emissiveIntensity={0.18} color="#9FC2DE" roughness={0.18} metalness={0.35} toneMapped={false} />
          {panes.map((p, i) => (
            <Instance key={i} position={[p.x, p.y + 0.4, p.z]} rotation={[0, p.rotY, 0]} scale={[p.sx, p.sy, 1]} color={p.warm ? '#FFE6AE' : windowColor} />
          ))}
        </Instances>
      )}

      {/* ── Roof crown ──────────────────────────────────────────────────── */}
      <group position={[topX, 0, topZ]}>
        <Crown kind={roof} topW={topW} topD={topD} topY={topY + 0.4} minTop={minTop} roofColor={roofColor} trim={trim} accent={accentColor} />
      </group>

      {/* Ground floor — entrance + steps, or shopfront glazing. */}
      {hasGround && (
        <>
          {archetype.details.includes('shopfront' as never) ? (
            <RoundedBox args={[width * 0.92, 2.2, depth * 0.92]} radius={0.1} smoothness={1} position={[0, 1.5, 0]} castShadow>
              <meshStandardMaterial color="#2D3A45" emissive="#9FD0E8" emissiveIntensity={0.22} roughness={0.2} metalness={0.4} toneMapped={false} />
            </RoundedBox>
          ) : (
            <>
              <RoundedBox args={[1.6, 2.2, 0.2]} radius={0.18} smoothness={1} position={[0, 1.5, frontZ + 0.1]} castShadow>
                <meshStandardMaterial color="#4A3526" roughness={0.6} />
              </RoundedBox>
              <RoundedBox args={[2.8, 0.22, 1.0]} radius={0.06} smoothness={1} position={[0, 0.55, frontZ + 0.25]}>
                <meshStandardMaterial color="#E8E0D0" roughness={0.9} />
              </RoundedBox>
            </>
          )}
          {archetype.details.includes('awningSign' as never) && (
            <RoundedBox args={[width * 0.9, 0.14, 1.0]} radius={0.05} smoothness={1} position={[0, 2.9, frontZ + 0.2]} rotation-x={-0.42} castShadow>
              <meshStandardMaterial color={accentColor} roughness={0.6} />
            </RoundedBox>
          )}
        </>
      )}
    </group>
  );
}

/* Distinct, colourful crowns — the single biggest "architecture" signal. */
function Crown({
  kind, topW, topD, topY, minTop, roofColor, trim, accent,
}: {
  kind: RoofKind; topW: number; topD: number; topY: number; minTop: number; roofColor: string; trim: string; accent: string;
}) {
  const halfDiag = Math.hypot(topW / 2, topD / 2);
  switch (kind) {
    case 'pyramid': {
      const h = minTop * 0.62;
      return (
        <mesh position={[0, topY + 0.22 + h / 2, 0]} scale={[topW * 1.04, 1, topD * 1.04]} castShadow>
          {/* axis-aligned square base (thetaStart π/4) → flush rectangular pyramid */}
          <coneGeometry args={[Math.SQRT1_2, h, 4, 1, false, Math.PI / 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.6} />
        </mesh>
      );
    }
    case 'hip': {
      const h = minTop * 0.42;
      return (
        <mesh position={[0, topY + 0.25 + h / 2, 0]} scale={[topW * 1.04, 1, topD * 1.04]} castShadow>
          <coneGeometry args={[Math.SQRT1_2, h, 4, 1, false, Math.PI / 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.6} />
        </mesh>
      );
    }
    case 'gable': {
      const h = minTop * 0.5;
      const halfD = topD / 2;
      const theta = Math.atan2(h, halfD);
      const slope = Math.hypot(halfD, h);
      const halfW = topW / 2;
      // triangular gable-end wall (closes the otherwise see-through ends).
      const triPos = new Float32Array([-halfD, 0, 0, halfD, 0, 0, 0, h, 0]);
      const triNrm = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
      return (
        <group position={[0, topY + 0.25, 0]}>
          {/* two sloped slabs meeting at a ridge running along the width */}
          <mesh position={[0, h / 2, -halfD / 2]} rotation-x={-theta} castShadow>
            <boxGeometry args={[topW + 0.3, 0.16, slope + 0.2]} />
            <meshStandardMaterial color={roofColor} roughness={0.6} />
          </mesh>
          <mesh position={[0, h / 2, halfD / 2]} rotation-x={theta} castShadow>
            <boxGeometry args={[topW + 0.3, 0.16, slope + 0.2]} />
            <meshStandardMaterial color={roofColor} roughness={0.6} />
          </mesh>
          {/* solid triangular end walls (front + back), trim-coloured. */}
          {[halfW, -halfW].map((wx, k) => (
            <mesh key={k} position={[wx, 0, 0]} rotation-y={k === 0 ? Math.PI / 2 : -Math.PI / 2} castShadow>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[triPos, 3]} />
                <bufferAttribute attach="attributes-normal" args={[triNrm, 3]} />
              </bufferGeometry>
              <meshStandardMaterial color={trim} roughness={0.7} />
            </mesh>
          ))}
        </group>
      );
    }
    case 'spire':
      return (
        <group>
          <mesh position={[0, topY + 0.2, 0]} castShadow>
            <cylinderGeometry args={[minTop * 0.55, minTop * 0.6, 0.4, 8]} />
            <meshStandardMaterial color={trim} roughness={0.6} />
          </mesh>
          {/* Cone half-height is minTop*0.5, drum top is at topY+0.4, so the cone
              centre must sit at topY+0.4+minTop*0.5 for its base to rest on the
              drum. Pull down 0.05 for a clean overlap (was minTop*0.65 → floated). */}
          <mesh position={[0, topY + minTop * 0.5 + 0.35, 0]} castShadow>
            <coneGeometry args={[minTop * 0.5, minTop * 1.0, 6]} />
            <meshStandardMaterial color={roofColor} roughness={0.55} />
          </mesh>
        </group>
      );
    case 'dome':
      return (
        <mesh position={[0, topY, 0]} castShadow>
          <sphereGeometry args={[minTop * 0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={roofColor} roughness={0.45} metalness={0.2} />
        </mesh>
      );
    case 'flatStack':
      return (
        <group>
          <RoundedBox args={[topW * 0.8, 0.7, topD * 0.8]} radius={0.15} smoothness={1} position={[0, topY + 0.35, 0]} castShadow>
            <meshStandardMaterial color={trim} roughness={0.6} />
          </RoundedBox>
          <RoundedBox args={[topW * 0.45, 0.6, topD * 0.45]} radius={0.12} smoothness={1} position={[0, topY + 0.95, 0]} castShadow>
            <meshStandardMaterial color={accent} roughness={0.5} />
          </RoundedBox>
        </group>
      );
    case 'mech':
      return (
        <group>
          <RoundedBox args={[topW + 0.1, 0.55, topD + 0.1]} radius={0.1} smoothness={1} position={[0, topY + 0.25, 0]} castShadow>
            <meshStandardMaterial color={trim} roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[topW * 0.5, 1.1, topD * 0.5]} radius={0.1} smoothness={1} position={[0, topY + 1.0, 0]} castShadow>
            <meshStandardMaterial color={accent} roughness={0.6} metalness={0.2} />
          </RoundedBox>
        </group>
      );
    case 'antenna':
      return (
        <group>
          <RoundedBox args={[topW + 0.1, 0.5, topD + 0.1]} radius={0.1} smoothness={1} position={[0, topY + 0.25, 0]} castShadow>
            <meshStandardMaterial color={trim} roughness={0.7} />
          </RoundedBox>
          <mesh position={[0, topY + 1.7, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.14, 2.8, 8]} />
            <meshStandardMaterial color="#5A6470" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, topY + 3.2, 0]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#E05C5C" emissive="#E05C5C" emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'tank':
      return (
        <group>
          <RoundedBox args={[topW + 0.1, 0.5, topD + 0.1]} radius={0.1} smoothness={2} position={[0, topY + 0.25, 0]} castShadow>
            <meshStandardMaterial color={trim} roughness={0.7} />
          </RoundedBox>
          <mesh position={[0, topY + 1.5, 0]} castShadow>
            <cylinderGeometry args={[minTop * 0.3, minTop * 0.3, 1.6, 12]} />
            <meshStandardMaterial color={accent} roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, topY + 2.45, 0]} castShadow>
            <coneGeometry args={[minTop * 0.32, 0.5, 12]} />
            <meshStandardMaterial color={roofColor} roughness={0.6} />
          </mesh>
        </group>
      );
    case 'parapet':
    default:
      return (
        <group>
          <RoundedBox args={[topW + 0.25, 0.6, topD + 0.25]} radius={0.1} smoothness={2} position={[0, topY + 0.3, 0]} castShadow>
            <meshStandardMaterial color={trim} roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[topW - 0.5, 0.3, topD - 0.5]} radius={0.08} smoothness={2} position={[0, topY + 0.2, 0]}>
            <meshStandardMaterial color="#3A4350" roughness={0.85} />
          </RoundedBox>
        </group>
      );
  }
}
