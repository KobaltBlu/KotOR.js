import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { ModuleCreatureArmorSlot } from "@core/enums/module/ModuleCreatureArmorSlot";
import type { Item } from "@engine/module/Item";
import { Action } from "@engine/actions/Action";
import { isCreature } from "@engine/module/guards/isCreature";

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

  constructor(actionId: number = -1,  groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionUnequipItem;

    //PARAMS
    // 0 - dword: oItem (item object id)
    // 1 - dword: oTargetAreaOrInventory (destination container or 0x7f000000 for ground)
    // 2 - int: bInstant / bForce (1 = instant unequip, 0 = standard)
  }

  update(delta?: number): ActionStatus {

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const item = this.getParameter<Item>(0);

    if(this.owner.equipment.HEAD == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.HEAD);
    }else if(this.owner.equipment.ARMS == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.ARMS);
    }else if(this.owner.equipment.IMPLANT == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.IMPLANT);
    }else if(this.owner.equipment.LEFTARMBAND == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.LEFTARMBAND);
    }else if(this.owner.equipment.RIGHTARMBAND == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.RIGHTARMBAND);
    }else if(this.owner.equipment.LEFTHAND == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    }else if(this.owner.equipment.BELT == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.BELT);
    }else if(this.owner.equipment.RIGHTHAND == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    }else if(this.owner.equipment.RIGHTHAND2 == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    }else if(this.owner.equipment.LEFTHAND2 == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND2);
    }else if(this.owner.equipment.CLAW1 == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.CLAW1);
    }else if(this.owner.equipment.CLAW2 == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.CLAW2);
    }else if(this.owner.equipment.CLAW3 == item){
      this.owner.unequipSlot(ModuleCreatureArmorSlot.CLAW3);
    }else{
      return ActionStatus.FAILED;
    }
    
    return ActionStatus.COMPLETE;
  }

}