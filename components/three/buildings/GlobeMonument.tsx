'use client';

import { RoundedBox } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { hex } from '@/lib/three/theme';
import { VnText as Text } from '../primitives/VnText';

/** Central globe monument — rotating earth sphere on a rounded pedestal in the city plaza. */
export function GlobeMonument() {
  const globeRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = clock.elapsedTime * 0.18;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y = -clock.elapsedTime * 0.25;
      ringRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.4) * 0.08;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Pedestal base */}
      <mesh receiveShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[3.5, 4, 0.8, 24]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
      </mesh>

      {/* Pedestal column */}
      <RoundedBox args={[2.6, 2, 2.6]} radius={0.4} smoothness={2} position={[0, 1.8, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={hex.primary} roughness={0.5} />
      </RoundedBox>

      {/* Top platform */}
      <mesh castShadow position={[0, 3.0, 0]}>
        <cylinderGeometry args={[1.6, 1.4, 0.3, 24]} />
        <meshStandardMaterial color={hex.gold} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Globe */}
      <mesh ref={globeRef} castShadow position={[0, 4.4, 0]}>
        <sphereGeometry args={[1.2, 24, 16]} />
        <meshStandardMaterial color={hex.secondary} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Continents — abstract green patches */}
      <mesh position={[0, 4.4, 0]} rotation-y={0.3}>
        <sphereGeometry args={[1.205, 24, 16]} />
        <meshStandardMaterial color={hex.primary} roughness={0.5} transparent opacity={0.55} />
      </mesh>

      {/* Orbital ring */}
      <mesh ref={ringRef} position={[0, 4.4, 0]} rotation-x={Math.PI / 2.3}>
        <torusGeometry args={[1.7, 0.07, 10, 40]} />
        <meshStandardMaterial color={hex.gold} metalness={0.6} roughness={0.3} emissive={hex.gold} emissiveIntensity={0.3} />
      </mesh>

      {/* Light beam */}
      <pointLight position={[0, 5.5, 0]} color={hex.gold} intensity={0.8} distance={12} decay={2} />

      {/* Invisible hit sphere — click to reset the camera to the initial home view */}
      <mesh
        position={[0, 4.4, 0]}
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(
            new CustomEvent('camera-focus', {
              detail: { position: [0, 5.6, 11], target: [0, 3.6, 0], fov: 56 }
            })
          );
        }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[2.2, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Sign on the pedestal */}
      <RoundedBox args={[3.5, 0.6, 0.1]} radius={0.1} smoothness={2} position={[0, 1.6, 1.35]}>
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
      </RoundedBox>
      <Text position={[0, 1.6, 1.42]} fontSize={0.28} color={hex.text} anchorX="center" anchorY="middle" bold>
        BIÊN GIỚI MỀM
      </Text>
    </group>
  );
}
