'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { hex } from '@/lib/three/theme';
import { VnText as Text } from '../primitives/VnText';
import { Button3D } from '../primitives/Button3D';
import { InteriorRoom } from './parts/InteriorRoom';
import { cinemaVideos, type CinemaVideo } from '@/data/cinemaVideos';

/* ─── World position of cinema ──────────────────────────────────────── */
const POS: [number, number, number] = [0, 0, 34];

/* ─── Room dimensions ───────────────────────────────────────────────── */
const ROOM_W = 28;
const ROOM_D = 20;   // reduced depth
const ROOM_H = 10;

/* ─── Seating layout ────────────────────────────────────────────────── */
// 3 dãy × 8 hàng × 5 ghế  =  120 ghế
// 4 bậc × 2 hàng/bậc       =   8 hàng
const NUM_STEPS      = 4;
const ROWS_PER_STEP  = 2;
const ROWS           = NUM_STEPS * ROWS_PER_STEP; // 8
const SEATS_PER_ROW  = 5;
const SEAT_SPACING   = 0.90;
const ROW_SPACING    = 1.6;
const STEP_H         = 0.65; // height gained per bậc
const FIRST_ROW_Z    = -5.0; // local Z of first (closest-to-screen) row

// Section (dãy) centers: left=-6, center=0, right=+6
const SECTION_W      = SEATS_PER_ROW * SEAT_SPACING; // 4.5
const SECTION_GAP    = 2.5;                           // aisle between sections
const SECTION_X      = [-(SECTION_W + SECTION_GAP), 0, SECTION_W + SECTION_GAP] as const;

/* ─── Derived geometry constants ────────────────────────────────────── */
const halfW   = ROOM_W / 2;
const halfD   = ROOM_D / 2;                // 14
const SCREEN_W = 22;
const SCREEN_H = 7.5;
const SCREEN_CY = SCREEN_H / 2 + 1.2;     // screen centre Y ≈ 4.95
const SCREEN_Z  = -(halfD - 0.12);         // ≈ -13.88

// Exit doors stand on the LAST step (same elevation as the last 2 rows)
const EXIT_STEP_H = (NUM_STEPS - 1) * STEP_H; // = 1.95

/* ─── Step platform Z boundaries (NO gaps between platforms) ────────── */
// boundary[s] = the Z where step s ends and step s+1 begins
const STEP_BOUNDARY = [
  FIRST_ROW_Z + 1.5 * ROW_SPACING,  //  2.5
  FIRST_ROW_Z + 3.5 * ROW_SPACING,  //  6.5
  FIRST_ROW_Z + 5.5 * ROW_SPACING,  // 10.5
] as const;

function stepZStart(s: number) {
  return s === 0 ? FIRST_ROW_Z - ROW_SPACING / 2 : STEP_BOUNDARY[s - 1];
}
function stepZEnd(s: number) {
  return s === NUM_STEPS - 1 ? halfD - 0.12 : STEP_BOUNDARY[s];
}

/* ─── Per-row helpers ───────────────────────────────────────────────── */
function rowStep(row: number) { return Math.floor(row / ROWS_PER_STEP); }
function getRowY(row: number) { return rowStep(row) * STEP_H; }
function getRowZ(row: number) { return FIRST_ROW_Z + row * ROW_SPACING; }

const CARPET_COLOR = '#7A0010';

/* ==================================================================== */
export function CinemaScene() {
  const [activeVideo, setActiveVideo] = useState<CinemaVideo | null>(null);

  // A real <video> DOM element (not in the R3F tree) feeds a VideoTexture that
  // is mapped straight onto the screen mesh — so the picture is truly part of
  // the 3D scene (never a floating 2D banner) and lights the room naturally.
  const videoEl = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.playsInline = true;
    v.loop = false;
    return v;
  }, []);
  const videoTexture = useMemo(() => {
    if (!videoEl) return null;
    const t = new THREE.VideoTexture(videoEl);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [videoEl]);

  useEffect(() => () => { if (videoEl) videoEl.pause(); }, [videoEl]);

  const selectVideo = useCallback((v: CinemaVideo) => {
    if (videoEl && v.type === 'local') {
      videoEl.src = v.src;
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    }
    setActiveVideo(v);
  }, [videoEl]);

  const closeVideo = useCallback(() => {
    if (videoEl) videoEl.pause();
    setActiveVideo(null);
  }, [videoEl]);

  const showVideo = !!activeVideo && activeVideo.type === 'local' && !!videoTexture;

  return (
    <group position={POS}>

      {/* ── Room shell ────────────────────────────────────────────────── */}
      <InteriorRoom
        width={ROOM_W} depth={ROOM_D} height={ROOM_H}
        floorColor="#1C1210" wallColor="#221212" ceilingColor="#100808"
      />

      {/* ── Lighting — simple even light, no effects ─────────────────── */}
      <ambientLight intensity={1.0} />

      {/* ── Screen ───────────────────────────────────────────────────── */}
      {/* Frame */}
      <mesh position={[0, SCREEN_CY, SCREEN_Z]}>
        <boxGeometry args={[SCREEN_W + 1.8, SCREEN_H + 1.4, 0.14]} />
        <meshStandardMaterial color="#111111" roughness={0.8} />
      </mesh>
      {/* Surface — shows the VideoTexture when a film is playing, else dark idle */}
      <mesh position={[0, SCREEN_CY, SCREEN_Z + 0.08]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        {showVideo ? (
          <meshBasicMaterial map={videoTexture!} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#0B0B14" emissive="#0B0B14" emissiveIntensity={0.35} roughness={0.35} />
        )}
      </mesh>

      {/* ── Movie selection — real 3D poster panels on the screen ─────── */}
      {!activeVideo && (
        <group position={[0, SCREEN_CY, SCREEN_Z + 0.1]}>
          <Text position={[0, SCREEN_H / 2 - 0.55, 0.06]} fontSize={0.55} color="#F4C542" anchorX="center" anchorY="middle">
            🎬  CHỌN PHIM
          </Text>
          {cinemaVideos.map((v, i) => {
            const n = cinemaVideos.length;
            const colW = (SCREEN_W - 2) / Math.max(n, 1);
            const px = (i - (n - 1) / 2) * colW;
            return (
              <PosterPanel
                key={v.id}
                video={v}
                position={[px, -0.5, 0.06]}
                width={Math.min(colW - 0.5, 6)}
                height={SCREEN_H - 2.2}
                onSelect={() => selectVideo(v)}
              />
            );
          })}
        </group>
      )}

      {/* ── Close button (3D) while a film plays ─────────────────────── */}
      {activeVideo && (
        <Button3D
          position={[SCREEN_W / 2 - 1.4, SCREEN_CY + SCREEN_H / 2 + 0.7, SCREEN_Z + 0.25]}
          width={2.6}
          height={0.75}
          color="#6A000E"
          emissive="#6A000E"
          emissiveIntensity={0.35}
          onClick={closeVideo}
          ariaLabel="Đóng phim"
        >
          <Text fontSize={0.3} color="#fff" anchorX="center" anchorY="middle">← Đóng</Text>
        </Button3D>
      )}

      {/* ── Projector booth ──────────────────────────────────────────── */}
      <group position={[0, ROOM_H - 0.8, halfD - 1.5]}>
        <RoundedBox args={[2.8, 1.0, 1.8]} radius={0.18} smoothness={3}>
          <meshStandardMaterial color="#1A1A1A" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0, -0.93]}>
          <cylinderGeometry args={[0.22, 0.28, 0.3, 16]} />
          <meshStandardMaterial color="#2A2A2A" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, -1.1]}>
          <circleGeometry args={[0.18, 16]} />
          <meshStandardMaterial color="#FFF" emissive="#AACCFF"
            emissiveIntensity={activeVideo ? 0.5 : 1.8} />
        </mesh>
      </group>

      {/* ── Floor-level aisle carpets ────────────────────────────────── */}
      {/* These cover the ground between the screen and the first step */}
      <CarpetPlane x={-3.5}  y={0.012} z={0} w={2.5} d={ROOM_D - 2} />
      <CarpetPlane x={3.5}   y={0.012} z={0} w={2.5} d={ROOM_D - 2} />
      <CarpetPlane x={-11.5} y={0.012} z={0} w={4.5} d={ROOM_D - 2} />
      <CarpetPlane x={11.5}  y={0.012} z={0} w={4.5} d={ROOM_D - 2} />
      {/* Transverse strips — front (lobby before first step) and back (top of last step near exits) */}
      <CarpetPlane x={0} y={0.012}               z={FIRST_ROW_Z - ROW_SPACING * 2.0}              w={ROOM_W} d={4} />
      <CarpetPlane x={0} y={EXIT_STEP_H + 0.013} z={stepZEnd(NUM_STEPS - 1) - ROW_SPACING * 0.5} w={ROOM_W} d={3} />

      {/* ── Step platforms — 4 bậc, no gaps between them ────────────── */}
      {Array.from({ length: NUM_STEPS }).map((_, s) => {
        const zStart  = stepZStart(s);
        const zEnd    = stepZEnd(s);
        const zLen    = zEnd - zStart;
        const zCenter = (zStart + zEnd) / 2;
        // Platform height = step elevation (step 0 is effectively floor level)
        const ph = s * STEP_H;
        // Render a solid box from Y=0 up to Y=ph (no floating thin slab for step 0)
        const boxH = Math.max(ph, 0.06);

        return (
          <group key={`step-${s}`}>
            {/* Solid riser box from floor to this step's elevation */}
            <mesh position={[0, boxH / 2, zCenter]}>
              <boxGeometry args={[ROOM_W, boxH, zLen]} />
              <meshStandardMaterial color="#0E0808" roughness={0.9} />
            </mesh>
            {/* Carpet on the top surface of this step (aisle areas only) */}
            <CarpetPlane x={-3.5}  y={boxH + 0.013} z={zCenter} w={2.5} d={zLen} />
            <CarpetPlane x={3.5}   y={boxH + 0.013} z={zCenter} w={2.5} d={zLen} />
            <CarpetPlane x={-11.5} y={boxH + 0.013} z={zCenter} w={4.5} d={zLen} />
            <CarpetPlane x={11.5}  y={boxH + 0.013} z={zCenter} w={4.5} d={zLen} />
          </group>
        );
      })}

      {/* ── Seating: 3 dãy × 8 hàng × 5 ghế ───────────────────────── */}
      {Array.from({ length: ROWS }).map((_, row) => {
        const rZ = getRowZ(row);
        const rY = getRowY(row);
        return (
          <group key={`row-${row}`}>
            {SECTION_X.map((secX, secIdx) =>
              Array.from({ length: SEATS_PER_ROW }).map((_, si) => (
                <Seat
                  key={`${secIdx}-${si}`}
                  position={[secX + (si - 2) * SEAT_SPACING, rY, rZ]}
                />
              ))
            )}
          </group>
        );
      })}

      {/* ── Aisle step-edge indicator lights ─────────────────────────── */}
      {Array.from({ length: ROWS }).map((_, row) => {
        const rZ  = getRowZ(row);
        const rY  = getRowY(row);
        const edgeZ = rZ - ROW_SPACING / 2;
        return ([-4.75, -2.25, 2.25, 4.75] as number[]).map((x) => (
          <mesh
            key={`fl-${row}-${x}`}
            position={[x, rY + 0.08, edgeZ]}
            rotation-x={-Math.PI / 2}
          >
            <circleGeometry args={[0.09, 10]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.9} />
          </mesh>
        ));
      })}

      {/* ── Wall sconces ─────────────────────────────────────────────── */}
      {([-1, 1] as const).map((side) =>
        [-2, 3, 8].map((z, si) => (
          <group key={`sc-${side}-${si}`} position={[side * (halfW - 0.15), 5.5, z]}>
            <mesh>
              <boxGeometry args={[0.08, 0.4, 0.2]} />
              <meshStandardMaterial color="#5A3010" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.25, 0]}>
              <sphereGeometry args={[0.18, 10, 8]} />
              <meshStandardMaterial color="#FFD080" emissive="#FFD080" emissiveIntensity={1.2} />
            </mesh>
          </group>
        ))
      )}

      {/* ── Exit doors — centered in outer aisles (x=±11.5), sign faces inward ─ */}
      {[-11.5, 11.5].map((x, i) => (
        <group key={`exit-${i}`} position={[x, EXIT_STEP_H, halfD - 0.12]} rotation-y={Math.PI}>
          <mesh position={[0, 2.35, 0]}>
            <boxGeometry args={[2.0, 4.7, 0.18]} />
            <meshStandardMaterial color="#3A1A1A" roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.2, 0.06]}>
            <boxGeometry args={[1.7, 4.2, 0.1]} />
            <meshStandardMaterial color="#1A0808" roughness={0.6} />
          </mesh>
          <mesh position={[0, 4.85, 0.1]}>
            <planeGeometry args={[1.0, 0.34]} />
            <meshStandardMaterial color="#00CC44" emissive="#00CC44" emissiveIntensity={0.9} />
          </mesh>
          <Text position={[0, 4.85, 0.12]} fontSize={0.17} color="#FFF" anchorX="center" anchorY="middle">
            EXIT
          </Text>
        </group>
      ))}

      {/* ── Wall star decorations ─────────────────────────────────────── */}
      {([-1, 1] as const).map((side) => (
        <group key={`star-${side}`} position={[side * (halfW - 0.12), 7.5, SCREEN_Z + 5]}>
          <mesh rotation-y={side === -1 ? Math.PI / 2 : -Math.PI / 2}>
            <ringGeometry args={[0.3, 0.42, 6]} />
            <meshStandardMaterial color={hex.gold} emissive={hex.gold} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}

    </group>
  );
}

/* ─── Carpet strip helper ────────────────────────────────────────────── */
function CarpetPlane({ x, y, z, w, d }: { x: number; y: number; z: number; w: number; d: number }) {
  return (
    <mesh position={[x, y, z]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={CARPET_COLOR} roughness={0.85} />
    </mesh>
  );
}

/* ─── Clickable 3D movie poster panel (shown on the idle screen) ──────── */
function PosterPanel({
  video, position, width, height, onSelect,
}: {
  video: CinemaVideo;
  position: [number, number, number];
  width: number;
  height: number;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={position}
      scale={hovered ? 1.05 : 1}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {/* Card */}
      <RoundedBox args={[width, height, 0.12]} radius={0.12} smoothness={3}>
        <meshStandardMaterial
          color={video.posterColor}
          emissive={video.posterColor}
          emissiveIntensity={hovered ? 0.55 : 0.3}
          roughness={0.5}
        />
      </RoundedBox>
      {/* Thin gold border — 4 slim bars */}
      {([[0, height / 2 - 0.02, width, 0.04], [0, -height / 2 + 0.02, width, 0.04],
         [-width / 2 + 0.02, 0, 0.04, height], [width / 2 - 0.02, 0, 0.04, height]] as const).map(([bx, by, bw, bh], k) => (
        <mesh key={k} position={[bx, by, 0.07]}>
          <planeGeometry args={[bw, bh]} />
          <meshBasicMaterial color={hovered ? '#F4C542' : '#B8860B'} />
        </mesh>
      ))}
      {/* Title */}
      <Text position={[0, 0, 0.1]} fontSize={0.5} color="#FFFFFF" anchorX="center" anchorY="middle"
        maxWidth={width - 0.6} textAlign="center">
        {video.title}
      </Text>
    </group>
  );
}

/* ─── Cinema seat ────────────────────────────────────────────────────── */
function Seat({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    // rotation-y=π → backrest toward +Z (entrance side), viewer faces screen (-Z)
    <group position={[x, y, z]} rotation-y={Math.PI}>
      <mesh position={[0,  0.48,  0.10]}><boxGeometry args={[0.78, 0.10, 0.60]} /><meshStandardMaterial color="#6A0010" roughness={0.75} /></mesh>
      <mesh position={[0,  0.54,  0.10]}><boxGeometry args={[0.65, 0.06, 0.50]} /><meshStandardMaterial color="#8A0018" roughness={0.70} /></mesh>
      <mesh position={[0,  0.88, -0.22]}><boxGeometry args={[0.72, 0.72, 0.10]} /><meshStandardMaterial color="#6A0010" roughness={0.75} /></mesh>
      <mesh position={[0,  0.88, -0.17]}><boxGeometry args={[0.60, 0.62, 0.06]} /><meshStandardMaterial color="#8A0018" roughness={0.70} /></mesh>
      <mesh position={[-0.40, 0.65, -0.05]}><boxGeometry args={[0.06, 0.12, 0.60]} /><meshStandardMaterial color="#2A1A10" roughness={0.7} /></mesh>
      <mesh position={[ 0.40, 0.65, -0.05]}><boxGeometry args={[0.06, 0.12, 0.60]} /><meshStandardMaterial color="#2A1A10" roughness={0.7} /></mesh>
      {([-0.32, 0.32] as number[]).flatMap((lx) =>
        ([0.12, -0.20] as number[]).map((lz, li) => (
          <mesh key={`${lx}-${li}`} position={[lx, 0.23, lz]}>
            <cylinderGeometry args={[0.04, 0.04, 0.46, 8]} />
            <meshStandardMaterial color="#1A1010" roughness={0.8} metalness={0.3} />
          </mesh>
        ))
      )}
    </group>
  );
}
