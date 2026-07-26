import { maxCleaveRange } from "@/combat/attack-range";
import { getNearestEnemy } from "@/combat/nearest-enemy";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * Retail CSWSCreature::CreateNewAttackActions @ 005b6980
 * (EndCombatRound path: param_1=1 → always GetNearestEnemy within MaxCleaveRange).
 *
 * Prefer/queue one ATTACK on the nearest SEEN hostile. On failure, clear combat mode.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file create-new-attack-actions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export function createNewAttackActions(creature: ModuleCreature): boolean {
  if(!creature || creature.isDead()){
    return false;
  }

  const round = creature.combatRound;
  if(!round){
    return false;
  }

  const maxRange = maxCleaveRange(creature);
  const next = getNearestEnemy(creature, maxRange);
  if(!next){
    // Retail @ 005b6980 no-enemy: SetLockOrientationToObject(INVALID), idle anim 10000,
    // SetCombatMode(0), ClearAllSpecialAttacks. Does NOT SetCombatState(0) — the 8s
    // combat timer keeps running (updateCombatStateTimer owns that exit).
    creature.clearCombatMode();
    if(round.specialAttackList){
      round.specialAttackList.length = 0;
    }
    if(creature.animationState.index == ModuleCreatureAnimState.READY){
      creature.setAnimationState(ModuleCreatureAnimState.PAUSE);
    }
    return false;
  }

  creature.combatData.lastAttackTarget = next;
  creature.combatData.lastAttemptedAttackTarget = next;
  round.newAttackTarget = next;
  round.setAttackTarget(next);
  creature.attackCreature(next);
  return true;
}
