import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { Action } from "@/actions/Action";
import { isCreature } from "@/module/guards/isCreature";

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
    // 0 - Item (DWORD)
    // 1 - (?) (DWORD)
    // 2 - bInstant (INT)
  }

  update(delta?: number): ActionStatus {

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const item = this.getParameter<ModuleItem>(0);
    const obj = this.owner as ModuleCreature;

    if(obj.equipment.HEAD == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.HEAD);
    }else if(obj.equipment.ARMS == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.ARMS);
    }else if(obj.equipment.IMPLANT == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.IMPLANT);
    }else if(obj.equipment.LEFTARMBAND == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.LEFTARMBAND);
    }else if(obj.equipment.RIGHTARMBAND == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.RIGHTARMBAND);
    }else if(obj.equipment.LEFTHAND == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    }else if(obj.equipment.BELT == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.BELT);
    }else if(obj.equipment.RIGHTHAND == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    }else if(obj.equipment.RIGHTHAND2 == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND2);
    }else if(obj.equipment.LEFTHAND2 == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND2);
    }else if(obj.equipment.CLAW1 == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.CLAW1);
    }else if(obj.equipment.CLAW2 == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.CLAW2);
    }else if(obj.equipment.CLAW3 == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.CLAW3);
    }else{
      return ActionStatus.FAILED;
    }
    
    return ActionStatus.COMPLETE;
  }

}