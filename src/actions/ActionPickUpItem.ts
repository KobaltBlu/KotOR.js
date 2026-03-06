import { ActionStatus, ActionType, ModuleObjectType } from "../enums";
import { GameState } from "../GameState";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleItem } from "../module/ModuleItem";
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
    super(actionId, groupId);
    this.type = ActionType.ActionPickUpItem;

    //PARAMS
    // 0 - dword: oItem (the ground item to pick up)
  }

  update(delta?: number): ActionStatus {
    if(!this.owner){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const item = this.getParameter<ModuleItem>(0);
    if(!BitWise.InstanceOfObject(item, ModuleObjectType.ModuleItem)){
      return ActionStatus.FAILED;
    }

    // Remove item model from scene and detach from area
    item.placedInWorld = false;
    if(item.model && item.model.parent){
      item.model.parent.remove(item.model);
    }
    if(item.area){
      item.area.detachObject(item);
    }

    // Add item to the picking-up creature's inventory
    if(GameState.PartyManager.party.indexOf(this.owner as any) >= 0){
      GameState.InventoryManager.addItem(item);
    } else {
      (this.owner as ModuleCreature).addItem(item);
    }

    return ActionStatus.COMPLETE;
  }

}