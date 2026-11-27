import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import type { GameObject } from "@engine/module/GameObject";
import { Action } from "@engine/actions/Action";
import { queueMoveIntoUseRange } from "@engine/actions/use-range";
import { isDoor } from "@engine/module/guards/isDoor";
import { isCreature } from "@engine/module/guards/isCreature";

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

    //PARAMS
    // 0 - dword: oTarget (door object id)
    // 1 - int: bRun (run into use range vs walk, default 0)
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter<GameObject>(0);

    if(!isDoor(this.target))
      return ActionStatus.FAILED;

    if(!this.target.isOpen())
      return ActionStatus.FAILED;

    if(isCreature(this.owner)){
      if(queueMoveIntoUseRange(this.owner, this.target, this.groupId)){
        return ActionStatus.IN_PROGRESS;
      }

      this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      this.owner.force = 0;
      this.owner.speed = 0;
      this.owner.setFacingObject(this.target);
      this.target.closeDoor(this.owner);
      return ActionStatus.COMPLETE;
    }

    this.target.closeDoor(this.owner);
    return ActionStatus.COMPLETE;
  }

}
