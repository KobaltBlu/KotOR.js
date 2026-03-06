import { GameState } from "../GameState";
import { Action } from "./Action";
import { ActionType } from "../enums/actions/ActionType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleItem } from "../module/ModuleItem";

/**
 * ActionDropItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionDropItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionDropItem extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionDropItem;

    //PARAMS
    // 0 - dword: oItem (the item to drop)
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

    const owner = this.owner as ModuleCreature;

    // Remove from inventory (party member or creature)
    if(GameState.PartyManager.party.indexOf(owner as any) >= 0){
      GameState.InventoryManager.removeItem(item);
    } else {
      const idx = owner.inventory.indexOf(item);
      if(idx >= 0) owner.inventory.splice(idx, 1);
    }

    // Place item at the owner's current position on the ground
    item.placedInWorld = true;
    item.position.copy(owner.position);
    item.area = GameState.module?.area;
    item.loadModel().then(() => {
      if(item.model){
        item.model.userData.moduleObject = item;
        item.model.name = item.getTag();
        GameState.group.placeables.add(item.model);
      }
      if(GameState.module?.area){
        GameState.module.area.items.push(item);
        item.getCurrentRoom();
      }
    }).catch((e: unknown) => {
      console.error('ActionDropItem: failed to load item model', e);
      // Even without a model, track the item in the area for persistence
      if(GameState.module?.area && !GameState.module.area.items.includes(item)){
        GameState.module.area.items.push(item);
      }
    });

    return ActionStatus.COMPLETE;
  }

}
