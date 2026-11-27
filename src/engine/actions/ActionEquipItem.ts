import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { ModuleCreatureArmorSlot } from "@core/enums/module/ModuleCreatureArmorSlot";
import type { Item } from "@engine/module/Item";
import { Action } from "@engine/actions/Action";

import { isCreature } from "@engine/module/guards/isCreature";
import { isItem } from "@engine/module/guards/isItem";
import { canCreatureEquipItem } from "@engine/menu/action-menu-usable";

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
    // 0 - dword: oItem (item object id)
    // 1 - int: nInventorySlot (ModuleCreatureArmorSlot inventory slot bitmask / index)
    // 2 - int: bInstant / bCheckRequirements (1 = instant equip / skip weapon flourish, 0 = play draw animation)
  }

  update(delta?: number): ActionStatus {
    if(
      isItem(this.getParameter<Item>(0)) && 
      isCreature(this.owner)
    ){
      const item = this.getParameter<Item>(0);
      const slot = this.getParameter<ModuleCreatureArmorSlot>(1);
      const instant = !!this.getParameter<number>(2);
      // RunEquip → CanEquipItem: refuse items the creature lacks the
      // proficiency feats or use limits for.
      if(!canCreatureEquipItem(this.owner, item)){
        return ActionStatus.FAILED;
      }
      // Stamp hand slots sync inside equipItem; model load continues async.
      void this.owner.equipItem(slot, item);

      // UpdateVisibleWeapons → PlayDrawAnimation(FLOURISH) when MainHand/OffHand
      // changes and GetLastInstant is false (combat MostDamaging / ActionEquipItem).
      if(
        !instant &&
        (slot === ModuleCreatureArmorSlot.RIGHTHAND || slot === ModuleCreatureArmorSlot.LEFTHAND)
      ){
        this.owner.playDrawAnimation();
      }
    }
    return ActionStatus.COMPLETE;
  }

}
