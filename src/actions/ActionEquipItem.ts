import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleItem } from "../module/ModuleItem";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";

/**
 * ActionEquipItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionEquipItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionEquipItem extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionEquipItem;
  }

  update(delta?: number): ActionStatus {
    if(
      BitWise.InstanceOfObject(this.getParameter(0), ModuleObjectType.ModuleItem) && 
      BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)
    ){
      const item = this.getParameter(0) as ModuleItem;
      const slot = this.getParameter(1) as ModuleCreatureArmorSlot;
      const obj = this.owner as ModuleCreature;
      obj.equipItem(slot, item);
    }
    return ActionStatus.COMPLETE;
  }

}
