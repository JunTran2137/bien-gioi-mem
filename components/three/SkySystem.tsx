'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

const CYCLE = 90; // must match DayNightCycle
const TWO_PI = Math.PI * 2;

/**
 * Sky system synced to DayNightCycle phase.
 * Day: bright blue gradient, glowing sun, drifting clouds.
 * Night: dark navy gradient, moon, twinkling stars.
 *
 * Uses its own internal clock (same period as DayNightCycle) to drive opacity
 * and celestial body positions. Sun and moon orbit overhead.
 */
interface SkyProps {
  cycleSeconds?: number;
  disabled?: boolean;
  stars?: boolean;
  clouds?: boolean;
}

export function SkySystem({ cycleSeconds = CYCLE, disabled = false, stars = true, clouds = true }: SkyProps) {
  const elapsed = useRef(disabled ? 0.25 * cycleSeconds : 0);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const sunRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Group>(null);
  const cloudTick = useRef(0);
  const skyAcc = useRef(0);

  // Vertex/fragment shader for gradient skydome that blends day/night colors.
  const shader = useMemo(() => ({
    uniforms: {
      uDay:    { value: new THREE.Color('#7CC8F2') },     // top day
      uDayLow: { value: new THREE.Color('#D6ECFA') },     // horizon day
      uNight:  { value: new THREE.Color('#0A1230') },     // top night
      uNightLow: { value: new THREE.Color('#2A3A6A') },   // horizon night
      uDawn:   { value: new THREE.Color('#FFB07A') },     // horizon dawn/dusk
      uPhase:  { value: 0 } // 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldPos;
      uniform vec3 uDay;
      uniform vec3 uDayLow;
      uniform vec3 uNight;
      uniform vec3 uNightLow;
      uniform vec3 uDawn;
      uniform float uPhase;

      void main() {
        // height factor: 0 at horizon, 1 at zenith
        float h = clamp(normalize(vWorldPos).y, 0.0, 1.0);
        h = pow(h, 0.55);

        // Day gradient
        vec3 dayCol = mix(uDayLow, uDay, h);
        // Night gradient
        vec3 nightCol = mix(uNightLow, uNight, h);
        // Dawn/dusk warm tint at horizon
        vec3 warmTint = mix(uDawn, dayCol, smoothstep(0.0, 0.45, h));

        // Phase 0..1 wraps full cycle: 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight, 1=dawn
        // Compute day weight (0 at midnight, 1 at noon)
        float dayWeight = 0.5 + 0.5 * cos((uPhase - 0.25) * 6.28318);
        // Twilight weight (peaks at dawn 0 and dusk 0.5)
        float twilight = max(
          smoothstep(0.0, 0.06, uPhase) * smoothstep(0.18, 0.06, uPhase),
          smoothstep(0.42, 0.5, uPhase) * smoothstep(0.62, 0.5, uPhase)
        );

        vec3 base = mix(nightCol, dayCol, dayWeight);
        vec3 col = mix(base, warmTint, twilight * 0.8 * (1.0 - h));

        gl_FragColor = vec4(col, 1.0);
      }
    `
  }), []);

  // Cloud puffs (procedural placements). Skip generation entirely if clouds disabled.
  const cloudPuffs = useMemo(() => {
    if (!clouds) return [] as { pos: [number, number, number]; scale: number; speed: number }[];
    const arr: { pos: [number, number, number]; scale: number; speed: number }[] = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const r = 80 + Math.random() * 80;
      const a = Math.random() * TWO_PI;
      arr.push({
        pos: [Math.cos(a) * r, 35 + Math.random() * 25, Math.sin(a) * r],
        scale: 0.7 + Math.random() * 1.3,
        speed: 0.005 + Math.random() * 0.01
      });
    }
    return arr;
  }, [clouds]);

  useFrame((_, delta) => {
    if (!disabled) elapsed.current = (elapsed.current + delta) % cycleSeconds;

    // The day/night cycle is 90s long, so celestial bodies move extremely
    // slowly — updating their trig + uniforms ~15x/sec instead of every frame
    // is visually identical but removes most of this loop's per-frame cost.
    skyAcc.current += delta;
    if (skyAcc.current < 1 / 15) return;
    skyAcc.current = 0;

    const t = elapsed.current / cycleSeconds; // 0..1

    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uPhase.value = t;
    }

    // Sun + Moon orbit on opposite sides of an overhead arc.
    // angleSun: 0 at midnight (below horizon), 0.5 at noon (zenith), 1 at next midnight
    // We want sun visible roughly when t in [0.85..0.5] (dawn through dusk).
    // Map t→sun angle so sun rises in east at dawn (t=0), zenith at noon (t=0.25), sets at dusk (t=0.5).
    const sunAngle = (t * TWO_PI) - Math.PI / 2;     // -PI/2 at t=0 (east horizon)
    const sunRadius = 130;
    const sunY = Math.sin(sunAngle + Math.PI / 2) * sunRadius;
    const sunX = Math.cos(sunAngle + Math.PI / 2) * sunRadius;
    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, -40);
      sunRef.current.visible = sunY > -10;
    }

    // Moon opposite of sun
    if (moonRef.current) {
      moonRef.current.position.set(-sunX, -sunY, 40);
      moonRef.current.visible = -sunY > -10;
    }

    // Stars only visible at night (t roughly 0.55..0.95)
    const nightVis = Math.max(0,
      Math.min(1, (t - 0.5) * 5),       // fade in from dusk
    ) * Math.max(0,
      Math.min(1, (0.95 - t) * 5)        // fade out before dawn
    );
    if (starsRef.current) {
      starsRef.current.visible = nightVis > 0.05;
      (starsRef.current as any).scale?.setScalar(1);
      // Use opacity by setting children material opacity if available.
    }

    // Cloud drift — throttled to ~5 Hz and skip the deep traverse for opacity.
    if (cloudsRef.current && cloudPuffs.length > 0) {
      cloudTick.current += 1;
      if (cloudTick.current >= 12) {
        cloudTick.current = 0;
        const dayWeight = 0.5 + 0.5 * Math.cos((t - 0.25) * TWO_PI);
        const opacity = 0.85 * dayWeight + 0.05;
        cloudsRef.current.children.forEach((c, i) => {
          const cfg = cloudPuffs[i];
          if (!cfg) return;
          c.position.x += cfg.speed * 12; // catch up for skipped frames
          if (c.position.x > 180) c.position.x = -180;
          // Cast to group with userData opacity ref; materials applied at mount.
          (c as any).userData.opacity = opacity;
          c.children.forEach((m: any) => {
            if (m.material) m.material.opacity = opacity;
          });
        });
      }
    }
  });

  return (
    <group>
      {/* Sky dome */}
      <mesh scale={[-1, 1, 1]} renderOrder={-1}>
        <sphereGeometry args={[300, 20, 12]} />
        <shaderMaterial
          ref={skyMatRef}
          args={[shader]}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Stars (drei) — skipped on lower tiers */}
      {stars && (
        <group ref={starsRef}>
          <Stars radius={250} depth={60} count={400} factor={5} fade speed={0.5} />
        </group>
      )}

      {/* Sun */}
      <group ref={sunRef}>
        <mesh>
          <sphereGeometry args={[6, 16, 10]} />
          <meshBasicMaterial color="#FFE9A8" />
        </mesh>
        {/* glow halo */}
        <mesh>
          <sphereGeometry args={[8, 16, 10]} />
          <meshBasicMaterial color="#FFC868" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[12, 16, 10]} />
          <meshBasicMaterial color="#FFB050" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      </group>

      {/* Moon */}
      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[4, 16, 10]} />
          <meshBasicMaterial color="#F4F0E0" />
        </mesh>
        {/* moon craters (dark patches) */}
        <mesh position={[1.2, 0.8, 3.4]}>
          <sphereGeometry args={[0.6, 8, 6]} />
          <meshBasicMaterial color="#C8C0A8" />
        </mesh>
        <mesh position={[-1.5, -0.5, 3.2]}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshBasicMaterial color="#BCB498" />
        </mesh>
        {/* glow */}
        <mesh>
          <sphereGeometry args={[5.5, 16, 10]} />
          <meshBasicMaterial color="#E6E2D0" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>

      {/* Clouds */}
      <group ref={cloudsRef}>
        {cloudPuffs.map((c, i) => (
          <CloudPuff key={i} position={c.pos} scale={c.scale} />
        ))}
      </group>
    </group>
  );
}

function CloudPuff({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[3.2, 8, 6]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh position={[2.8, -0.4, 0.5]}>
        <sphereGeometry args={[2.4, 8, 6]} />
        <meshBasicMaterial color="#F8FAFF" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh position={[-2.5, -0.2, -0.4]}>
        <sphereGeometry args={[2.6, 8, 6]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  );
}
