import * as THREE from "three";
import type { IShadowRegistryEntry } from "@/managers/ShadowCasterRegistry";
import { ShadowRegistryMeshKind } from "@/managers/ShadowCasterRegistry";
import {
  retailProjectPointFromLight,
  retailShadowEffectiveRadius,
  retailShadowLightPosition,
  retailShadowVertexDarken,
  type IRetailVec2,
} from "@/utility/retailLighting";

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _boneWorld = new THREE.Vector3();
const _casterScratch: IRetailVec2[] = [];

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
  planeZ: number;
}

export function buildShadowProjectionHull(
  casters: readonly IShadowRegistryEntry[],
  light: IShadowProjectionLight,
  planeZ: number,
  registry: { getEntryWorldPosition: (e: IShadowRegistryEntry, t?: THREE.Vector3) => THREE.Vector3 | undefined }
): IShadowProjectionHull | undefined {
  if(!casters.length){ return undefined; }

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

  _casterScratch.length = 0;
  let casterNearDist = Number.POSITIVE_INFINITY;

  for(let ci = 0; ci < casters.length; ci++){
    const caster = casters[ci];
    const casterPos = registry.getEntryWorldPosition(caster, _vB);
    if(!casterPos){ continue; }
    collectCasterSamplePoints(caster, lp.x, lp.y, lp.z, planeZ, _casterScratch);
    const cdx = casterPos.x - lp.x;
    const cdy = casterPos.y - lp.y;
    const cdz = casterPos.z - lp.z;
    const cLen = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
    if(cLen < casterNearDist){
      casterNearDist = cLen;
    }
  }

  if(_casterScratch.length < 3){ return undefined; }
  const hull = convexHull2D(_casterScratch);
  if(hull.length < 3){ return undefined; }

  return {
    hullVertCount: Math.min(hull.length, 16),
    hullVerts: hull.slice(0, 16),
    casterNearDist: Number.isFinite(casterNearDist) ? casterNearDist : 0,
    lightX: lp.x,
    lightY: lp.y,
    lightZ: lp.z,
    influenceRSq,
    planeZ,
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
    if(!pointInConvexPolygon(worldX, worldY, hull.hullVerts)){ continue; }
    const recvDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if(recvDist <= hull.casterNearDist + 0.05){ continue; }
    const keep = 1 - strength * (1 - 0.25);
    factor = Math.min(factor, keep);
  }
  return factor;
}

function collectCasterSamplePoints(
  entry: IShadowRegistryEntry,
  lightX: number,
  lightY: number,
  lightZ: number,
  planeZ: number,
  out: IRetailVec2[]
){
  if(entry.kind === ShadowRegistryMeshKind.Bone && entry.bone){
    entry.bone.getWorldPosition(_boneWorld);
    const proj = retailProjectPointFromLight(
      lightX, lightY, lightZ,
      _boneWorld.x, _boneWorld.y, _boneWorld.z,
      planeZ
    );
    if(proj){
      const r = entry.boneRadius ?? 0.35;
      out.push(proj);
      out.push({ x: proj.x + r, y: proj.y });
      out.push({ x: proj.x - r, y: proj.y });
      out.push({ x: proj.x, y: proj.y + r });
      out.push({ x: proj.x, y: proj.y - r });
    }
    return;
  }

  const mesh = entry.mesh;
  if(!mesh?.geometry){ return; }
  const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  if(!posAttr){ return; }

  const isSkinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
  const skinned = isSkinned ? (mesh as THREE.SkinnedMesh) : undefined;
  const step = Math.max(1, Math.floor(posAttr.count / 48));

  for(let i = 0; i < posAttr.count; i += step){
    _vA.fromBufferAttribute(posAttr, i);
    if(skinned){
      deformSkinnedVertex(skinned, i, _vA);
    }
    mesh.localToWorld(_vA);
    const proj = retailProjectPointFromLight(
      lightX, lightY, lightZ,
      _vA.x, _vA.y, _vA.z,
      planeZ
    );
    if(proj){ out.push(proj); }
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
      collectCasterSamplePoints(caster, lp.x, lp.y, lp.z, _vA.z, _casterScratch);
      if(_casterScratch.length < 3){ continue; }
      const hull = convexHull2D(_casterScratch);
      if(hull.length >= 3 && pointInConvexPolygon(_vA.x, _vA.y, hull)){
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
