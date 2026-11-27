import { getNearestEnemy } from "@engine/combat/nearest-enemy";
import { maxAttackRange } from "@engine/combat/attack-range";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import type { Action } from "@engine/actions/Action";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * InitializeNewAttackTarget
 * retarget scheduled attacks + PhysicalAttacks action param when stuck-LOS
 * finds a nearer SEEN hostile (MaxAttackRange override).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file initialize-new-attack-target.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export function initializeNewAttackTarget(
  attacker: Creature,
  newTarget: GameObject,
  physicalAttackAction?: Action
): void {
  if(!attacker || !newTarget){
    return;
  }

  const round = attacker.combatRound;
  if(!round){
    return;
  }

  attacker.combatData.lastAttackTarget = newTarget;
  attacker.combatData.lastAttemptedAttackTarget = newTarget;
  round.newAttackTarget = undefined;
  round.setAttackTarget(newTarget);

  if(physicalAttackAction){
    physicalAttackAction.setParameter(1, ActionParameterType.DWORD, newTarget.id);
    physicalAttackAction.target = newTarget;
  }
}

/**
 * stuck-LOS branch in physical-attack action:
 * standing still with blocked LOS → GetNearestEnemy(MaxAttackRange override)
 * excluding current target → InitializeNewAttackTarget or cancel combat.
 *
 * @returns true if caller should return early (retargeted or cancelled)
 */
export function tryStuckLosRetarget(
  attacker: Creature,
  currentTarget: GameObject,
  physicalAttackAction?: Action
): 'retargeted' | 'cancelled' | 'waiting' {
  const round = attacker.combatRound;
  if(!round){
    return 'cancelled';
  }

  const pos = attacker.position;
  const stuck = round.losStuckPosition;
  const sameSpot = !!(
    stuck &&
    Math.abs(stuck.x - pos.x) < 0.05 &&
    Math.abs(stuck.y - pos.y) < 0.05 &&
    Math.abs(stuck.z - pos.z) < 0.05
  );

  if(!sameSpot){
    if(!stuck){
      round.losStuckPosition = pos.clone();
    }else{
      stuck.copy(pos);
    }
    return 'waiting';
  }

  round.losStuckPosition = undefined;

  const range = maxAttackRange(attacker, attacker, false, true);
  const next = getNearestEnemy(attacker, range, { exclude: currentTarget });
  if(
    next &&
    isCreature(next)
  ){
    initializeNewAttackTarget(attacker, next, physicalAttackAction);
    return 'retargeted';
  }

  attacker.cancelCombat();
  return 'cancelled';
}
