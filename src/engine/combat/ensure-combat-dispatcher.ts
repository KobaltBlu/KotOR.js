import { ActionType } from "@core/enums/actions/ActionType";
import { GameState } from "@engine/runtime/GameState";
import type { ModuleCreature } from "@engine/module/ModuleCreature";

/**
 * Ensure ActionCombat is on the action queue while the combat-round schedule
 * still has pending work. Mid-combat load already restores this; runtime
 * can lose the dispatcher after WAITING-splice / ClearAllActions(1) while
 * keep-queue leaves the schedule intact.
 *
 * @returns true if a dispatcher was added
 */
export function ensureCombatDispatcher(creature: ModuleCreature): boolean {
  if(!creature?.combatRound || !creature.actionQueue){
    return false;
  }
  if(!creature.combatRound.scheduledActionList?.length){
    return false;
  }
  if(creature.actionQueue.actionTypeExists(ActionType.ActionCombat)){
    return false;
  }
  const ActionCombat = GameState.ActionFactory?.ActionCombat;
  if(!ActionCombat){
    return false;
  }
  creature.actionQueue.add(new ActionCombat(0xFFFF));
  return true;
}
