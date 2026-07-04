import * as THREE from 'three';

/**
 * Global registry of window-glass materials so the day/night cycle can light
 * every building's windows at night with a single update — no per-building
 * useFrame hook. FacadeBuilding (and any other facade) registers its glass
 * material on mount and unregisters on unmount.
 */
const glassMaterials = new Set<THREE.MeshStandardMaterial>();

/** Daytime baseline emissive for window glass. */
const DAY_EMISSIVE = 0.18;
/** Fully-lit night emissive — windows glow warm. */
const NIGHT_EMISSIVE = 1.9;

let _night = 0;

function applyTo(m: THREE.MeshStandardMaterial) {
  m.emissiveIntensity = DAY_EMISSIVE + (NIGHT_EMISSIVE - DAY_EMISSIVE) * _night;
}

export function registerGlassMaterial(m: THREE.MeshStandardMaterial) {
  glassMaterials.add(m);
  applyTo(m);
}

export function unregisterGlassMaterial(m: THREE.MeshStandardMaterial) {
  glassMaterials.delete(m);
}

/** 0 = full day (windows dim), 1 = full night (windows fully lit). */
export function setNightFactor(n: number) {
  const c = THREE.MathUtils.clamp(n, 0, 1);
  if (c === _night) return;
  _night = c;
  glassMaterials.forEach(applyTo);
}

export function getNightFactor() {
  return _night;
}
