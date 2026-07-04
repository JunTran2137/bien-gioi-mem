/**
 * Pure, isomorphic city-layout computation.
 *
 * Runs on both the server (precomputed at request time, cached via HTTP headers)
 * and the client (fallback if API call fails). Output is plain JSON so it can
 * cross the network boundary and avoid main-thread CPU work on weak clients.
 *
 * - 11×11 cell grid (was 17×17 → 58% fewer cells)
 * - Each visible grass cell is exactly 5×5 units; black asphalt road (1.5 wide)
 *   separates cells. Cycle = 6.5.
 * - Landmarks at ±26 land exactly on cell centers (i=1 and i=9 of 11 cells).
 * - Road segments are PRUNED so they never cross landmark or plaza reserves
 *   (no building ever sits on a road).
 */

import { hex, buildings as B, groundSize } from './theme';

/* === Grid constants ===
 * Grass cells are 15×15 (9× the previous 5×5 footprint).
 * Sub-tiles inside each cell remain a 5×5 packing grid, so each sub-tile is
 * CELL_SIZE/SUB_COUNT = 3 world units → buildings come in 3×3, 6×6, 9×9.
 * Black asphalt road (2 wide) is the cell divider. */
export const CELL_SIZE = 15;
export const ROAD_WIDTH = 2;
export const CYCLE = CELL_SIZE + ROAD_WIDTH; // 17
export const N_CELLS = 7; // axis = (i-3)·17 = [-51,-34,-17,0,17,34,51]
export const SUB_COUNT = 5;
export const SUB_TILE = CELL_SIZE / SUB_COUNT; // 3
export const GRID_EXTENT = ((N_CELLS - 1) / 2) * CYCLE + CELL_SIZE / 2; // 58.5

/**
 * Bump this whenever any constant above (or any building/road generation logic)
 * changes. The /api/city/layout endpoint sends `Cache-Control: immutable` so
 * old responses live in the browser for a year. Appending ?v=N to the fetch
 * URL forces a fresh download because the cache is keyed on full URL. */
export const LAYOUT_VERSION = 28;

const FACADE_COLORS = [
  hex.pastelPink, hex.pastelMint, hex.pastelSky, hex.pastelPeach,
  hex.pastelLavender, hex.pastelLemon, hex.pastelCoral,
  '#FFFFFF', '#E8F0FF', '#FFE8DC', '#F5E5A0', '#D8C5E8'
];
const ACCENT_COLORS = [hex.primary, hex.secondary, hex.accent, hex.gold];
const ROOF_STYLES = ['flat', 'flat', 'antenna', 'dome', 'sign', 'flat'] as const;
type RoofStyle = typeof ROOF_STYLES[number];

/* Tower silhouettes. The old city was a field of identical boxes; these give
 * each high-rise a genuinely different massing (stepped setbacks, a slim tower
 * on a wide podium, twin towers, a tapered shaft, a cylindrical drum). 'slab'
 * (the plain box) is intentionally rare so the skyline reads as varied. */
const MASSING_STYLES = ['setback', 'podium', 'twin', 'round', 'taper', 'setback', 'podium', 'slab'] as const;
type Massing = typeof MASSING_STYLES[number];

/* === Types === */
export type Segment = { from: [number, number]; to: [number, number]; w?: number };
export type Reserve = readonly [number, number, number]; // cx, cz, radius

/* Road hierarchy widths. The visual asphalt mesh uses these per-segment so the
 * grid reads as a planned network: wide central avenues, medium arterials, and
 * narrow neighbourhood streets on the outskirts. The grid SPACING is still the
 * fixed ROAD_WIDTH=2 gap (keeps building geometry aligned); only the painted
 * asphalt width varies, with a little overlap onto the grass acting as kerb. */
export const AVENUE_WIDTH = 2.8;
export const ARTERIAL_WIDTH = 2.2;
export const STREET_WIDTH = 1.8;

export type Building =
  | { kind: 'highrise'; pos: [number, number, number]; w: number; d: number; h: number; body: string; accent: string; roof: RoofStyle; massing: Massing; rot: number }
  | { kind: 'shop'; pos: [number, number, number]; w: number; d: number; h: number; body: string; awning: string; rot: number }
  | { kind: 'cafe'; pos: [number, number, number]; w: number; d: number; h: number; rot: number }
  | { kind: 'hospital'; pos: [number, number, number]; w: number; d: number; rot: number }
  | { kind: 'apartment'; pos: [number, number, number]; w: number; d: number; h: number; body: string; rot: number }
  | { kind: 'restaurant'; pos: [number, number, number]; w: number; d: number; h: number; body: string; accent: string; rot: number }
  | { kind: 'cinema'; pos: [number, number, number]; w: number; d: number; h: number; rot: number }
  | { kind: 'mall'; pos: [number, number, number]; w: number; d: number; h: number; body: string; rot: number }
  | { kind: 'park'; pos: [number, number, number]; w: number; d: number; rot: number };

export type Tree = { pos: [number, number, number]; scale: number; rot: number; type: 0 | 1 };
export type Lamp = { pos: [number, number, number] };

export interface CityLayout {
  cellSize: number;
  roadWidth: number;
  nCells: number;
  gridExtent: number;
  reserves: Reserve[];
  roads: Segment[];
  buildings: Building[];
  trees: Tree[];
  lamps: Lamp[];
}

export type Tier = 'high' | 'mid' | 'low' | 'fallback';

const TREE_COUNT_BY_TIER: Record<Tier, number> = { high: 120, mid: 70, low: 28, fallback: 0 };
const LAMP_COUNT_BY_TIER: Record<Tier, number> = { high: 0, mid: 0, low: 0, fallback: 0 };

/* Fraction of plots that actually get a building (the rest become lawns). Lower
 * tiers thin the city out to cut draw calls; high stays near-full. */
const BUILDING_DENSITY_BY_TIER: Record<Tier, number> = { high: 1.0, mid: 0.58, low: 0.4, fallback: 0.3 };

/* === Reserved landmark + plaza footprints === */
/* Reserve circles cover each landmark's single 15×15 cell. Landmarks now sit
 * on EXACT cell centers (±34), so a radius of 8 (just over the cell half-width
 * of 7.5) fully reserves the occupied cell while staying clear of the roads at
 * ±8.5 from the center — no road segment is pruned, the grid stays intact. */
const PLAZA_RADIUS = 6.5;
const LANDMARK_RADIUS = 8;
/** Roundabout ring-road outer radius — a single circular road around the
 * central plaza. Straight roads are pruned inside PLAZA_RADIUS so the only
 * thing crossing the middle is this circle. */
export const ROUNDABOUT_INNER = 6.2;
export const ROUNDABOUT_OUTER = 7.8;

export function getReserves(): Reserve[] {
  return [
    [0, 0, PLAZA_RADIUS],
    [B.library.position[0], B.library.position[2], LANDMARK_RADIUS],
    [B.tower.position[0], B.tower.position[2], LANDMARK_RADIUS],
    [B.arena.position[0], B.arena.position[2], LANDMARK_RADIUS],
    [B.academy.position[0], B.academy.position[2], LANDMARK_RADIUS],
    [B.townhall.position[0], B.townhall.position[2], LANDMARK_RADIUS]
  ];
}

/* === Grid helpers === */
function cellCentersAxis(): number[] {
  const out: number[] = [];
  const start = -((N_CELLS - 1) / 2) * CYCLE;
  for (let i = 0; i < N_CELLS; i++) out.push(start + i * CYCLE);
  return out;
}

const CELL_X = cellCentersAxis();
const CELL_Z = cellCentersAxis();

function isReserved(x: number, z: number, reserves: Reserve[], margin = 1): boolean {
  for (const [bx, bz, br] of reserves) {
    const d2 = (x - bx) ** 2 + (z - bz) ** 2;
    if (d2 < (br + margin) ** 2) return true;
  }
  return false;
}

/* === Road pruning ===
 * For each axis-aligned segment, subtract the portion that passes inside
 * any reserve circle. Returns 0, 1, or 2 sub-segments. */
function pruneSegment(seg: Segment, reserves: Reserve[], margin = 0.3): Segment[] {
  const [ax, az] = seg.from;
  const [bx, bz] = seg.to;
  const isVertical = ax === bx;
  const isHorizontal = az === bz;
  if (!isVertical && !isHorizontal) return [seg];

  const fixedCoord = isVertical ? ax : az;
  const t0 = isVertical ? Math.min(az, bz) : Math.min(ax, bx);
  const t1 = isVertical ? Math.max(az, bz) : Math.max(ax, bx);

  const blocked: [number, number][] = [];
  for (const [cx, cz, r] of reserves) {
    const perpCenter = isVertical ? cx : cz;
    const parCenter = isVertical ? cz : cx;
    const effR = r + margin;
    const d = fixedCoord - perpCenter;
    if (Math.abs(d) >= effR) continue;
    const half = Math.sqrt(effR * effR - d * d);
    blocked.push([parCenter - half, parCenter + half]);
  }
  blocked.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const iv of blocked) {
    if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]);
    } else {
      merged.push([iv[0], iv[1]]);
    }
  }

  const out: Segment[] = [];
  let cur = t0;
  for (const [lo, hi] of merged) {
    if (hi <= cur || lo >= t1) continue;
    if (lo > cur) {
      out.push(isVertical
        ? { from: [fixedCoord, cur], to: [fixedCoord, lo] }
        : { from: [cur, fixedCoord], to: [lo, fixedCoord] });
    }
    cur = Math.max(cur, hi);
  }
  if (cur < t1) {
    out.push(isVertical
      ? { from: [fixedCoord, cur], to: [fixedCoord, t1] }
      : { from: [cur, fixedCoord], to: [t1, fixedCoord] });
  }
  return out.filter(s => Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]) > 0.6);
}

/** Road grid axis lines sit at the midpoints between adjacent cell centres.
 * Exposed so the renderer can paint crosswalks + stop lines at each junction. */
export function roadAxes(): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELL_X.length - 1; i++) out.push((CELL_X[i] + CELL_X[i + 1]) / 2);
  return out;
}

export function roadClassWidth(axisCoord: number): number {
  const af = Math.abs(axisCoord);
  return af < 12 ? AVENUE_WIDTH : af < 30 ? ARTERIAL_WIDTH : STREET_WIDTH;
}

/** Every road×road crossing not swallowed by a reserve, with the asphalt width
 * of each crossing road so the renderer can size the junction pad + crosswalks. */
export function buildIntersections(reserves: Reserve[]): { x: number; z: number; wx: number; wz: number }[] {
  const axes = roadAxes();
  const out: { x: number; z: number; wx: number; wz: number }[] = [];
  for (const mx of axes) {
    for (const mz of axes) {
      if (isReserved(mx, mz, reserves, 0.5)) continue;
      out.push({ x: mx, z: mz, wx: roadClassWidth(mx), wz: roadClassWidth(mz) });
    }
  }
  return out;
}

export function buildRoads(reserves: Reserve[]): Segment[] {
  const raw: Segment[] = [];
  for (let i = 0; i < CELL_X.length - 1; i++) {
    const x = (CELL_X[i] + CELL_X[i + 1]) / 2;
    raw.push({ from: [x, -GRID_EXTENT], to: [x, GRID_EXTENT] });
  }
  for (let j = 0; j < CELL_Z.length - 1; j++) {
    const z = (CELL_Z[j] + CELL_Z[j + 1]) / 2;
    raw.push({ from: [-GRID_EXTENT, z], to: [GRID_EXTENT, z] });
  }
  const out: Segment[] = [];
  for (const seg of raw) {
    // Classify the line by its distance from the centre: the two innermost
    // axes (±8.5) are grand avenues, the next ring (±25.5) arterials, the
    // outermost (±42.5) quiet local streets.
    const fixed = seg.from[0] === seg.to[0] ? seg.from[0] : seg.from[1];
    const af = Math.abs(fixed);
    const w = af < 12 ? AVENUE_WIDTH : af < 30 ? ARTERIAL_WIDTH : STREET_WIDTH;
    for (const piece of pruneSegment(seg, reserves)) out.push({ ...piece, w });
  }
  return out;
}

/* === Buildings === */
type Cell = { cx: number; cz: number };
type Zone = 'core' | 'mid' | 'outer';
type Placement = { x: number; z: number; w: number; d: number; size: number };

/* A building setback: every footprint is trimmed by this much on each side so
 * neighbours never touch and each structure has its own breathing room. */
const SETBACK = 1.6; // clear gap between neighbours; clipping prevents any overlap

/**
 * Hand-authored block templates (the work of an "urban planner"). Each entry
 * is a list of footprints [i, j, w, d] placed on the 5×5 sub-tile grid of a
 * single cell. Crucially they DON'T fill the block — the empty sub-tiles become
 * lawns, courtyards and pocket parks, giving the city its open, planned feel.
 *
 *   core  → downtown: a few tall towers around a central plaza (≈45-65% built)
 *   mid   → residential/commercial mid-rise with green courtyards (≈45-55%)
 *   outer → low-rise suburb, lots of parks & gardens (≈25-45%, some all-green)
 */
const BLOCK_TEMPLATES: Record<Zone, number[][][]> = {
  // Every template tiles the full 5x5 cell with exactly four chunky footprints
  // (each side >= 2 sub-tiles) so a plot is NEVER left with a bare gap. Sizes
  // are mixed (3x3 / 2x3 / 3x2 / 2x2) and arranged differently per template for
  // massing variety, but they always sum to 25 sub-tiles = no empty corner.
  core: [
    [[0, 0, 3, 3], [3, 0, 2, 3], [0, 3, 3, 2], [3, 3, 2, 2]],
    [[0, 0, 3, 3], [3, 0, 2, 2], [3, 2, 2, 3], [0, 3, 3, 2]],
    [[0, 0, 3, 2], [3, 0, 2, 3], [0, 2, 3, 3], [3, 3, 2, 2]],
    [[0, 0, 2, 2], [2, 0, 3, 2], [0, 2, 2, 3], [2, 2, 3, 3]],
  ],
  mid: [
    [[0, 0, 3, 3], [3, 0, 2, 3], [0, 3, 3, 2], [3, 3, 2, 2]],
    [[0, 0, 2, 3], [2, 0, 3, 2], [0, 3, 2, 2], [2, 2, 3, 3]],
    [[0, 0, 3, 2], [3, 0, 2, 3], [0, 2, 3, 3], [3, 3, 2, 2]],
    [[0, 0, 2, 2], [2, 0, 3, 2], [0, 2, 2, 3], [2, 2, 3, 3]],
  ],
  outer: [
    [[0, 0, 3, 3], [3, 0, 2, 3], [0, 3, 3, 2], [3, 3, 2, 2]],
    [[0, 0, 2, 3], [2, 0, 3, 2], [0, 3, 2, 2], [2, 2, 3, 3]],
    [[0, 0, 3, 2], [3, 0, 2, 3], [0, 2, 3, 3], [3, 3, 2, 2]],
    [[0, 0, 3, 3], [3, 0, 2, 2], [3, 2, 2, 3], [0, 3, 3, 2]],
  ],
};

/** Rotate a [i,j,w,d] footprint 90° clockwise within the SUB_COUNT grid. */
function rot90(p: number[]): number[] {
  const [i, j, w, d] = p;
  return [j, SUB_COUNT - i - w, d, w];
}

function zoneFor(cx: number, cz: number): Zone {
  const ring = Math.max(Math.round(Math.abs(cx) / CYCLE), Math.round(Math.abs(cz) / CYCLE));
  if (ring <= 1) return 'core';
  if (ring === 2) return 'mid';
  return 'outer';
}

/**
 * Lay out one block from a rotated template. Returns the building footprints
 * plus the centres of every OPEN sub-tile (lawns) so greenery can be planted
 * in the courtyards. */
function packCell(cell: Cell, rng: () => number, zone: Zone, forbidPark = false): { builds: Placement[]; greens: [number, number][]; fullPark: boolean } {
  const templates = BLOCK_TEMPLATES[zone];
  let tpl = templates[Math.floor(rng() * templates.length)];
  // Never sit a full-park block next to another park (caller passes forbidPark).
  if (forbidPark && tpl.length === 0) {
    const filled = templates.filter((t) => t.length > 0);
    tpl = filled[Math.floor(rng() * filled.length)];
  }
  const times = Math.floor(rng() * 4);
  const grid: boolean[][] = Array.from({ length: SUB_COUNT }, () => Array(SUB_COUNT).fill(false));
  const builds: Placement[] = [];
  const halfCell = CELL_SIZE / 2;

  const toWorld = (i: number, j: number, w: number, d: number): Placement => {
    // Natural footprint edges on the sub-tile grid, inset by half the setback on
    // every side so neighbours always keep a clear gap.
    const half = SETBACK / 2;
    let x0 = cell.cx - halfCell + i * SUB_TILE + half;
    let x1 = cell.cx - halfCell + (i + w) * SUB_TILE - half;
    let z0 = cell.cz - halfCell + j * SUB_TILE + half;
    let z1 = cell.cz - halfCell + (j + d) * SUB_TILE - half;
    // CLIP (don't shift) each footprint to a generous inner band so nothing
    // pokes onto the road. Clipping keeps every building anchored to its own
    // tiles, so two buildings in the same cell can never be pushed into each
    // other (the bug that came from shifting centres inward).
    const EDGE_LIMIT = halfCell - 1.3; // 6.2 — bigger plots, still off the (now thinner) roads
    x0 = Math.max(x0, cell.cx - EDGE_LIMIT);
    x1 = Math.min(x1, cell.cx + EDGE_LIMIT);
    z0 = Math.max(z0, cell.cz - EDGE_LIMIT);
    z1 = Math.min(z1, cell.cz + EDGE_LIMIT);
    const fw = Math.max(x1 - x0, 0.5);
    const fd = Math.max(z1 - z0, 0.5);
    return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: fw, d: fd, size: Math.max(w, d) };
  };

  for (const raw of tpl) {
    let p = raw;
    for (let r = 0; r < times; r++) p = rot90(p);
    const [i, j, w, d] = p;
    if (i < 0 || j < 0 || i + w > SUB_COUNT || j + d > SUB_COUNT) continue;
    for (let di = 0; di < w; di++) for (let dj = 0; dj < d; dj++) grid[i + di][j + dj] = true;
    builds.push(toWorld(i, j, w, d));
  }

  const greens: [number, number][] = [];
  for (let i = 0; i < SUB_COUNT; i++) {
    for (let j = 0; j < SUB_COUNT; j++) {
      if (grid[i][j]) continue;
      greens.push([
        cell.cx - halfCell + (i + 0.5) * SUB_TILE,
        cell.cz - halfCell + (j + 0.5) * SUB_TILE
      ]);
    }
  }
  return { builds, greens, fullPark: tpl.length === 0 };
}

export interface CityBlocks {
  buildings: Building[];
  greenSpots: [number, number][];
}

/* Height buckets give every block a deliberate rhythm of tall / medium / low
 * instead of a flat skyline. Zone only shifts the PROBABILITY of each bucket,
 * so a downtown block still mixes a tower with mid-rises and a couple of low
 * shops, and a suburb still gets the odd taller accent. */
type HBucket = 'tall' | 'mid' | 'low';
const H_RANGE: Record<HBucket, [number, number]> = {
  tall: [15, 22],
  mid: [8, 12],
  low: [6, 10], // taller low-rise (stretched, NOT extra floors) so they aren't stubby
};
const ZONE_HMIX: Record<Zone, [number, number]> = {
  // cumulative thresholds [tallMax, midMax] for the rng roll. Tall is disabled
  // here (0): the skyline's high-rises are placed deterministically afterwards
  // as exactly 10 evenly-spread towers, so the random pass only mixes mid/low.
  core: [0, 0.55],
  mid: [0, 0.5],
  outer: [0, 0.42],
};

export function buildBuildings(seed: number, reserves: Reserve[], density = 1): CityBlocks {
  let s = seed;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const arr: Building[] = [];
  const greenSpots: [number, number][] = [];
  const parkCells = new Set<string>();
  const isParkNeighbour = (cx: number, cz: number) =>
    parkCells.has(`${cx - CYCLE},${cz}`) || parkCells.has(`${cx + CYCLE},${cz}`) ||
    parkCells.has(`${cx},${cz - CYCLE}`) || parkCells.has(`${cx},${cz + CYCLE}`);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rng() * list.length)];

  for (const cx of CELL_X) {
    for (const cz of CELL_Z) {
      if (isReserved(cx, cz, reserves, 0)) continue;
      const zone = zoneFor(cx, cz);
      const forbidPark = isParkNeighbour(cx, cz);
      const { builds, greens, fullPark } = packCell({ cx, cz }, rng, zone, forbidPark);

      // An all-green outer block becomes a proper park: a wide lawn pad plus
      // a cluster of trees planted on it.
      if (fullPark) {
        parkCells.add(`${cx},${cz}`);
        arr.push({ kind: 'park', pos: [cx, 0, cz], w: CELL_SIZE - 1.5, d: CELL_SIZE - 1.5, rot: 0 });
        for (const g of greens) greenSpots.push(g);
        continue;
      }
      for (const g of greens) greenSpots.push(g);

      // Plan the whole block first so we can enforce rhythm & anti-repeat.
      const tallPlaced: [number, number][] = [];
      let prevKind: Building['kind'] | null = null;
      let prevBody: string | null = null;
      const [tallMax, midMax] = ZONE_HMIX[zone];

      for (const sub of builds) {
        // Density thinning: on weaker tiers leave a share of plots as lawns
        // (filled with greenery below) instead of buildings — fewer draw calls
        // while keeping the planned, open look. Core stays a touch denser.
        const plotDensity = zone === 'core' ? Math.min(1, density + 0.12) : density;
        if (rng() > plotDensity) { greenSpots.push([sub.x, sub.z]); continue; }

        // Non-square footprints only spin 0/180° so a quarter-turn can't poke
        // their long side out across the road; square ones may use any turn.
        const square = Math.abs(sub.w - sub.d) < 0.6;
        const rot = square ? (Math.floor(rng() * 4) * Math.PI) / 2 : (rng() < 0.5 ? 0 : Math.PI);
        const pos: [number, number, number] = [sub.x, 0, sub.z];

        // ── Height bucket with rhythm: no two TALL buildings adjacent. ──
        let bucket: HBucket;
        const hr = rng();
        bucket = hr < tallMax ? 'tall' : hr < midMax ? 'mid' : 'low';
        const tooClose = tallPlaced.some(([tx, tz]) => Math.hypot(tx - sub.x, tz - sub.z) < 6.5);
        const slim = Math.min(sub.w, sub.d) < 4.0; // thin footprints make ugly slab towers
        if (bucket === 'tall' && (tooClose || slim)) bucket = 'mid';
        if (bucket === 'tall') tallPlaced.push([sub.x, sub.z]);
        // Tiny single-tile cottages stay low so they never become thin pillars.
        if (sub.size === 1) bucket = 'low';
        const [hLo, hHi] = H_RANGE[bucket];
        const h = hLo + rng() * (hHi - hLo);

        // ── Land use: every block mixes uses; zone tilts the odds. Tall
        //    footprints lean office/highrise, low ones lean retail. ──
        let kind: Building['kind'];
        const kr = rng();
        const big = sub.size >= 2; // footprint wide enough for a mall / cinema
        if (bucket === 'tall') {
          kind = kr < 0.4 ? 'highrise' : kr < 0.85 ? 'apartment' : 'hospital';
        } else if (bucket === 'mid') {
          if (big && kr < 0.06) kind = 'mall';
          else if (big && kr < 0.12) kind = 'cinema';
          else if (kr < 0.34) kind = 'apartment';
          else if (kr < 0.46) kind = 'highrise';
          else if (kr < 0.62) kind = 'shop';
          else if (kr < 0.79) kind = 'restaurant';
          else if (kr < 0.92) kind = 'cafe';
          else kind = 'hospital';
        } else {
          // Low-rise neighbourhood: lots of everyday function buildings.
          if (big && kr < 0.05) kind = 'mall';
          else if (big && kr < 0.11) kind = 'cinema';
          else if (kr < 0.34) kind = 'shop';
          else if (kr < 0.53) kind = 'cafe';
          else if (kr < 0.73) kind = 'restaurant';
          else kind = 'apartment';
        }
        // Anti-repeat: never the same kind twice in a row within a block.
        if (kind === prevKind) {
          const alt: Building['kind'][] = kind === 'shop' ? ['cafe', 'apartment']
            : kind === 'cafe' ? ['shop', 'apartment']
            : kind === 'apartment' ? ['shop', 'cafe']
            : kind === 'highrise' ? ['apartment', 'hospital']
            : ['cafe', 'shop'];
          kind = pick(alt);
        }
        // Don't drop a pocket park into a block that already neighbours a park.
        if (kind === 'park' && forbidPark) kind = 'cafe';
        prevKind = kind;

        // Colour variety: avoid repeating the previous body colour.
        let body = pick(FACADE_COLORS);
        if (body === prevBody) body = pick(FACADE_COLORS);
        prevBody = body;

        switch (kind) {
          case 'park':
            // Pocket-park rolls become a planted lawn instead of a park block:
            // real parks are full cells only, so two parks never sit adjacent.
            greenSpots.push([sub.x, sub.z]);
            break;
          case 'highrise':
            arr.push({
              kind: 'highrise', pos, w: sub.w, d: sub.d, h,
              body,
              accent: pick(ACCENT_COLORS),
              roof: pick(ROOF_STYLES),
              massing: pick(MASSING_STYLES),
              rot
            });
            break;
          case 'apartment':
            arr.push({ kind: 'apartment', pos, w: sub.w, d: sub.d, h: Math.min(h, 14), body, rot });
            break;
          case 'shop':
            arr.push({
              kind: 'shop', pos, w: sub.w, d: sub.d, h: Math.min(Math.max(h, 6), 9),
              body,
              awning: pick([hex.danger, hex.accent, hex.secondary, hex.primary]),
              rot
            });
            break;
          case 'cafe':
            arr.push({ kind: 'cafe', pos, w: sub.w, d: sub.d, h: Math.min(Math.max(h, 5.5), 8), rot });
            break;
          case 'hospital':
            arr.push({ kind: 'hospital', pos, w: sub.w, d: sub.d, rot });
            break;
          case 'restaurant':
            arr.push({ kind: 'restaurant', pos, w: sub.w, d: sub.d, h: Math.min(Math.max(h, 5.5), 8), body, accent: pick([hex.danger, hex.accent, hex.gold]), rot });
            break;
          case 'cinema':
            arr.push({ kind: 'cinema', pos, w: sub.w, d: sub.d, h: Math.min(Math.max(h, 6), 9), rot });
            break;
          case 'mall':
            arr.push({ kind: 'mall', pos, w: sub.w, d: sub.d, h: Math.min(Math.max(h, 5), 9), body, rot });
            break;
        }
      }
    }
  }

  // ── Exactly 10 high-rise towers, spread evenly across the whole city. ──
  // No building is tall by default (ZONE_HMIX disables the tall bucket). We pick
  // 10 well-separated cells via deterministic farthest-point sampling and raise
  // the chunkiest building in each into a real tower, so the skyline reads as an
  // even scattering of landmarks instead of random clumps or flat districts.
  const N_TALL = 10;
  const freeCells: [number, number][] = [];
  for (const fcx of CELL_X) for (const fcz of CELL_Z) {
    if (isReserved(fcx, fcz, reserves, 0)) continue;
    freeCells.push([fcx, fcz]);
  }
  const towerCells: [number, number][] = [];
  if (freeCells.length) {
    // deterministic start: the cell nearest the south-west corner.
    let start = 0, startD = Infinity;
    freeCells.forEach((c, k) => {
      const d = Math.hypot(c[0] + GRID_EXTENT, c[1] + GRID_EXTENT);
      if (d < startD) { startD = d; start = k; }
    });
    towerCells.push(freeCells[start]);
    while (towerCells.length < Math.min(N_TALL, freeCells.length)) {
      let far = -1, farD = -1;
      freeCells.forEach((c, k) => {
        let dmin = Infinity;
        for (const t of towerCells) dmin = Math.min(dmin, Math.hypot(c[0] - t[0], c[1] - t[1]));
        if (dmin > farD) { farD = dmin; far = k; }
      });
      towerCells.push(freeCells[far]);
    }
  }
  for (const [tcx, tcz] of towerCells) {
    let bestIdx = -1, bestArea = 0;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      if (!('h' in b)) continue; // skip hospital / park (no height)
      if (Math.abs(b.pos[0] - tcx) > CELL_SIZE / 2 || Math.abs(b.pos[2] - tcz) > CELL_SIZE / 2) continue;
      if (Math.min(b.w, b.d) < 4) continue; // never a thin slab tower
      const area = b.w * b.d;
      if (area > bestArea) { bestArea = area; bestIdx = i; }
    }
    if (bestIdx < 0) continue;
    const b = arr[bestIdx];
    arr[bestIdx] = {
      kind: 'highrise', pos: b.pos, w: b.w, d: b.d,
      h: 17 + rng() * 6,
      body: pick(FACADE_COLORS),
      accent: pick(ACCENT_COLORS),
      roof: pick(ROOF_STYLES),
      massing: pick(MASSING_STYLES),
      rot: b.rot,
    };
  }

  return { buildings: arr, greenSpots };
}



/* === Trees & lamps === */
function distToSegment(px: number, pz: number, a: [number, number], b: [number, number]): number {
  const [ax, az] = a, [bx, bz] = b;
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function nearAnyRoad(x: number, z: number, roads: Segment[], margin: number): boolean {
  for (const seg of roads) {
    if (distToSegment(x, z, seg.from, seg.to) < margin) return true;
  }
  return false;
}

/** Trees may sit on park lawns but never inside a solid building footprint. */
function inSolidBuilding(x: number, z: number, solids: Building[]): boolean {
  for (const b of solids) {
    if (Math.abs(b.pos[0] - x) < b.w / 2 + 0.7 && Math.abs(b.pos[2] - z) < b.d / 2 + 0.7) return true;
  }
  return false;
}

/**
 * Greenery in three deliberate layers:
 *   1. Street trees — evenly spaced rows lining both kerbs of every road.
 *   2. Courtyard trees — planted on the open lawn tiles left inside each block.
 *   3. A light random scatter to fill any remaining budget.
 * The result is the leafy, planned look of Pocket City / SimCity BuildIt. */
export function buildTrees(
  seed: number,
  count: number,
  reserves: Reserve[],
  roads: Segment[],
  buildings: Building[],
  greenSpots: [number, number][]
): Tree[] {
  let s = seed * 31 + 7;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const arr: Tree[] = [];
  const solids = buildings.filter(b => b.kind !== 'park');
  const add = (x: number, z: number, scaleLo: number, scaleHi: number) => {
    arr.push({ pos: [x, 0, z], scale: scaleLo + rng() * (scaleHi - scaleLo), rot: rng() * Math.PI * 2, type: rng() > 0.5 ? 1 : 0 });
  };

  // ── 1. Street trees ─────────────────────────────────────────────
  // Trees ONLY line the streets — never planted on open ground inside a block,
  // so a plot is always a building, never a stray clump of trees.
  const streetCap = count;
  const SPACING = 6;
  for (const seg of roads) {
    if (arr.length >= streetCap) break;
    const [ax, az] = seg.from;
    const [bx, bz] = seg.to;
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 7) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len;       // along
    const nx = -uz, nz = ux;                                 // perpendicular
    const half = (seg.w ?? ROAD_WIDTH) / 2;
    const off = half + 1.8;
    const n = Math.floor(len / SPACING);
    for (let k = 1; k < n; k++) {
      const t = (k / n) * len;
      const px = ax + ux * t, pz = az + uz * t;
      for (const side of [1, -1]) {
        if (arr.length >= streetCap) break;
        const x = px + nx * off * side;
        const z = pz + nz * off * side;
        if (isReserved(x, z, reserves, 1.0)) continue;
        // Skip trees that would land on a crossing road near a junction.
        if (nearAnyRoad(x, z, roads, half + 0.9)) continue;
        if (inSolidBuilding(x, z, solids)) continue;
        add(x, z, 0.5, 0.85);
      }
    }
  }

  // ── 2. Courtyard / lawn trees ──────────────────────────────────
  const shuffled = [...greenSpots];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (const [gx, gz] of shuffled) {
    if (arr.length >= count) break;
    if (rng() < 0.35) continue;                              // leave some bare lawn
    const x = gx + (rng() - 0.5) * 1.4;
    const z = gz + (rng() - 0.5) * 1.4;
    if (isReserved(x, z, reserves, 1.2)) continue;
    if (nearAnyRoad(x, z, roads, 1.3)) continue;
    if (inSolidBuilding(x, z, solids)) continue;
    add(x, z, 0.7, 1.2);
  }

  return arr;
}

export function buildLamps(count: number): Lamp[] {
  const arr: Lamp[] = [];
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2 + 0.2;
    const r = 11;
    arr.push({ pos: [Math.cos(theta) * r, 0, Math.sin(theta) * r] });
  }
  return arr;
}

/* === Top-level === */
export function computeCityLayout(tier: Tier, seedOverride?: number): CityLayout {
  const seed = seedOverride ?? (tier === 'high' ? 4242 : tier === 'mid' ? 1337 : 99);
  const reserves = getReserves();
  const roads = buildRoads(reserves);
  const { buildings, greenSpots } = buildBuildings(seed, reserves, BUILDING_DENSITY_BY_TIER[tier]);
  const trees = buildTrees(seed, TREE_COUNT_BY_TIER[tier], reserves, roads, buildings, greenSpots);
  const lamps = buildLamps(LAMP_COUNT_BY_TIER[tier]);
  return {
    cellSize: CELL_SIZE,
    roadWidth: ROAD_WIDTH,
    nCells: N_CELLS,
    gridExtent: GRID_EXTENT,
    reserves,
    roads,
    buildings,
    trees,
    lamps
  };
}
