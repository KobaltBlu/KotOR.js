import { Action } from "@/actions/Action";
import { ActionParameterType, ActionStatus, ActionType } from "@/enums";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
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
    // 0 - dword: oItem (item object id)
    // 1 - dword: oTargetAreaOrInventory (target container/area id, or 0x7f000000 for ground)
    // 2 - int: bDisplayStatus (status feedback broadcast flag)
  }

  update(delta?: number): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const oItem = this.getParameter<ModuleItem>(0);

    if(!isItem(oItem)){
      return ActionStatus.FAILED;
    }

    if(queueMoveIntoUseRange(this.owner, oItem, this.groupId)){
      return ActionStatus.IN_PROGRESS;
    }

    this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
    this.owner.force = 0;
    this.owner.speed = 0;
    this.owner.setFacingObject(oItem);

    oItem.placedInWorld = false;
    oItem.area?.detachObject(oItem);

    if(oItem.model){
      oItem.model.removeFromParent();
    }

    if(GameState.PartyManager.party.indexOf(this.owner) >= 0){
      GameState.InventoryManager.addItem(oItem);
    }else{
      this.owner.addItem(oItem);
    }

    return ActionStatus.COMPLETE;
  }

}
