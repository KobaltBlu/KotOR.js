import * as THREE from 'three';
import {
  odysseyShadowCasterDistanceLimit,
} from '@/utility/odysseyLighting';

export interface IShadowCasterRegistration {
  castShadow: boolean;
  receiveShadow: boolean;
  isStatic?: boolean;
}

export interface IShadowCasterLightFilter {
  x: number;
  y: number;
  z: number;
  radius: number;
  shadowRadius?: number;
  /** Shadow camera for frustum test (after updateMatrixWorld). */
  shadowCamera?: THREE.Camera;
}

interface IRegisteredMesh {
  mesh: THREE.Mesh;
  castShadow: boolean;
  receiveShadow: boolean;
  isStatic: boolean;
  /** Authoritative castShadow before radius filter this frame. */
  authoredCastShadow: boolean;
}

/**
 * Tracks meshes that cast / receive Odyssey shadows so the shadow pass can
 * limit casters to each light's influence radius (+ retail margin).
 */
export class ShadowCasterRegistry {
  private readonly _entries = new Map<number, IRegisteredMesh>();
  private _nextId = 1;
  private static readonly _tmp = new THREE.Vector3();
  private static readonly _sphere = new THREE.Sphere();
  private static readonly _proj = new THREE.Matrix4();
  private static readonly _frustumScratch: THREE.Frustum[] = [];

  registerMesh(mesh: THREE.Mesh, opts: IShadowCasterRegistration): number {
    const id = (mesh.userData.odysseyShadowCasterId as number) || this._nextId++;
    mesh.userData.odysseyShadowCasterId = id;
    const entry: IRegisteredMesh = {
      mesh,
      castShadow: !!opts.castShadow,
      receiveShadow: !!opts.receiveShadow,
      isStatic: !!opts.isStatic,
      authoredCastShadow: !!opts.castShadow,
    };
    this._entries.set(id, entry);
    if(opts.castShadow){
      mesh.castShadow = true;
    }
    if(opts.receiveShadow){
      mesh.receiveShadow = true;
    }
    return id;
  }

  unregisterMesh(mesh: THREE.Mesh): void {
    const id = mesh.userData.odysseyShadowCasterId as number | undefined;
    if(id == null){ return; }
    this._entries.delete(id);
    delete mesh.userData.odysseyShadowCasterId;
  }

  /** Casters used for stencil / depth shadow fans. */
  getStencilCasters(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for(const e of this._entries.values()){
      if(e.castShadow && e.mesh.visible){
        out.push(e.mesh);
      }
    }
    return out;
  }

  getStaticReceivers(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for(const e of this._entries.values()){
      if(e.receiveShadow && e.isStatic){
        out.push(e.mesh);
      }
    }
    return out;
  }

  getDynamicReceivers(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for(const e of this._entries.values()){
      if(e.receiveShadow && !e.isStatic){
        out.push(e.mesh);
      }
    }
    return out;
  }

  /**
   * Casters whose world position is within light radius + margin.
   */
  getCastersInLightRadius(
    lightX: number,
    lightY: number,
    lightZ: number,
    radius: number,
    shadowRadius: number = 0
  ): THREE.Mesh[] {
    const limit = odysseyShadowCasterDistanceLimit(radius, shadowRadius);
    const limit2 = limit * limit;
    const out: THREE.Mesh[] = [];
    for(const e of this._entries.values()){
      if(!e.castShadow || !e.mesh.visible){ continue; }
      const p = e.mesh.getWorldPosition(ShadowCasterRegistry._tmp);
      const dx = p.x - lightX;
      const dy = p.y - lightY;
      const dz = p.z - lightZ;
      if((dx * dx + dy * dy + dz * dz) <= limit2){
        out.push(e.mesh);
      }
    }
    return out;
  }

  /**
   * Enable castShadow only for casters inside the union of active light radii
   * and (when provided) shadow-camera frustums / view focus distance.
   * Returns how many casters remain enabled. Call {@link restoreCastShadow}
   * after the shadow pass.
   */
  filterCastersForLights(
    lights: IShadowCasterLightFilter[],
    opts?: {
      focus?: THREE.Vector3;
      /** Max distance from focus for a caster to remain enabled (0 = ignore). */
      maxFocusDistance?: number;
    }
  ): number {
    const focus = opts?.focus;
    const maxFocus = opts?.maxFocusDistance ?? 0;
    const maxFocus2 = maxFocus > 0 ? maxFocus * maxFocus : 0;

    const frustums = ShadowCasterRegistry._frustumScratch;
    let frustumCount = 0;
    for(let i = 0; i < lights.length; i++){
      const cam = lights[i].shadowCamera;
      if(!cam){ continue; }
      cam.updateMatrixWorld(true);
      const persp = cam as THREE.PerspectiveCamera;
      if(typeof persp.updateProjectionMatrix === 'function'){
        persp.updateProjectionMatrix();
      }
      if(!frustums[frustumCount]){
        frustums[frustumCount] = new THREE.Frustum();
      }
      frustums[frustumCount].setFromProjectionMatrix(
        ShadowCasterRegistry._proj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
      );
      frustumCount++;
    }

    for(const e of this._entries.values()){
      e.authoredCastShadow = e.mesh.castShadow;
      if(!e.castShadow || !e.mesh.visible){
        e.mesh.castShadow = false;
        continue;
      }

      const sphere = ShadowCasterRegistry._sphere;
      const geom = e.mesh.geometry;
      if(geom){
        if(!geom.boundingSphere){ geom.computeBoundingSphere(); }
        if(geom.boundingSphere){
          sphere.copy(geom.boundingSphere);
          sphere.applyMatrix4(e.mesh.matrixWorld);
        }else{
          e.mesh.getWorldPosition(sphere.center);
          sphere.radius = 1.5;
        }
      }else{
        e.mesh.getWorldPosition(sphere.center);
        sphere.radius = 1.5;
      }

      if(maxFocus2 > 0 && focus){
        const fdx = sphere.center.x - focus.x;
        const fdy = sphere.center.y - focus.y;
        const fdz = sphere.center.z - focus.z;
        const dist = Math.sqrt(fdx * fdx + fdy * fdy + fdz * fdz) - sphere.radius;
        if(dist > 0 && (dist * dist) > maxFocus2){
          e.mesh.castShadow = false;
          continue;
        }
      }

      // No active lights → enable nobody (do not leave all casters on).
      let inRange = false;
      for(let i = 0; i < lights.length; i++){
        const L = lights[i];
        const limit = odysseyShadowCasterDistanceLimit(L.radius, L.shadowRadius ?? 0);
        const dx = sphere.center.x - L.x;
        const dy = sphere.center.y - L.y;
        const dz = sphere.center.z - L.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) - sphere.radius;
        if(dist > limit){
          continue;
        }
        if(frustumCount > 0){
          let inFrustum = false;
          for(let fi = 0; fi < frustumCount; fi++){
            if(frustums[fi].intersectsSphere(sphere)){
              inFrustum = true;
              break;
            }
          }
          if(!inFrustum){ continue; }
        }
        inRange = true;
        break;
      }
      e.mesh.castShadow = inRange;
    }
    let count = 0;
    for(const e of this._entries.values()){
      if(e.mesh.castShadow){ count++; }
    }
    return count;
  }

  restoreCastShadow(): void {
    for(const e of this._entries.values()){
      e.mesh.castShadow = e.authoredCastShadow && e.castShadow;
    }
  }

  clear(): void {
    this._entries.clear();
  }
}
