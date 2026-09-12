import { Action } from "@/actions/Action";
import { ActionStatus, ActionType } from "@/enums";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleItem } from "@/module/ModuleItem";

import { isCreature } from "@/module/guards/isCreature";
import { isItem } from "@/module/guards/isItem";

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
    // 0 - dword: oItem
  }

  update(delta?: number): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const oItem = this.getParameter<ModuleItem>(0);

    if(!isItem(oItem)){
      return ActionStatus.FAILED;
    }

    this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    this.owner.force = 0;
    this.owner.speed = 0;

    let dropped: ModuleItem;
    if(GameState.PartyManager.party.indexOf(this.owner) >= 0){
      dropped = GameState.InventoryManager.removeItem(oItem, 1) as ModuleItem;
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
      model.userData.moduleObject = dropped;
      model.name = dropped.getTag();
      GameState.group.placeables.add(model);
      if(GameState.module?.area){
        GameState.module.area.items.push(dropped);
        dropped.area = GameState.module.area;
        dropped.getCurrentRoom();
      }
    });

    return ActionStatus.COMPLETE;
  }

}
