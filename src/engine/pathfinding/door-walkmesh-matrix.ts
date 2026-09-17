import * as THREE from "three";

/**
 * Object-surface DWK/PWK LocalToWorld:
 *   world = R(obj) * (local + mesh.position) + obj.position
 *         = T(obj.pos) * R(obj) * T(mesh.header.position) * local
 *
 * `mesh.position` is the BWM header position (door jamb / placeable offset).
 *
 * @file door-walkmesh-matrix.ts
 */

const _rot = new THREE.Matrix4();
const _meshT = new THREE.Matrix4();

export function composeDoorWalkmeshLocalToWorld(
  out: THREE.Matrix4,
  doorPosition: { x: number; y: number; z: number },
  doorRotation: THREE.Euler,
  meshPosition?: { x: number; y: number; z: number } | null,
): THREE.Matrix4 {
  return composeObjectWalkmeshLocalToWorld(out, doorPosition, doorRotation, meshPosition);
}

/** Same LocalToWorld for doors (DWK) and placeables (PWK). */
export function composeObjectWalkmeshLocalToWorld(
  out: THREE.Matrix4,
  objectPosition: { x: number; y: number; z: number },
  objectRotation: THREE.Euler,
  meshPosition?: { x: number; y: number; z: number } | null,
): THREE.Matrix4 {
  const mx = meshPosition?.x ?? 0;
  const my = meshPosition?.y ?? 0;
  const mz = meshPosition?.z ?? 0;
  _meshT.makeTranslation(mx, my, mz);
  _rot.makeRotationFromEuler(objectRotation);
  out.makeTranslation(objectPosition.x, objectPosition.y, objectPosition.z);
  out.multiply(_rot).multiply(_meshT);
  return out;
}
