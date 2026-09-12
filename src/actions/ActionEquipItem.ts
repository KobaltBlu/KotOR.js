import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { Action } from "@/actions/Action";

import { isCreature } from "@/module/guards/isCreature";
import { isItem } from "@/module/guards/isItem";

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
    super(actionId, groupId);
    this.type = ActionType.ActionEquipItem;

    //PARAMS
    // 0 - Item (DWORD)
    // 1 - InventorySlot (INT / bit-slot)
    // 2 - bInstant (INT)
  }

  update(delta?: number): ActionStatus {
    if(
      isItem(this.getParameter<ModuleItem>(0)) && 
      isCreature(this.owner)
    ){
      const item = this.getParameter<ModuleItem>(0);
      const slot = this.getParameter<ModuleCreatureArmorSlot>(1);
      const instant = !!this.getParameter<number>(2);
      const obj = this.owner as ModuleCreature;
      // Stamp hand slots sync inside equipItem; model load continues async.
      void obj.equipItem(slot, item);

      // UpdateVisibleWeapons → PlayDrawAnimation(FLOURISH) when MainHand/OffHand
      // changes and GetLastInstant is false (combat MostDamaging / ActionEquipItem).
      if(
        !instant &&
        (slot === ModuleCreatureArmorSlot.RIGHTHAND || slot === ModuleCreatureArmorSlot.LEFTHAND)
      ){
        obj.playDrawAnimation();
      }
    }
    return ActionStatus.COMPLETE;
  }

}
