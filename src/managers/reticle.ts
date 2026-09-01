import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import type { ModuleDoor } from "@/module/ModuleDoor";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { GameState } from "@/GameState";

/**
 * Retail reticle sizing / style helpers.
 * UpdateStickyTarget
 * UpdateIndicator
 *
 * @file reticle.ts
 */

/** Retail clear / scale floor distance (√900). */
export const RETICLE_MAX_DISTANCE = 30;
export const RETICLE_MAX_DISTANCE_SQ = 900;

/** World sprite scale that maps to retail base size 0x40 (64px). */
export const RETICLE_BASE_WORLD_SCALE = 0.5;

export type ReticleKind = 'creature' | 'object';

export type ReticleStyle = {
  /** CursorManager material key */
  material: 'reticleF' | 'reticleH' | 'reticleF2' | 'reticleH2' | 'reticleCombat';
  /** Friendly vs hostile (arrow / nameplate) */
  hostile: boolean;
};

/**
 * Retail pixel size from distance².
 * Creatures shrink with ×48 toward min 16; doors/placeables/triggers ×32 toward min 32.
 */
export function getReticlePixelSize(distSq: number, kind: ReticleKind): number {
  const base = 0x40;
  if(distSq >= RETICLE_MAX_DISTANCE_SQ){
    return kind === 'creature' ? 0x10 : 0x20;
  }
  if(distSq > 25){
    const shrink = kind === 'creature' ? 48 : 32;
    return Math.max(
      kind === 'creature' ? 0x10 : 0x20,
      base - Math.floor((Math.sqrt(distSq) - 5) * 0.04 * shrink)
    );
  }
  return base;
}

export function pixelSizeToWorldScale(pixelSize: number): number {
  // Relative to prior fixed world scale 0.5 at retail base 64px.
  // Perspective sizeAttenuation still applies; this matches retail's distance curve on top.
  return (pixelSize / 0x40) * RETICLE_BASE_WORLD_SCALE;
}

export function getReticleKind(object: ModuleObject | undefined): ReticleKind {
  if(BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)){
    return 'creature';
  }
  return 'object';
}

/**
 * True when retail client combat_mode would be set (party has live attack/spell target).
 * Approximates UpdateCombatMode.
 */
export function isClientCombatMode(): boolean {
  const party = GameState.PartyManager?.party;
  if(!party?.length){
    const pc = GameState.getCurrentPlayer();
    return !!(pc?.combatData?.combatState || (pc?.excitedDuration ?? 0) > 0);
  }
  for(let i = 0; i < party.length; i++){
    const member = party[i];
    if(!member || member.isDead?.()) continue;
    if(member.combatData?.combatState || (member.excitedDuration ?? 0) > 0){
      return true;
    }
  }
  return false;
}

/**
 * Hostile for reticle fill.
 * Creatures: live hostile only (dead → friendly loot).
 * Placeables: locked + useable + non-plot (retail dual-flag bash path).
 * Doors: locked and closed (retail door dual-flag path).
 */
export function isReticleHostile(object: ModuleObject | undefined, observer?: ModuleObject): boolean {
  if(!object) return false;
  const viewer = observer ?? GameState.getCurrentPlayer();
  if(!viewer) return false;

  if(BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)){
    const cre = object as ModuleCreature;
    if(cre.isDead()) return false;
    return cre.isHostile(viewer);
  }

  if(BitWise.InstanceOfObject(object, ModuleObjectType.ModulePlaceable)){
    const plc = object as ModulePlaceable;
    if(!plc.isUseable()) return false;
    if(plc.plot || plc.isBodyBag || plc.isCorpse) return false;
    // Unlocked chests stay friendly; locked bashable containers are hostile
    return !!plc.locked;
  }

  if(BitWise.InstanceOfObject(object, ModuleObjectType.ModuleDoor)){
    const door = object as ModuleDoor;
    if(!door.isUseable()) return false;
    if(door.plot) return false;
    // Retail: both door interaction flags → hostile while locked/closed
    return door.isLocked() && !door.isOpen();
  }

  if(BitWise.InstanceOfObject(object, ModuleObjectType.ModuleTrigger)){
    return !!object.isHostile?.(viewer);
  }

  return false;
}

/** Hover reticle (UpdateStickyTarget): friendlyreticle / hostilereticle */
export function getHoverReticleStyle(object: ModuleObject | undefined): ReticleStyle {
  const hostile = isReticleHostile(object);
  return {
    hostile,
    material: hostile ? 'reticleH' : 'reticleF',
  };
}

/**
 * Selected reticle (UpdateIndicator): friendlyreticle2 / hostilereticle2 / combatreticle.
 */
export function getSelectedReticleStyle(object: ModuleObject | undefined): ReticleStyle {
  const hostile = isReticleHostile(object);
  if(!hostile){
    return { hostile: false, material: 'reticleF2' };
  }
  if(
    BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature) &&
    isClientCombatMode()
  ){
    return { hostile: true, material: 'reticleCombat' };
  }
  return { hostile: true, material: 'reticleH2' };
}

/**
 * Retail combat-reticle size pulse.
 * Timer -1 → start 0.5s swell; while &gt; 0 add up to +64px; then settle.
 */
export class CombatReticlePulse {
  /** -1 = armed to swell, 0 = idle, &gt;0 = pulsing */
  timer: number = 0;

  /** Call when selected target or combat-mode style becomes combatreticle. */
  arm(){
    if(this.timer === 0){
      this.timer = -1;
    }
  }

  reset(){
    this.timer = 0;
  }

  /**
   * @returns extra pixel size to add this frame
   */
  update(delta: number, usingCombatReticle: boolean): number {
    if(!usingCombatReticle){
      this.timer = 0;
      return 0;
    }
    if(this.timer <= 0){
      if(this.timer !== -1){
        return 0;
      }
      this.timer = 0.5;
      return 0x40;
    }
    this.timer -= delta;
    if(this.timer <= 0){
      this.timer = 0;
      return 0;
    }
    // (1 - 2*(0.5 - t)) * 64 == 128 * t
    return Math.floor(this.timer * 128);
  }
}
