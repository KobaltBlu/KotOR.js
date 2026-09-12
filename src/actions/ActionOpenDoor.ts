import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleObject } from "@/module/ModuleObject";
import { Action } from "@/actions/Action";
import { queueMoveIntoUseRange } from "@/actions/use-range";

import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";

/**
 * ActionOpenDoor class.
 *
 * open-door action uses GetIsInUseRange / GetUseRange.
 *
 * @file ActionOpenDoor.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionOpenDoor extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionOpenDoor;
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);

    if(!isDoor(this.target)){
      return ActionStatus.FAILED;
    }

    const door = this.target as ModuleDoor;
    if(door.isOpen()){
      return ActionStatus.FAILED;
    }

    if(isCreature(this.owner)){
      const owner = this.owner as ModuleCreature;
      if(queueMoveIntoUseRange(owner, this.target, this.groupId)){
        return ActionStatus.IN_PROGRESS;
      }

      owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      owner.force = 0;
      owner.speed = 0;
      owner.setFacingObject(this.target);
      door.use(owner);
      return ActionStatus.COMPLETE;
    }

    // AssignCommand(oDoor, ActionOpenDoor(oDoor)) — open directly (parity with ActionCloseDoor)
    door.openDoor(this.owner);
    return ActionStatus.COMPLETE;
  }

}
