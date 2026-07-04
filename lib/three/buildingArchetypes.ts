/**
 * Building archetype library.
 *
 * Every plot in the city holds ONE coherent single-mass building. Variety does
 * NOT come from size/height/colour — it comes from genuinely different
 * architectural FORMS: the footprint shape, the overall silhouette, the window
 * system and a few facade details. This module is just data + a deterministic
 * picker; the actual geometry is built by <FacadeBuilding>.
 *
 * There are 24 archetypes (>= 20 as requested), split by height tier so towers
 * get tower forms and low blocks get street forms.
 */

export type Footprint = 'box' | 'round' | 'hex' | 'oct' | 'wedge';
export type Silhouette =
  | 'straight'      // constant cross-section
  | 'taper'         // narrows toward the top
  | 'slantTop'      // flat body + a slanted (cut) crown
  | 'setbackCrown'  // body + one slimmer integral top section
  | 'podiumShaft'   // wide low base + slim tall shaft (one building)
  | 'stepped'       // single-mass ziggurat, centred shrinking tiers
  | 'twist';        // floors rotate gradually up the height

export type WindowStyle =
  | 'punch'    // individual punched windows
  | 'ribbon'   // continuous horizontal window bands
  | 'curtain'  // dense full glass mullion grid
  | 'grid'     // deep regular square grid
  | 'checker'  // offset checkerboard
  | 'arched'   // tall round-topped windows
  | 'factory'  // large multi-pane industrial windows
  | 'none';

export type Detail =
  | 'balcony'     // projecting balcony slabs + railings each floor
  | 'fins'        // vertical fins between windows
  | 'louver'      // horizontal sun-screen slats
  | 'bands'       // horizontal spandrel bands
  | 'cornice'     // classical crown moulding ring
  | 'awningSign'  // ground-floor awning + signboard
  | 'shopfront'   // glazed retail ground floor
  | 'dome'        // domed roof cap
  | 'diagrid'     // diagonal structural lattice
  | 'parapet';    // raised flat roof parapet ring

export type Finish = 'glass' | 'concrete' | 'brick' | 'stucco' | 'metal' | 'timber';

export interface Archetype {
  id: string;
  name: string;
  tier: 'tall' | 'low';
  footprint: Footprint;
  silhouette: Silhouette;
  window: WindowStyle;
  details: Detail[];
  finish: Finish;
}

/* ── 12 tall (tower) forms ─────────────────────────────────────────────── */
const TALL: Archetype[] = [
  { id: 't01', name: 'Tháp kính', tier: 'tall', footprint: 'box', silhouette: 'straight', window: 'curtain', details: ['parapet'], finish: 'glass' },
  { id: 't02', name: 'Tháp trụ tròn', tier: 'tall', footprint: 'round', silhouette: 'straight', window: 'ribbon', details: [], finish: 'glass' },
  { id: 't03', name: 'Tháp thuôn nhọn', tier: 'tall', footprint: 'box', silhouette: 'taper', window: 'grid', details: [], finish: 'concrete' },
  { id: 't04', name: 'Tháp xoắn tầng', tier: 'tall', footprint: 'box', silhouette: 'twist', window: 'ribbon', details: ['bands'], finish: 'glass' },
  { id: 't05', name: 'Tháp vạt mái chéo', tier: 'tall', footprint: 'box', silhouette: 'slantTop', window: 'curtain', details: ['parapet'], finish: 'glass' },
  { id: 't06', name: 'Tháp lam đứng', tier: 'tall', footprint: 'box', silhouette: 'straight', window: 'ribbon', details: ['fins'], finish: 'metal' },
  { id: 't07', name: 'Tháp lưới bê tông', tier: 'tall', footprint: 'box', silhouette: 'straight', window: 'grid', details: ['bands'], finish: 'concrete' },
  { id: 't08', name: 'Tháp đỉnh thon', tier: 'tall', footprint: 'box', silhouette: 'setbackCrown', window: 'punch', details: ['parapet'], finish: 'stucco' },
  { id: 't09', name: 'Tháp đế + thân', tier: 'tall', footprint: 'box', silhouette: 'podiumShaft', window: 'curtain', details: ['shopfront'], finish: 'glass' },
  { id: 't10', name: 'Tháp diagrid', tier: 'tall', footprint: 'box', silhouette: 'taper', window: 'curtain', details: ['diagrid'], finish: 'metal' },
  { id: 't11', name: 'Tháp lục giác', tier: 'tall', footprint: 'hex', silhouette: 'straight', window: 'ribbon', details: ['parapet'], finish: 'glass' },
  { id: 't12', name: 'Khối khách sạn', tier: 'tall', footprint: 'box', silhouette: 'straight', window: 'punch', details: ['balcony'], finish: 'stucco' },
];

/* ── 12 low / mid (street) forms ───────────────────────────────────────── */
const LOW: Archetype[] = [
  { id: 'l01', name: 'Hộp chữ nhật', tier: 'low', footprint: 'box', silhouette: 'straight', window: 'punch', details: ['parapet'], finish: 'stucco' },
  { id: 'l02', name: 'Nhà phố gạch', tier: 'low', footprint: 'box', silhouette: 'straight', window: 'punch', details: ['awningSign'], finish: 'brick' },
  { id: 'l03', name: 'Chung cư ban công', tier: 'low', footprint: 'box', silhouette: 'straight', window: 'ribbon', details: ['balcony'], finish: 'stucco' },
  { id: 'l04', name: 'Nhà cổ điển cornice', tier: 'low', footprint: 'box', silhouette: 'straight', window: 'arched', details: ['cornice'], finish: 'stucco' },
  { id: 'l05', name: 'Loft công nghiệp', tier: 'low', footprint: 'box', silhouette: 'straight', window: 'factory', details: ['parapet'], finish: 'brick' },
  { id: 'l06', name: 'Mixed-use kính', tier: 'low', footprint: 'box', silhouette: 'straight', window: 'punch', details: ['shopfront'], finish: 'concrete' },
  { id: 'l07', name: 'Nhà mặt bằng lục giác', tier: 'low', footprint: 'hex', silhouette: 'straight', window: 'punch', details: ['parapet'], finish: 'stucco' },
  { id: 'l08', name: 'Nhà mặt bằng bát giác', tier: 'low', footprint: 'oct', silhouette: 'straight', window: 'ribbon', details: ['cornice'], finish: 'concrete' },
  { id: 'l09', name: 'Nhà vạt chéo (wedge)', tier: 'low', footprint: 'wedge', silhouette: 'straight', window: 'punch', details: ['parapet'], finish: 'metal' },
  { id: 'l10', name: 'Nhà giật cấp bậc', tier: 'low', footprint: 'box', silhouette: 'stepped', window: 'ribbon', details: ['balcony'], finish: 'stucco' },
  { id: 'l11', name: 'Trụ tròn thấp', tier: 'low', footprint: 'round', silhouette: 'straight', window: 'ribbon', details: ['parapet'], finish: 'concrete' },
  { id: 'l12', name: 'Mái vòm rotunda', tier: 'low', footprint: 'round', silhouette: 'straight', window: 'arched', details: ['dome'], finish: 'stucco' },
];

export const ARCHETYPES: Archetype[] = [...TALL, ...LOW];

/* Stable hash so each plot's archetype is deterministic across reloads. */
function hash(px: number, pz: number, salt: number): number {
  let a = (Math.floor(px * 92.7 + pz * 57.3) | 0) ^ (salt * 0x9e3779b1);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}

/**
 * Pick a deterministic archetype for a plot. Tall plots get tower forms, low
 * plots get street forms. A coarse cell-parity salt decorrelates neighbours so
 * two adjacent plots rarely share the same form.
 */
export function pickArchetype(
  px: number,
  pz: number,
  height: number,
  forceTier?: 'tall' | 'low',
): Archetype {
  const tier = forceTier ?? (height >= 11 ? 'tall' : 'low');
  const pool = tier === 'tall' ? TALL : LOW;
  const parity = (Math.floor(px / 8) + Math.floor(pz / 8)) & 3;
  const idx = Math.floor(hash(px, pz, parity + 1) * pool.length) % pool.length;
  return pool[idx];
}
