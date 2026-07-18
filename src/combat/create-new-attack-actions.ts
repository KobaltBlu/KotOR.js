import { maxCleaveRange } from "@/combat/attack-range";
import { getNearestEnemy } from "@/combat/nearest-enemy";
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
    // Retail: SetLockOrientationToObject(INVALID), SetCombatMode(0), ClearAllSpecialAttacks
    creature.clearCombatMode();
    creature.setCombatState(false);
    if(round.specialAttackList){
      round.specialAttackList.length = 0;
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
