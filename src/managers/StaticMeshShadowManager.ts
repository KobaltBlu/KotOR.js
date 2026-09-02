import * as THREE from "three";
import type { LightManager } from "@/managers/LightManager";
import type { ShadowCasterRegistry, IShadowRegistryEntry } from "@/managers/ShadowCasterRegistry";
import { ShadowRegistryMeshKind } from "@/managers/ShadowCasterRegistry";
import type { OdysseyLight3D } from "@/three/odyssey";
import { OdysseyLightingBinder } from "@/three/odyssey/OdysseyLightingBinder";
import { GameState } from "@/GameState";
import {
  retailShadowProjectionStrength,
  isRetailAreaDirectionalShadowLight,
  buildRetailShadowProjectionPlane,
  retailStaticMeshShadowPlaneKind,
  retailShadowProjectionPlaneKind,
  RetailShadowProjectionPlaneKind,
  transformRetailShadowPlaneToMeshLocal,
  type IRetailShadowProjectionPlane,
} from "@/utility/retailLighting";
import {
  buildShadowProjectionHull,
  transformShadowHullToReceiverLocal,
  type IShadowProjectionHull,
} from "@/utility/shadowProjection";
import {
  createEmptyOdysseyShadowHullSlots,
  createReceiverShadowState,
  MAX_ODYSSEY_SHADOW_HULLS,
  MAX_ODYSSEY_SHADOW_HULL_VERTS,
  type IOdysseyShadowHullSlot,
  type IReceiverShadowState,
} from "@/shaders/chunks/OdysseyShadow";

/**
 * Retail DoStaticMeshShadows / DoDynamicMeshProjections — receiver-driven CPU hull prep.
 * Each meshShadowBucket / staticShadowBucket entry gets Plane::Transform + PartTriMesh::Project
 * parity via per-receiver local hulls bound at draw time.
 */
export class StaticMeshShadowManager {
  private lightManager: LightManager;
  private registry: ShadowCasterRegistry;
  /** Legacy global slots — first active receiver or debug fallback. */
  readonly hullSlots: IOdysseyShadowHullSlot[] = createEmptyOdysseyShadowHullSlots();
  readonly receiverStates = new Map<string, IReceiverShadowState>();
  frameEpoch = 0;
  activeHullCount = 0;
  focusZ = 0;
  staticMeshShadowLightUuid = "";

  private _lightScratch = {
    worldPosition: new THREE.Vector3(),
    radius: 0,
    shadowRadius: 0,
    verticalDisplacement: 0,
    shadowFadeFactor: 0,
  };
  private _groupCentroid = new THREE.Vector3();
  private _groupPosScratch = new THREE.Vector3();
  private _cameraForward = new THREE.Vector3();
  private _casterGroupsScratch: IShadowRegistryEntry[][] = [];
  private _receiverStatePool = new Map<string, IReceiverShadowState>();
  private _worldHullScratch: { hull: IShadowProjectionHull; strength: number }[] = [];
  private _receiverSphere = new THREE.Sphere();
  private _hullWorldAabb = new THREE.Box3();

  init(lightManager: LightManager, registry: ShadowCasterRegistry){
    this.lightManager = lightManager;
    this.registry = registry;
  }

  getReceiverShadowState(meshUuid: string): IReceiverShadowState | undefined {
    return this.receiverStates.get(meshUuid);
  }

  /** Per-mesh onBeforeRender hook — binds receiver-local hull uniforms before each draw. */
  static attachReceiverRenderHook(mesh: THREE.Mesh | THREE.SkinnedMesh){
    if(mesh.userData.odysseyReceiverShadowHooked){ return; }
    mesh.userData.odysseyReceiverShadowHooked = true;
    const prev = mesh.onBeforeRender;
    mesh.onBeforeRender = function(
      renderer: THREE.WebGLRenderer,
      scene: THREE.Scene,
      camera: THREE.Camera,
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      group: THREE.Group
    ){
      if(material instanceof THREE.ShaderMaterial){
        const manager = GameState.staticMeshShadowManager;
        const state = manager?.getReceiverShadowState(mesh.uuid);
        if(state){
          material.userData.odysseyShadowReceiverUuid = mesh.uuid;
          OdysseyLightingBinder.bindShadowUniforms(material, manager, state);
        }
      }
      if(typeof prev === 'function'){
        prev.call(mesh, renderer, scene, camera, geometry, material, group);
      }
    };
  }

  update(focus?: THREE.Vector3, includeDynamic = true){
    this.activeHullCount = 0;
    for(const state of this._receiverStatePool.values()){
      state.activeHullCount = 0;
      for(let i = 0; i < state.slots.length; i++){
        state.slots[i].active = false;
        state.slots[i].strength = 0;
        state.slots[i].hullVertCount = 0;
      }
    }
    this.receiverStates.clear();
    for(let i = 0; i < this.hullSlots.length; i++){
      this.hullSlots[i].active = false;
      this.hullSlots[i].strength = 0;
      this.hullSlots[i].hullVertCount = 0;
    }

    if(!this.lightManager || !this.registry || !GameState.areShadowsEnabled()){
      return;
    }

    const strengthBase = GameState.shadowAlpha;
    if(!(strengthBase > 0)){ return; }
    if(!this.hasVisibleReceivers()){ return; }

    const planeZ = focus?.z ?? GameState.currentCameraPosition?.z ?? 0;
    this.focusZ = planeZ;

    const camera = GameState.currentCamera;
    const camStub = camera ?? { position: { x: 0, y: 0, z: 0 }, near: 0.1 };
    const getForward = camera
      ? (out: { x: number; y: number; z: number }) => {
        this._cameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
        out.x = this._cameraForward.x;
        out.y = this._cameraForward.y;
        out.z = this._cameraForward.z;
      }
      : undefined;

    const prevStaticUuid = this.staticMeshShadowLightUuid;
    let globalSlotIndex = 0;

    // Mode 1 — staticShadowBucket (GetShadowLights(1) → static receivers only).
    if(GameState.areaShadowsEnabled){
      const staticLight = this.lightManager.staticMeshShadowLights[0];
      if(staticLight){
        this.staticMeshShadowLightUuid = staticLight.uuid;
        const kind = retailStaticMeshShadowPlaneKind(staticLight.getRadius());
        const worldPlane = buildRetailShadowProjectionPlane(kind, camStub, planeZ, getForward);
        globalSlotIndex = this.updateReceiverBucket(
          this.registry.getStaticReceivers(),
          [staticLight],
          strengthBase,
          worldPlane,
          globalSlotIndex,
          undefined
        );
      }else{
        const distant = this.lightManager.distantShadowLight;
        if(distant){
          this.staticMeshShadowLightUuid = distant.uuid;
          const worldPlane = buildRetailShadowProjectionPlane(
            RetailShadowProjectionPlaneKind.DistantGround,
            camStub,
            planeZ,
            getForward
          );
          globalSlotIndex = this.updateReceiverBucket(
            this.registry.getStaticReceivers(),
            [distant],
            strengthBase,
            worldPlane,
            globalSlotIndex,
            undefined
          );
        }else{
          this.staticMeshShadowLightUuid = "";
        }
      }
    }else{
      const staticLight = this.lightManager.staticMeshShadowLights[0];
      if(staticLight && !isRetailAreaDirectionalShadowLight(staticLight.getRadius())){
        this.staticMeshShadowLightUuid = staticLight.uuid;
        const kind = retailStaticMeshShadowPlaneKind(staticLight.getRadius());
        const worldPlane = buildRetailShadowProjectionPlane(kind, camStub, planeZ, getForward);
        globalSlotIndex = this.updateReceiverBucket(
          this.registry.getStaticReceivers(),
          [staticLight],
          strengthBase,
          worldPlane,
          globalSlotIndex,
          undefined
        );
      }else{
        this.staticMeshShadowLightUuid = "";
      }
    }

    if(prevStaticUuid !== this.staticMeshShadowLightUuid && prevStaticUuid !== ""){
      this.frameEpoch++;
    }

    // Mode 0 — meshShadowBucket (GetShadowLights(0) → dynamic receivers only).
    if(includeDynamic){
      const shadowLights = this.lightManager.shadowLights;
      const kind = retailShadowProjectionPlaneKind(shadowLights[0]?.getRadius() ?? 8, false);
      const worldPlane = buildRetailShadowProjectionPlane(kind, camStub, planeZ, getForward);
      globalSlotIndex = this.updateReceiverBucket(
        this.registry.getDynamicReceivers(),
        shadowLights,
        strengthBase,
        worldPlane,
        globalSlotIndex,
        this.staticMeshShadowLightUuid
      );
    }

    this.activeHullCount = globalSlotIndex;
    if(globalSlotIndex > 0 || this.receiverStates.size > 0){
      this.frameEpoch++;
    }
  }

  private hasVisibleReceivers(): boolean {
    for(const mesh of this.registry.getStaticReceivers()){
      if(mesh.visible){ return true; }
    }
    for(const mesh of this.registry.getDynamicReceivers()){
      if(mesh.visible){ return true; }
    }
    return false;
  }

  /**
   * Retail DoDynamicMeshProjections / DoStaticMeshShadows receiver loop:
   * foreach bucket mesh → Plane::Transform → per-caster hull pack.
   */
  private updateReceiverBucket(
    receivers: readonly (THREE.Mesh | THREE.SkinnedMesh)[],
    lights: readonly OdysseyLight3D[],
    shadowAlpha: number,
    worldPlane: IRetailShadowProjectionPlane,
    globalSlotIndex: number,
    skipLightUuid?: string
  ): number {
    if(!lights.length){ return globalSlotIndex; }

    this._worldHullScratch.length = 0;
    for(let li = 0; li < lights.length; li++){
      const light = lights[li];
      if(skipLightUuid && light.uuid === skipLightUuid){ continue; }
      const strength = retailShadowProjectionStrength(shadowAlpha, light.shadowFadeFactor || 0);
      if(!(strength > 0)){ continue; }
      const worldHulls = this.buildWorldHullsForLight(light, worldPlane);
      for(let hi = 0; hi < worldHulls.length; hi++){
        this._worldHullScratch.push({ hull: worldHulls[hi], strength });
      }
    }
    if(!this._worldHullScratch.length){ return globalSlotIndex; }

    this._hullWorldAabb.makeEmpty();
    for(let hi = 0; hi < this._worldHullScratch.length; hi++){
      this.expandWorldAabbForHull(this._worldHullScratch[hi].hull, worldPlane);
    }

    for(let ri = 0; ri < receivers.length; ri++){
      const receiver = receivers[ri];
      if(!receiver.visible){ continue; }
      if(!this.receiverIntersectsWorldHulls(receiver)){ continue; }

      const localPlane = transformRetailShadowPlaneToMeshLocal(worldPlane, receiver.matrixWorld);
      const state = this.acquireReceiverState(receiver.uuid);
      let slotIndex = 0;

      for(let hi = 0; hi < this._worldHullScratch.length && slotIndex < MAX_ODYSSEY_SHADOW_HULLS; hi++){
        const entry = this._worldHullScratch[hi];
        const localHull = transformShadowHullToReceiverLocal(
          entry.hull,
          worldPlane,
          receiver.matrixWorld,
          localPlane
        );
        this.writeHullSlot(state.slots[slotIndex], localHull, entry.strength, localPlane);
        state.slots[slotIndex].active = true;
        slotIndex++;
      }

      state.activeHullCount = slotIndex;
      state.frameEpoch = this.frameEpoch;
      if(slotIndex > 0){
        this.receiverStates.set(receiver.uuid, state);
        receiver.userData.receiverShadowState = state;
        StaticMeshShadowManager.attachReceiverRenderHook(receiver);

        if(globalSlotIndex < MAX_ODYSSEY_SHADOW_HULLS && slotIndex > 0){
          for(let si = 0; si < slotIndex && globalSlotIndex < MAX_ODYSSEY_SHADOW_HULLS; si++){
            this.copyHullSlot(this.hullSlots[globalSlotIndex], state.slots[si]);
            this.hullSlots[globalSlotIndex].active = true;
            globalSlotIndex++;
          }
        }
      }
    }

    return globalSlotIndex;
  }

  private acquireReceiverState(meshUuid: string): IReceiverShadowState {
    let state = this._receiverStatePool.get(meshUuid);
    if(!state){
      state = createReceiverShadowState();
      this._receiverStatePool.set(meshUuid, state);
    }
    return state;
  }

  private buildWorldHullsForLight(
    light: OdysseyLight3D,
    worldPlane: IRetailShadowProjectionPlane
  ): IShadowProjectionHull[] {
    const out: IShadowProjectionHull[] = [];
    const lp = this._lightScratch;
    lp.worldPosition.copy(light.worldPosition);
    lp.radius = light.getRadius();
    lp.shadowRadius = light.shadowRadius || 0;
    lp.verticalDisplacement = light.verticalDisplacement || 0;
    lp.shadowFadeFactor = light.shadowFadeFactor || 0;

    const focusPos = GameState.getCurrentPlayer()?.position ?? GameState.currentCameraPosition;
    const casters = this.registry.getCastersInLightRadius(
      lp.worldPosition.x,
      lp.worldPosition.y,
      lp.worldPosition.z,
      lp.radius,
      lp.shadowRadius,
      focusPos
    );
    if(!casters.length){ return out; }

    const groups = this.groupCastersByOwner(casters);
    if(focusPos){
      groups.sort((a, b) =>
        this.groupFocusDistanceSq(a, focusPos) - this.groupFocusDistanceSq(b, focusPos)
      );
    }

    for(let gi = 0; gi < groups.length && out.length < MAX_ODYSSEY_SHADOW_HULLS; gi++){
      const groupCasters = this.selectCasterSamplesForGroup(groups[gi]);
      const hull = buildShadowProjectionHull(groupCasters, lp, worldPlane, this.registry);
      if(hull){ out.push(hull); }
    }
    return out;
  }

  private expandWorldAabbForHull(hull: IShadowProjectionHull, worldPlane: IRetailShadowProjectionPlane){
    const n = worldPlane.normal;
    const ox = -n.x * worldPlane.constant;
    const oy = -n.y * worldPlane.constant;
    const oz = -n.z * worldPlane.constant;
    const tu = worldPlane.tangentU;
    const tv = worldPlane.tangentV;
    const influenceR = Math.sqrt(hull.influenceRSq);
    for(let vi = 0; vi < hull.hullVertCount; vi++){
      const v = hull.hullVerts[vi];
      const wx = ox + tu.x * v.x + tv.x * v.y;
      const wy = oy + tu.y * v.x + tv.y * v.y;
      const wz = oz + tu.z * v.x + tv.z * v.y;
      this._hullWorldAabb.expandByPoint(this._groupPosScratch.set(wx, wy, wz));
    }
    this._hullWorldAabb.expandByScalar(influenceR * 0.05);
  }

  private receiverIntersectsWorldHulls(receiver: THREE.Mesh | THREE.SkinnedMesh): boolean {
    if(this._hullWorldAabb.isEmpty()){ return false; }
    const geom = receiver.geometry;
    if(!geom){ return false; }
    if(!geom.boundingSphere){
      geom.computeBoundingSphere();
    }
    if(!geom.boundingSphere){ return false; }
    this._receiverSphere.copy(geom.boundingSphere).applyMatrix4(receiver.matrixWorld);
    return this._hullWorldAabb.intersectsSphere(this._receiverSphere);
  }

  private copyHullSlot(dst: IOdysseyShadowHullSlot, src: IOdysseyShadowHullSlot){
    dst.lightX = src.lightX;
    dst.lightY = src.lightY;
    dst.lightZ = src.lightZ;
    dst.strength = src.strength;
    dst.planeZ = src.planeZ;
    dst.planeNormal.copy(src.planeNormal);
    dst.planeConstant = src.planeConstant;
    dst.planeTangentU.copy(src.planeTangentU);
    dst.planeTangentV.copy(src.planeTangentV);
    dst.casterNearDist = src.casterNearDist;
    dst.influenceRSq = src.influenceRSq;
    dst.hullVertCount = src.hullVertCount;
    for(let i = 0; i < MAX_ODYSSEY_SHADOW_HULL_VERTS; i++){
      dst.hullVerts[i].copy(src.hullVerts[i]);
    }
  }

  /** Retail PartVolumeProject is per gob — one hull per owner, not a scene-wide convex hull. */
  private groupCastersByOwner(casters: readonly IShadowRegistryEntry[]): IShadowRegistryEntry[][] {
    const groups = this._casterGroupsScratch;
    groups.length = 0;
    const map = new Map<string, IShadowRegistryEntry[]>();
    for(let i = 0; i < casters.length; i++){
      const entry = casters[i];
      const key = entry.ownerUuid || entry.mesh?.uuid || `caster:${i}`;
      let group = map.get(key);
      if(!group){
        group = [];
        map.set(key, group);
        groups.push(group);
      }
      group.push(entry);
    }
    return groups;
  }

  private groupFocusDistanceSq(group: readonly IShadowRegistryEntry[], focus: THREE.Vector3): number {
    this._groupCentroid.set(0, 0, 0);
    let count = 0;
    for(let i = 0; i < group.length; i++){
      const pos = this.registry.getEntryWorldPosition(group[i], this._groupPosScratch);
      if(!pos){ continue; }
      this._groupCentroid.add(pos);
      count++;
    }
    if(count > 0){
      this._groupCentroid.multiplyScalar(1 / count);
    }
    return this._groupCentroid.distanceToSquared(focus);
  }

  private selectCasterSamplesForGroup(group: readonly IShadowRegistryEntry[]): IShadowRegistryEntry[] {
    const bones = group.filter((entry) => entry.kind === ShadowRegistryMeshKind.Bone);
    if(bones.length){
      return bones;
    }
    return group.slice();
  }

  private writeHullSlot(
    slot: IOdysseyShadowHullSlot,
    hull: IShadowProjectionHull,
    strength: number,
    plane: IRetailShadowProjectionPlane
  ){
    slot.lightX = hull.lightX;
    slot.lightY = hull.lightY;
    slot.lightZ = hull.lightZ;
    slot.strength = strength;
    slot.planeZ = hull.planeZ;
    slot.planeNormal.set(plane.normal.x, plane.normal.y, plane.normal.z);
    slot.planeConstant = plane.constant;
    slot.planeTangentU.set(plane.tangentU.x, plane.tangentU.y, plane.tangentU.z);
    slot.planeTangentV.set(plane.tangentV.x, plane.tangentV.y, plane.tangentV.z);
    slot.casterNearDist = hull.casterNearDist;
    slot.influenceRSq = hull.influenceRSq;
    slot.hullVertCount = hull.hullVertCount;
    for(let i = 0; i < MAX_ODYSSEY_SHADOW_HULL_VERTS; i++){
      const dst = slot.hullVerts[i];
      const src = hull.hullVerts[i];
      if(src){
        dst.set(src.x, src.y);
      }else{
        dst.set(0, 0);
      }
    }
  }

  /** Forge/debug — line segments for active hull edges in world space. */
  buildDebugHullLineSegments(outPositions: number[]): number {
    outPositions.length = 0;
    let segments = 0;

    const emitSlot = (slot: IOdysseyShadowHullSlot, matrixWorld?: THREE.Matrix4) => {
      if(!slot?.active || slot.hullVertCount < 3){ return; }
      const n = slot.planeNormal;
      const c = slot.planeConstant;
      const ox = -n.x * c;
      const oy = -n.y * c;
      const oz = -n.z * c;
      const tu = slot.planeTangentU;
      const tv = slot.planeTangentV;
      for(let vi = 0; vi < slot.hullVertCount; vi++){
        const a = slot.hullVerts[vi];
        const b = slot.hullVerts[(vi + 1) % slot.hullVertCount];
        let ax = ox + tu.x * a.x + tv.x * a.y;
        let ay = oy + tu.y * a.x + tv.y * a.y;
        let az = oz + tu.z * a.x + tv.z * a.y;
        let bx = ox + tu.x * b.x + tv.x * b.y;
        let by = oy + tu.y * b.x + tv.y * b.y;
        let bz = oz + tu.z * b.x + tv.z * b.y;
        if(matrixWorld){
          this._groupCentroid.set(ax, ay, az).applyMatrix4(matrixWorld);
          ax = this._groupCentroid.x;
          ay = this._groupCentroid.y;
          az = this._groupCentroid.z;
          this._groupCentroid.set(bx, by, bz).applyMatrix4(matrixWorld);
          bx = this._groupCentroid.x;
          by = this._groupCentroid.y;
          bz = this._groupCentroid.z;
        }
        outPositions.push(ax, ay, az, bx, by, bz);
        segments++;
      }
    };

    this.receiverStates.forEach((state, meshUuid) => {
      const receiver = this.findReceiverByUuid(meshUuid);
      for(let si = 0; si < state.activeHullCount; si++){
        emitSlot(state.slots[si], receiver?.matrixWorld);
      }
    });

    if(segments === 0){
      for(let si = 0; si < this.activeHullCount; si++){
        emitSlot(this.hullSlots[si]);
      }
    }
    return segments;
  }

  private findReceiverByUuid(uuid: string): (THREE.Mesh | THREE.SkinnedMesh) | undefined {
    for(const mesh of this.registry.getStaticReceivers()){
      if(mesh.uuid === uuid){ return mesh; }
    }
    for(const mesh of this.registry.getDynamicReceivers()){
      if(mesh.uuid === uuid){ return mesh; }
    }
    return undefined;
  }
}
