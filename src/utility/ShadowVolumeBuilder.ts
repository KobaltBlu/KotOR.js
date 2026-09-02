import * as THREE from "three";
import type { IShadowRegistryEntry } from "@/managers/ShadowCasterRegistry";
import { ShadowRegistryMeshKind } from "@/managers/ShadowCasterRegistry";
import {
  retailClipProjection,
  retailShadowEffectiveProjectionLength,
  type IRetailShadowProjectionPlane,
} from "@/utility/retailLighting";

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _boneWorld = new THREE.Vector3();

type SkinnedMeshVertexDeformer = THREE.SkinnedMesh & {
  boneTransform?: (index: number, target: THREE.Vector3) => THREE.Vector3;
  applyBoneTransform?: (index: number, target: THREE.Vector3) => THREE.Vector3;
};

function deformSkinnedVertex(skinned: THREE.SkinnedMesh, index: number, target: THREE.Vector3): void {
  const mesh = skinned as SkinnedMeshVertexDeformer;
  if(typeof mesh.applyBoneTransform === "function"){
    mesh.applyBoneTransform(index, target);
  }else if(typeof mesh.boneTransform === "function"){
    mesh.boneTransform(index, target);
  }
}

interface IShadowVolumePair {
  baseX: number;
  baseY: number;
  baseZ: number;
  extX: number;
  extY: number;
  extZ: number;
}

/**
 * K1 BuildShadowArray + RenderShadowArray — extruded silhouette sides for stencil.
 */
export class ShadowVolumeBuilder {
  private pairs: IShadowVolumePair[] = [];
  private positions: number[] = [];
  private indices: number[] = [];
  readonly geometry = new THREE.BufferGeometry();
  readonly mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;

  constructor(){
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      colorWrite: false,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  buildForLight(
    casters: readonly IShadowRegistryEntry[],
    lightX: number,
    lightY: number,
    lightZ: number,
    radius: number,
    shadowRadius: number,
    plane: IRetailShadowProjectionPlane,
    registry: { getEntryWorldPosition: (e: IShadowRegistryEntry, t?: THREE.Vector3) => THREE.Vector3 | undefined }
  ): boolean {
    const extrudeLen = retailShadowEffectiveProjectionLength(radius, shadowRadius);
    this.pairs.length = 0;

    for(let ci = 0; ci < casters.length; ci++){
      const entry = casters[ci];
      if(entry.kind === ShadowRegistryMeshKind.Bone && entry.bone){
        entry.bone.getWorldPosition(_boneWorld);
        this.addExtrudedPair(
          _boneWorld.x, _boneWorld.y, _boneWorld.z,
          lightX, lightY, lightZ, extrudeLen, plane,
          !!entry.mesh?.userData?.beaming
        );
        continue;
      }
      const mesh = entry.mesh;
      if(!mesh?.geometry){ continue; }
      if(entry.mesh?.userData?.beaming){ continue; }
      const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      if(!posAttr){ continue; }
      const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? (mesh as THREE.SkinnedMesh) : undefined;
      const step = Math.max(1, Math.floor(posAttr.count / 32));
      for(let vi = 0; vi < posAttr.count; vi += step){
        _vA.fromBufferAttribute(posAttr, vi);
        if(skinned){
          deformSkinnedVertex(skinned, vi, _vA);
        }
        mesh.localToWorld(_vA);
        this.addExtrudedPair(
          _vA.x, _vA.y, _vA.z,
          lightX, lightY, lightZ, extrudeLen, plane,
          false
        );
      }
    }

    if(this.pairs.length < 2){
      this.geometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
      this.geometry.setIndex(null);
      return false;
    }

    this.positions.length = 0;
    this.indices.length = 0;
    for(let i = 0; i < this.pairs.length; i++){
      const p = this.pairs[i];
      const baseIdx = i * 2;
      this.positions.push(p.baseX, p.baseY, p.baseZ, p.extX, p.extY, p.extZ);
      const next = (i + 1) % this.pairs.length;
      const nextBase = next * 2;
      this.indices.push(
        baseIdx, baseIdx + 1, nextBase + 1,
        baseIdx, nextBase + 1, nextBase
      );
    }

    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    this.geometry.setIndex(this.indices);
    this.geometry.computeBoundingSphere();
    return true;
  }

  private addExtrudedPair(
    vx: number,
    vy: number,
    vz: number,
    lightX: number,
    lightY: number,
    lightZ: number,
    extrudeLen: number,
    plane: IRetailShadowProjectionPlane,
    skipCapClip: boolean
  ){
    _dir.set(vx - lightX, vy - lightY, vz - lightZ);
    const len = _dir.length();
    if(len < 1e-6){ return; }
    _dir.multiplyScalar(1 / len);

    let baseX = vx;
    let baseY = vy;
    let baseZ = vz;
    let extX = lightX + _dir.x * extrudeLen;
    let extY = lightY + _dir.y * extrudeLen;
    let extZ = lightZ + _dir.z * extrudeLen;

    if(!skipCapClip){
      const clippedBase = retailClipProjection(plane, baseX, baseY, baseZ, lightX, lightY, lightZ);
      baseX = clippedBase.x;
      baseY = clippedBase.y;
      baseZ = clippedBase.z;
      const clippedExt = retailClipProjection(plane, extX, extY, extZ, lightX, lightY, lightZ);
      extX = clippedExt.x;
      extY = clippedExt.y;
      extZ = clippedExt.z;
    }

    this.pairs.push({ baseX, baseY, baseZ, extX, extY, extZ });
  }

  applyStencilWriteState(stencilRef: number){
    this.material.stencilWrite = true;
    this.material.stencilWriteMask = 0xff;
    this.material.stencilFunc = THREE.AlwaysStencilFunc;
    this.material.stencilRef = stencilRef;
    this.material.stencilFuncMask = 0xffffffff;
    this.material.stencilFail = THREE.KeepStencilOp;
    this.material.stencilZFail = THREE.KeepStencilOp;
    this.material.stencilZPass = THREE.ReplaceStencilOp;
    this.material.needsUpdate = true;
  }

  dispose(){
    this.geometry.dispose();
    this.material.dispose();
  }
}
