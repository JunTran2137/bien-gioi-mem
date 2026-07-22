'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { VnText as Text } from '../primitives/VnText';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button3D } from '../primitives/Button3D';
import { hex, palette } from '@/lib/three/theme';
import { toast } from '@/components/ui/toast';

const POS: [number, number, number] = [34, 0, -34];

type GameType = 'quiz' | 'debate';

export function ArenaScene() {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState<GameType | null>(null);

  const create = async (type: GameType) => {
    if (!session) {
      toast({ title: 'Đăng nhập trước khi tạo phòng', description: 'Bạn cần đăng nhập Google để tạo phòng thi đấu.' });
      signIn('google');
      return;
    }
    if (busy) return;
    setBusy(type);
    try {
      const res = await fetch(`/api/${type}/session`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.roomCode) {
        throw new Error(data?.error || 'Không tạo được phòng');
      }
      router.push(`/game/${type}?room=${data.roomCode}&host=1`);
    } catch (e: any) {
      toast({ title: 'Không tạo được phòng', description: String(e?.message || e), variant: 'danger' });
      setBusy(null);
    }
  };

  // Stadium tiers — ONE source of truth so the seat ring and the people on it
  // always share the same height (this was the "floating audience" bug). The
  // lowest tier sits well above the arena floor like a real colosseum.
  // Each tier's outer radius == the next tier's inner radius so the rings butt
  // together with NO radial gap between levels.
  const TIERS = useMemo(() => ([
    { ri: 9.5,  ro: 11.0, y: 2.4, count: 26 },
    { ri: 11.0, ro: 12.5, y: 4.0, count: 30 },
    { ri: 12.5, ro: 14.0, y: 5.6, count: 34 },
    { ri: 14.0, ro: 15.5, y: 7.2, count: 38 },
    { ri: 15.5, ro: 17.0, y: 8.8, count: 42 },
  ]), []);

  const AUD_SCALE = 0.6;
  // A sit-pose Person's FEET sit at its origin and the butt ~0.52 above it.
  // So we put the origin ON the step surface (feet planted on the floor of the
  // tier) and add a low bench under the butt — instead of sinking the whole
  // figure below the ring, which left the legs dangling in the air.
  const BENCH_H = 0.5; // bench seat height above the step floor

  const audience = useMemo(() => {
    const arr: { x: number; z: number; y: number; rot: number; seed: number }[] = [];
    let seed = 0;
    for (const t of TIERS) {
      // Sit toward the BACK of the step so the forward-stretched feet land on
      // the step floor rather than poking over the front riser.
      const r = t.ro - 0.55;
      for (let i = 0; i < t.count; i++) {
        const a = (i / t.count) * Math.PI * 2;
        arr.push({
          x: Math.cos(a) * r,
          z: Math.sin(a) * r,
          y: t.y,
          rot: -a + Math.PI / 2 + Math.PI,
          seed: ++seed * 0.137
        });
      }
    }
    return arr;
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

      {/* Audience — instanced crowd: 2 draw calls instead of ~5,000 meshes */}
      <InstancedAudience data={audience} scale={AUD_SCALE} />

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
        ⚔️ ĐẤU TRƯỜNG TRUNG CỔ
      </Text>
      <Text position={[0, 5.2, 0]} fontSize={0.22} color="#FFFFFF" anchorX="center" anchorY="middle">
        Chọn chế độ thi đấu
      </Text>

      <Button3D
        position={[-2.8, 3.5, 0]}
        width={3.8}
        height={2.4}
        color={palette.primary}
        emissive={palette.primary}
        onClick={() => router.push('/game?play=describe')}
        ariaLabel="Quiz"
      >
        <Text position={[0, 0.4, 0.18]} fontSize={0.4} color="#fff" anchorX="center" anchorY="middle">⚡ Quiz</Text>
        <Text position={[0, -0.3, 0.18]} fontSize={0.16} color="#fff" anchorX="center" anchorY="middle" maxWidth={3.2}>
          {busy === 'quiz' ? 'Đang tạo phòng…' : '10 câu hỏi · 8 nhóm cạnh tranh'}
        </Text>
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
        <Text position={[0, 0.4, 0.18]} fontSize={0.4} color="#fff" anchorX="center" anchorY="middle">🎭 Tranh luận</Text>
        <Text position={[0, -0.3, 0.18]} fontSize={0.16} color="#fff" anchorX="center" anchorY="middle" maxWidth={3.2}>
          5 phase · phản biện realtime
        </Text>
      </Button3D>
    </group>
  );
}

// ── Instanced crowd ─────────────────────────────────────────────────────────
// The stands hold ~170 spectators. Rendering each as a full multi-mesh Person
// cost thousands of draw calls. Since they're small, distant and static, we draw
// the whole crowd as two InstancedMeshes (one body capsule + one head sphere),
// colour-varied per instance. Result: 2 draw calls for the entire audience.
const AUD_CLOTHES = [
  '#E05C5C', '#4A90D9', '#F4A261', '#2E8B6B', '#9C5BC0', '#FFA89C',
  '#5BA0E0', '#F4C542', '#FFB5C5', '#A5E5C8', '#FFFFFF', '#3A3F4A',
  '#7AB87A', '#D45050', '#5680C2', '#E08C3A'
];
const AUD_SKINS = ['#F5D0A8', '#E8B890', '#D8A878', '#C99068', '#B07A5A'];
function audPick(arr: string[], seed: number) {
  return arr[Math.abs(Math.floor(seed * 1000)) % arr.length];
}

function InstancedAudience({
  data, scale
}: {
  data: { x: number; z: number; y: number; rot: number; seed: number }[];
  scale: number;
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const count = data.length;

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = data[i];
      const s = scale * (0.92 + ((a.seed * 13) % 1) * 0.16);
      scl.set(s, s, s);

      pos.set(a.x, a.y + 0.48 * s, a.z);
      m.compose(pos, quat, scl);
      body.setMatrixAt(i, m);
      body.setColorAt(i, col.set(audPick(AUD_CLOTHES, a.seed)));

      pos.set(a.x, a.y + 1.05 * s, a.z);
      m.compose(pos, quat, scl);
      head.setMatrixAt(i, m);
      head.setColorAt(i, col.set(audPick(AUD_SKINS, a.seed * 1.3)));
    }
    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    if (head.instanceColor) head.instanceColor.needsUpdate = true;
  }, [data, scale, count]);

  return (
    <>
      <instancedMesh
        ref={bodyRef}
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.2, 0.55, 4, 8]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        ref={headRef}
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, count]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </>
  );
}
