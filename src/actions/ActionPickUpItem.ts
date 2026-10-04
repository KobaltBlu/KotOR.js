import { GameState } from "@/GameState";
import { ActionStatus, ActionType, ModuleObjectType } from "@/enums";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";

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
    super(actionId, groupId);
    this.type = ActionType.ActionPickUpItem;

    //PARAMS
    // 0 - dword: oItem
  }

  update(delta?: number): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as ModuleCreature;
    const item = this.getParameter<ModuleItem>(0);

    if(!BitWise.InstanceOfObject(item, ModuleObjectType.ModuleItem)){
      return ActionStatus.FAILED;
    }

    if(!item.area){
      return ActionStatus.FAILED;
    }

    if(item.model){
      item.model.removeFromParent();
    }

    item.placedInWorld = false;
    item.setPossessor(owner);
    item.area.detachObject(item);

    if(owner.isPartyMember()){
      GameState.InventoryManager.addItem(item);
    }else{
      owner.addItem(item);
    }

    return ActionStatus.COMPLETE;
  }

}
