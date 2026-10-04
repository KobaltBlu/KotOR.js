/**
 * HitCheckPart stand-in for minigame collisions.
 * World segment → gob local → bounding-sphere cull → part mesh raycast → world hit.
 *
 * @file MGHitCheck.ts
 */

import * as THREE from 'three';
import { GameState } from '@engine/runtime/GameState';

export interface MGHitCheckOut {
  point?: THREE.Vector3;
  normal?: THREE.Vector3;
}

const _inv = new THREE.Matrix4();
const _localFrom = new THREE.Vector3();
const _localTo = new THREE.Vector3();
const _bsCenter = new THREE.Vector3();
const _worldDir = new THREE.Vector3();
const _tmpClosest = new THREE.Vector3();
const _tmpPartPos = new THREE.Vector3();
const _tmpSeg = new THREE.Vector3();
const _tmpToCenter = new THREE.Vector3();
const _rayHits: THREE.Intersection[] = [];

/**
 * Segment (fromWorld → toWorld) vs named Aurora part mesh under a gob root.
 * Returns true on hit; optional out.point / out.normal in world space.
 */
export function hitCheckPart(
  root: THREE.Object3D | undefined | null,
  part: THREE.Object3D | undefined | null,
  fromWorld: THREE.Vector3,
  toWorld: THREE.Vector3,
  out?: MGHitCheckOut,
): boolean {
  if(!root || !part){ return false; }

  const dx = toWorld.x - fromWorld.x;
  const dy = toWorld.y - fromWorld.y;
  const dz = toWorld.z - fromWorld.z;
  const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if(segLen < 1e-8){ return false; }

  root.updateWorldMatrix?.(true, false);
  if(typeof (root as any).updateMatrixWorld === 'function'){
    root.updateMatrixWorld(true);
  }

  // Local-space BS cull (SphereIntersect after inverse-orient).
  _inv.copy(root.matrixWorld).invert();
  _localFrom.copy(fromWorld).applyMatrix4(_inv);
  _localTo.copy(toWorld).applyMatrix4(_inv);
  const radius = getLocalBoundingRadius(root, _bsCenter);
  if(radius > 0 && !segmentIntersectsSphere(_localFrom, _localTo, _bsCenter, radius)){
    return false;
  }

  const meshes = collectMeshes(part);
  if(!meshes.length){
    return hitCheckPartSphereFallback(part, fromWorld, toWorld, out);
  }

  _worldDir.set(dx, dy, dz).multiplyScalar(1 / segLen);
  const raycaster = GameState.raycaster;
  const prevFar = raycaster.far;
  raycaster.ray.origin.copy(fromWorld);
  raycaster.ray.direction.copy(_worldDir);
  raycaster.far = segLen;

  _rayHits.length = 0;
  try{
    raycaster.intersectObjects(meshes, true, _rayHits);
  }finally{
    raycaster.far = prevFar;
  }

  let best: THREE.Intersection | undefined;
  for(let i = 0; i < _rayHits.length; i++){
    const hit = _rayHits[i];
    if(hit.distance < 0 || hit.distance > segLen){ continue; }
    if(!best || hit.distance < best.distance){
      best = hit;
    }
  }
  if(!best){ return false; }

  if(out?.point){
    out.point.copy(fromWorld).addScaledVector(_worldDir, best.distance);
  }
  if(out?.normal){
    if(best.face?.normal){
      out.normal.copy(best.face.normal);
      const nObj = best.object as THREE.Object3D;
      nObj.updateMatrixWorld?.(true);
      out.normal.transformDirection(nObj.matrixWorld).normalize();
    }else{
      out.normal.copy(_worldDir).negate().normalize();
    }
  }
  return true;
}

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if(mesh.isMesh && mesh.geometry){
      meshes.push(mesh);
    }
  });
  return meshes;
}

function getLocalBoundingRadius(root: THREE.Object3D, centerOut: THREE.Vector3): number {
  // Prefer mdl-local geometry BS when the root is a mesh; otherwise skip cull
  // (world Box3 from setFromObject is not safe in local space).
  const mesh = root as THREE.Mesh;
  if(mesh.isMesh && mesh.geometry){
    if(!mesh.geometry.boundingSphere){
      mesh.geometry.computeBoundingSphere();
    }
    const bs = mesh.geometry.boundingSphere;
    if(bs){
      centerOut.copy(bs.center);
      return Math.max(bs.radius, 0);
    }
  }
  centerOut.set(0, 0, 0);
  return 0;
}

function segmentIntersectsSphere(
  a: THREE.Vector3,
  b: THREE.Vector3,
  center: THREE.Vector3,
  radius: number,
): boolean {
  _tmpSeg.copy(b).sub(a);
  const lenSq = _tmpSeg.lengthSq();
  let t = 0;
  if(lenSq > 1e-12){
    t = THREE.MathUtils.clamp(_tmpToCenter.copy(center).sub(a).dot(_tmpSeg) / lenSq, 0, 1);
  }
  _tmpClosest.copy(a).addScaledVector(_tmpSeg, t);
  return _tmpClosest.distanceToSquared(center) <= radius * radius;
}

/**
 * When part has no mesh: segment vs part world sphere (userData.sphereRadius ?? 0.5).
 */
export function hitCheckPartSphereFallback(
  part: THREE.Object3D,
  fromWorld: THREE.Vector3,
  toWorld: THREE.Vector3,
  out?: MGHitCheckOut,
): boolean {
  const r = (part as any).userData?.sphereRadius ?? 0.5;
  part.getWorldPosition(_tmpPartPos);
  _tmpSeg.copy(toWorld).sub(fromWorld);
  const lenSq = _tmpSeg.lengthSq();
  let t = 0;
  if(lenSq > 1e-12){
    t = THREE.MathUtils.clamp(
      _tmpToCenter.copy(_tmpPartPos).sub(fromWorld).dot(_tmpSeg) / lenSq,
      0,
      1,
    );
  }
  const closest = _worldDir.copy(fromWorld).addScaledVector(_tmpSeg, t);
  if(closest.distanceToSquared(_tmpPartPos) > r * r){ return false; }
  if(out?.point){ out.point.copy(closest); }
  if(out?.normal){
    out.normal.copy(closest).sub(_tmpPartPos);
    if(out.normal.lengthSq() < 1e-12){
      out.normal.copy(toWorld).sub(fromWorld).negate();
    }
    out.normal.normalize();
  }
  return true;
}
