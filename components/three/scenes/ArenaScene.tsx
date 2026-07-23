'use client';

import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { VnText as Text } from '../primitives/VnText';
import { useRouter } from 'next/navigation';
import { Button3D } from '../primitives/Button3D';
import { hex, palette } from '@/lib/three/theme';

const POS: [number, number, number] = [34, 0, -34];

export function ArenaScene() {
  const router = useRouter();

  // Stadium tiers — ONE source of truth so the seat ring and the people on it
  // always share the same height (this was the "floating audience" bug). The
  // lowest tier sits well above the arena floor like a real colosseum.
  // Each tier's outer radius == the next tier's inner radius so the rings butt
  // together with NO radial gap between levels. Counts kept moderate because the
  // crowd now uses the full detailed Person model (not instanced capsules).
  const TIERS = useMemo(() => ([
    { ri: 9.5,  ro: 11.0, y: 2.4, count: 32 },
    { ri: 11.0, ro: 12.5, y: 4.0, count: 36 },
    { ri: 12.5, ro: 14.0, y: 5.6, count: 40 },
    { ri: 14.0, ro: 15.5, y: 7.2, count: 44 },
    { ri: 15.5, ro: 17.0, y: 8.8, count: 48 },
  ]), []);

  // Bench seat height above the step floor. Raised to match a sit-pose Person's
  // hip height (~0.85) so spectators rest ON the bench like the seated figures
  // in the other building interiors.
  const BENCH_H = 0.85;

  // Audience positions — one entry per seat, computed from TIERS.
  const audienceSeats = useMemo(() => {
    const out: { x: number; z: number; y: number; rot: number; seed: number }[] = [];
    let s = 0;
    for (const t of TIERS) {
      const r = t.ro - 0.5;
      for (let i = 0; i < t.count; i++) {
        const a = (i / t.count) * Math.PI * 2;
        out.push({ x: Math.cos(a)*r, z: Math.sin(a)*r, y: t.y + 0.2, rot: -a - Math.PI/2, seed: ++s * 0.137 });
      }
    }
    return out;
  }, [TIERS]);

  return (
    <group position={POS}>
      {/* NO ROOF — sky is visible from outer scene Stars/Sky */}

      {/* Medieval stone perimeter wall with crenellations (short, not dome) */}
      <mesh position={[0, 7, 0]}>
        <cylinderGeometry args={[24, 24, 14, 48, 1, true]} />
        <meshStandardMaterial color="#6B5B4F" side={2} roughness={0.95} />
      </mesh>

      {/* Crenellations (battlements) around the top */}
      {Array.from({ length: 32 }).map((_, i) => {
        const a = (i / 32) * Math.PI * 2;
        return (
          <mesh key={`cren-${i}`} position={[Math.cos(a) * 23.8, 14.5, Math.sin(a) * 23.8]} rotation-y={-a}>
            <boxGeometry args={[2, 1.5, 0.8]} />
            <meshStandardMaterial color="#5A4A3E" roughness={0.9} />
          </mesh>
        );
      })}

      {/* Stone arches in walls */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <group key={`arch-${i}`} position={[Math.cos(a) * 23.5, 6, Math.sin(a) * 23.5]} rotation-y={-a}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[2, 4, 0.5]} />
              <meshStandardMaterial color="#4A3A2E" roughness={0.9} />
            </mesh>
            <mesh position={[0, 2.2, 0]}>
              <cylinderGeometry args={[1, 1, 0.5, 16, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#4A3A2E" roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Arena floor — packed sand/dirt */}
      <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[11, 48]} />
        <meshStandardMaterial color="#D4A86A" roughness={0.9} />
      </mesh>
      {/* Arena boundary ring */}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[10.5, 11, 48]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Tiered seating — derived from the SAME TIERS array as the audience */}
      {TIERS.map((tier, i) => {
        // Riser must span the FULL height from the tier below (or the arena
        // floor for the lowest tier) up to this step — otherwise a hole shows.
        const prevY = i === 0 ? 0 : TIERS[i - 1].y;
        const riserH = tier.y - prevY;
        return (
        <group key={`tier-${i}`}>
          {/* Step floor (FOOT REST) — pale cool stone so it clearly reads as the
              walking/standing surface, distinct from the wooden bench behind. */}
          <mesh position={[0, tier.y, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[tier.ri, tier.ro, 48]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#C9C2B4' : '#B8B0A0'} roughness={0.9} />
          </mesh>
          {/* Tier front face (riser) — full-height, reaches the level below / floor */}
          <mesh position={[0, tier.y - riserH / 2, 0]}>
            <cylinderGeometry args={[tier.ri, tier.ri, riserH, 48, 1, true]} />
            <meshStandardMaterial color="#8A8073" side={2} roughness={0.9} />
          </mesh>
          {/* Bench seat (SIT HERE) — warm wood, clearly different from the stone
              step, so the seating row vs foot row are obvious at a glance. */}
          <mesh position={[0, tier.y + BENCH_H, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[tier.ro - 0.85, tier.ro, 48]} />
            <meshStandardMaterial color="#A9682E" roughness={0.7} />
          </mesh>
          {/* Bench front face */}
          <mesh position={[0, tier.y + BENCH_H / 2, 0]}>
            <cylinderGeometry args={[tier.ro - 0.85, tier.ro - 0.85, BENCH_H, 48, 1, true]} />
            <meshStandardMaterial color="#7E4D20" side={2} roughness={0.75} />
          </mesh>
        </group>
        );
      })}

      {/* Audience — same Person geometry but rendered as InstancedMesh.
          ~26 draw calls total instead of 200 × ~46 meshes = ~9200. */}
      <ArenaAudience seats={audienceSeats} />

      {/* Medieval banners hanging from walls */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const colors = [hex.danger, hex.gold, hex.primary, hex.secondary, hex.accent, '#7B2F2F', '#2F4F7B', '#4F7B2F'];
        return (
          <group key={`mbanner-${i}`} position={[Math.cos(a) * 23, 11, Math.sin(a) * 23]} rotation-y={-a}>
            <mesh position={[0, -1.5, 0.4]}>
              <boxGeometry args={[1.5, 4, 0.05]} />
              <meshStandardMaterial color={colors[i]} />
            </mesh>
            <mesh position={[0, 0.6, 0.4]}><cylinderGeometry args={[0.06, 0.06, 2, 8]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
          </group>
        );
      })}

      {/* Torches ringing the INSIDE of the arena floor (radius < 9.5 inner wall,
          on the open sand) so they light the stage rather than sit among seats */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <group key={`torch-${i}`} position={[Math.cos(a) * 8.8, 0, Math.sin(a) * 8.8]}>
            <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.06, 0.08, 3, 8]} /><meshStandardMaterial color="#4A3520" /></mesh>
            {/* Emissive flame only — the per-torch point light was removed to cut
                the scene from 15 dynamic lights down to 3 (huge fragment saving). */}
            <mesh position={[0, 3.2, 0]}><sphereGeometry args={[0.2, 10, 6]} /><meshStandardMaterial color="#FF6600" emissive="#FF4400" emissiveIntensity={2.6} /></mesh>
          </group>
        );
      })}

      {/* Central arena lighting (bright, like sun) */}
      <pointLight position={[0, 20, 0]} color="#FFFFCC" intensity={2.0} distance={40} />
      <pointLight position={[8, 16, 8]} color="#FFFFE0" intensity={1.0} distance={30} />
      <pointLight position={[-8, 16, -8]} color="#FFFFE0" intensity={1.0} distance={30} />

      {/* Title and game selection UI (floating in center at eye level) */}
      <Text position={[0, 6, 0]} fontSize={0.6} color={hex.danger} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
        ⚔️ ĐẤU TRƯỜNG 
      </Text>
  
      <Button3D
        position={[-2.8, 3.5, 0]}
        width={3.8}
        height={2.4}
        color={palette.primary}
        emissive={palette.primary}
        onClick={() => router.push('/game?play=describe')}
        ariaLabel="Luận giải"
      >
        <Text position={[0, 0.1, 0.18]} fontSize={0.4} color="#fff" anchorX="center" anchorY="middle">🔍 Luận Giải</Text>

      </Button3D>

      <Button3D
        position={[2.8, 3.5, 0]}
        width={3.8}
        height={2.4}
        color={palette.secondary}
        emissive={palette.secondary}
        onClick={() => router.push('/game?play=debate')}
        ariaLabel="Tranh luận"
      >
        <Text position={[0, 0.1, 0.18]} fontSize={0.4} color="#fff" anchorX="center" anchorY="middle">🎭 Tranh luận</Text>
        
      </Button3D>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ArenaAudience — replicates the sit-pose Person geometry as InstancedMesh.
// Geometry args and local positions are taken verbatim from parts/Person.tsx.
// Result: ~26 draw calls instead of 200 × ~46 meshes ≈ 9200 draw calls.
// ─────────────────────────────────────────────────────────────────────────────

// Color palettes (identical to Person.tsx)
const _CL = ['#E05C5C','#4A90D9','#F4A261','#2E8B6B','#9C5BC0','#FFA89C','#5BA0E0','#F4C542','#FFB5C5','#A5E5C8','#FFFFFF','#3A3F4A','#7AB87A','#D45050','#5680C2','#E08C3A'];
const _SK = ['#F5D0A8','#E8B890','#D8A878','#C99068','#B07A5A'];
const _HR = ['#1A1A1A','#2A1A0A','#3A2A1A','#5A4030','#8B6B45','#3A2520'];
const _PN = ['#2A3F5C','#3A3F4A','#1F1F2A','#5C3D2A','#3A2D1A','#4A4A55'];
function _pick<T>(a: T[], s: number): T { return a[Math.abs(Math.floor(s*1000)) % a.length]; }
// Darken/lighten a hex color (amt ∈ [-1,1]) — copied from Person.tsx shade()
function _shade(hex: string, amt: number): string {
  const h=hex.replace('#','');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  const f=(n:number)=>Math.max(0,Math.min(255,Math.round(n+amt*255)));
  return '#'+[f(r),f(g),f(b)].map(n=>n.toString(16).padStart(2,'0')).join('');
}

// Person sit-pose geometry constants (male, from Person.tsx)
const _tR=0.192, _tLen=0.65, _tScX=1.58, _tScZ=0.80;
const _tH=2*_tR+_tLen, _tCY=0.80+_tH/2;
const _armX=_tR*_tScX*0.95, _shY=_tCY+_tLen/2+_tR*0.42;
const _neckY=_tCY+_tH/2-0.04, _hY=_neckY+0.22, _sZ=0.05;
const _ulLen=Math.hypot(0,0.08,0.50); // upper leg len
const _llLen=Math.hypot(0,0.66,0.15); // lower leg len
const _uaLen=_shY-1.15;               // upper arm len (vertical)
const _laLen=0.37;                     // lower arm len (vertical)

// Compose a local Matrix4 (position + optional non-uniform scale)
function _lm(px:number,py:number,pz:number,sx=1,sy=1,sz=1): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(px,py,pz), new THREE.Quaternion(), new THREE.Vector3(sx,sy,sz));
}
// Matrix4 for a tapered cylinder Limb (from Person.tsx Limb logic)
function _limbM(fx:number,fy:number,fz:number,tx:number,ty:number,tz:number): THREE.Matrix4 {
  const dx=tx-fx,dy=ty-fy,dz=tz-fz, len=Math.hypot(dx,dy,dz);
  const pos=new THREE.Vector3((fx+tx)/2,(fy+ty)/2,(fz+tz)/2);
  const vx=dx/len,vy=dy/len,vz=dz/len;
  const ax=vz,az=-vx,axLen=Math.hypot(ax,0,az);
  const ang=Math.acos(Math.max(-1,Math.min(1,vy)));
  const q=axLen>1e-5
    ? new THREE.Quaternion(Math.sin(ang/2)*ax/axLen,0,Math.sin(ang/2)*az/axLen,Math.cos(ang/2))
    : new THREE.Quaternion();
  return new THREE.Matrix4().compose(pos,q,new THREE.Vector3(1,1,1));
}
// Mirror a local matrix across X (for bilateral symmetric parts)
function _mirX(m: THREE.Matrix4): THREE.Matrix4 {
  const r=m.clone(); r.elements[12]*=-1; return r;
}

// Part spec: [localMatrix, colorFn, bilateral?]
// bilateral=true → generates both left (localM) and right (mirrorX(localM))
type _CF=(cl:string,sk:string,hr:string,pn:string)=>string;
const _SPECS: [THREE.Matrix4, _CF, boolean][] = [
  // torso capsule — cloth, non-uniform scale baked in
  [_lm(0,_tCY,_sZ,_tScX,1,_tScZ),           (c)=>c,            false],
  // upper legs — pants
  [_limbM(0.11,0.86,0.05,0.11,0.78,0.55),   (_c,_s,_h,pn)=>pn, true],
  // lower legs — pants
  [_limbM(0.11,0.78,0.55,0.11,0.12,0.70),   (_c,_s,_h,pn)=>pn, true],
  // upper arms — cloth
  [_limbM(_armX,_shY,_sZ,_armX,1.15,_sZ),   (c)=>c,            true],
  // lower arms — skin
  [_limbM(_armX,1.15,_sZ,_armX,0.78,_sZ),   (_c,sk)=>sk,       true],
  // neck capsule — skin
  [_lm(0,_neckY+0.06,_sZ),                  (_c,sk)=>sk,       false],
  // skull sphere — skin (scale [1,1.15,1.05] baked)
  [_lm(0,_hY,_sZ,1,1.15,1.05),              (_c,sk)=>sk,       false],
  // jaw sphere — skin (scale [0.85,0.6,0.9])
  [_lm(0,_hY-0.12,_sZ+0.02,0.85,0.6,0.9),  (_c,sk)=>sk,       false],
  // hair main — hair (scale [1.05,1,1.1])
  [_lm(0,_hY+0.06,_sZ-0.015,1.05,1,1.1),   (_c,_s,hr)=>hr,    false],
  // hair side — hair (bilateral, scale [0.5,0.7,0.5])
  [_lm(0.11,_hY+0.02,_sZ+0.05,0.5,0.7,0.5),(_c,_s,hr)=>hr,    true],
  // hair fringe — hair
  [_lm(0,_hY+0.07,_sZ+0.13,1,0.5,0.6),     (_c,_s,hr)=>hr,    false],
  // eye white (bilateral)
  [_lm(0.06,_hY+0.02,_sZ+0.15),             ()=>'#FFFFFF',     true],
  // iris (bilateral)
  [_lm(0.06,_hY+0.02,_sZ+0.175),            ()=>'#3A4A6B',     true],
  // pupil (bilateral)
  [_lm(0.06,_hY+0.02,_sZ+0.185),            ()=>'#0A0A0A',     true],
  // eyebrow (bilateral)
  [_lm(0.06,_hY+0.075,_sZ+0.165),           (_c,_s,hr)=>hr,    true],
  // nose tip
  [_lm(0,_hY-0.04,_sZ+0.19),                (_c,sk)=>sk,       false],
  // mouth
  [_lm(0,_hY-0.085,_sZ+0.17,1,0.5,0.6),    ()=>'#9C4040',     false],
  // ears (bilateral, scale [1,1,0.6])
  [_lm(0.165,_hY+0.005,_sZ,1,1,0.6),        (_c,sk)=>sk,       true],
  // hand palm (bilateral)
  [_lm(_armX,0.73,_sZ),                     (_c,sk)=>sk,       true],
  // shoe (bilateral) — heel block
  [_lm(0.11,0.05,0.78),                     ()=>'#1A1A1A',     true],
  // shoe toe cap (bilateral) — position offset from heel in Shoe component
  [_lm(0.11,0.06,0.86),                     ()=>'#0D0D0D',     true],
  // shoe sole (bilateral)
  [_lm(0.11,0.01,0.79),                     ()=>'#5A4030',     true],
  // hand finger cluster (bilateral) — offset below palm
  [_lm(_armX,0.655,_sZ),                    (_c,sk)=>sk,       true],
  // hand thumb (bilateral) — armX+0.035 for left, mirror gives -armX-0.035 for right
  [_lm(_armX+0.035,0.71,_sZ),               (_c,sk)=>sk,       true],
  // eyelid bar (bilateral) — shade(skin,-0.2) per Person.tsx
  [_lm(0.06,_hY+0.045,_sZ+0.17),            (_c,sk)=>_shade(sk,-0.2), true],
  // nose bridge sphere — shade(skin,-0.05)
  [_lm(0,_hY-0.005,_sZ+0.17,0.6,1.5,1),    (_c,sk)=>_shade(sk,-0.05),false],
];

// Geometry for each spec entry (index must match _SPECS)
const _GEO_ARGS = [
  { type:'capsule', args:[_tR,_tLen,5,14] },            // torso
  { type:'cylinder',args:[0.085,0.095,_ulLen,12] },     // u-leg
  { type:'cylinder',args:[0.07,0.082,_llLen,12] },      // l-leg
  { type:'cylinder',args:[0.060,0.068,_uaLen,12] },     // u-arm
  { type:'cylinder',args:[0.050,0.060,_laLen,12] },     // l-arm
  { type:'capsule', args:[0.070,0.08,3,10] },           // neck
  { type:'sphere',  args:[0.16,20,16] },                // skull
  { type:'sphere',  args:[0.12,16,12] },                // jaw
  { type:'sphere',  args:[0.17,18,14,0,Math.PI*2,0,Math.PI*0.6] }, // hair main
  { type:'sphere',  args:[0.09,10,8] },                 // hair side
  { type:'sphere',  args:[0.085,10,8] },                // hair fringe
  { type:'sphere',  args:[0.032,12,10] },               // eye white
  { type:'sphere',  args:[0.017,10,8] },                // iris
  { type:'sphere',  args:[0.009,8,6] },                 // pupil
  { type:'box',     args:[0.05,0.014,0.014] },          // eyebrow
  { type:'sphere',  args:[0.025,10,8] },                // nose
  { type:'sphere',  args:[0.035,12,8] },                // mouth
  { type:'sphere',  args:[0.04,10,8] },                 // ear
  { type:'box',     args:[0.07,0.11,0.05] },            // hand palm
  { type:'box',     args:[0.15,0.07,0.18] },            // shoe heel
  { type:'box',     args:[0.15,0.08,0.16] },            // shoe toe cap
  { type:'box',     args:[0.16,0.025,0.32] },           // shoe sole
  { type:'box',     args:[0.065,0.05,0.04] },           // hand fingers
  { type:'sphere',  args:[0.022,8,6] },                 // hand thumb
  { type:'box',     args:[0.06,0.008,0.01] },           // eyelid
  { type:'sphere',  args:[0.022,10,8] },                // nose bridge
] as const;

function ArenaAudience({ seats }: { seats: {x:number;z:number;y:number;rot:number;seed:number}[] }) {
  // For each spec, compute per-instance matrices and colors.
  // bilateral specs produce 2×seats entries (left + right).
  const data = useMemo(() => {
    const N = seats.length;
    return _SPECS.map(([localM, colorFn, bilateral]) => {
      const count = bilateral ? N*2 : N;
      const matrices: THREE.Matrix4[] = new Array(count);
      const colors:   string[]        = new Array(count);
      const mirLocal = bilateral ? _mirX(localM) : null;
      for (let i=0; i<N; i++) {
        const { x, z, y, rot, seed } = seats[i];
        const cl=_pick(_CL,seed), sk=_pick(_SK,seed*1.3), hr=_pick(_HR,seed*1.7), pn=_pick(_PN,seed*2.1);
        const personM = new THREE.Matrix4().compose(
          new THREE.Vector3(x,y,z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rot),
          new THREE.Vector3(0.9,0.9,0.9)
        );
        matrices[i] = new THREE.Matrix4().multiplyMatrices(personM, localM);
        colors[i]   = colorFn(cl,sk,hr,pn);
        if (bilateral && mirLocal) {
          matrices[N+i] = new THREE.Matrix4().multiplyMatrices(personM, mirLocal);
          colors[N+i]   = colorFn(cl,sk,hr,pn);
        }
      }
      return { matrices, colors, count };
    });
  }, [seats]);

  // One ref per spec
  const refs = useRef<(THREE.InstancedMesh|null)[]>([]);

  useLayoutEffect(() => {
    const tmp = new THREE.Color();
    data.forEach((d, idx) => {
      const im = refs.current[idx];
      if (!im) return;
      for (let i=0; i<d.count; i++) {
        im.setMatrixAt(i, d.matrices[i]);
        im.setColorAt(i, tmp.set(d.colors[i]));
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    });
  }, [data]);

  return (
    <>
      {_GEO_ARGS.map((geo, idx) => {
        const bilateral = _SPECS[idx][2];
        const count = bilateral ? seats.length*2 : seats.length;
        return (
          <instancedMesh
            key={idx}
            ref={(el: THREE.InstancedMesh|null) => { refs.current[idx] = el; }}
            args={[undefined, undefined, count]}
            frustumCulled={false}
            castShadow={false}
            receiveShadow={false}
          >
            {geo.type === 'capsule'  && <capsuleGeometry  args={geo.args as [number,number,number,number]} />}
            {geo.type === 'cylinder' && <cylinderGeometry args={geo.args as [number,number,number,number]} />}
            {geo.type === 'sphere'   && <sphereGeometry   args={geo.args as any} />}
            {geo.type === 'box'      && <boxGeometry      args={geo.args as [number,number,number]} />}
            <meshStandardMaterial roughness={0.7} />
          </instancedMesh>
        );
      })}
    </>
  );
}
