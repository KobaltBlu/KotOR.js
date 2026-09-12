import { maxCleaveRange } from "@/combat/attack-range";
import {
  explainNearestEnemyMiss,
  getNearestEnemy,
} from "@/combat/nearest-enemy";
import { duelLog, duelWho } from "@/combat/duel-debug";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";

import { isObject } from "@/module/guards/isObject";

/**
 * QueueAttackActions.
 *
 * end combat round passes forceNearest only when the combat-round sticky
 * (NewAttackTarget / field 0xb20) died this end-round. Otherwise:
 * - non-empty schedule → keep queued actions (do not retarget)
 * - empty schedule + valid sticky → re-queue the same sticky target
 * - empty schedule + invalid sticky → GetNearestEnemy (MaxCleaveRange)
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file queue-attack-actions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export type QueueAttackActionsOptions = {
  /** Sticky target died during end-round cleanup (force nearest-enemy retarget). */
  forceNearest?: boolean;
};

function isDeadOrMissing(target: ModuleObject | undefined): boolean {
  if(!target){
    return true;
  }
  if(typeof (target as ModuleCreature).isDead === 'function'){
    return !!(target as ModuleCreature).isDead();
  }
  return false;
}

/**
 * Sticky validation for the non-spell QueueAttackActions path
 * (alive + hostile). Spell-round MaxCleaveRange gate is unused here.
 */
export function isValidCreateNewAttackSticky(
  creature: ModuleCreature,
  target: ModuleObject | undefined
): boolean {
  if(!creature || !target || target === creature){
    return false;
  }
  if(isDeadOrMissing(target)){
    return false;
  }
  if(typeof creature.isHostile === 'function'){
    return !!creature.isHostile(target);
  }
  if(typeof creature.getReputation === 'function'){
    return creature.getReputation(target) < 11;
  }
  return true;
}

function clearCombatModeNoEnemy(creature: ModuleCreature, maxRange: number): void {
  const round = creature.combatRound;
  duelLog(creature, 'create-new-attack:none', {
    maxRange,
    ...explainNearestEnemyMiss(creature, maxRange),
  });
  creature.clearCombatMode();
  if(round?.specialAttackList){
    round.specialAttackList.length = 0;
  }
  if(creature.animationState.index == ModuleCreatureAnimState.READY){
    creature.setAnimationState(ModuleCreatureAnimState.PAUSE);
  }
}

function applyNearestTarget(creature: ModuleCreature, next: ModuleObject): void {
  const round = creature.combatRound;
  creature.combatData.lastAttackTarget = next;
  creature.combatData.lastAttemptedAttackTarget = next;
  if(round){
    round.newAttackTarget = next;
    round.setAttackTarget(next);
  }
  // QueueAttackActions → SetLastTarget (client UI focus)
  if(
    creature === GameState.getCurrentPlayer?.() &&
    GameState.ModuleObjectManager?.showObject
  ){
    GameState.ModuleObjectManager.showObject(next, true, false);
  }
}

export function queueAttackActions(
  creature: ModuleCreature,
  options?: QueueAttackActionsOptions
): boolean {
  if(!creature || creature.isDead()){
    return false;
  }

  const round = creature.combatRound;
  if(!round){
    return false;
  }

  const forceNearest = !!options?.forceNearest;
  const scheduleEmpty = !round.scheduledActionList.length;
  const sticky = round.newAttackTarget;
  const stickyValid = isValidCreateNewAttackSticky(creature, sticky);

  // : (sticky INVALID || schedule non-empty) → only force nearest when
  // sticky INVALID && schedule empty. Valid sticky + empty → requeue sticky.
  // Non-empty schedule + !forceNearest → keep queue unchanged.
  let useNearest = forceNearest;
  let requeueSticky = false;

  if(!stickyValid){
    if(scheduleEmpty){
      useNearest = true;
    }
  }else if(scheduleEmpty){
    requeueSticky = true;
  }

  if(forceNearest){
    useNearest = true;
    requeueSticky = false;
  }

  if(!useNearest && !requeueSticky){
    duelLog(creature, 'create-new-attack:keep-queue', {
      sticky: duelWho(sticky),
      queued: round.scheduledActionList.length,
    });
    return false;
  }

  const maxRange = maxCleaveRange(creature);
  let next: ModuleObject | undefined = requeueSticky ? sticky : undefined;

  if(useNearest){
    next = getNearestEnemy(creature, maxRange);
    if(!next){
      clearCombatModeNoEnemy(creature, maxRange);
      return false;
    }
    duelLog(creature, 'create-new-attack:nearest', {
      target: duelWho(next),
      maxRange,
      forceNearest,
    });
    applyNearestTarget(creature, next);
  }else{
    duelLog(creature, 'create-new-attack:sticky', {
      target: duelWho(next),
      maxRange,
    });
  }

  if(
    !next ||
    !isObject(next)
  ){
    clearCombatModeNoEnemy(creature, maxRange);
    return false;
  }

  creature.attackCreature(next);

  // AddAttackAction / QueueAttackActions: clear lastAttacker when
  // it equals the (re)queued target so hits cannot keep pulling focus.
  if(creature.combatData.lastAttacker === next){
    creature.combatData.lastAttacker = undefined;
  }
  return true;
}
