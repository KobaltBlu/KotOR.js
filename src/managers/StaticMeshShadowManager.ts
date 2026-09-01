import * as THREE from "three";
import type { LightManager } from "@/managers/LightManager";
import type { ShadowCasterRegistry } from "@/managers/ShadowCasterRegistry";
import type { OdysseyLight3D } from "@/three/odyssey";
import { GameState } from "@/GameState";
import {
  retailShadowProjectionStrength,
  retailShadowEffectiveRadius,
  isRetailAreaDirectionalShadowLight,
} from "@/utility/retailLighting";
import {
  buildShadowProjectionHull,
  type IShadowProjectionHull,
} from "@/utility/shadowProjection";
import {
  createEmptyOdysseyShadowHullSlots,
  MAX_ODYSSEY_SHADOW_HULLS,
  MAX_ODYSSEY_SHADOW_HULL_VERTS,
  type IOdysseyShadowHullSlot,
} from "@/shaders/chunks/OdysseyShadow";

/**
 * Retail DoStaticMeshShadows / DoDynamicMeshProjections — CPU hull prep only.
 * Fragment shader evaluates shadow via OdysseyShadow chunk (no vertex-color writes).
 */
export class StaticMeshShadowManager {
  private lightManager: LightManager;
  private registry: ShadowCasterRegistry;
  readonly hullSlots: IOdysseyShadowHullSlot[] = createEmptyOdysseyShadowHullSlots();
  /** Monotonic epoch bumped each successful hull prep for binder cache invalidation. */
  frameEpoch = 0;
  activeHullCount = 0;
  focusZ = 0;

  private _lightScratch = {
    worldPosition: new THREE.Vector3(),
    radius: 0,
    shadowRadius: 0,
    verticalDisplacement: 0,
    shadowFadeFactor: 0,
  };
  private _hullAabb = new THREE.Box2();
  private _receiverAabb = new THREE.Box2();
  private _receiverSphere = new THREE.Sphere();

  init(lightManager: LightManager, registry: ShadowCasterRegistry){
    this.lightManager = lightManager;
    this.registry = registry;
  }

  /**
   * Build shadow hull uniforms for active shadow lights.
   * @param focus World focus (player / camera target) — hull plane Z matches stencil disks.
   * @param includeDynamic When true, also include shadowLights (mode 0) hulls.
   */
  update(focus?: THREE.Vector3, includeDynamic = true){
    this.activeHullCount = 0;
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

    let slotIndex = 0;

    if(GameState.areaShadowsEnabled){
      const staticLight = this.lightManager.staticMeshShadowLights[0];
      if(staticLight){
        slotIndex = this.packLightHull(staticLight, this.registry.getStaticReceivers(), strengthBase, planeZ, slotIndex);
      }else{
        const distant = this.lightManager.distantShadowLight;
        if(distant){
          slotIndex = this.packLightHull(distant, this.registry.getStaticReceivers(), strengthBase, planeZ, slotIndex);
        }
      }
    }else{
      // Sun/moon shadows off — still run DoStaticMeshShadows for the mode-1 lamp light.
      const staticLight = this.lightManager.staticMeshShadowLights[0];
      if(staticLight && !isRetailAreaDirectionalShadowLight(staticLight.getRadius())){
        slotIndex = this.packLightHull(staticLight, this.registry.getStaticReceivers(), strengthBase, planeZ, slotIndex);
      }
    }

    if(includeDynamic){
      const shadowLights = this.lightManager.shadowLights;
      const dynamicReceivers = this.registry.getDynamicReceivers();
      for(let i = 0; i < shadowLights.length && slotIndex < MAX_ODYSSEY_SHADOW_HULLS; i++){
        slotIndex = this.packLightHull(shadowLights[i], dynamicReceivers, strengthBase, planeZ, slotIndex);
      }
    }

    this.activeHullCount = slotIndex;
    if(slotIndex > 0){
      this.frameEpoch++;
    }
  }

  private hasVisibleReceivers(): boolean {
    const staticR = this.registry.getStaticReceivers();
    for(let i = 0; i < staticR.length; i++){
      if(staticR[i].visible){ return true; }
    }
    const dynamicR = this.registry.getDynamicReceivers();
    for(let i = 0; i < dynamicR.length; i++){
      if(dynamicR[i].visible){ return true; }
    }
    return false;
  }

  private packLightHull(
    light: OdysseyLight3D,
    receivers: readonly (THREE.Mesh | THREE.SkinnedMesh)[],
    shadowAlpha: number,
    planeZ: number,
    slotIndex: number
  ): number {
    if(slotIndex >= MAX_ODYSSEY_SHADOW_HULLS){ return slotIndex; }

    const strength = retailShadowProjectionStrength(shadowAlpha, light.shadowFadeFactor || 0);
    if(!(strength > 0)){ return slotIndex; }

    // Retail cull — lights with illuminationScore > 1 are excluded from GetShadowLights.
    if(light.illuminationScore > 1){ return slotIndex; }

    const lp = this._lightScratch;
    lp.worldPosition.copy(light.worldPosition);
    lp.radius = light.getRadius();
    lp.shadowRadius = light.shadowRadius || 0;
    lp.verticalDisplacement = light.verticalDisplacement || 0;
    lp.shadowFadeFactor = light.shadowFadeFactor || 0;

    const casters = this.registry.getCastersInLightRadius(
      lp.worldPosition.x,
      lp.worldPosition.y,
      lp.worldPosition.z,
      lp.radius,
      lp.shadowRadius
    );
    if(!casters.length){ return slotIndex; }

    const hull = buildShadowProjectionHull(casters, lp, planeZ, this.registry);
    if(!hull){ return slotIndex; }

    if(!this.hullIntersectsReceivers(hull, receivers)){ return slotIndex; }

    this.writeHullSlot(this.hullSlots[slotIndex], hull, strength);
    this.hullSlots[slotIndex].active = true;
    return slotIndex + 1;
  }

  private hullIntersectsReceivers(
    hull: IShadowProjectionHull,
    receivers: readonly (THREE.Mesh | THREE.SkinnedMesh)[]
  ): boolean {
    this._hullAabb.makeEmpty();
    for(let i = 0; i < hull.hullVerts.length; i++){
      const v = hull.hullVerts[i];
      this._hullAabb.expandByPoint(new THREE.Vector2(v.x, v.y));
    }
    if(this._hullAabb.isEmpty()){ return false; }

    const influenceR = Math.sqrt(hull.influenceRSq);
    this._hullAabb.expandByScalar(influenceR * 0.01);

    for(let ri = 0; ri < receivers.length; ri++){
      const mesh = receivers[ri];
      if(!mesh.visible){ continue; }
      const geom = mesh.geometry;
      if(!geom){ continue; }
      if(!geom.boundingSphere){
        geom.computeBoundingSphere();
      }
      if(!geom.boundingSphere){ continue; }
      this._receiverSphere.copy(geom.boundingSphere).applyMatrix4(mesh.matrixWorld);
      this._receiverAabb.set(
        new THREE.Vector2(this._receiverSphere.center.x - this._receiverSphere.radius,
          this._receiverSphere.center.y - this._receiverSphere.radius),
        new THREE.Vector2(this._receiverSphere.center.x + this._receiverSphere.radius,
          this._receiverSphere.center.y + this._receiverSphere.radius)
      );
      if(this._hullAabb.intersectsBox(this._receiverAabb)){
        return true;
      }
    }
    return false;
  }

  private writeHullSlot(slot: IOdysseyShadowHullSlot, hull: IShadowProjectionHull, strength: number){
    slot.lightX = hull.lightX;
    slot.lightY = hull.lightY;
    slot.lightZ = hull.lightZ;
    slot.strength = strength;
    slot.planeZ = hull.planeZ;
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
}
