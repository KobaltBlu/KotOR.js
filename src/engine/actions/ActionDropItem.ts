import { Action } from "@engine/actions/Action";
import { ActionStatus, ActionType } from "@core/enums";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import { GameState } from "@engine/runtime/GameState";
import type { Item } from "@engine/module/Item";

import { isCreature } from "@engine/module/guards/isCreature";
import { isItem } from "@engine/module/guards/isItem";

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
    // 0 - dword: oItem (item object id)
    // 1 - float: vDropLocation.x (target drop location x)
    // 2 - float: vDropLocation.y (target drop location y)
    // 3 - float: vDropLocation.z (target drop location z)
    // 4 - int: bDropGold (1 = gold drop, 0 = regular item)
  }

  update(delta?: number): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const oItem = this.getParameter<Item>(0);

    if(!isItem(oItem)){
      return ActionStatus.FAILED;
    }

    this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    this.owner.force = 0;
    this.owner.speed = 0;

    let dropped: Item;
    if(GameState.PartyManager.party.indexOf(this.owner) >= 0){
      dropped = GameState.InventoryManager.removeItem(oItem, 1) as Item;
    }else{
      dropped = this.owner.removeItem(oItem, 1);
    }

    if(!dropped){
      return ActionStatus.FAILED;
    }

    dropped.placedInWorld = true;
    dropped.position.copy(this.owner.position);
    dropped.position.x += Math.cos(this.owner.getFacing()) * 0.5;
    dropped.position.y += Math.sin(this.owner.getFacing()) * 0.5;
    dropped.load();
    dropped.loadModel().then( (model: any) => {
      if(!model){ return; }
      model.userData.gameObject = dropped;
      model.name = dropped.getTag();
      GameState.group.placeables.add(model);
      const area = this.owner.area;
      if(area){
        area.attachObject(dropped);
        dropped.getCurrentRoom();
      }
    });

    return ActionStatus.COMPLETE;
  }

}
