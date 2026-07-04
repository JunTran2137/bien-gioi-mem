'use client';

import { VnText as Text } from './primitives/VnText';
import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button3D } from './primitives/Button3D';
import { hex, palette } from '@/lib/three/theme';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Camera-locked 3D modal: sign-in + group selector trigger. */
export function AuthModal3D({ open, onClose }: Props) {
  const { data: session } = useSession();
  const grpRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!grpRef.current) return;

    if (!open && grpRef.current.scale.x < 0.02) {
      grpRef.current.visible = false;
      return;
    }
    if (open) grpRef.current.visible = true;

    const ts = open ? 1 : 0.001;
    const cs = THREE.MathUtils.damp(grpRef.current.scale.x, ts, 12, delta);
    grpRef.current.scale.setScalar(cs);

    // Position panel 6u in front of camera
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const pos = new THREE.Vector3()
      .copy(camera.position)
      .add(fwd.multiplyScalar(7))
      .add(up.multiplyScalar(0.5));
    grpRef.current.position.copy(pos);
    grpRef.current.quaternion.copy(camera.quaternion);
  });

  const userName = session?.user?.name?.split(' ').slice(-1)[0] || 'bạn';

  return (
    <group ref={grpRef} renderOrder={1000} visible={false}>
      {/* Backdrop — clicking it closes modal */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        position={[0, 0, -0.3]}
      >
        <planeGeometry args={[80, 60]} />
        <meshBasicMaterial color="#0F1B2D" transparent opacity={0.55} depthTest={false} depthWrite={false} />
      </mesh>

      {/* Modal card with rounded corners */}
      <RoundedBox args={[6.4, 4.8, 0.2]} radius={0.25} smoothness={6} position={[0, 0, 0]} castShadow={false}>
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} metalness={0} />
      </RoundedBox>

      {/* Decorative ribbon */}
      <RoundedBox args={[6.4, 0.6, 0.05]} radius={0.1} smoothness={4} position={[0, 1.85, 0.11]}>
        <meshStandardMaterial color={hex.primary} roughness={0.5} />
      </RoundedBox>

      <Text position={[0, 1.85, 0.16]} fontSize={0.28} color="#fff" anchorX="center" anchorY="middle">
        🏛️  Tòa thị chính
      </Text>

      {!session ? (
        <>
          <Text position={[0, 1.0, 0.12]} fontSize={0.34} color={hex.text} anchorX="center" anchorY="middle" bold>
            Đăng nhập để bắt đầu
          </Text>
          <Text position={[0, 0.5, 0.12]} fontSize={0.18} color={hex.muted} anchorX="center" anchorY="middle" maxWidth={5.6} textAlign="center">
            Tham gia thi đấu nhóm, lưu tiến độ học tập và lên bảng xếp hạng.
          </Text>

          <Button3D
            position={[0, -0.4, 0.12]}
            width={3.8}
            height={0.85}
            color={palette.primary}
            hoverColor={palette.primaryDark}
            onClick={() => signIn('google')}
          >
            <Text position={[0, 0, 0.18]} fontSize={0.24} color="#fff" anchorX="center" anchorY="middle" bold>
              Đăng nhập với Google
            </Text>
          </Button3D>

          <Button3D
            position={[0, -1.55, 0.12]}
            width={1.6}
            height={0.55}
            color={palette.muted}
            onClick={onClose}
          >
            <Text position={[0, 0, 0.18]} fontSize={0.18} color="#fff" anchorX="center" anchorY="middle">Đóng</Text>
          </Button3D>
        </>
      ) : (
        <>
          <Text position={[0, 1.05, 0.12]} fontSize={0.3} color={hex.text} anchorX="center" anchorY="middle" bold>
            Xin chào {userName}!
          </Text>
          <Text position={[0, 0.6, 0.12]} fontSize={0.16} color={hex.muted} anchorX="center" anchorY="middle" maxWidth={5.6} textAlign="center">
            Quản lý nhóm thi đấu của bạn ở đây.
          </Text>

          <Button3D
            position={[0, -0.05, 0.12]}
            width={3.8}
            height={0.8}
            color={palette.primary}
            hoverColor={palette.primaryDark}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-group-selector'));
              onClose();
            }}
          >
            <Text position={[0, 0, 0.18]} fontSize={0.22} color="#fff" anchorX="center" anchorY="middle" bold>
              🤝  Chọn / đổi nhóm
            </Text>
          </Button3D>

          <Button3D
            position={[-1.1, -1.1, 0.12]}
            width={2.0}
            height={0.6}
            color={palette.danger}
            onClick={() => signOut()}
          >
            <Text position={[0, 0, 0.18]} fontSize={0.18} color="#fff" anchorX="center" anchorY="middle">
              Đăng xuất
            </Text>
          </Button3D>

          <Button3D
            position={[1.1, -1.1, 0.12]}
            width={2.0}
            height={0.6}
            color={palette.muted}
            onClick={onClose}
          >
            <Text position={[0, 0, 0.18]} fontSize={0.18} color="#fff" anchorX="center" anchorY="middle">
              Đóng
            </Text>
          </Button3D>

          <Text position={[0, -1.85, 0.12]} fontSize={0.13} color={hex.muted} anchorX="center" anchorY="middle" maxWidth={5.6} textAlign="center">
            Mẹo: nhấn ESC hoặc nhấn ngoài bảng để đóng
          </Text>
        </>
      )}
    </group>
  );
}
