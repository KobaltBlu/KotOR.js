import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";

/**
 * Retail DesiredAttackRange
 * MaxAttackRange.
 *
 * Melee engage does NOT use PrefAttackDist / appearance PREFATCKDIST —
 * those are loaded but unused on the K1 physical-attack path.
 * Engaged (choreographed melee weapons) uses creperspace; otherwise hitradius.
 */

function asCreature(obj: ModuleObject | undefined): ModuleCreature | undefined {
  if(!obj || !BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)){
    return undefined;
  }
  return obj as ModuleCreature;
}

/** appearance.hitradius — DesiredAttackRange (unengaged creature targets). */
export function getHitRadius(obj: ModuleObject | undefined): number {
  const creature = asCreature(obj);
  if(creature){
    return creature.getAppearance()?.hitradius ?? 0.25;
  }
  return 0.25;
}

/** appearance.creperspace — creature-creature use / engaged attack spacing. */
export function getCreaturePersonalSpace(obj: ModuleObject | undefined): number {
  const creature = asCreature(obj);
  if(creature){
    return creature.getAppearance()?.creperspace ?? 0.4;
  }
  return 0.4;
}

/** appearance.perspace — pathfind personal_space (walkmesh / step tolerance). */
export function getPathPersonalSpace(obj: ModuleObject | undefined): number {
  const creature = asCreature(obj);
  if(creature){
    return creature.getAppearance()?.perspace ?? 0.35;
  }
  return 0.35;
}

/**
 * Retail DesiredAttackRange(targetId, engaged).
 * @param engaged ResolveChoreographedState (melee weapon pair), not ResolveEngagedState
 */
export function desiredAttackRange(
  attacker: ModuleCreature,
  target: ModuleObject,
  engaged: boolean = false
): number {
  const targetCreature = asCreature(target);
  if(targetCreature){
    if(engaged){
      return getCreaturePersonalSpace(attacker) + getCreaturePersonalSpace(targetCreature) + 0.7;
    }
    return getHitRadius(attacker) + getHitRadius(targetCreature) + 1.6;
  }

  // Door / placeable / other: retail falls through GetUseRange.
  // Importing use-range here would be circular; caller may prefer getUseRange.
  // Minimal fallback matches Default branch (~1.5) when GetUseRange fails.
  if(
    BitWise.InstanceOfObject(target, ModuleObjectType.ModuleDoor) ||
    BitWise.InstanceOfObject(target, ModuleObjectType.ModulePlaceable)
  ){
    return getPathPersonalSpace(attacker) + 0.75;
  }

  return 1.5;
}

/**
 * Retail MaxAttackRange(targetId, engaged, findNearestEnemyOverride).
 * Melee: Desired + 0.5. Ranged: baseitems.MaxAttackRange, else 30 (or 20 when override).
 */
export function maxAttackRange(
  attacker: ModuleCreature,
  target: ModuleObject,
  engaged: boolean = false,
  findNearestEnemyOverride: boolean = false
): number {
  const weapon = attacker.equipment?.RIGHTHAND;
  const ranged = !!weapon?.isRangedWeapon?.();

  if(!weapon || !ranged){
    return desiredAttackRange(attacker, target, engaged) + 0.5;
  }

  if(findNearestEnemyOverride){
    return 20.0;
  }

  const max = weapon.getBaseItem?.()?.maxAttackRange ?? 0;
  // Retail: use MaxAttackRange when non-zero; else 30
  if(typeof max === 'number' && max > 0){
    return max;
  }
  return 30.0;
}

/** Move-to arrive range while closing for a physical attack (ranged → max, melee → desired). */
export function getAttackMoveArriveRange(
  attacker: ModuleCreature,
  target: ModuleObject,
  engaged: boolean = false
): number {
  if(attacker.isRangedEquipped?.()){
    return maxAttackRange(attacker, target, engaged);
  }
  return desiredAttackRange(attacker, target, engaged);
}

/**
 * Retail MaxCleaveRange = MaxAttackRange(..., findNearestEnemyOverride) + 2.
 * Used by CreateNewAttackActions / GetNearestEnemy search radius.
 */
export function maxCleaveRange(
  attacker: ModuleCreature,
  referenceTarget?: ModuleObject,
  engaged: boolean = false
): number {
  const target = referenceTarget ?? attacker;
  return maxAttackRange(attacker, target, engaged, true) + 2.0;
}

/**
 * Retail ClearLineOfSight from physical-attack action / GetIsInUseRange:
 * eye height +1.5, no perception clamp; maxDistance typically MaxAttackRange.
 */
export function hasCombatLineOfSight(
  attacker: ModuleCreature,
  target: ModuleObject,
  maxDistance?: number
): boolean {
  if(!attacker || !target){
    return false;
  }
  const max = typeof maxDistance === 'number'
    ? maxDistance
    : maxAttackRange(attacker, target, !!(attacker as any).combatRound?.engaged);
  return attacker.hasLineOfSight(target, max, {
    ignorePerceptionRange: true,
    eyeHeight: 1.5,
    ignoreObject: target,
  });
}
