import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { Action } from "@engine/actions/Action";

/**
 * ActionSetCommandable class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionSetCommandable.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionSetCommandable extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionSetCommandable;

    //PARAMS
    // 0 - int: bCommandable (1 = commandable, 0 = non-commandable)
    
  }

  update(delta: number = 0): ActionStatus {
    if(this.owner){
      this.owner.setCommandable( this.getParameter<number>(0) ? true : false );
      return ActionStatus.COMPLETE;
    }
    return ActionStatus.FAILED;
  }

}
