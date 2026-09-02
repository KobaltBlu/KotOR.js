import * as THREE from "three";
import {
  retailShadowCasterDistanceLimit,
  retailShadowEffectiveRadius,
  RETAIL_ENABLE_FOCUS_SHADOWING,
  RETAIL_MAX_SHADOW_DISTANCE,
} from "@/utility/retailLighting";

export enum ShadowRegistryMeshKind {
  Static = 0,
  Dynamic = 1,
  Bone = 2,
}

export interface IShadowRegistryEntry {
  mesh?: THREE.Mesh | THREE.SkinnedMesh;
  bone?: THREE.Bone;
  kind: ShadowRegistryMeshKind;
  castShadow: boolean;
  receiveShadow: boolean;
  isStatic: boolean;
  /** Cached world-space bounding sphere radius for bone casters. */
  boneRadius?: number;
  /** When false, retail TurnOffShadows — skip projection and stencil volumes. */
  shadowsEnabled?: boolean;
  ownerUuid?: string;
}

/**
 * Tracks shadow casters and receivers to avoid per-frame scene traversals.
 * Aligns with retail gob/model shadow state and bone-driven caster geometry.
 */
export class ShadowCasterRegistry {
  private casters: IShadowRegistryEntry[] = [];
  private staticReceivers: (THREE.Mesh | THREE.SkinnedMesh)[] = [];
  private dynamicReceivers: (THREE.Mesh | THREE.SkinnedMesh)[] = [];
  private _world = new THREE.Vector3();
  private _castersScratch: IShadowRegistryEntry[] = [];

  clear(){
    this.casters.length = 0;
    this.staticReceivers.length = 0;
    this.dynamicReceivers.length = 0;
  }

  registerMesh(
    mesh: THREE.Mesh | THREE.SkinnedMesh,
    options: {
      castShadow?: boolean;
      receiveShadow?: boolean;
      isStatic?: boolean;
      ownerUuid?: string;
      shadowsEnabled?: boolean;
    }
  ){
    if(!mesh){ return; }
    this.unregisterMesh(mesh);

    const castShadow = !!options.castShadow;
    const receiveShadow = !!options.receiveShadow;
    const isStatic = !!options.isStatic;

    if(castShadow || (mesh as THREE.SkinnedMesh).isSkinnedMesh){
      this.casters.push({
        mesh,
        kind: (mesh as THREE.SkinnedMesh).isSkinnedMesh
          ? ShadowRegistryMeshKind.Dynamic
          : (isStatic ? ShadowRegistryMeshKind.Static : ShadowRegistryMeshKind.Dynamic),
        castShadow: castShadow || (mesh as THREE.SkinnedMesh).isSkinnedMesh,
        receiveShadow,
        isStatic,
        ownerUuid: options.ownerUuid,
        shadowsEnabled: options.shadowsEnabled !== false,
      });
    }

    if(receiveShadow){
      if(isStatic){
        this.staticReceivers.push(mesh);
      }else{
        this.dynamicReceivers.push(mesh);
      }
    }
  }

  registerBoneCaster(
    bone: THREE.Bone,
    options: { radius?: number; ownerUuid?: string } = {}
  ){
    if(!bone){ return; }
    this.casters.push({
      bone,
      kind: ShadowRegistryMeshKind.Bone,
      castShadow: true,
      receiveShadow: false,
      isStatic: false,
      boneRadius: options.radius ?? 0.35,
      ownerUuid: options.ownerUuid,
    });
  }

  unregisterMesh(mesh: THREE.Mesh | THREE.SkinnedMesh){
    if(!mesh){ return; }
    const ownerUuid = mesh.userData?.shadowOwnerUuid as string | undefined;
    for(let i = this.casters.length - 1; i >= 0; i--){
      if(this.casters[i].mesh === mesh){
        this.casters.splice(i, 1);
      }
    }
    if(ownerUuid){
      this.casters = this.casters.filter(
        (e) => !(e.kind === ShadowRegistryMeshKind.Bone && e.ownerUuid === ownerUuid)
      );
    }
    this.staticReceivers = this.staticReceivers.filter((m) => m !== mesh);
    this.dynamicReceivers = this.dynamicReceivers.filter((m) => m !== mesh);
  }

  unregisterByOwner(ownerUuid: string){
    if(!ownerUuid){ return; }
    this.casters = this.casters.filter((e) => e.ownerUuid !== ownerUuid);
    this.staticReceivers = this.staticReceivers.filter(
      (m) => m.userData?.shadowOwnerUuid !== ownerUuid
    );
    this.dynamicReceivers = this.dynamicReceivers.filter(
      (m) => m.userData?.shadowOwnerUuid !== ownerUuid
    );
  }

  getCastersInLightRadius(
    lightX: number,
    lightY: number,
    lightZ: number,
    radius: number,
    shadowRadius: number,
    focus?: THREE.Vector3,
    out: IShadowRegistryEntry[] = this._castersScratch
  ): IShadowRegistryEntry[] {
    out.length = 0;
    const limit = retailShadowCasterDistanceLimit(radius, shadowRadius);
    const limitSq = limit * limit;
    const focusCull = RETAIL_ENABLE_FOCUS_SHADOWING && focus;
    const maxFocusSq = RETAIL_MAX_SHADOW_DISTANCE * RETAIL_MAX_SHADOW_DISTANCE;
    for(let i = 0; i < this.casters.length; i++){
      const entry = this.casters[i];
      if(!entry.castShadow){ continue; }
      if(entry.shadowsEnabled === false){ continue; }
      const pos = this.getEntryWorldPosition(entry);
      if(!pos){ continue; }
      if(focusCull){
        const fdx = pos.x - focus.x;
        const fdy = pos.y - focus.y;
        const fdz = pos.z - focus.z;
        if(fdx * fdx + fdy * fdy + fdz * fdz > maxFocusSq){ continue; }
      }
      const dx = pos.x - lightX;
      const dy = pos.y - lightY;
      const dz = pos.z - lightZ;
      if(dx * dx + dy * dy + dz * dz <= limitSq){
        out.push(entry);
      }
    }
    return out;
  }

  getStaticReceivers(): readonly (THREE.Mesh | THREE.SkinnedMesh)[] {
    return this.staticReceivers;
  }

  getDynamicReceivers(): readonly (THREE.Mesh | THREE.SkinnedMesh)[] {
    return this.dynamicReceivers;
  }

  getStencilCasters(): (THREE.Mesh | THREE.SkinnedMesh)[] {
    const out: (THREE.Mesh | THREE.SkinnedMesh)[] = [];
    for(let i = 0; i < this.casters.length; i++){
      const mesh = this.casters[i].mesh;
      if(mesh && mesh.castShadow !== false){
        out.push(mesh);
      }
    }
    return out;
  }

  setOwnerShadowsEnabled(ownerUuid: string, enabled: boolean){
    if(!ownerUuid){ return; }
    for(let i = 0; i < this.casters.length; i++){
      if(this.casters[i].ownerUuid === ownerUuid){
        this.casters[i].shadowsEnabled = enabled;
      }
    }
  }

  getEntryWorldPosition(entry: IShadowRegistryEntry, target = this._world): THREE.Vector3 | undefined {
    if(entry.mesh){
      return entry.mesh.getWorldPosition(target);
    }
    if(entry.bone){
      return entry.bone.getWorldPosition(target);
    }
    return undefined;
  }

  getEntryInfluenceRadius(entry: IShadowRegistryEntry): number {
    if(entry.kind === ShadowRegistryMeshKind.Bone){
      return entry.boneRadius ?? 0.35;
    }
    if(entry.mesh){
      const sphere = new THREE.Sphere();
      if(!entry.mesh.geometry?.boundingSphere){
        entry.mesh.geometry?.computeBoundingSphere?.();
      }
      if(entry.mesh.geometry?.boundingSphere){
        sphere.copy(entry.mesh.geometry.boundingSphere);
        sphere.applyMatrix4(entry.mesh.matrixWorld);
        return Math.max(0.25, sphere.radius);
      }
    }
    return 0.5;
  }
}
