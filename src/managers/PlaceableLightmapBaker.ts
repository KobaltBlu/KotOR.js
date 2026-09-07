import type { ModulePlaceable } from '@/module/ModulePlaceable';
import type { ModuleArea } from '@/module/ModuleArea';
import type { LightManager } from '@/managers/LightManager';
import type { OdysseyModel3D } from '@/three/odyssey/OdysseyModel3D';
import { OdysseyLightmapBaker, type IOdysseyLightmapBakeOptions } from '@/managers/OdysseyLightmapBaker';
import { ModulePlaceableAnimState } from '@/enums/module/ModulePlaceableAnimState';

interface IPlaceableIdleState {
  idleAccum: number;
  poseFrozen: boolean;
  /** True after activity/classify bake until an idle pose-freeze completes. */
  tracking: boolean;
}

/**
 * Placeable-facing facade over {@link OdysseyLightmapBaker}.
 * Prefer OdysseyLightmapBaker for doors, rooms props, or arbitrary geometry.
 */
export class PlaceableLightmapBaker {
  /** Seconds of rest before freezing hinged/animated meshes into the lightmap. */
  static readonly IDLE_REBAKE_SECONDS = 0.5;

  private static idleStates = new Map<ModulePlaceable, IPlaceableIdleState>();

  static setLightManagerProvider(provider: () => LightManager | undefined): void {
    OdysseyLightmapBaker.setLightManagerProvider(provider);
  }

  static isBaked(plc: ModulePlaceable): boolean {
    return OdysseyLightmapBaker.isBaked(plc?.model as OdysseyModel3D);
  }

  static isPoseFrozen(plc: ModulePlaceable): boolean {
    return !!this.idleStates.get(plc)?.poseFrozen;
  }

  /**
   * Mark motion / open-close activity. Resets the idle clock and unfreezes
   * a prior pose-freeze bake so lids return to GetNearestLights.
   */
  static noteActivity(plc: ModulePlaceable): void {
    if(!plc || plc.destroyed){ return; }
    const state = this.ensureIdleState(plc);
    state.idleAccum = 0;
    state.tracking = true;
    if(state.poseFrozen){
      state.poseFrozen = false;
      this.invalidate(plc);
    }
  }

  /**
   * Accumulate idle time for resting placeables; freeze pose once after delay.
   * Call once per frame before flushDirty.
   */
  static tickIdle(delta: number, lightManager?: LightManager): void {
    if(!(delta > 0) || this.idleStates.size === 0){ return; }

    for(const [plc, state] of this.idleStates){
      if(!plc || plc.destroyed){
        this.idleStates.delete(plc);
        continue;
      }
      if(!(plc.model as OdysseyModel3D)?.materials){ continue; }
      if(state.poseFrozen || !state.tracking){ continue; }
      if(this.isTransitioning(plc)){
        state.idleAccum = 0;
        continue;
      }

      state.idleAccum += delta;
      if(state.idleAccum < this.IDLE_REBAKE_SECONDS){ continue; }

      this.bakePlaceable(plc, lightManager, { includeAnimatedTransforms: true });
      state.poseFrozen = true;
      state.idleAccum = 0;
      state.tracking = false;
    }
  }

  static invalidate(plc: ModulePlaceable): void {
    if(!plc || !(plc.model as OdysseyModel3D)?.materials){ return; }
    const state = this.ensureIdleState(plc);
    state.idleAccum = 0;
    state.tracking = true;
    state.poseFrozen = false;
    OdysseyLightmapBaker.invalidate({
      model: plc.model as OdysseyModel3D,
      root: plc.container,
      destroyed: plc.destroyed,
    });
  }

  static invalidateArea(area: ModuleArea): void {
    if(!area?.placeables){ return; }
    for(let i = 0; i < area.placeables.length; i++){
      this.invalidate(area.placeables[i]);
    }
  }

  static bakeArea(area: ModuleArea, lightManager?: LightManager): void {
    if(!area?.placeables){ return; }
    for(let i = 0; i < area.placeables.length; i++){
      this.bakePlaceable(area.placeables[i], lightManager);
    }
  }

  static flushDirty(lightManager?: LightManager): void {
    OdysseyLightmapBaker.flushDirty(lightManager);
  }

  static dispose(plc: ModulePlaceable): void {
    this.idleStates.delete(plc);
    OdysseyLightmapBaker.dispose(plc?.model as OdysseyModel3D);
  }

  static bakePlaceable(
    plc: ModulePlaceable,
    lightManager?: LightManager,
    options: Pick<IOdysseyLightmapBakeOptions, 'includeAnimatedTransforms'> = {}
  ): void {
    const model = plc?.model as OdysseyModel3D | undefined;
    if(!model?.materials){ return; }
    const freezePose = !!options.includeAnimatedTransforms;
    OdysseyLightmapBaker.bakeModel(model, lightManager, {
      root: plc.container,
      classifyAnimated: true,
      includeAnimatedTransforms: freezePose,
    });
    const state = this.ensureIdleState(plc);
    if(freezePose){
      state.poseFrozen = true;
      state.idleAccum = 0;
      state.tracking = false;
    }else{
      state.poseFrozen = false;
      state.idleAccum = 0;
      state.tracking = true;
    }
  }

  private static ensureIdleState(plc: ModulePlaceable): IPlaceableIdleState {
    let state = this.idleStates.get(plc);
    if(!state){
      state = { idleAccum: 0, poseFrozen: false, tracking: false };
      this.idleStates.set(plc, state);
    }
    return state;
  }

  private static isTransitioning(plc: ModulePlaceable): boolean {
    const anim = plc.animStateInfo?.currentAnimState ?? plc.animState;
    return anim === ModulePlaceableAnimState.OPEN_CLOSE
      || anim === ModulePlaceableAnimState.CLOSE_OPEN;
  }

  static applyLightmap = OdysseyLightmapBaker.applyLightmap.bind(OdysseyLightmapBaker);
  static classifyDynamicMeshes = OdysseyLightmapBaker.classifyDynamicMeshes.bind(OdysseyLightmapBaker);
  static computeChartPad = OdysseyLightmapBaker.computeChartPad.bind(OdysseyLightmapBaker);
  static bakeModel = OdysseyLightmapBaker.bakeModel.bind(OdysseyLightmapBaker);
  static bakeMesh = OdysseyLightmapBaker.bakeMesh.bind(OdysseyLightmapBaker);
  static bakeGeometry = OdysseyLightmapBaker.bakeGeometry.bind(OdysseyLightmapBaker);
}
