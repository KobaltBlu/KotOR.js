import * as THREE from "three";

/**
 * Retail NWScript shape constants (ExecuteCommandGetObjectInShape @ 0054a260).
 *
 * @file objects-in-shape.ts
 */
export const ShapeType = {
  SPELLCYLINDER: 0,
  CONE: 1,
  CUBE: 2,
  SPELLCONE: 3,
  SPHERE: 4,
} as const;

/** Retail SPELLCYLINDER off-axis radius squared (1.5²). */
export const SPELLCYLINDER_RADIUS_SQ = 2.25;

/** Retail SPELLCONE forward half-angle cos(30°) ≈ 0.866. */
export const SPELLCONE_MIN_DOT = 0.866;

export function isInSphere(
  point: THREE.Vector3,
  center: THREE.Vector3,
  radius: number
): boolean {
  return point.distanceToSquared(center) <= radius * radius;
}

export function isInCube(
  point: THREE.Vector3,
  center: THREE.Vector3,
  halfExtent: number
): boolean {
  return (
    Math.abs(point.x - center.x) <= halfExtent &&
    Math.abs(point.y - center.y) <= halfExtent &&
    Math.abs(point.z - center.z) <= halfExtent
  );
}

/**
 * Retail case 0 — corridor from origin to target end, 1.5m off-axis radius.
 * Point must lie in front of the origin along the axis (dot ≥ 0).
 */
export function isInSpellCylinder(
  point: THREE.Vector3,
  origin: THREE.Vector3,
  end: THREE.Vector3,
  length: number
): boolean {
  const axis = end.clone().sub(origin);
  const axisLen = axis.length();
  if(axisLen < 1e-5){
    return isInSphere(point, origin, 1.5);
  }
  axis.multiplyScalar(1 / axisLen);
  const toPoint = point.clone().sub(origin);
  const along = toPoint.dot(axis);
  if(along < 0 || along > Math.max(length, axisLen)) return false;
  const closest = origin.clone().addScaledVector(axis, along);
  return point.distanceToSquared(closest) <= SPELLCYLINDER_RADIUS_SQ;
}

/**
 * Retail case 1 — cone that widens toward the end; radius at distance d is
 * (d / |end-origin|) * size.
 */
export function isInCone(
  point: THREE.Vector3,
  origin: THREE.Vector3,
  end: THREE.Vector3,
  size: number
): boolean {
  const axis = end.clone().sub(origin);
  const axisLen = axis.length();
  if(axisLen < 1e-5) return false;
  const toPoint = point.clone().sub(origin);
  const dir = axis.clone().multiplyScalar(1 / axisLen);
  const along = toPoint.dot(dir);
  if(along <= 0 || along > axisLen) return false;
  const closest = origin.clone().addScaledVector(dir, along);
  const radiusAt = (along / axisLen) * size;
  return point.distanceToSquared(closest) <= radiusAt * radiusAt;
}

/**
 * Retail case 3 — forward cone with cosθ ≥ 0.866 and distance ≤ size.
 */
export function isInSpellCone(
  point: THREE.Vector3,
  origin: THREE.Vector3,
  end: THREE.Vector3,
  size: number
): boolean {
  const axis = end.clone().sub(origin);
  const axisLen = axis.length();
  if(axisLen < 1e-5) return false;
  const toPoint = point.clone().sub(origin);
  const distSq = toPoint.lengthSq();
  if(distSq > size * size) return false;
  const dir = axis.multiplyScalar(1 / axisLen);
  const toDir = toPoint.normalize();
  return dir.dot(toDir) >= SPELLCONE_MIN_DOT;
}

/**
 * True when `point` lies in the retail shape described by nShape.
 * `origin` is used for cylinders/cones; sphere/cube use `center` only.
 */
export function isPointInShape(
  shape: number,
  point: THREE.Vector3,
  center: THREE.Vector3,
  size: number,
  origin?: THREE.Vector3
): boolean {
  const from = origin || center;
  switch(shape){
    case ShapeType.SPELLCYLINDER:
      return isInSpellCylinder(point, from, center, size);
    case ShapeType.CONE:
      return isInCone(point, from, center, size);
    case ShapeType.CUBE:
      return isInCube(point, center, size);
    case ShapeType.SPELLCONE:
      return isInSpellCone(point, from, center, size);
    case ShapeType.SPHERE:
    default:
      return isInSphere(point, center, size);
  }
}
