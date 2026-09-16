/**
 * Jump destination resolution — JumpToPoint / JumpToObject
 * (AddToArea when dest area ≠ current; same-area SetPosition).
 *
 * KotOR.js modules are typically one area; when dest area belongs to another
 * module filename, LoadModule + pending spawn coords (door/trigger pattern).
 */

import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";

export type JumpDestinationKind = 'same' | 'reattach' | 'loadModule' | 'fail';

export interface JumpDestination {
  kind: JumpDestinationKind;
  /** Target area when kind is same/reattach (or resolved before load). */
  area?: ModuleArea;
  /** Module resref when kind is loadModule. */
  moduleName?: string;
}

export interface JumpSpawnCoords {
  x: number;
  y: number;
  z: number;
  /** Orientation vector X/Y (EngineLocation rotation). */
  ox: number;
  oy: number;
}

/**
 * Classify jump dest vs owner area.
 * @param ownerArea current creature area (may be undefined in limbo)
 * @param destArea resolved ModuleArea for action param 3 / location.area
 * @param currentModuleFilename GameState.module.filename
 */
export function classifyJumpDestination(
  ownerArea: ModuleArea | undefined | null,
  destArea: ModuleArea | undefined | null,
  currentModuleFilename: string = ''
): JumpDestination {
  if(!destArea){
    return { kind: 'same', area: ownerArea || undefined };
  }

  const destMod = (destArea.module?.filename || '').toLowerCase();
  const curMod = (currentModuleFilename || '').toLowerCase();

  if(destMod && curMod && destMod !== curMod){
    return { kind: 'loadModule', area: destArea, moduleName: destArea.module.filename };
  }

  if(!ownerArea || destArea === ownerArea || destArea.id === ownerArea.id){
    return { kind: 'same', area: destArea };
  }

  // Different area object, same (or unknown) module — AddToArea.
  return { kind: 'reattach', area: destArea };
}

/**
 * Resolve area id / object from jump param 3.
 * Returns undefined if OBJECT_INVALID / missing / not an area.
 */
export function isAreaLike(obj: any): obj is ModuleArea {
  if(!obj) return false;
  // ModuleArea has attachObject + creatures list; avoid importing enums here for tests.
  return typeof obj.attachObject === 'function' && Array.isArray(obj.creatures);
}

export function jumpFacingFromOrientation(ox: number, oy: number): number {
  return -Math.atan2(ox || 0, oy || 0);
}
