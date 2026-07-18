import { ModuleObjectType } from "@/enums";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import { isInUseRange, queueMoveIntoUseRange } from "@/actions/use-range";

/**
 * ActionUseObject class.
 *
 * Retail AIActionUseObject uses GetIsInUseRange / GetUseRange before use.
 *
 * @file ActionUseObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionUseObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionUseObject;
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleObject)){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    if(queueMoveIntoUseRange(owner, this.target, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    if(!isInUseRange(owner, this.target)){
      return ActionStatus.FAILED;
    }

    owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    owner.force = 0;
    owner.speed = 0;
    owner.setFacingObject(this.target);

    if(this.target != GameState.PartyManager.Player){
      this.target.use(owner);
    }

    return ActionStatus.COMPLETE;
  }

}
