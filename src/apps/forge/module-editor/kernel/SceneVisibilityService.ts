/**
 * Scene helper / layer visibility for the module viewport.
 *
 * @file SceneVisibilityService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import {
  ForgeModuleHelperVisibility,
  forgeModuleSettings,
  MODULE_HELPER_TYPES,
  ModuleHelperType,
} from "@/apps/forge/settings/forgeEditorsSettings";

export type SceneLayerId =
  | ModuleHelperType
  | "rooms"
  | "cameras"
  | "paths"
  | "walkmesh"
  | "grid"
  | "entry";

export class SceneVisibilityService extends EventListenerModel {
  private helpers: ForgeModuleHelperVisibility;
  private layers: Record<string, boolean> = {
    rooms: true,
    cameras: true,
    paths: true,
    walkmesh: false,
    grid: true,
    entry: true,
  };
  private soloType: ModuleHelperType | null = null;

  constructor() {
    super();
    this.helpers = { ...forgeModuleSettings.get().helpers };
  }

  loadFromSettings(): void {
    this.helpers = { ...forgeModuleSettings.get().helpers };
    this.processEventListener("onVisibilityChanged", [this.snapshot()]);
  }

  snapshot(): { helpers: ForgeModuleHelperVisibility; layers: Record<string, boolean>; soloType: ModuleHelperType | null } {
    return {
      helpers: { ...this.helpers },
      layers: { ...this.layers },
      soloType: this.soloType,
    };
  }

  isHelperVisible(type: ModuleHelperType): boolean {
    if (this.soloType) {
      return this.soloType === type;
    }
    return !!this.helpers[type];
  }

  setHelperVisible(type: ModuleHelperType, visible: boolean): void {
    this.helpers = { ...this.helpers, [type]: visible };
    this.processEventListener("onVisibilityChanged", [this.snapshot()]);
  }

  setAllHelpers(visible: boolean): void {
    const next = { ...this.helpers };
    for (const key of MODULE_HELPER_TYPES) {
      next[key] = visible;
    }
    this.helpers = next;
    this.soloType = null;
    this.processEventListener("onVisibilityChanged", [this.snapshot()]);
  }

  setSolo(type: ModuleHelperType | null): void {
    this.soloType = type;
    this.processEventListener("onVisibilityChanged", [this.snapshot()]);
  }

  isLayerVisible(layer: SceneLayerId): boolean {
    if (MODULE_HELPER_TYPES.indexOf(layer as ModuleHelperType) >= 0) {
      return this.isHelperVisible(layer as ModuleHelperType);
    }
    return this.layers[layer] !== false;
  }

  setLayerVisible(layer: SceneLayerId, visible: boolean): void {
    if (MODULE_HELPER_TYPES.indexOf(layer as ModuleHelperType) >= 0) {
      this.setHelperVisible(layer as ModuleHelperType, visible);
      return;
    }
    this.layers[layer] = visible;
    this.processEventListener("onVisibilityChanged", [this.snapshot()]);
  }
}
