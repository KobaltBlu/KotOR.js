import { ModuleObjectType } from "@/enums";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { ModuleDoor } from "@/module/ModuleDoor";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";

/**
 * ActionCloseDoor class.
 *
 * close-door action uses GetIsInUseRange / GetUseRange.
 *
 * @file ActionCloseDoor.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionCloseDoor extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionCloseDoor;
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor))
      return ActionStatus.FAILED;

    if(!(this.target as ModuleDoor).isOpen())
      return ActionStatus.FAILED;

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      const owner = this.owner as ModuleCreature;
      if(queueMoveIntoUseRange(owner, this.target, this.groupId)){
        return ActionStatus.IN_PROGRESS;
      }

      owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      owner.force = 0;
      owner.speed = 0;
      owner.setFacingObject(this.target);
      (this.target as ModuleDoor).closeDoor(owner);
      return ActionStatus.COMPLETE;
    }

    (this.target as ModuleDoor).closeDoor(this.owner);
    return ActionStatus.COMPLETE;
  }

}
