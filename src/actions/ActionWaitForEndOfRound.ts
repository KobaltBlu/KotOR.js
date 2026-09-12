import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { isCreature } from "@/module/guards/isCreature";

/**
 * ActionWaitForEndOfRound class.
 *
 * wait-for-end-of-round action —
 * IN_PROGRESS while round_started && !GetSpellActionPending; else COMPLETE.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionWaitForEndOfRound.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionWaitForEndOfRound extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionWaitForEndOfRound;

    //PARAMS
    // none
  }

  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead?.() || owner.plot){
      return ActionStatus.FAILED;
    }

    const combatRound = owner.combatRound;
    if(!combatRound?.roundStarted){
      return ActionStatus.COMPLETE;
    }

    // GetSpellActionPending — casting in progress ends the wait
    if(combatRound.getSpellActionPending()){
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.IN_PROGRESS;
  }

}
