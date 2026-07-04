'use client';

import { useEffect } from 'react';
import { VnText as Text } from './VnText';
import { useTextInput } from '@/lib/three/useTextInput';
import { hex, palette } from '@/lib/three/theme';
import * as THREE from 'three';

interface Props {
  id: string;
  position?: [number, number, number];
  width?: number;
  height?: number;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  fontSize?: number;
  onSubmit?: (value: string) => void;
}

export function TextInput3D({
  id,
  position = [0, 0, 0],
  width = 6,
  height = 0.9,
  placeholder = 'Nhập…',
  multiline = false,
  maxLength = 240,
  fontSize = 0.16,
  onSubmit,
}: Props) {
  const t = useTextInput();
  const active = t.activeId === id;
  const value = t.values[id] || '';

  useEffect(() => {
    if (!onSubmit) return;
    return t.onSubmit(id, (v) => onSubmit(v));
  }, [id, onSubmit, t]);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        t.focus(id, { multiline, maxLength, placeholder });
      }}
    >
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.12]} />
        <meshStandardMaterial
          color={active ? '#fff' : '#F6F2E9'}
          emissive={active ? new THREE.Color(palette.primary) : new THREE.Color('#000')}
          emissiveIntensity={active ? 0.18 : 0}
          roughness={0.4}
        />
      </mesh>
      {/* border */}
      <mesh position={[0, 0, -0.001]}>
        <boxGeometry args={[width + 0.06, height + 0.06, 0.1]} />
        <meshBasicMaterial color={active ? hex.primary : hex.muted} />
      </mesh>

      <Text
        position={[-width / 2 + 0.2, 0, 0.08]}
        fontSize={fontSize}
        color={value ? hex.text : hex.muted}
        anchorX="left"
        anchorY="middle"
        maxWidth={width - 0.4}
      >
        {value || placeholder}
      </Text>

      {active && (
        <Text
          position={[width / 2 - 0.2, 0, 0.08]}
          fontSize={fontSize * 0.8}
          color={hex.muted}
          anchorX="right"
          anchorY="middle"
        >
          {value.length}/{maxLength}
        </Text>
      )}
    </group>
  );
}
