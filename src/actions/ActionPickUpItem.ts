import { Action } from "@/actions/Action";
import { ActionParameterType, ActionStatus, ActionType } from "@/enums";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { queueMoveIntoUseRange } from "@/actions/use-range";

import { isCreature } from "@/module/guards/isCreature";
import { isItem } from "@/module/guards/isItem";

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
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as ModuleCreature;
    const oItem = this.getParameter<ModuleItem>(0);

    if(!isItem(oItem)){
      return ActionStatus.FAILED;
    }

    if(queueMoveIntoUseRange(owner, oItem, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    owner.force = 0;
    owner.speed = 0;
    owner.setFacingObject(oItem);

    oItem.placedInWorld = false;
    if(oItem.area){
      oItem.area.detachObject(oItem);
    }else if(GameState.module?.area){
      const idx = GameState.module.area.items.indexOf(oItem);
      if(idx >= 0){
        GameState.module.area.items.splice(idx, 1);
      }
    }

    if(oItem.model){
      oItem.model.removeFromParent();
    }

    if(GameState.PartyManager.party.indexOf(owner) >= 0){
      GameState.InventoryManager.addItem(oItem);
    }else{
      owner.addItem(oItem);
    }

    return ActionStatus.COMPLETE;
  }

}
