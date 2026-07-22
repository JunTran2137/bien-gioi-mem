'use client';

import { ReactNode, useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { useHoverLight } from '@/lib/three/hoverLight';
import { approachPoses } from '@/lib/three/theme';

interface Props {
  children: ReactNode;
  position: [number, number, number];
  label: string;
  sub?: string;
  route?: string;
  onClick?: () => void;
  ariaLabel?: string;
  /** Box for raycast / outline shape */
  hitbox?: [number, number, number];
}

/** Wraps a building. Raycast hitbox triggers fly-to + navigation. Hover shows a floating label. */
export function Hotspot({ children, position, label, sub, route, onClick, ariaLabel, hitbox = [9, 8, 9] }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const grpRef = useRef<THREE.Group>(null);
  const hoverLight = useHoverLight();

  useEffect(() => {
    const onModal = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setModalOpen(!!detail?.open);
    };
    window.addEventListener('auth-modal-state', onModal);
    return () => window.removeEventListener('auth-modal-state', onModal);
  }, []);

  // Freeze per-mesh local matrices for children that never move. The Hotspot group
  // itself still updates (it scales on hover), but the static landmark meshes inside
  // don't need to recompose position/rotation/scale every frame. Called once on mount.
  useLayoutEffect(() => {
    const g = grpRef.current;
    if (!g) return;
    g.traverse((child) => {
      // Skip the group itself (it scales) and any explicitly animated mesh.
      if (child === g) return;
      if (child.userData?.animated) return;
      if ((child as THREE.Mesh).isMesh && child.matrixAutoUpdate) {
        child.updateMatrix();
        child.matrixAutoUpdate = false;
      }
    });
  }, []);

  useFrame((_, delta) => {
    // When not hovered and already settled, skip the per-frame damping work.
    // Across 6 buildings this avoids constant idle computation every frame.
    if (!hovered) {
      const scaleSettled = !grpRef.current || Math.abs(grpRef.current.scale.x - 1) < 0.0005;
      if (scaleSettled) {
        if (grpRef.current) grpRef.current.scale.setScalar(1);
        return;
      }
    }
    if (grpRef.current) {
      const t = hovered ? 1.025 : 1;
      const s = THREE.MathUtils.damp(grpRef.current.scale.x, t, 8, delta);
      grpRef.current.scale.setScalar(s);
    }
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (onClick) onClick();
    else if (route) {
      // Landmarks with a front-of-building pose: fly to the entrance first and
      // let the camera rig swap the scene in only after it arrives. Everything
      // else navigates immediately.
      if (approachPoses[route]) {
        window.dispatchEvent(new CustomEvent('landmark-enter', { detail: { route } }));
      } else {
        router.push(route);
      }
    }
  }, [onClick, route, router]);

  const handleOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    hoverLight?.setHover(position);
    document.body.style.cursor = 'pointer';
  }, [hoverLight, position]);

  const handleOut = useCallback(() => {
    setHovered(false);
    hoverLight?.setHover(null);
    document.body.style.cursor = 'auto';
  }, [hoverLight]);

  return (
    <group
      ref={grpRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      {children}

      {/* invisible large hitbox so children with complex geom still register clicks */}
      <mesh visible={false}>
        <boxGeometry args={hitbox} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Floating label — hidden when an auth/modal panel is open */}
      {!modalOpen && (
        <Html
          position={[0, hitbox[1] + 1.2, 0]}
          center
          distanceFactor={11}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            className="select-none transition-all duration-200"
            style={{
              transform: hovered ? 'translateY(0) scale(1.12)' : 'translateY(4px) scale(1)',
              opacity: 1,
            }}
          >
            <div className="rounded-2xl border-2 border-white/60 bg-white/95 px-6 py-3 text-center shadow-xl">
              <div className="font-display text-2xl font-extrabold tracking-wide text-primary whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}>{label}</div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
