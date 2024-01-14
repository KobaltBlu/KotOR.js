import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleItem } from "../module/ModuleItem";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";
import { ActionQueue } from "./ActionQueue";

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

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionUnequipItem;

    //PARAMS
    // 0 - Item (DWORD)
    // 1 - (?) (DWORD)
    // 2 - bInstant (INT)
  }

  update(delta?: number): ActionStatus {

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }
    const item = this.getParameter(0) as ModuleItem;
    const obj = this.owner as ModuleCreature;

    if(obj.equipment.HEAD == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.HEAD);
    }

    if(obj.equipment.ARMS == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.ARMS);
    }

    if(obj.equipment.IMPLANT == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.IMPLANT);
    }

    if(obj.equipment.LEFTARMBAND == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.LEFTARMBAND);
    }

    if(obj.equipment.RIGHTARMBAND == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.RIGHTARMBAND);
    }

    if(obj.equipment.LEFTHAND == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    }

    if(obj.equipment.BELT == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.BELT);
    }

    if(obj.equipment.RIGHTHAND == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);
    }

    if(obj.equipment.CLAW1 == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.CLAW1);
    }

    if(obj.equipment.CLAW2 == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.CLAW2);
    }

    if(obj.equipment.CLAW3 == item){
      obj.unequipSlot(ModuleCreatureArmorSlot.CLAW3);
    }
    
    return ActionStatus.COMPLETE;
  }

}