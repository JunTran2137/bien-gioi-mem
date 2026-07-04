'use client';

import { useRef, useState, useCallback, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { palette } from '@/lib/three/theme';

interface Props {
  children?: ReactNode;
  width?: number;
  height?: number;
  radius?: number;
  color?: THREE.Color | string | number;
  hoverColor?: THREE.Color | string | number;
  emissive?: THREE.Color | string | number;
  emissiveIntensity?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onClick?: (e?: any) => void;
  onPointerOver?: (e?: any) => void;
  onPointerOut?: (e?: any) => void;
  disabled?: boolean;
  ariaLabel?: string;
  scaleOnHover?: number;
}

/** Generic 3D button: rounded box + glow + hover scale. Children render on top (typically <Text/>). */
export function Button3D({
  children,
  width = 3,
  height = 1,
  radius = 0.18,
  color = palette.primary,
  hoverColor,
  emissive = palette.primary,
  emissiveIntensity = 0.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onClick,
  onPointerOver,
  onPointerOut,
  disabled = false,
  ariaLabel,
  scaleOnHover = 1.06
}: Props) {
  const grpRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const targetEmissive = useRef(emissiveIntensity);
  const targetScale = useRef(1);

  useFrame((_, delta) => {
    if (matRef.current) {
      const t = disabled ? 0 : hovered ? 0.45 : emissiveIntensity;
      targetEmissive.current = THREE.MathUtils.damp(matRef.current.emissiveIntensity, t, 8, delta);
      matRef.current.emissiveIntensity = targetEmissive.current;
    }
    if (grpRef.current) {
      const ts = disabled ? 1 : pressed ? 0.96 : hovered ? scaleOnHover : 1;
      const s = THREE.MathUtils.damp(grpRef.current.scale.x, ts, 12, delta);
      grpRef.current.scale.setScalar(s);
    }
  });

  const handleOver = useCallback((e: any) => {
    if (disabled) return;
    e?.stopPropagation?.();
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onPointerOver?.(e);
  }, [disabled, onPointerOver]);

  const handleOut = useCallback((e: any) => {
    setHovered(false);
    setPressed(false);
    document.body.style.cursor = 'auto';
    onPointerOut?.(e);
  }, [onPointerOut]);

  return (
    <group ref={grpRef} position={position} rotation={rotation}>
      <RoundedBox
        args={[width, height, 0.3]}
        radius={Math.min(radius, width / 2 - 0.01, height / 2 - 0.01)}
        smoothness={4}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          onClick?.(e);
        }}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onPointerDown={(e) => { if (!disabled) { e.stopPropagation(); setPressed(true); } }}
        onPointerUp={() => setPressed(false)}
        castShadow
        receiveShadow
        userData={{ ariaLabel }}
      >
        <meshStandardMaterial
          ref={matRef}
          color={hovered && hoverColor ? (hoverColor as any) : (color as any)}
          emissive={emissive as any}
          emissiveIntensity={emissiveIntensity}
          metalness={0.1}
          roughness={0.5}
          opacity={disabled ? 0.4 : 1}
          transparent={disabled}
        />
      </RoundedBox>
      {children}
    </group>
  );
}
