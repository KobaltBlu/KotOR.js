import { CombatActionType } from "@/enums/combat/CombatActionType";

/**
 * Drop ATTACK / ATTACK_USE_FEAT sched entries whose target is dead or missing.
 * Lets EndCombatRound reach CreateNewAttackActions instead of replaying corpses.
 *
 * @file prune-dead-attack-actions.ts
 */

export type PrunableCombatAction = {
  actionType: CombatActionType | number;
  target?: { isDead?: () => boolean } | null;
};

export function filterLiveAttackActions<T extends PrunableCombatAction>(
  list: T[]
): T[] {
  return list.filter((action) => {
    if(
      action.actionType !== CombatActionType.ATTACK &&
      action.actionType !== CombatActionType.ATTACK_USE_FEAT
    ){
      return true;
    }
    const t = action.target;
    if(!t) return false;
    if(typeof t.isDead === 'function' && t.isDead()) return false;
    return true;
  });
}
