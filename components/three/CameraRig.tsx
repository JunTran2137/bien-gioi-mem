'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { usePathname, useRouter } from 'next/navigation';
import * as THREE from 'three';
import { cameraPresets, approachPoses, buildings as B } from '@/lib/three/theme';

const tmpPos = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const PAN_BOUNDS_CITY = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };

/** Per-route interior camera bounds (around the room center). */
type RoomBounds = { center: [number, number]; halfX: number; halfZ: number; minDist: number; maxDist: number; maxRadius?: number; maxPolar?: number; rectClamp?: boolean };
const ROOM_BOUNDS: Record<string, RoomBounds> = {
  '/theory':      { center: [B.library.position[0], B.library.position[2]],   halfX: 16, halfZ: 13, minDist: 4, maxDist: 28 },
  '/flashcards':  { center: [B.academy.position[0], B.academy.position[2]],   halfX: 9, halfZ: 7, minDist: 4, maxDist: 14, maxPolar: 0.49 },
  '/leaderboard': { center: [B.tower.position[0], B.tower.position[2]],       halfX: 14, halfZ: 11, minDist: 4, maxDist: 28 },
  // Arena is a circular open-air bowl (seating r≈17, perimeter wall r=24). Keep
  // the camera INSIDE the wall with a circular radius clamp so it can never
  // orbit/zoom out to reveal the exterior void.
  '/game':        { center: [B.arena.position[0], B.arena.position[2]],       halfX: 13, halfZ: 13, minDist: 4, maxDist: 11, maxRadius: 13, maxPolar: 0.66 },
  '/game/quiz':   { center: [B.arena.position[0], B.arena.position[2]],       halfX: 13, halfZ: 13, minDist: 4, maxDist: 11, maxRadius: 13, maxPolar: 0.66 },
  '/game/describe': { center: [B.arena.position[0], B.arena.position[2]],     halfX: 13, halfZ: 13, minDist: 4, maxDist: 11, maxRadius: 13, maxPolar: 0.66 },
  '/game/debate': { center: [B.arena.position[0], B.arena.position[2]],       halfX: 18, halfZ: 18, minDist: 4, maxDist: 32 },
  '/townhall':    { center: [B.townhall.position[0], B.townhall.position[2]], halfX: 14, halfZ: 12, minDist: 4, maxDist: 28 },
  '/cinema':      { center: [B.cinema.position[0],   B.cinema.position[2]],   halfX: 13, halfZ: 9, minDist: 3, maxDist: 16, maxPolar: 0.72, rectClamp: true }
};

interface Props {
  disabled?: boolean;
}

export function CameraRig({ disabled = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const animState = useRef({
    active: false,
    t: 1,
    duration: 1.2,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    fromFov: 42,
    toFov: 42,
    useWaypoint: false,
    waypoint: new THREE.Vector3(),
    // Gate so the dolly only begins once the scene has stopped building (frames
    // are smooth). Prevents the entry from being eaten by build jank on reload.
    started: false,
    waited: 0
  });

  // Route we still need to navigate to once the exterior approach fly finishes.
  const pendingEnterRoute = useRef<string | null>(null);
  // Door pose for the SECOND approach phase (slow zoom into the entrance) once
  // the first phase (fly to the building front) finishes. Null when not chaining.
  const doorZoom = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  // When the next room-entry animation should dolly straight in (because we are
  // already parked at the building's front from the approach fly) rather than
  // doing the pull-back establishing waypoint.
  const skipWaypointNext = useRef(false);
  // Previous pathname, so we know which building we are stepping back out of.
  const prevPath = useRef(pathname);

  // ── Click a landmark → go straight in. No overhead approach swoop (that
  //    arcing fly was the disorienting "spin"). The fade-to-black + the
  //    door→content dolly (run from the pathname effect below) handle the
  //    whole entrance: step through the door and zoom onto the content. ──
  useEffect(() => {
    const onEnter = (e: Event) => {
      const route = (e as CustomEvent<{ route: string }>).detail?.route;
      if (!route) return;
      const pose = approachPoses[route];
      // No approach pose defined → just enter directly (cover then push).
      if (!pose) {
        window.dispatchEvent(new Event('world-loading'));
        requestAnimationFrame(() => router.push(route));
        return;
      }
      // Two chained steps:
      //   Step 1 — fly to the front of the building (same pose you land on when
      //            stepping back out to the city). Straight lerp, no arc.
      //   Step 2 — once there, SLOWLY zoom in toward the entrance (the door).
      // The route push happens only after step 2 finishes (see useFrame).
      const a = animState.current;
      // All city buildings have their entrance on the +z face. Derive the door
      // standing pose from the building centre (= approach lookAt).
      const bx = pose.lookAt[0];
      const bz = pose.lookAt[2];
      a.fromPos.copy(camera.position);
      a.toPos.set(...pose.position);
      if (controlsRef.current) a.fromTarget.copy(controlsRef.current.target);
      a.toTarget.set(...pose.lookAt);
      if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        a.fromFov = (camera as THREE.PerspectiveCamera).fov;
      }
      a.toFov = pose.fov;
      a.useWaypoint = false;
      a.duration = 1.3;
      a.t = 0;
      a.active = true;
      a.started = true; // city is already built — play immediately, no gate
      a.waited = 0;
      // Queue the slow door zoom as the second step. The entrance/door of every
      // landmark sits on its +z facade at ≈ centre + 3.5; stand a short way out
      // on that same axis and look straight at it (the approach front is clear).
      doorZoom.current = {
        pos: new THREE.Vector3(bx, 3.2, bz + 9.5),  // close, on the door axis, looking in
        target: new THREE.Vector3(bx, 2.4, bz + 4)  // the actual doorway on the facade
      };
      pendingEnterRoute.current = route;
      if (controlsRef.current) controlsRef.current.enabled = false;
    };
    window.addEventListener('landmark-enter', onEnter);
    return () => window.removeEventListener('landmark-enter', onEnter);
  }, [camera, router]);

  // Ad-hoc camera focus (e.g. click the central globe) — smoothly fly to a given
  // pose looking at a point, then hand control back to OrbitControls. No route
  // change, no fade; just a guided zoom toward an object in the current scene.
  useEffect(() => {
    const onFocus = (e: Event) => {
      const d = (e as CustomEvent<{ position: [number, number, number]; target: [number, number, number]; fov?: number }>).detail;
      if (!d) return;
      const a = animState.current;
      a.fromPos.copy(camera.position);
      if (controlsRef.current) a.fromTarget.copy(controlsRef.current.target);
      a.toPos.set(...d.position);
      a.toTarget.set(...d.target);
      if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        a.fromFov = (camera as THREE.PerspectiveCamera).fov;
      }
      a.toFov = d.fov ?? 40;
      a.useWaypoint = false;
      a.duration = 1.4;
      a.t = 0;
      a.active = true;
      a.started = true;
      doorZoom.current = null;
      pendingEnterRoute.current = null;
      if (controlsRef.current) controlsRef.current.enabled = false;
    };
    window.addEventListener('camera-focus', onFocus);
    return () => window.removeEventListener('camera-focus', onFocus);
  }, [camera]);

  useEffect(() => {
    const came = prevPath.current;
    prevPath.current = pathname;
    const preset = cameraPresets[pathname] || cameraPresets['/'];
    const a = animState.current;
    a.fromPos.copy(camera.position);
    a.toPos.set(...preset.position);
    if (controlsRef.current) {
      a.fromTarget.copy(controlsRef.current.target);
    } else {
      a.fromTarget.set(0, 2, 0);
    }
    a.toTarget.set(...preset.lookAt);
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      a.fromFov = (camera as THREE.PerspectiveCamera).fov;
    }
    a.toFov = preset.fov;

    // Stepping back out to the city from a landmark → stop right in front of
    // that building (chính diện) instead of the city-centre overview. Game
    // sub-routes (/game/quiz, /game/debate) share the arena's approach pose.
    const approachKey = approachPoses[came]
      ? came
      : came.startsWith('/game')
        ? '/game'
        : null;
    const leavingToCity = pathname === '/' && !!approachKey;
    if (leavingToCity && approachKey) {
      const pose = approachPoses[approachKey];
      a.toPos.set(...pose.position);
      a.toTarget.set(...pose.lookAt);
      a.toFov = pose.fov;
    }

    // Interior room entry: step through the doorway and dolly straight toward
    // the content. The camera starts at the front edge of the room (the door)
    // with the SAME view direction as the final framing, then pushes forward
    // and narrows its FOV. Because fromTarget === toTarget the view never
    // rotates — no spinning, just a smooth zoom-in onto the content.
    const enteringRoom = !!ROOM_BOUNDS[pathname];
    a.useWaypoint = false;
    skipWaypointNext.current = false;
    if (enteringRoom) {
      const room = ROOM_BOUNDS[pathname];
      // Start exactly ON the final view ray (the line through the content target
      // and the final camera pos), extended backward toward the door. Staying on
      // this ray guarantees the start direction is IDENTICAL to the final one, so
      // the entry is a pure straight dolly — never angled / from a corner.
      const ray = new THREE.Vector3().subVectors(a.toPos, a.toTarget); // target → final pos
      // Start just INSIDE the room, in front of the (closed) door — never at or
      // behind the door, otherwise the shut doors occlude the view. The door is
      // then behind the camera as it dollies forward onto the content.
      const frontZ = room.center[1] + room.halfZ - 0.5; // ≈ 2 units in front of the door
      const inside = (p: THREE.Vector3) =>
        p.x >= room.center[0] - room.halfX + 0.5 && p.x <= room.center[0] + room.halfX - 0.5 &&
        p.z >= room.center[1] - room.halfZ + 0.5 && p.z <= frontZ &&
        p.y >= 1.4 && p.y <= 7;
      // Walk back along the ray (s = 1 is the final pos) until we hit that edge.
      let s = 1;
      const probe = new THREE.Vector3();
      for (let test = 1.05; test <= 3.2; test += 0.05) {
        probe.copy(a.toTarget).addScaledVector(ray, test);
        if (!inside(probe)) break;
        s = test;
      }
      a.fromPos.copy(a.toTarget).addScaledVector(ray, s);
      a.fromTarget.copy(a.toTarget);
      a.fromFov = a.toFov + 12; // start wider so the push reads as a strong zoom-in
      // Snap to the door pose immediately. The scene-transition fade hides this
      // jump, so the visible motion is purely the door→content dolly.
      camera.position.copy(a.fromPos);
      if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        const cam = camera as THREE.PerspectiveCamera;
        cam.fov = a.fromFov;
        cam.updateProjectionMatrix();
      }
      if (controlsRef.current) controlsRef.current.target.copy(a.fromTarget);
      a.duration = 2.2;
    } else {
      a.duration = 1.2;
    }

    a.t = 0;
    a.active = true;
    a.started = false;
    a.waited = 0;
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [pathname, camera]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    const a = animState.current;
    const ctrl = controlsRef.current;

    if (a.active) {
      // Hold at the door pose until the scene has finished its heavy build.
      // While instances are still being created the per-frame delta is huge
      // (1–2s); if we advanced now the whole dolly would complete in one frame
      // ("appears instantly"). Wait for a couple of smooth frames, then reveal
      // the canvas and play the dolly from the start so it is fully visible.
      if (!a.started) {
        a.waited += delta;
        // A small delta means the build jank is over and we are at real FPS.
        // The waited>... fallback forces a start on very slow machines.
        if ((delta < 0.05 && a.waited > 0.08) || a.waited > 4) {
          a.started = true;
          a.t = 0;
          window.dispatchEvent(new CustomEvent('world-ready'));
        } else {
          // Keep parked at the door pose; don't advance the dolly yet.
          camera.position.copy(a.fromPos);
          ctrl.target.copy(a.fromTarget);
          if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            const cam = camera as THREE.PerspectiveCamera;
            cam.fov = a.fromFov;
            cam.updateProjectionMatrix();
          }
          ctrl.update();
          return;
        }
      }
      // Clamp the per-frame step so a stray large delta can never skip the dolly.
      a.t = Math.min(1, a.t + Math.min(delta, 0.033) / a.duration);
      const k = easeInOutCubic(a.t);
      if (a.useWaypoint) {
        // Phase A (k 0⁆0.5): glide to the front-facing establishing waypoint.
        // Phase B (k 0.5→1): dolly straight in to the interior preset.
        if (k < 0.5) {
          const k2 = easeInOutCubic(k / 0.5);
          tmpPos.copy(a.fromPos).lerp(a.waypoint, k2);
          tmpTarget.copy(a.fromTarget).lerp(a.toTarget, k2);
        } else {
          const k2 = easeInOutCubic((k - 0.5) / 0.5);
          tmpPos.copy(a.waypoint).lerp(a.toPos, k2);
          tmpTarget.copy(a.toTarget);
        }
      } else {
        tmpPos.copy(a.fromPos).lerp(a.toPos, k);
        tmpTarget.copy(a.fromTarget).lerp(a.toTarget, k);
      }
      camera.position.copy(tmpPos);
      ctrl.target.copy(tmpTarget);
      if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        const cam = camera as THREE.PerspectiveCamera;
        cam.fov = a.fromFov + (a.toFov - a.fromFov) * k;
        cam.updateProjectionMatrix();
      }
      if (a.t >= 1) {
        // Step 1 (fly to building front) just finished and a door zoom is queued
        // → start the slow zoom into the entrance instead of pushing yet.
        if (doorZoom.current) {
          const dz = doorZoom.current;
          doorZoom.current = null;
          a.fromPos.copy(camera.position);
          a.fromTarget.copy(ctrl.target);
          a.toPos.copy(dz.pos);
          a.toTarget.copy(dz.target);
          if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            a.fromFov = (camera as THREE.PerspectiveCamera).fov;
          }
          a.toFov = 48;
          a.useWaypoint = false;
          a.duration = 2.2;   // slow, deliberate zoom toward the door
          a.t = 0;
          a.active = true;
          a.started = true;
          ctrl.update();
          return;
        }
        a.active = false;
        ctrl.enabled = !disabled;
        // Exterior approach fly just finished → cover the screen, then swap the
        // scene in. The next room-entry animation dollies straight in from this
        // front pose.
        if (pendingEnterRoute.current) {
          const r = pendingEnterRoute.current;
          pendingEnterRoute.current = null;
          skipWaypointNext.current = true;
          window.dispatchEvent(new Event('world-loading'));
          router.push(r);
        } else {
          // Tell the shell the camera has settled so the reload warm-up cover can
          // fade out only once the room is correctly framed (never mid-dolly).
          window.dispatchEvent(new CustomEvent('world-ready'));
        }
      }
      ctrl.update();
      return;
    }

    const room = ROOM_BOUNDS[pathname];
    if (room) {
      if (room.maxRadius) {
        // Circular arena: LOCK the look-at target near the central stage so the
        // camera (which always faces the target) can never be panned to aim at
        // the exterior. Combined with maxDistance this fully contains the view.
        const tdx = ctrl.target.x - room.center[0];
        const tdz = ctrl.target.z - room.center[1];
        const td = Math.hypot(tdx, tdz);
        const TARGET_MAX = 3;
        if (td > TARGET_MAX) {
          const s = TARGET_MAX / td;
          ctrl.target.x = room.center[0] + tdx * s;
          ctrl.target.z = room.center[1] + tdz * s;
        }
        ctrl.target.y = THREE.MathUtils.clamp(ctrl.target.y, 2.5, 7);
      } else {
        // Lock target inside room and clamp camera close to it
        ctrl.target.x = THREE.MathUtils.clamp(ctrl.target.x, room.center[0] - room.halfX, room.center[0] + room.halfX);
        ctrl.target.z = THREE.MathUtils.clamp(ctrl.target.z, room.center[1] - room.halfZ, room.center[1] + room.halfZ);
        ctrl.target.y = THREE.MathUtils.clamp(ctrl.target.y, 1, 6);
      }
      // Pull camera back if it strayed outside the room
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, room.center[0] - room.halfX - 1, room.center[0] + room.halfX + 1);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, room.center[1] - room.halfZ - 1, room.center[1] + room.halfZ + 1);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.5, 8);
      // Circular containment (round arenas): keep the camera within maxRadius of
      // the centre so it can never slip past the perimeter wall and see outside.
      if (room.maxRadius) {
        const dx = camera.position.x - room.center[0];
        const dz = camera.position.z - room.center[1];
        const dist = Math.hypot(dx, dz);
        if (dist > room.maxRadius) {
          const s = room.maxRadius / dist;
          camera.position.x = room.center[0] + dx * s;
          camera.position.z = room.center[1] + dz * s;
        }
      }
    } else {
      ctrl.target.x = THREE.MathUtils.clamp(ctrl.target.x, PAN_BOUNDS_CITY.minX, PAN_BOUNDS_CITY.maxX);
      ctrl.target.z = THREE.MathUtils.clamp(ctrl.target.z, PAN_BOUNDS_CITY.minZ, PAN_BOUNDS_CITY.maxZ);
      ctrl.target.y = THREE.MathUtils.clamp(ctrl.target.y, 0, 8);
    }

    ctrl.enabled = !disabled;
    ctrl.update();

    // ── HARD post-update containment for circular arenas ──────────────────
    // OrbitControls.update() (called above) RE-derives the camera position from
    // its own spherical state, overwriting any pre-update clamp. So the only
    // place a clamp is guaranteed to win is HERE, after update(). We force the
    // camera back inside the bowl cylinder and re-aim it at the locked target.
    if (room && room.maxRadius) {
      const dx = camera.position.x - room.center[0];
      const dz = camera.position.z - room.center[1];
      const dist = Math.hypot(dx, dz);
      let clamped = false;
      if (dist > room.maxRadius) {
        const s = room.maxRadius / dist;
        camera.position.x = room.center[0] + dx * s;
        camera.position.z = room.center[1] + dz * s;
        clamped = true;
      }
      if (camera.position.y > 8) { camera.position.y = 8; clamped = true; }
      if (camera.position.y < 2) { camera.position.y = 2; clamped = true; }
      if (clamped) {
        camera.lookAt(ctrl.target.x, ctrl.target.y, ctrl.target.z);
      }
    }

    // ── HARD post-update containment for rectangular rooms (cinema) ──────
    // Same problem as arenas: update() re-derives the camera position from its
    // spherical state (distance up to maxDist), overwriting the pre-update
    // clamp and letting the camera slip through the walls. Force it back inside
    // the box AFTER update() and re-aim at the target.
    if (room && room.rectClamp) {
      const minX = room.center[0] - room.halfX, maxX = room.center[0] + room.halfX;
      const minZ = room.center[1] - room.halfZ, maxZ = room.center[1] + room.halfZ;
      let clamped = false;
      if (camera.position.x < minX) { camera.position.x = minX; clamped = true; }
      if (camera.position.x > maxX) { camera.position.x = maxX; clamped = true; }
      if (camera.position.z < minZ) { camera.position.z = minZ; clamped = true; }
      if (camera.position.z > maxZ) { camera.position.z = maxZ; clamped = true; }
      if (camera.position.y > 8.5) { camera.position.y = 8.5; clamped = true; }
      if (camera.position.y < 1.5) { camera.position.y = 1.5; clamped = true; }
      if (clamped) {
        camera.lookAt(ctrl.target.x, ctrl.target.y, ctrl.target.z);
      }
    }
  });

  const room = ROOM_BOUNDS[pathname];
  const minDist = room?.minDist ?? 8;
  const maxDist = room?.maxDist ?? 150;
  // Round arenas: forbid panning so the look-at target stays pinned to the
  // central stage and the camera can never be aimed outside the bowl.
  const lockPan = !!room?.maxRadius;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      enableRotate
      enablePan={!lockPan}
      enableZoom
      rotateSpeed={0.7}
      panSpeed={1.0}
      zoomSpeed={0.9}
      screenSpacePanning={false}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      }}
      minDistance={minDist}
      maxDistance={maxDist}
      minPolarAngle={Math.PI * 0.08}
      maxPolarAngle={Math.PI * (room?.maxPolar ?? 0.49)}
    />
  );
}
