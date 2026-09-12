import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleObject } from "@/module/ModuleObject";

import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";

/**
 * ActionStanceTotalDefense class.
 * TSL total-defense stance action — hold defensive stance ~1500ms.
 * RunActions case 0x44. ActivityManager(4) clears minor activities.
 *
 * PARAMS
 * 0 - dword: oTarget (target combatant object id)
 *
 * @file ActionStanceTotalDefense.ts
 */
export class ActionStanceTotalDefense extends Action {
  private elapsed = 0;
  private started = false;
  /** SubtractWorldTimes threshold 0x5dc ms. */
  private static readonly HOLD_SEC = 1.5;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionStanceTotalDefense;

    //PARAMS
    // 0 - dword: oTarget (target combatant object id)
  }

  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.ERROR;
    }

    if(this.owner.isDead?.() || this.owner.isDebilitated?.()){
      this.owner.clearCombatMode?.();
      return ActionStatus.ERROR;
    }

    this.target = this.getParameter<ModuleObject>(0);
    if(!isObject(this.target)){
      this.owner.clearCombatMode?.();
      return ActionStatus.ERROR;
    }

    if(!this.started){
      this.started = true;
      this.elapsed = 0;
      this.owner.setAnimationState?.(ModuleCreatureAnimState.READY);
      this.owner.combatData?.setAttemptedAttackTargetIfInvalid?.(this.target);
      this.owner.setFacingObject?.(this.target);
      if(typeof this.owner.broadcastCombatStateToParty === 'function'){
        this.owner.broadcastCombatStateToParty();
      }
    }

    this.elapsed += delta;
    if(this.elapsed < ActionStanceTotalDefense.HOLD_SEC){
      return ActionStatus.IN_PROGRESS;
    }

    return ActionStatus.COMPLETE;
  }

}
