import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { Action } from "@/actions/Action";
import {
  acquireItem,
  isPartyCreature,
  releaseItemFromOwner,
  showGiveTakeStatus,
  UPDATE_STATUS_ITEM_TAKEN,
} from "@/actions/item-transfer";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";

import { isCreature } from "@/module/guards/isCreature";
import { isItem } from "@/module/guards/isItem";
import { isPlaceable } from "@/module/guards/isPlaceable";
import { isStore } from "@/module/guards/isStore";

/**
 * ActionTakeItem — take-item action.
 *
 * Params:
 * 0 - dword: oItem
 * 1 - dword: oTakeFrom
 * 2 - int: bDisplayStatus (UpdateStatus 8 when source is PC)
 *
 * No range / pathfind. Actor must be creature or placeable.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionTakeItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionTakeItem extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionTakeItem;
  }

  update(_delta?: number): ActionStatus {
    if (
      !isCreature(this.owner) &&
      !isPlaceable(this.owner)
    ) {
      return ActionStatus.ERROR;
    }

    const oItem = this.getParameter<ModuleItem>(0);
    const oTakeFrom = this.getParameter<ModuleObject>(1);
    const bDisplayStatus = (this.getParameter<number>(2) | 0) !== 0;

    if (!isItem(oItem)) {
      return ActionStatus.ERROR;
    }
    if (
      !isCreature(oTakeFrom) &&
      !isPlaceable(oTakeFrom) &&
      !isStore(oTakeFrom)
    ) {
      return ActionStatus.ERROR;
    }

    const sourceWasParty = isPartyCreature(oTakeFrom);
    const transfer = releaseItemFromOwner(oTakeFrom, oItem, -1);
    if (!transfer) {
      return ActionStatus.ERROR;
    }

    const ok = acquireItem(this.owner, transfer, {
      addAsItem: true,
      displayStatus: false,
      from: oTakeFrom,
    });

    if (ok && bDisplayStatus && sourceWasParty) {
      showGiveTakeStatus(UPDATE_STATUS_ITEM_TAKEN);
    }

    return ok ? ActionStatus.COMPLETE : ActionStatus.ERROR;
  }

}
