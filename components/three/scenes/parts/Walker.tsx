'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Person, PersonProps } from './Person';

interface WalkerProps extends Omit<PersonProps, 'position' | 'rotationY' | 'pose'> {
  /** Closed-loop path of [x, z] points the person walks around. */
  waypoints: [number, number][];
  /** World units per second. */
  speed?: number;
  /** Floor height the person stands on. */
  y?: number;
  /** 0..1 starting offset along the loop so a crowd doesn't move in lockstep. */
  phase?: number;
}

/**
 * A standing Person that continuously walks a looped path. The outer group is
 * mutated every frame (cheap) while the Person mesh itself never re-renders.
 * A small vertical bob + heading-follow sells the motion.
 */
export function Walker({ waypoints, speed = 1.1, y = 0, phase = 0, ...person }: WalkerProps) {
  const ref = useRef<THREE.Group>(null);

  const { cum, total } = useMemo(() => {
    const c: number[] = [0];
    let t = 0;
    for (let i = 0; i < waypoints.length; i++) {
      const a = waypoints[i];
      const b = waypoints[(i + 1) % waypoints.length];
      t += Math.hypot(b[0] - a[0], b[1] - a[1]);
      c.push(t);
    }
    return { cum: c, total: t || 1 };
  }, [waypoints]);

  const dist = useRef(phase * total);

  useFrame((_, delta) => {
    if (!ref.current) return;
    dist.current = (dist.current + speed * Math.min(delta, 0.05)) % total;
    const d = dist.current;
    let seg = 0;
    while (seg < cum.length - 1 && cum[seg + 1] < d) seg++;
    const a = waypoints[seg % waypoints.length];
    const b = waypoints[(seg + 1) % waypoints.length];
    const segLen = (cum[seg + 1] - cum[seg]) || 1;
    const f = (d - cum[seg]) / segLen;
    const x = a[0] + (b[0] - a[0]) * f;
    const z = a[1] + (b[1] - a[1]) * f;
    const heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
    ref.current.position.set(x, y + Math.abs(Math.sin(d * 3)) * 0.04, z);
    ref.current.rotation.y = heading;
  });

  return (
    <group ref={ref}>
      <Person position={[0, 0, 0]} rotationY={0} pose="stand" {...person} />
    </group>
  );
}
