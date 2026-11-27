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
const _worldVert = new THREE.Vector3();

export type WalkmeshWorldAabbXY = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

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

/**
 * World-space XY AABB of walkmesh vertices after LocalToWorld.
 * Prefer this over visual model boxes for door collision / LOS culls —
 * model AABBs drift to the open jamb and miss the closed DWK volume.
 */
export function walkmeshWorldAabbXY(
  vertices: ArrayLike<{ x: number; y: number; z: number }> | undefined,
  matrixWorld: THREE.Matrix4 | undefined,
  out?: WalkmeshWorldAabbXY,
): WalkmeshWorldAabbXY | undefined {
  if(!vertices?.length || !matrixWorld) return undefined;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for(let i = 0; i < vertices.length; i++){
    const v = vertices[i];
    _worldVert.set(v.x, v.y, v.z).applyMatrix4(matrixWorld);
    if(_worldVert.x < minX) minX = _worldVert.x;
    if(_worldVert.x > maxX) maxX = _worldVert.x;
    if(_worldVert.y < minY) minY = _worldVert.y;
    if(_worldVert.y > maxY) maxY = _worldVert.y;
  }
  if(!Number.isFinite(minX) || !Number.isFinite(maxX)) return undefined;
  if(out){
    out.minX = minX;
    out.maxX = maxX;
    out.minY = minY;
    out.maxY = maxY;
    return out;
  }
  return { minX, maxX, minY, maxY };
}
