import * as THREE from "three";
import type { IShadowRegistryEntry } from "@/managers/ShadowCasterRegistry";
import { ShadowRegistryMeshKind } from "@/managers/ShadowCasterRegistry";
import {
  retailProjectPointFromLight,
  retailProjectPointFromLightOntoPlane,
  retailShadowEffectiveRadius,
  retailShadowLightPosition,
  retailShadowVertexDarken,
  retailWorldToPlaneUV,
  retailPlaneUVToWorld,
  buildRetailShadowProjectionPlane,
  transformWorldPointToMeshLocal,
  RetailShadowProjectionPlaneKind,
  type IRetailShadowProjectionPlane,
  type IRetailVec2,
} from "@/utility/retailLighting";

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _boneWorld = new THREE.Vector3();
const _vD = new THREE.Vector3();
const _vE = new THREE.Vector3();
const _vF = new THREE.Vector3();
const _vG = new THREE.Vector3();
const _vH = new THREE.Vector3();
const _casterScratch: IRetailVec2[] = [];
const _localHullScratch: IRetailVec2[] = [];
const _invReceiverMatrix = new THREE.Matrix4();

/** Full triangle-walk silhouette above this face count uses bbox/bone sampling instead. */
export const SHADOW_SILHOUETTE_MAX_FACES = 384;

export function transformShadowHullToReceiverLocal(
  worldHull: IShadowProjectionHull,
  worldPlane: IRetailShadowProjectionPlane,
  receiverMatrixWorld: THREE.Matrix4,
  localPlane: IRetailShadowProjectionPlane
): IShadowProjectionHull {
  _invReceiverMatrix.copy(receiverMatrixWorld).invert();
  const localLight = transformWorldPointToMeshLocal(
    worldHull.lightX,
    worldHull.lightY,
    worldHull.lightZ,
    receiverMatrixWorld,
    _vG
  );

  _localHullScratch.length = 0;
  const vertCount = worldHull.hullVertCount;
  for(let vi = 0; vi < vertCount; vi++){
    const wv = worldHull.hullVerts[vi];
    retailPlaneUVToWorld(worldPlane, wv.x, wv.y, _vA);
    _vA.applyMatrix4(_invReceiverMatrix);
    const luv = retailWorldToPlaneUV(localPlane, _vA.x, _vA.y, _vA.z);
    _localHullScratch.push(luv);
  }

  let hullVerts = _localHullScratch;
  if(hullVerts.length >= 3){
    const rehulled = convexHull2D(hullVerts);
    if(rehulled.length >= 3){
      hullVerts = rehulled.slice(0, 16);
    }
  }

  let casterNearDist = Number.POSITIVE_INFINITY;
  for(let vi = 0; vi < vertCount; vi++){
    retailPlaneUVToWorld(worldPlane, worldHull.hullVerts[vi].x, worldHull.hullVerts[vi].y, _vA);
    _vA.applyMatrix4(_invReceiverMatrix);
    const dx = _vA.x - localLight.x;
    const dy = _vA.y - localLight.y;
    const dz = _vA.z - localLight.z;
    const cLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if(cLen < casterNearDist){
      casterNearDist = cLen;
    }
  }

  const planeZ = localPlane.normal.z !== 0
    ? -localPlane.constant / localPlane.normal.z
    : 0;

  return {
    hullVertCount: Math.min(hullVerts.length, 16),
    hullVerts: hullVerts.slice(0, 16),
    casterNearDist: Number.isFinite(casterNearDist) ? casterNearDist : worldHull.casterNearDist,
    lightX: localLight.x,
    lightY: localLight.y,
    lightZ: localLight.z,
    influenceRSq: worldHull.influenceRSq,
    planeZ,
    plane: localPlane,
  };
}

type SkinnedMeshVertexDeformer = THREE.SkinnedMesh & {
  boneTransform?: (index: number, target: THREE.Vector3) => THREE.Vector3;
  applyBoneTransform?: (index: number, target: THREE.Vector3) => THREE.Vector3;
};

/** r149 uses boneTransform; newer Three.js renamed it to applyBoneTransform. */
function deformSkinnedVertex(skinned: THREE.SkinnedMesh, index: number, target: THREE.Vector3): void {
  const mesh = skinned as SkinnedMeshVertexDeformer;
  if(typeof mesh.applyBoneTransform === 'function'){
    mesh.applyBoneTransform(index, target);
  }else if(typeof mesh.boneTransform === 'function'){
    mesh.boneTransform(index, target);
  }
}

export function pointInConvexPolygon(px: number, py: number, hull: IRetailVec2[]): boolean {
  const n = hull.length;
  if(n < 3){ return false; }
  let sign = 0;
  for(let i = 0; i < n; i++){
    const a = hull[i];
    const b = hull[(i + 1) % n];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if(Math.abs(cross) < 1e-8){ continue; }
    const s = cross > 0 ? 1 : -1;
    if(sign === 0){
      sign = s;
    }else if(sign !== s){
      return false;
    }
  }
  return sign !== 0;
}

/** Monotone-chain convex hull in XY. */
export function convexHull2D(points: IRetailVec2[]): IRetailVec2[] {
  if(points.length <= 2){ return points.slice(); }
  const sorted = points.slice().sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  const lower: IRetailVec2[] = [];
  for(let i = 0; i < sorted.length; i++){
    while(lower.length >= 2 && cross2D(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0){
      lower.pop();
    }
    lower.push(sorted[i]);
  }
  const upper: IRetailVec2[] = [];
  for(let i = sorted.length - 1; i >= 0; i--){
    while(upper.length >= 2 && cross2D(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0){
      upper.pop();
    }
    upper.push(sorted[i]);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function cross2D(o: IRetailVec2, a: IRetailVec2, b: IRetailVec2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export interface IShadowProjectionHull {
  hullVertCount: number;
  hullVerts: IRetailVec2[];
  casterNearDist: number;
  lightX: number;
  lightY: number;
  lightZ: number;
  influenceRSq: number;
  /** @deprecated Use plane — kept for tests mirroring horizontal focus plane. */
  planeZ: number;
  plane: IRetailShadowProjectionPlane;
}

export function buildShadowProjectionHull(
  casters: readonly IShadowRegistryEntry[],
  light: IShadowProjectionLight,
  plane: IRetailShadowProjectionPlane,
  registry: { getEntryWorldPosition: (e: IShadowRegistryEntry, t?: THREE.Vector3) => THREE.Vector3 | undefined },
  receiverMatrixWorld?: THREE.Matrix4
): IShadowProjectionHull | undefined {
  if(!casters.length){ return undefined; }

  const worldLp = retailShadowLightPosition({
    x: light.worldPosition.x,
    y: light.worldPosition.y,
    z: light.worldPosition.z,
    radius: light.radius,
    shadowRadius: light.shadowRadius,
    verticalDisplacement: light.verticalDisplacement,
  });
  const lp = receiverMatrixWorld
    ? transformWorldPointToMeshLocal(worldLp.x, worldLp.y, worldLp.z, receiverMatrixWorld, _vG)
    : _vG.set(worldLp.x, worldLp.y, worldLp.z);
  const influenceR = retailShadowEffectiveRadius(light.radius, light.shadowRadius);
  const influenceRSq = influenceR * influenceR;

  _casterScratch.length = 0;
  let casterNearDist = Number.POSITIVE_INFINITY;

  for(let ci = 0; ci < casters.length; ci++){
    const caster = casters[ci];
    const casterPos = registry.getEntryWorldPosition(caster, _vB);
    if(!casterPos){ continue; }
    collectCasterSilhouettePoints(caster, lp.x, lp.y, lp.z, plane, receiverMatrixWorld, _casterScratch);
    const localCaster = receiverMatrixWorld
      ? transformWorldPointToMeshLocal(casterPos.x, casterPos.y, casterPos.z, receiverMatrixWorld, _vH)
      : casterPos;
    const cdx = localCaster.x - lp.x;
    const cdy = localCaster.y - lp.y;
    const cdz = localCaster.z - lp.z;
    const cLen = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
    if(cLen < casterNearDist){
      casterNearDist = cLen;
    }
  }

  if(_casterScratch.length < 3){ return undefined; }
  const hull = convexHull2D(_casterScratch);
  if(hull.length < 3){ return undefined; }

  const planeZ = plane.normal.z !== 0
    ? -plane.constant / plane.normal.z
    : 0;

  return {
    hullVertCount: Math.min(hull.length, 16),
    hullVerts: hull.slice(0, 16),
    casterNearDist: Number.isFinite(casterNearDist) ? casterNearDist : 0,
    lightX: lp.x,
    lightY: lp.y,
    lightZ: lp.z,
    influenceRSq,
    planeZ,
    plane,
  };
}

/**
 * Software mirror of OdysseyShadow GLSL shadow factor (for tests).
 */
export function softwareOdysseyShadowFactor(
  worldX: number,
  worldY: number,
  worldZ: number,
  hulls: readonly IShadowProjectionHull[],
  strengths: readonly number[]
): number {
  let factor = 1;
  for(let i = 0; i < hulls.length; i++){
    const hull = hulls[i];
    const strength = strengths[i] ?? 0;
    if(!(strength > 0)){ continue; }
    const dx = worldX - hull.lightX;
    const dy = worldY - hull.lightY;
    const dz = worldZ - hull.lightZ;
    if(dx * dx + dy * dy + dz * dz > hull.influenceRSq){ continue; }
    const uv = retailWorldToPlaneUV(hull.plane, worldX, worldY, worldZ);
    if(!pointInConvexPolygon(uv.x, uv.y, hull.hullVerts)){ continue; }
    const recvDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if(recvDist <= hull.casterNearDist + 0.05){ continue; }
    const keep = 1 - strength * (1 - 0.25);
    factor = Math.min(factor, keep);
  }
  return factor;
}

function collectCasterSilhouettePoints(
  entry: IShadowRegistryEntry,
  lightX: number,
  lightY: number,
  lightZ: number,
  plane: IRetailShadowProjectionPlane,
  receiverMatrixWorld: THREE.Matrix4 | undefined,
  out: IRetailVec2[]
){
  if(entry.kind === ShadowRegistryMeshKind.Bone && entry.bone){
    entry.bone.getWorldPosition(_boneWorld);
    const local = receiverMatrixWorld
      ? transformWorldPointToMeshLocal(_boneWorld.x, _boneWorld.y, _boneWorld.z, receiverMatrixWorld, _vD)
      : _boneWorld;
    const uv = retailProjectPointFromLightOntoPlane(
      plane,
      lightX, lightY, lightZ,
      local.x, local.y, local.z
    );
    if(!uv){ return; }
    const r = entry.boneRadius ?? 0.35;
    out.push(uv);
    out.push({ x: uv.x + r, y: uv.y });
    out.push({ x: uv.x - r, y: uv.y });
    out.push({ x: uv.x, y: uv.y + r });
    out.push({ x: uv.x, y: uv.y - r });
    return;
  }

  const mesh = entry.mesh;
  if(!mesh?.geometry){ return; }
  const geom = mesh.geometry;
  const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
  if(!posAttr){ return; }

  const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? (mesh as THREE.SkinnedMesh) : undefined;
  if(skinned){
    collectCasterSamplePoints(entry, lightX, lightY, lightZ, plane, out, receiverMatrixWorld);
    return;
  }

  const index = geom.index;
  const faceCount = index ? index.count / 3 : posAttr.count / 3;
  if(faceCount < 1){ return; }

  if(faceCount > SHADOW_SILHOUETTE_MAX_FACES){
    collectCasterSamplePoints(entry, lightX, lightY, lightZ, plane, out, receiverMatrixWorld);
    return;
  }
  const faceFacing: boolean[] = new Array(faceCount);
  const edgeFaces = new Map<string, number[]>();

  const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

  const getVertexLocal = (vi: number, target: THREE.Vector3) => {
    target.fromBufferAttribute(posAttr, vi);
    mesh.localToWorld(target);
    if(receiverMatrixWorld){
      transformWorldPointToMeshLocal(target.x, target.y, target.z, receiverMatrixWorld, target);
    }
    return target;
  };

  const projectLocalVertex = (vx: number, vy: number, vz: number) => {
    const uv = retailProjectPointFromLightOntoPlane(plane, lightX, lightY, lightZ, vx, vy, vz);
    if(uv){ out.push(uv); }
  };

  for(let fi = 0; fi < faceCount; fi++){
    const i0 = index ? index.getX(fi * 3) : fi * 3;
    const i1 = index ? index.getX(fi * 3 + 1) : fi * 3 + 1;
    const i2 = index ? index.getX(fi * 3 + 2) : fi * 3 + 2;

    getVertexLocal(i0, _vA);
    getVertexLocal(i1, _vB);
    getVertexLocal(i2, _vC);

    _vD.subVectors(_vB, _vA);
    _vE.subVectors(_vC, _vA);
    _vF.crossVectors(_vD, _vE);
    const nLen = _vF.length();
    if(nLen < 1e-8){ continue; }
    _vF.multiplyScalar(1 / nLen);

    const cx = (_vA.x + _vB.x + _vC.x) / 3;
    const cy = (_vA.y + _vB.y + _vC.y) / 3;
    const cz = (_vA.z + _vB.z + _vC.z) / 3;
    const toLightX = lightX - cx;
    const toLightY = lightY - cy;
    const toLightZ = lightZ - cz;
    const facing = _vF.x * toLightX + _vF.y * toLightY + _vF.z * toLightZ > 0;
    faceFacing[fi] = facing;

    const edges = [[i0, i1], [i1, i2], [i2, i0]] as const;
    for(let ei = 0; ei < 3; ei++){
      const a = edges[ei][0];
      const b = edges[ei][1];
      const key = edgeKey(a, b);
      let list = edgeFaces.get(key);
      if(!list){
        list = [];
        edgeFaces.set(key, list);
      }
      list.push(fi);
    }
  }

  edgeFaces.forEach((faces, key) => {
    if(faces.length !== 2){ return; }
    const f0 = faceFacing[faces[0]];
    const f1 = faceFacing[faces[1]];
    if(f0 === f1){ return; }
    const parts = key.split(':');
    const ia = parseInt(parts[0], 10);
    const ib = parseInt(parts[1], 10);
    getVertexLocal(ia, _vA);
    getVertexLocal(ib, _vB);
    projectLocalVertex(_vA.x, _vA.y, _vA.z);
    projectLocalVertex(_vB.x, _vB.y, _vB.z);
  });

  if(out.length < 3){
    collectCasterSamplePoints(entry, lightX, lightY, lightZ, plane, out, receiverMatrixWorld);
  }
}

function collectCasterSamplePoints(
  entry: IShadowRegistryEntry,
  lightX: number,
  lightY: number,
  lightZ: number,
  plane: IRetailShadowProjectionPlane,
  out: IRetailVec2[],
  receiverMatrixWorld?: THREE.Matrix4
){
  if(entry.kind === ShadowRegistryMeshKind.Bone && entry.bone){
    entry.bone.getWorldPosition(_boneWorld);
    const local = receiverMatrixWorld
      ? transformWorldPointToMeshLocal(_boneWorld.x, _boneWorld.y, _boneWorld.z, receiverMatrixWorld, _vD)
      : _boneWorld;
    const uv = retailProjectPointFromLightOntoPlane(
      plane,
      lightX, lightY, lightZ,
      local.x, local.y, local.z
    );
    if(!uv){ return; }
    const r = entry.boneRadius ?? 0.35;
    out.push(uv);
    out.push({ x: uv.x + r, y: uv.y });
    out.push({ x: uv.x - r, y: uv.y });
    out.push({ x: uv.x, y: uv.y + r });
    out.push({ x: uv.x, y: uv.y - r });
    return;
  }

  const mesh = entry.mesh;
  if(!mesh?.geometry){ return; }
  const isSkinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
  if(!isSkinned){
    if(!mesh.geometry.boundingBox){
      mesh.geometry.computeBoundingBox();
    }
    const box = mesh.geometry.boundingBox;
    if(box){
      const min = box.min;
      const max = box.max;
      const corners = [
        [min.x, min.y, min.z], [max.x, min.y, min.z],
        [min.x, max.y, min.z], [max.x, max.y, min.z],
        [min.x, min.y, max.z], [max.x, min.y, max.z],
        [min.x, max.y, max.z], [max.x, max.y, max.z],
      ];
      for(let ci = 0; ci < corners.length; ci++){
        const c = corners[ci];
        _vA.set(c[0], c[1], c[2]);
        mesh.localToWorld(_vA);
        if(receiverMatrixWorld){
          transformWorldPointToMeshLocal(_vA.x, _vA.y, _vA.z, receiverMatrixWorld, _vA);
        }
        const uv = retailProjectPointFromLightOntoPlane(
          plane,
          lightX, lightY, lightZ,
          _vA.x, _vA.y, _vA.z
        );
        if(uv){ out.push(uv); }
      }
      return;
    }
  }

  const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  if(!posAttr){ return; }

  const skinned = isSkinned ? (mesh as THREE.SkinnedMesh) : undefined;
  const step = Math.max(1, Math.floor(posAttr.count / 48));

  for(let i = 0; i < posAttr.count; i += step){
    _vA.fromBufferAttribute(posAttr, i);
    if(skinned){
      deformSkinnedVertex(skinned, i, _vA);
    }
    mesh.localToWorld(_vA);
    if(receiverMatrixWorld){
      transformWorldPointToMeshLocal(_vA.x, _vA.y, _vA.z, receiverMatrixWorld, _vA);
    }
    const dx = _vA.x - lightX;
    const dy = _vA.y - lightY;
    const dz = _vA.z - lightZ;
    if(dx * dx + dy * dy + dz * dz < 1e-8){ continue; }
    const uv = retailProjectPointFromLightOntoPlane(
      plane,
      lightX, lightY, lightZ,
      _vA.x, _vA.y, _vA.z
    );
    if(uv){ out.push(uv); }
  }
}

export interface IShadowProjectionLight {
  worldPosition: THREE.Vector3;
  radius: number;
  shadowRadius: number;
  verticalDisplacement: number;
  shadowFadeFactor: number;
}

/**
 * ProjectDynamicShadow — darken receiver vertex colors from caster silhouettes.
 * Returns true if any vertex was modified.
 */
export function applyShadowProjectionToMesh(
  receiver: THREE.Mesh | THREE.SkinnedMesh,
  casters: readonly IShadowRegistryEntry[],
  light: IShadowProjectionLight,
  strength: number,
  registry: { getEntryWorldPosition: (e: IShadowRegistryEntry, t?: THREE.Vector3) => THREE.Vector3 | undefined }
): boolean {
  if(!(strength > 0) || !casters.length){ return false; }
  const geom = receiver.geometry;
  const colorAttr = geom?.getAttribute('color') as THREE.BufferAttribute;
  const posAttr = geom?.getAttribute('position') as THREE.BufferAttribute;
  if(!colorAttr || !posAttr){ return false; }

  const lp = retailShadowLightPosition({
    x: light.worldPosition.x,
    y: light.worldPosition.y,
    z: light.worldPosition.z,
    radius: light.radius,
    shadowRadius: light.shadowRadius,
    verticalDisplacement: light.verticalDisplacement,
  });
  const influenceR = retailShadowEffectiveRadius(light.radius, light.shadowRadius);
  const influenceRSq = influenceR * influenceR;

  receiver.getWorldPosition(_vC);
  const plane = buildRetailShadowProjectionPlane(
    RetailShadowProjectionPlaneKind.FocusHorizontal,
    { position: { x: 0, y: 0, z: 0 } },
    _vC.z,
    undefined
  );

  const isSkinned = (receiver as THREE.SkinnedMesh).isSkinnedMesh;
  const skinned = isSkinned ? (receiver as THREE.SkinnedMesh) : undefined;
  let changed = false;

  for(let vi = 0; vi < posAttr.count; vi++){
    _vA.fromBufferAttribute(posAttr, vi);
    if(skinned){
      deformSkinnedVertex(skinned, vi, _vA);
    }
    receiver.localToWorld(_vA);

    const dx = _vA.x - lp.x;
    const dy = _vA.y - lp.y;
    const dz = _vA.z - lp.z;
    if(dx * dx + dy * dy + dz * dz > influenceRSq){ continue; }

    // Receiver must be on the far side of the light relative to casters.
    let inShadow = false;
    for(let ci = 0; ci < casters.length && !inShadow; ci++){
      const caster = casters[ci];
      const casterPos = registry.getEntryWorldPosition(caster, _vB);
      if(!casterPos){ continue; }

      _casterScratch.length = 0;
      collectCasterSamplePoints(caster, lp.x, lp.y, lp.z, plane, _casterScratch);
      if(_casterScratch.length < 3){ continue; }
      const hull = convexHull2D(_casterScratch);
      const recvUv = retailWorldToPlaneUV(plane, _vA.x, _vA.y, _vA.z);
      if(hull.length >= 3 && pointInConvexPolygon(recvUv.x, recvUv.y, hull)){
        // Simple depth test: caster closer to light than receiver along light→vertex ray.
        const cdx = casterPos.x - lp.x;
        const cdy = casterPos.y - lp.y;
        const cdz = casterPos.z - lp.z;
        const vdx = _vA.x - lp.x;
        const vdy = _vA.y - lp.y;
        const vdz = _vA.z - lp.z;
        const cLen = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
        const vLen = Math.sqrt(vdx * vdx + vdy * vdy + vdz * vdz);
        if(cLen < vLen - 0.05){
          inShadow = true;
        }
      }
    }

    if(inShadow){
      const bi = vi * 3;
      const br = colorAttr.getX(vi);
      const bg = colorAttr.getY(vi);
      const bb = colorAttr.getZ(vi);
      const [nr, ng, nb] = retailShadowVertexDarken(br, bg, bb, strength);
      colorAttr.setXYZ(vi, nr, ng, nb);
      changed = true;
    }
  }

  if(changed){
    colorAttr.needsUpdate = true;
  }
  return changed;
}

/** Restore receiver vertex colors from userData.shadowBaseColors. */
export function resetMeshVertexColorsFromBase(mesh: THREE.Mesh | THREE.SkinnedMesh): void {
  const colorAttr = mesh.geometry?.getAttribute('color') as THREE.BufferAttribute;
  const base = mesh.userData?.shadowBaseColors as Float32Array | undefined;
  if(!colorAttr || !base || base.length !== colorAttr.count * 3){ return; }
  colorAttr.array.set(base);
  colorAttr.needsUpdate = true;
}

/** Clone current color attribute into userData.shadowBaseColors. */
export function captureMeshVertexColorBase(mesh: THREE.Mesh | THREE.SkinnedMesh): void {
  const colorAttr = mesh.geometry?.getAttribute('color') as THREE.BufferAttribute;
  if(!colorAttr){ return; }
  const arr = colorAttr.array as Float32Array;
  if(!mesh.userData.shadowBaseColors || (mesh.userData.shadowBaseColors as Float32Array).length !== arr.length){
    mesh.userData.shadowBaseColors = new Float32Array(arr);
  }else{
    (mesh.userData.shadowBaseColors as Float32Array).set(arr);
  }
}

/** Enable Three.js vertex-color path on Odyssey ShaderMaterials (shadow projection). */
export function enableOdysseyMaterialVertexColors(material: THREE.Material | THREE.Material[]): void {
  const mats = Array.isArray(material) ? material : [material];
  for(let i = 0; i < mats.length; i++){
    const mat = mats[i];
    if(!(mat instanceof THREE.ShaderMaterial)){ continue; }
    mat.vertexColors = true;
    mat.defines = mat.defines || {};
    mat.defines.USE_COLOR = '';
    mat.needsUpdate = true;
  }
}

/** Ensure geometry has a white color attribute when MDL colors are absent. */
export function ensureMeshVertexColors(mesh: THREE.Mesh | THREE.SkinnedMesh, vertexCount?: number): void {
  const geom = mesh.geometry;
  if(!geom){ return; }
  const pos = geom.getAttribute('position') as THREE.BufferAttribute;
  if(!pos){ return; }
  const count = vertexCount ?? pos.count;
  if(!geom.getAttribute('color')){
    const colors = new Float32Array(count * 3);
    for(let i = 0; i < count * 3; i++){
      colors[i] = 1;
    }
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }
  captureMeshVertexColorBase(mesh);
}
