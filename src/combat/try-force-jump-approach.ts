/**
 * ResolveMoveToForceJump — combat approach gate for Force Jump leap.
 *
 * @file try-force-jump-approach.ts
 */

import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { GameState } from "@/GameState";
import {
  getPathPersonalSpace,
} from "@/combat/attack-range";
import {
  hasWalkLineClear,
  WalkLineHitCode,
} from "@/engine/pathfinding/walk-line-clear";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { isCreature } from "@/module/guards/isCreature";

/** Minimum distance² gate (≥ 10 units). */
export const FORCE_JUMP_MIN_DIST_SQ = 100.0;

export type TryForceJumpApproachOut = {
  /** In/out feat id (must be 0 to attempt; set to 101/102/103 on success). */
  featId: number;
};

/**
 * When approaching a creature with Force Jump + lightsaber past 10 units and
 * clear walk-line clear / hasWalkLineClear, apply EffectForceJump and stamp the highest Force Jump
 * feat id. Returns true to skip normal MoveTo approach.
 */
export function tryForceJumpApproach(
  attacker: ModuleCreature,
  target: ModuleObject,
  out: TryForceJumpApproachOut
): boolean {
  if(!isCreature(attacker) || !isCreature(target)){
    return false;
  }
  if((out.featId | 0) !== 0){
    return false;
  }
  if(!attacker.getHasFeat?.(CombatFeatType.FORCE_JUMP)){
    return false;
  }
  const round = attacker.combatRound;
  if(!round?.isLightsaberEquipped?.(attacker)){
    return false;
  }

  const dx = attacker.position.x - target.position.x;
  const dy = attacker.position.y - target.position.y;
  const dz = (attacker.position.z || 0) - (target.position.z || 0);
  if(dx * dx + dy * dy + dz * dz < FORCE_JUMP_MIN_DIST_SQ){
    return false;
  }

  const area = attacker.area;
  if(!area){
    return false;
  }

  if(attacker.pathFindIgnoreObjectId !== undefined){
    attacker.pathFindIgnoreObjectId = target.id;
  }

  const perspace = getPathPersonalSpace(attacker);
  const hit = hasWalkLineClear(area, attacker.position, target.position, {
    owner: attacker,
    personalSpace: perspace,
    checkCreatures: false,
    ignoreCreatureIds: target.id != null ? [target.id] : [],
  });
  if(!hit.ok && hit.code !== WalkLineHitCode.Ok){
    return false;
  }

  const effect = new GameState.GameEffectFactory.EffectForceJump();
  effect.setCreator(attacker);
  effect.setObject(0, target);
  effect.setInt(0, 0);
  effect.initialize();
  attacker.addEffect(effect);

  if(attacker.getHasFeat?.(CombatFeatType.FORCE_JUMP_MASTERY)){
    out.featId = CombatFeatType.FORCE_JUMP_MASTERY;
  }else if(attacker.getHasFeat?.(CombatFeatType.FORCE_JUMP_ADVANCED)){
    out.featId = CombatFeatType.FORCE_JUMP_ADVANCED;
  }else{
    out.featId = CombatFeatType.FORCE_JUMP;
  }
  return true;
}
