import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";

/**
 * ARE WindPower (0–2) or Forge `previewDanglyWindPower` when set.
 * Single source for dangly meshes, grass, and emitters.
 */
export function resolveDanglyWindPower(context: any): number {
  if (!context) {
    return GameState.windManager?.windLevel ?? 0;
  }
  const preview = context.previewDanglyWindPower;
  if (typeof preview === "number" && !Number.isNaN(preview)) {
    return Math.max(0, preview);
  }
  if (GameState.windManager) {
    return GameState.windManager.windLevel;
  }
  const areaWind = context.module?.area?.windPower;
  if (areaWind != null && typeof areaWind === "number" && !Number.isNaN(areaWind)) {
    return Math.max(0, areaWind);
  }
  return 0;
}

/**
 * World-space wind direction for area wind. Must stay in sync with WindManager.applyWindLevel.
 */
export const ODYSSEY_AREA_WIND_DIRECTION = new THREE.Vector3(1, 1, 0);
