import * as THREE from 'three';

/* === Bright modern city palette === */
export const palette = {
  bg: new THREE.Color('#E8F4FF'),
  surface: new THREE.Color('#FFFFFF'),
  primary: new THREE.Color('#2E8B6B'),
  primarySoft: new THREE.Color('#E8F5F0'),
  primaryDark: new THREE.Color('#1F6149'),
  secondary: new THREE.Color('#4A90D9'),
  secondaryDark: new THREE.Color('#2E5C8B'),
  accent: new THREE.Color('#F4A261'),
  accentDark: new THREE.Color('#C97D40'),
  danger: new THREE.Color('#E05C5C'),
  text: new THREE.Color('#1A2E25'),
  muted: new THREE.Color('#6B7D74'),
  border: new THREE.Color('#D4E8DF'),
  gold: new THREE.Color('#F4C542'),
  silver: new THREE.Color('#C0C7CC'),
  bronze: new THREE.Color('#B87333'),
  night: new THREE.Color('#0F1B2D'),
  dawn: new THREE.Color('#FFC8A0'),
  dusk: new THREE.Color('#F08770'),
  sky: new THREE.Color('#A8D8F0'),
  pastelPink: new THREE.Color('#FFB5C5'),
  pastelMint: new THREE.Color('#A5E5C8'),
  pastelSky: new THREE.Color('#A5D8FF'),
  pastelPeach: new THREE.Color('#FFCBA0'),
  pastelLavender: new THREE.Color('#C8B5E0'),
  pastelLemon: new THREE.Color('#FFE5A0'),
  pastelCoral: new THREE.Color('#FFA89C'),
  grassLight: new THREE.Color('#A8D5A8'),
  grassDark: new THREE.Color('#7AB585'),
  asphalt: new THREE.Color('#3A3F4A'),
  sidewalk: new THREE.Color('#D8D4CA')
};

export const hex = {
  bg: '#E8F4FF',
  primary: '#2E8B6B',
  primarySoft: '#E8F5F0',
  secondary: '#4A90D9',
  accent: '#F4A261',
  danger: '#E05C5C',
  text: '#1A2E25',
  muted: '#6B7D74',
  border: '#D4E8DF',
  gold: '#F4C542',
  silver: '#C0C7CC',
  bronze: '#B87333',
  pastelPink: '#FFB5C5',
  pastelMint: '#A5E5C8',
  pastelSky: '#A5D8FF',
  pastelPeach: '#FFCBA0',
  pastelLavender: '#C8B5E0',
  pastelLemon: '#FFE5A0',
  pastelCoral: '#FFA89C',
  asphalt: '#3A3F4A',
  sidewalk: '#D8D4CA'
};

/* === Chess-grid building layout ===
 * Plaza ring at center (0,0). Five landmarks sit on EXACT grid-cell centers
 * (±34 = cell index 5 of the 7-cell grid, since centers = (i-3)·17).
 * Landing each landmark on a cell center means its footprint fills one whole
 * 15×15 cell and never straddles a road, so the road network stays intact.
 *   Row -1 (z=-34):  Library  ·  Tower  ·  Arena
 *   Row  0 (z=  0):  ........  PLAZA  ........
 *   Row +1 (z=+34):  Academy  ·  ......  ·  TownHall
 */
export const buildings = {
  globe:    { position: [0, 0, 0]      as const, label: '🌏 Biên Giới Mềm' },
  library:  { position: [-34, 0, -34]  as const, label: '📚 Thư viện',     sub: 'Lý thuyết',       route: '/theory'      },
  tower:    { position: [0, 0, -34]    as const, label: '🏆 Đài vinh danh', sub: 'Bảng xếp hạng',   route: '/leaderboard' },
  arena:    { position: [34, 0, -34]   as const, label: '⚔️ Đấu trường',  sub: 'Game',             route: '/game'        },
  academy:  { position: [-34, 0, 34]   as const, label: '🎓 Học viện',    sub: 'Flashcard',        route: '/flashcards'  },
  townhall: { position: [34, 0, 34]    as const, label: '🏛️ Tòa thị chính', sub: 'Đăng nhập / Nhóm', route: '/townhall' }
};

export type CameraPreset = {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
};

/* Camera presets.
 * Home: wide isometric overview of the whole city.
 * Interior routes: camera placed INSIDE each scene's room, looking toward the
 * main content panel/back wall. This frontal positioning ensures users see the
 * scene content directly upon entering a building, and we hide exterior props
 * so the camera only ever sees the room interior.
 *
 * Each scene's POS = building's world position. Interior content is anchored
 * at the back wall (negative local Z). Camera sits at front (positive local Z)
 * looking toward back.
 */
export const cameraPresets: Record<string, CameraPreset> = {
  '/':              { position: [0, 5.6, 11],   lookAt: [0, 3.6, 0],       fov: 56 },
  // Library: 36w × 30d × 10h at (-34,0,-34). Room spans Z∈[-49,-19].
  // Content panel + chapter buttons sit at local z=7 (world z≈-27), just in
  // front of the central shelves. Camera rests by the door framing both the
  // buttons (x≈-38) and the panel (x≈-32) without clipping any text.
  '/theory':        { position: [-33.7, 2.6, -24], lookAt: [-33.7, 3.7, -31],  fov: 58 },
  // Academy: 22w × 18d × 8.5h at (-34,0,34). Room spans Z∈[25,43].
  '/flashcards':    { position: [-34, 4.2, 41], lookAt: [-34, 3.5, 26],    fov: 55 },
  // Tower: 32w × 26d × 12h at (0,0,-34). Pedestals/leaderboard on back wall Z=-45.
  // Rest deep in the hall so the door→content entry dollies slowly onto the
  // winners' podium / results.
  '/leaderboard':   { position: [0, 5.6, -31],  lookAt: [0, 4.2, -44],     fov: 56 },
  // Arena: open-air medieval colosseum at (34,0,-34). Seating ring outer r≈17,
  // so the camera must sit INSIDE the open bowl (small radius) facing the central
  // Quiz/Debate panels at z=-34 — not back at z=-18 where it lands among the seats.
  '/game':          { position: [34, 5.4, -24.5], lookAt: [34, 4.9, -34],   fov: 55 },
  // Quiz keeps the SAME arena framing as /game — the board game shows as a DOM
  // popup over the live arena background instead of swapping to a flat 2D page.
  '/game/quiz':     { position: [34, 5.4, -24.5], lookAt: [34, 4.9, -34],   fov: 55 },
  '/game/debate':   { position: [34, 5, -20],   lookAt: [34, 4, -38],      fov: 70 },
  // TownHall: 32w × 26d × 11h at (34,0,34). Auth/login panel at world (34,3.5,29).
  // Land close, framed straight on the login panel.
  '/townhall':      { position: [34, 4, 38],    lookAt: [34, 3.6, 29],     fov: 52 }
};

/* Exterior "front-of-building" poses (chính diện).
 * Every landmark's entrance faces +Z (glass facade / interior presets confirm
 * this), so we stand off on the +Z side at street level, looking back at the
 * building. Used twice:
 *   1. On CLICK — fly here first (city still visible) before the scene swaps in.
 *   2. On EXIT — land here instead of the city-centre overview, so the user
 *      steps back out right in front of the building they just left.
 * Keyed by the building's route. */
export const approachPoses: Record<string, CameraPreset> = {
  '/theory':      { position: [-34, 21, -14], lookAt: [-34, 5, -34], fov: 52 }, // Library
  '/flashcards':  { position: [-34, 21, 54],  lookAt: [-34, 5, 34],  fov: 52 }, // Academy
  '/leaderboard': { position: [0, 22, -14],   lookAt: [0, 6, -34],   fov: 52 }, // Tower
  '/game':        { position: [34, 21, -14],  lookAt: [34, 4, -34],  fov: 56 }, // Arena
  '/townhall':    { position: [34, 21, 54],   lookAt: [34, 5, 34],   fov: 52 }  // TownHall
};

export const cityRadius = 60;
export const groundSize = 120;

/* Tile size used by the chessboard ground. Buildings sit on grid intersections. */
export const tileSize = 8;
