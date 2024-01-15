import { ActionStatus, ActionType, ModuleObjectType } from "../enums";
import type { ModuleCreature } from "../module/ModuleCreature";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";

/**
 * ActionPickUpItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionPickUpItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionPickUpItem extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionPickUpItem;

    //PARAMS
  }

  update(delta?: number): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as ModuleCreature;

    return ActionStatus.COMPLETE;
  }

}