import { Action } from "@engine/actions/Action";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { isCreature } from "@engine/module/guards/isCreature";
import { isObject } from "@engine/module/guards/isObject";
import type { ModuleObject } from "@engine/module/ModuleObject";

/**
 * ActionChangeFacingObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionChangeFacingObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionChangeFacingObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionChangeFacingObject;

    //PARAMS
    // 0 - dword: oTarget (target object id to face)
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    if(!isObject(this.target)){
      return ActionStatus.FAILED;
    }

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    this.owner.setFacingObject(this.target);
    return ActionStatus.COMPLETE;
  }

}
