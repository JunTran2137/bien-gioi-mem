'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { signalState } from '@/lib/three/traffic';
import { hex, groundSize } from '@/lib/three/theme';
import {
  computeCityLayout,
  buildIntersections,
  getReserves,
  roadAxes,
  ROAD_WIDTH,
  ROUNDABOUT_INNER,
  LAYOUT_VERSION,
  CityLayout,
  Tier
} from '@/lib/three/cityLayout';
import { HighRise } from './primitives/HighRise';
import { Hospital } from './primitives/Hospital';
import { Apartment } from './primitives/Apartment';
import { ParkBlock } from './primitives/ParkBlock';
import { FacadeBuilding } from './primitives/FacadeBuilding';
import { pickArchetype } from '@/lib/three/buildingArchetypes';
import { Cars } from './agents/Cars';

interface Props { perf: Tier }

/**
 * Freezes the local/world matrices of every descendant so three stops
 * recomposing PRS→matrix for hundreds of *static* meshes on every single
 * frame. Purely a CPU saving — the rendered result is byte-for-byte identical.
 * Re-runs whenever `deps` change (e.g. new buildings streamed in) so freshly
 * mounted objects get baked and frozen too.
 */
function Static({ children, deps }: { children: React.ReactNode; deps: any[] }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    // Re-enable so the freshly mounted batch can bake correct world matrices,
    // then bake + freeze the whole subtree.
    g.matrixWorldAutoUpdate = true;
    g.traverse((o) => {
      if (o.matrixAutoUpdate) {
        o.updateMatrix();
        o.matrixAutoUpdate = false;
      }
    });
    g.updateMatrixWorld(true);
    // r150+: with matrixWorldAutoUpdate=false three SKIPS this entire subtree
    // during scene.updateMatrixWorld() every frame — no per-frame traversal of
    // the hundreds of static building objects at all.
    g.matrixWorldAutoUpdate = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <group ref={ref}>{children}</group>;
}

/* Warm, varied building tones for plots whose layout entry carries no colour
 * (cafe / cinema), so the streetscape never collapses into a field of grey. */
const FILLER_BODY = ['#D9B98C', '#C9936A', '#B5806B', '#8FA8B5', '#9FB59A', '#C2B280', '#B59AAE', '#A8B0BC', '#D4C5A8', '#9CB8C2', '#CBA98C', '#A7C0A0'];

/* A generic street-front plot. Every such plot is ONE coherent single-mass
 * building whose architectural FORM (footprint + silhouette + facade) is picked
 * deterministically from the low-rise archetype library, so the streetscape is
 * 12 genuinely different forms instead of one repeated rectangular box. */
function GenericBuilding({ b }: { b: { pos: [number, number, number]; w: number; d: number; h: number; rot: number; body?: string; accent?: string } }) {
  const archetype = pickArchetype(b.pos[0], b.pos[2], b.h, 'low');
  const body = b.body ?? FILLER_BODY[Math.abs(Math.floor(b.pos[0] * 13.1 + b.pos[2] * 7.7)) % FILLER_BODY.length];
  return (
    <FacadeBuilding
      position={b.pos}
      width={b.w}
      depth={b.d}
      height={b.h}
      rotation={b.rot}
      bodyColor={body}
      accentColor={b.accent}
      archetype={archetype}
      simple
    />
  );
}

const CAR_COUNT_BY_TIER: Record<Tier, number> = { high: 5, mid: 3, low: 1, fallback: 0 };
const PED_COUNT_BY_TIER: Record<Tier, number> = { high: 8, mid: 4, low: 2, fallback: 0 };

/**
 * The whole layout is deterministic by tier. We synchronously seed with a
 * local compute (so first paint never blocks on network), then in the
 * background try to fetch the server-precomputed layout. If the server
 * version is identical (which it should be), the swap is invisible. The
 * server payload is cached `max-age=31536000, immutable`, so subsequent
 * visits cost ~0ms of CPU work on the client. */
function useCityLayout(perf: Tier): CityLayout {
  const local = useMemo(() => computeCityLayout(perf), [perf]);
  const [layout, setLayout] = useState<CityLayout>(local);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/city/layout?tier=${perf}&v=${LAYOUT_VERSION}`, { cache: 'force-cache' });
        if (!res.ok) return;
        const json = (await res.json()) as CityLayout;
        if (!cancelled) setLayout(json);
      } catch {
        /* keep local fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [perf]);

  useEffect(() => { setLayout(local); }, [local]);

  return layout;
}

/**
 * Progressive (lazy) mount: render the first `batch` buildings on the very
 * first frame, then add another batch on each subsequent animation frame.
 * The ground, roads and landmarks paint immediately and the page becomes
 * interactive right away while the rest of the city streams in over a handful
 * of frames instead of blocking the first paint with ~150 buildings at once. */
function useStagedCount(total: number, batch: number): number {
  const [shown, setShown] = useState(() => Math.min(total, batch));
  useEffect(() => {
    if (shown >= total) return;
    const raf = requestAnimationFrame(() => setShown((c) => Math.min(total, c + batch)));
    return () => cancelAnimationFrame(raf);
  }, [shown, total, batch]);
  return shown;
}

export function CityProps({ perf }: Props) {
  const layout = useCityLayout(perf);
  const shown = useStagedCount(layout.buildings.length, perf === 'high' ? 28 : 48);

  return (
    <group>
      {/* Square ground — solid grass, no overlay (road grid IS the divider). */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow position-y={-0.04}>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color="#B8DCB8" roughness={0.95} metalness={0} />
      </mesh>

      {/* Plaza paving — circular pedestrian island in the middle (no ring road) */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.04} receiveShadow>
        <circleGeometry args={[ROUNDABOUT_INNER, 24]} />
        <meshStandardMaterial color={hex.sidewalk} roughness={0.85} />
      </mesh>
      {/* Inner plaza decoration ring + gold centrepiece */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.08}>
        <ringGeometry args={[ROUNDABOUT_INNER - 0.3, ROUNDABOUT_INNER, 24]} />
        <meshStandardMaterial color={hex.primary} roughness={0.6} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.085}>
        <ringGeometry args={[3.6, 4.0, 48]} />
        <meshStandardMaterial color={hex.gold} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Roads — pruned around landmark/plaza reserves so no road runs under a building. */}
      <RoadsInstanced roads={layout.roads} />

      {/* Intersections — junction pad + zebra crosswalks + stop lines. */}
      <Junctions tier={perf} />

      {/* Traffic lights — red/green signals at every junction (cars + peds obey). */}
      <TrafficLights tier={perf} />

      {/* Buildings — streamed in over a few frames (progressive mount). */}
      <Static deps={[shown, layout]}>
      {layout.buildings.slice(0, shown).map((b, i) => {
        if (b.kind === 'highrise') {
          return (
            <group key={`b-${i}`} position={b.pos} rotation-y={b.rot}>
              <HighRise
                width={b.w} height={b.h} depth={b.d}
                bodyColor={b.body} accentColor={b.accent}
                seed={[b.pos[0], b.pos[2]]}
              />
            </group>
          );
        }
        if (b.kind === 'hospital') return <Hospital key={`b-${i}`} position={b.pos} width={b.w} depth={b.d} rotation={b.rot} />;
        if (b.kind === 'apartment') return <Apartment key={`b-${i}`} position={b.pos} width={b.w} depth={b.d} height={b.h} bodyColor={b.body} rotation={b.rot} simple />;
        if (b.kind === 'park') return <ParkBlock key={`b-${i}`} position={b.pos} width={b.w} depth={b.d} rotation={b.rot} />;
        // shop / cafe / restaurant / cinema / mall → one coherent building each,
        // forms drawn from the low-rise archetype library.
        return <GenericBuilding key={`b-${i}`} b={b} />;
      })}
      </Static>

      {/* Lamps — instanced (2 draw calls for ALL lamps) */}
      {layout.lamps.length > 0 && <LampsInstanced lamps={layout.lamps} />}

      {perf !== 'fallback' && (
        <>
          <Cars count={CAR_COUNT_BY_TIER[perf]} segments={layout.roads} simple={perf !== 'high'} />
        </>
      )}
    </group>
  );
}

/* ==== helpers ==== */

/* All road segments share three flat layers (kerb, asphalt, centre line). Each
 * used to be 3 separate meshes → ~3× the segment count in draw calls. They are
 * now baked into three InstancedMeshes (3 draw calls total) with per-instance
 * scale = [length, width] and a pre-computed flat rotation. Zero visual change. */
function RoadsInstanced({ roads }: { roads: { from: [number, number]; to: [number, number]; w?: number }[] }) {
  const { segs, dashes } = useMemo(() => {
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const qy = new THREE.Quaternion();
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const euler = new THREE.Euler();
    const dashes: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    const DASH_PERIOD = 2.4; // centre-to-centre spacing of the dashes
    const DASH_LEN = 1.1;    // painted length of each dash
    const AXES = roadAxes();
    const BOX_HALF = 1.9;    // clear the centre-line dashes out of each junction box
    const segs = roads.map((seg) => {
      const [ax, az] = seg.from;
      const [bx, bz] = seg.to;
      const dx = bx - ax, dz = bz - az;
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);
      qy.setFromAxisAngle(yAxis, -angle);
      q.copy(qy).multiply(qx);
      euler.setFromQuaternion(q);
      const rot: [number, number, number] = [euler.x, euler.y, euler.z];
      // Broken white centre line: lay down individual dash quads along the road,
      // but skip any dash that falls inside a junction box (real roads have a
      // blank square where the two carriageways cross).
      const ux = dx / length, uz = dz / length;
      const vertical = Math.abs(dx) < Math.abs(dz);
      const nd = Math.floor(length / DASH_PERIOD);
      for (let k = 0; k < nd; k++) {
        const d = (k + 0.5) * DASH_PERIOD;
        const px = ax + ux * d, pz = az + uz * d;
        const cross = vertical ? pz : px;
        let inBox = false;
        for (const a of AXES) { if (Math.abs(cross - a) < BOX_HALF) { inBox = true; break; } }
        if (inBox) continue;
        dashes.push({ pos: [px, 0.09, pz], rot });
      }
      return {
        cx: (ax + bx) / 2,
        cz: (az + bz) / 2,
        rot,
        length,
        width: seg.w ?? ROAD_WIDTH,
        dashLen: DASH_LEN
      };
    });
    return { segs, dashes };
  }, [roads]);

  const n = Math.max(segs.length, 1);
  const dn = Math.max(dashes.length, 1);
  return (
    <group>
      {/* Light kerb / sidewalk slightly wider than the asphalt. */}
      <Instances frames={1} limit={n} range={segs.length}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color={hex.sidewalk} roughness={0.9} />
        {segs.map((s, i) => (
          <Instance key={`rk-${i}`} position={[s.cx, 0.02, s.cz]} rotation={s.rot} scale={[s.length, s.width + 1.1, 1]} />
        ))}
      </Instances>
      {/* Black asphalt — width varies by road class. */}
      <Instances frames={1} limit={n} range={segs.length}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color={hex.asphalt} roughness={0.92} />
        {segs.map((s, i) => (
          <Instance key={`ra-${i}`} position={[s.cx, 0.05, s.cz]} rotation={s.rot} scale={[s.length, s.width, 1]} />
        ))}
      </Instances>
      {/* Broken WHITE centre line — real-world dashed lane markings (1 draw call). */}
      <Instances frames={1} limit={dn} range={dashes.length}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#F4F1E8" roughness={0.6} />
        {dashes.map((s, i) => (
          <Instance key={`rd-${i}`} position={s.pos} rotation={s.rot} scale={[1.1, 0.16, 1]} />
        ))}
      </Instances>
    </group>
  );
}

/* Junctions: at every road×road crossing we paint a clean asphalt pad (covers
 * the centre-line dashes so they don't run through the box), four zebra
 * crosswalks and four white stop lines — the readable, planned look of a
 * city-builder intersection.
 *
 * Previously each junction emitted ~21 individual flat meshes (pad + 16 zebra
 * stripes + 4 stop lines), so ~30 junctions cost ~600 draw calls just for
 * ground paint. Everything is now baked into TWO InstancedMeshes (pads +
 * markings) so the whole road-marking layer is 2 draw calls. The zebra/stop
 * markings are skipped entirely on low/fallback tiers. */
function Junctions({ tier }: { tier: Tier }) {
  const withMarks = tier === 'high' || tier === 'mid';

  const { pads, marks } = useMemo(() => {
    const nodes = buildIntersections(getReserves());
    const pads: { pos: [number, number, number]; scale: [number, number, number] }[] = [];
    const marks: { pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] }[] = [];

    const q = new THREE.Quaternion();
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const qy = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const euler = new THREE.Euler();

    for (const n of nodes) {
      const padX = n.wx + 1.0;
      const padZ = n.wz + 1.0;
      pads.push({ pos: [n.x, 0.07, n.z], scale: [padX, padZ, 1] });
      if (!withMarks) continue;

      for (let dir = 0; dir < 4; dir++) {
        const along = dir % 2 === 0 ? n.wx : n.wz;
        const rot = dir % 2 === 0 ? 0 : Math.PI / 2;
        const sign = dir < 2 ? 1 : -1;
        const reach = (dir % 2 === 0 ? padZ : padX) / 2;

        qy.setFromAxisAngle(yAxis, rot);
        q.copy(qy).multiply(qx);
        euler.setFromQuaternion(q);
        const erot: [number, number, number] = [euler.x, euler.y, euler.z];
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);

        // Zebra stripes
        for (let k = 0; k < 4; k++) {
          const lx = -along / 2 + 0.35 + k * (along / 4);
          const lz = sign * (reach + 0.55);
          marks.push({
            pos: [n.x + lx * cos + lz * sin, 0.11, n.z - lx * sin + lz * cos],
            rot: erot,
            scale: [along / 8, 1.0, 1]
          });
        }
        // Stop line
        const slz = sign * (reach + 1.25);
        marks.push({
          pos: [n.x + slz * sin, 0.11, n.z + slz * cos],
          rot: erot,
          scale: [along, 0.18, 1]
        });
      }
    }
    return { pads, marks };
  }, [withMarks]);

  return (
    <group>
      {/* Clean asphalt junction pads — one instanced draw call. */}
      <Instances frames={1} limit={Math.max(pads.length, 1)} range={pads.length}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color={hex.asphalt} roughness={0.92} />
        {pads.map((p, i) => (
          <Instance key={`jp-${i}`} position={p.pos} rotation={[-Math.PI / 2, 0, 0]} scale={p.scale} />
        ))}
      </Instances>

      {/* Crosswalk + stop-line markings — one instanced draw call (skipped on low tiers). */}
      {withMarks && marks.length > 0 && (
        <Instances frames={1} limit={Math.max(marks.length, 1)} range={marks.length}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#F2EEDD" roughness={0.7} depthWrite={false} />
          {marks.map((m, i) => (
            <Instance key={`jm-${i}`} position={m.pos} rotation={m.rot} scale={m.scale} />
          ))}
        </Instances>
      )}
    </group>
  );
}

const GREEN_ON = '#27D06B';
const RED_ON = '#FF4536';
const AMBER_ON = '#FFB02E';

/* Stable per-building RNG so each roof's shape/colour is deterministic. */
function roofRng(px: number, pz: number) {
  let a = ((Math.floor(px * 73.1 + pz * 131.7) | 0) >>> 0) + 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RoofInst = { p: [number, number, number]; s: [number, number, number]; ry: number; c: THREE.Color };
const ROOF_BOX_KINDS = new Set(['shop', 'restaurant', 'cafe', 'cinema', 'mall']);

/* Centralised flat-roof layer for the small commercial boxes (shops, cafes,
 * restaurants, etc.). Every roof is a flat slab in a varied tone so the city
 * reads as a patchwork from above; all architectural variety comes from the
 * building massing, not the roof shape. One instanced draw call. */
function CityRoofs({ buildings }: { buildings: CityLayout['buildings'] }) {
  const flats = useMemo(() => {
    const flats: RoofInst[] = [];
    const FLAT = ['#CDBFA0', '#8A93A0', '#6E7A8A', '#5E8C61', '#A57F6B', '#7C6E8C', '#C2B280', '#9AA6A0'].map((c) => new THREE.Color(c));

    for (const b of buildings) {
      if (!('h' in b) || !ROOF_BOX_KINDS.has(b.kind)) continue;
      const w = b.w, d = b.d, h = b.h;
      const [px, , pz] = b.pos;
      const rng = roofRng(px, pz);
      flats.push({
        p: [px, h + 0.2, pz],
        s: [w + 0.5, 0.4, d + 0.5],
        ry: b.rot,
        c: FLAT[Math.floor(rng() * FLAT.length)],
      });
    }
    return flats;
  }, [buildings]);

  if (flats.length === 0) return null;
  return (
    <Instances frames={1} limit={flats.length} range={flats.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={0.8} />
      {flats.map((b, i) => (
        <Instance key={`ft-${i}`} position={b.p} rotation={[0, b.ry, 0]} scale={b.s} color={b.c} castShadow />
      ))}
    </Instances>
  );
}

type SignalHead = { p: [number, number, number]; ry: number };

/* Traffic lights at every junction. One global signal clock (lib/three/traffic)
 * drives them, and cars + pedestrians read the SAME clock so they stop on red.
 * Each head is a proper 3-lens signal (red / amber / green) turned to face the
 * junction centre. Only the active phase's lens glows; we just flip one
 * emissiveIntensity per material per frame, so the whole grid of signals is a
 * handful of instanced draw calls. Skipped on low/fallback tiers. */
function TrafficLights({ tier }: { tier: Tier }) {
  const show = tier === 'high' || tier === 'mid';

  const heads = useMemo(() => {
    if (!show) return null;
    const nodes = buildIntersections(getReserves());
    const poles: [number, number, number][] = [];
    const housings: SignalHead[] = [];
    const nsR: SignalHead[] = [], nsY: SignalHead[] = [], nsG: SignalHead[] = [];
    const ewR: SignalHead[] = [], ewY: SignalHead[] = [], ewG: SignalHead[] = [];
    const HY = 3.4;   // housing centre height
    const FR = 0.16;  // lens stand-off in front of the housing face
    const DY = 0.33;  // vertical spacing between the three lenses
    const addHead = (
      hx: number, hz: number, fx: number, fz: number,
      R: SignalHead[], Y: SignalHead[], G: SignalHead[]
    ) => {
      const len = Math.hypot(fx, fz) || 1;
      const nx = fx / len, nz = fz / len;       // unit "facing" direction
      const ry = Math.atan2(nx, nz);            // turn the lens to face that way
      poles.push([hx, 1.7, hz]);
      housings.push({ p: [hx, HY, hz], ry });
      R.push({ p: [hx + nx * FR, HY + DY, hz + nz * FR], ry });
      Y.push({ p: [hx + nx * FR, HY, hz + nz * FR], ry });
      G.push({ p: [hx + nx * FR, HY - DY, hz + nz * FR], ry });
    };
    for (const nd of nodes) {
      const ox = nd.wx / 2 + 0.4;
      const oz = nd.wz / 2 + 0.4;
      // Heads sit at the off-road corners of the junction, but each faces along
      // ONE axis so the housing stays square to the grid (not angled diagonally).
      addHead(nd.x + ox, nd.z + oz, -1, 0, nsR, nsY, nsG); // corner, faces −X
      addHead(nd.x - ox, nd.z - oz, 0, 1, ewR, ewY, ewG);  // corner, faces +Z
    }
    return { poles, housings, nsR, nsY, nsG, ewR, ewY, ewG };
  }, [show]);

  // One emissive material per lens (NS/EW × red/amber/green). Base colour is a
  // dark tinted glass; we only raise emissiveIntensity on the active phase.
  const mats = useMemo(() => {
    const mk = (base: string, emis: string) =>
      new THREE.MeshStandardMaterial({
        color: base, emissive: new THREE.Color(emis), emissiveIntensity: 0,
        roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide, toneMapped: false
      });
    return {
      nsR: mk('#451414', RED_ON), nsY: mk('#453914', AMBER_ON), nsG: mk('#14401f', GREEN_ON),
      ewR: mk('#451414', RED_ON), ewY: mk('#453914', AMBER_ON), ewG: mk('#14401f', GREEN_ON),
    };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const ns = signalState('NS', t);
    const ew = signalState('EW', t);
    const ON = 2.9;
    mats.nsR.emissiveIntensity = ns === 'red' ? ON : 0;
    mats.nsY.emissiveIntensity = ns === 'yellow' ? ON : 0;
    mats.nsG.emissiveIntensity = ns === 'green' ? ON : 0;
    mats.ewR.emissiveIntensity = ew === 'red' ? ON : 0;
    mats.ewY.emissiveIntensity = ew === 'yellow' ? ON : 0;
    mats.ewG.emissiveIntensity = ew === 'green' ? ON : 0;
  });

  if (!heads) return null;
  const c = Math.max(heads.poles.length, 1);
  const Lenses = (items: SignalHead[], mat: THREE.Material, key: string) => (
    <Instances frames={1} limit={Math.max(items.length, 1)} range={items.length}>
      <circleGeometry args={[0.12, 16]} />
      <primitive object={mat} attach="material" />
      {items.map((h, i) => <Instance key={`${key}-${i}`} position={h.p} rotation={[0, h.ry, 0]} />)}
    </Instances>
  );

  return (
    <group>
      {/* Mast poles */}
      <Instances frames={1} limit={c} range={heads.poles.length}>
        <cylinderGeometry args={[0.07, 0.09, 3.4, 8]} />
        <meshStandardMaterial color="#24272E" roughness={0.5} metalness={0.4} />
        {heads.poles.map((p, i) => <Instance key={`tp-${i}`} position={p} />)}
      </Instances>
      {/* Dark signal housings */}
      <Instances frames={1} limit={c} range={heads.housings.length}>
        <boxGeometry args={[0.34, 1.18, 0.26]} />
        <meshStandardMaterial color="#15171C" roughness={0.55} metalness={0.2} />
        {heads.housings.map((h, i) => <Instance key={`th-${i}`} position={h.p} rotation={[0, h.ry, 0]} />)}
      </Instances>
      {Lenses(heads.nsR, mats.nsR, 'nsr')}
      {Lenses(heads.nsY, mats.nsY, 'nsy')}
      {Lenses(heads.nsG, mats.nsG, 'nsg')}
      {Lenses(heads.ewR, mats.ewR, 'ewr')}
      {Lenses(heads.ewY, mats.ewY, 'ewy')}
      {Lenses(heads.ewG, mats.ewG, 'ewg')}
    </group>
  );
}


/* === InstancedMesh helpers ===
 * Each <Instances> renders ALL its children as a single GPU draw call. */

function TreesInstanced({ trees }: { trees: { pos: [number, number, number]; scale: number; rot: number; type: 0 | 1 }[] }) {
  const limit = Math.max(trees.length, 1);
  return (
    <group>
      <Instances frames={1} limit={limit} range={trees.length}>
        <cylinderGeometry args={[0.18, 0.22, 1, 6]} />
        <meshStandardMaterial color="#6B4F2C" roughness={1} />
        {trees.map((t, i) => (
          <Instance key={`tt-${i}`} position={[t.pos[0], 0.5 * t.scale, t.pos[2]]} scale={t.scale} />
        ))}
      </Instances>
      <Instances frames={1} limit={limit} range={trees.length}>
        <sphereGeometry args={[0.95, 6, 5]} />
        <meshStandardMaterial color="#5BA070" roughness={0.85} />
        {trees.map((t, i) => (
          <Instance
            key={`tf-${i}`}
            position={[t.pos[0], 1.5 * t.scale, t.pos[2]]}
            scale={t.scale}
          />
        ))}
      </Instances>
    </group>
  );
}

function LampsInstanced({ lamps }: { lamps: { pos: [number, number, number] }[] }) {
  const limit = Math.max(lamps.length, 1);
  return (
    <group>
      <Instances frames={1} limit={limit} range={lamps.length}>
        <cylinderGeometry args={[0.06, 0.08, 3, 6]} />
        <meshStandardMaterial color="#3A3A3A" />
        {lamps.map((l, i) => (
          <Instance key={`lp-${i}`} position={[l.pos[0], 1.5, l.pos[2]]} />
        ))}
      </Instances>
      <Instances frames={1} limit={limit} range={lamps.length}>
        <sphereGeometry args={[0.18, 6, 5]} />
        <meshBasicMaterial color="#FFE8A0" />
        {lamps.map((l, i) => (
          <Instance key={`lb-${i}`} position={[l.pos[0], 3.05, l.pos[2]]} />
        ))}
      </Instances>
    </group>
  );
}
