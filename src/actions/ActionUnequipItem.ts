import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";
import { ActionQueue } from "./ActionQueue";

/**
 * ActionUnequipItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionUnequipItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionUnequipItem extends Action {

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionUnequipItem;

    //PARAMS
    // 0 - Item (DWORD)
    // 1 - (?) (DWORD)
    // 2 - bInstant (INT)
  }

  update(delta: number = 0){
    return ActionStatus.COMPLETE;
  }

}