import type { ModulePlaceable } from '@/module/ModulePlaceable';
import type { ModuleArea } from '@/module/ModuleArea';
import type { LightManager } from '@/managers/LightManager';
import type { OdysseyModel3D } from '@/three/odyssey/OdysseyModel3D';
import { OdysseyLightmapBaker } from '@/managers/OdysseyLightmapBaker';

/**
 * Placeable-facing facade over {@link OdysseyLightmapBaker}.
 * Prefer OdysseyLightmapBaker for doors, rooms props, or arbitrary geometry.
 */
export class PlaceableLightmapBaker {
  static setLightManagerProvider(provider: () => LightManager | undefined): void {
    OdysseyLightmapBaker.setLightManagerProvider(provider);
  }

  static isBaked(plc: ModulePlaceable): boolean {
    return OdysseyLightmapBaker.isBaked(plc?.model as OdysseyModel3D);
  }

  static invalidate(plc: ModulePlaceable): void {
    if(!plc || !(plc.model as OdysseyModel3D)?.materials){ return; }
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
    OdysseyLightmapBaker.dispose(plc?.model as OdysseyModel3D);
  }

  static bakePlaceable(plc: ModulePlaceable, lightManager?: LightManager): void {
    const model = plc?.model as OdysseyModel3D | undefined;
    if(!model?.materials){ return; }
    OdysseyLightmapBaker.bakeModel(model, lightManager, {
      root: plc.container,
      classifyAnimated: true,
    });
  }

  static applyLightmap = OdysseyLightmapBaker.applyLightmap.bind(OdysseyLightmapBaker);
  static classifyDynamicMeshes = OdysseyLightmapBaker.classifyDynamicMeshes.bind(OdysseyLightmapBaker);
  static computeChartPad = OdysseyLightmapBaker.computeChartPad.bind(OdysseyLightmapBaker);
  static bakeModel = OdysseyLightmapBaker.bakeModel.bind(OdysseyLightmapBaker);
  static bakeMesh = OdysseyLightmapBaker.bakeMesh.bind(OdysseyLightmapBaker);
  static bakeGeometry = OdysseyLightmapBaker.bakeGeometry.bind(OdysseyLightmapBaker);
}
