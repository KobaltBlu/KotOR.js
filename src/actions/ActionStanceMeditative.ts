import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BitWise } from "@/utility/BitWise";

/**
 * ActionStanceMeditative class.
 * TSL meditative-stance action — brief meditative ambient toggle.
 * RunActions case 0x45. ActivityManager(2) clears combat-mode activity bits.
 *
 * @file ActionStanceMeditative.ts
 */
export class ActionStanceMeditative extends Action {
  private phase: 'enter' | 'hold' = 'enter';
  private holdTimer = 0;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionStanceMeditative;
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.ERROR;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead?.() || owner.isDebilitated?.()){
      return ActionStatus.ERROR;
    }

    if(this.phase === 'enter'){
      // ActivityManager(2) → SetActivity(0x3f00, 0) clear combat modes
      owner.clearCombatMode?.();
      owner.setAnimationState?.(ModuleCreatureAnimState.PAUSE);
      this.phase = 'hold';
      this.holdTimer = 0;
      return ActionStatus.IN_PROGRESS;
    }

    // waits a couple of frames (frame counter < 2) then COMPLETE
    this.holdTimer += delta;
    if(this.holdTimer < 0.05){
      return ActionStatus.IN_PROGRESS;
    }

    return ActionStatus.COMPLETE;
  }

}
