'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';
import { cameraPresets } from './theme';

const tmpPos = new THREE.Vector3();
const tmpLookAt = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpMat = new THREE.Matrix4();

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function RouteCamera({ duration = 1.4 }: { duration?: number }) {
  const pathname = usePathname();
  const { camera } = useThree();
  const startPos = useRef(new THREE.Vector3());
  const startQuat = useRef(new THREE.Quaternion());
  const targetPos = useRef(new THREE.Vector3());
  const targetQuat = useRef(new THREE.Quaternion());
  const targetFov = useRef(50);
  const startFov = useRef(50);
  const t = useRef(1);
  const lookTarget = useRef(new THREE.Vector3(0, 4, 0));

  useEffect(() => {
    const preset = cameraPresets[pathname] || cameraPresets['/'];
    startPos.current.copy(camera.position);
    startQuat.current.copy(camera.quaternion);
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      startFov.current = (camera as THREE.PerspectiveCamera).fov;
    }

    targetPos.current.set(...preset.position);
    tmpLookAt.set(...preset.lookAt);
    lookTarget.current.copy(tmpLookAt);
    tmpMat.lookAt(targetPos.current, tmpLookAt, camera.up);
    targetQuat.current.setFromRotationMatrix(tmpMat);
    targetFov.current = preset.fov;

    t.current = 0;
  }, [pathname, camera]);

  useFrame((_, delta) => {
    if (t.current >= 1) return;
    t.current = Math.min(1, t.current + delta / duration);
    const k = easeInOutCubic(t.current);

    tmpPos.copy(startPos.current).lerp(targetPos.current, k);
    camera.position.copy(tmpPos);

    tmpQuat.copy(startQuat.current).slerp(targetQuat.current, k);
    camera.quaternion.copy(tmpQuat);

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as THREE.PerspectiveCamera;
      cam.fov = startFov.current + (targetFov.current - startFov.current) * k;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

export function useFlyToLook() {
  // exported for ad-hoc fly-to from inside scene; reserved for future use
  return null;
}
