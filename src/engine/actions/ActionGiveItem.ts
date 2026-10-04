import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { Action } from "@engine/actions/Action";
import {
  acquireItem,
  isCreditsItem,
  isPartyCreature,
  releaseItemFromOwner,
  UPDATE_STATUS_ITEM_GIVEN,
} from "@engine/actions/item-transfer";
import { getUseRange, isInUseRange, queueMoveIntoUseRange } from "@engine/actions/use-range";
import { GameState } from "@engine/runtime/GameState";
import type { ModuleItem } from "@engine/module/ModuleItem";
import type { ModuleObject } from "@engine/module/ModuleObject";

import { isCreature } from "@engine/module/guards/isCreature";
import { isItem } from "@engine/module/guards/isItem";
import { isObject } from "@engine/module/guards/isObject";

/**
 * ActionGiveItem — give-item action.
 *
 * Params:
 * 0 - dword: oItem (item object id)
 * 1 - dword: oGiveTo (recipient object id)
 * 2 - int: nStackSize (quantity to give; -1 = entire stack)
 * 3 - int: bDisplayStatus (1 = display party GUI feedback status)
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionGiveItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionGiveItem extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionGiveItem;

    //PARAMS
    // 0 - dword: oItem (item object id)
    // 1 - dword: oGiveTo (recipient object id)
    // 2 - int: nStackSize (quantity to give; -1 = entire stack)
    // 3 - int: bDisplayStatus (1 = display party GUI feedback status)
  }

  update(_delta: number = 0): ActionStatus {
    const oItem = this.getParameter<ModuleItem>(0);
    const oGiveTo = this.getParameter<ModuleObject>(1);
    const nCountRaw = this.getParameter<number>(2);
    const nCount = typeof nCountRaw === "number" ? nCountRaw | 0 : -1;
    const bDisplayStatus = (this.getParameter<number>(3) | 0) !== 0;

    if (!isItem(oItem)) {
      return ActionStatus.ERROR;
    }
    if (!isObject(oGiveTo)) {
      return ActionStatus.ERROR;
    }

    // Creature giver out of use-range → front-queue Move (run if dist² > 25).
    if (isCreature(this.owner)) {
      if (!isInUseRange(this.owner, oGiveTo)) {
        // : run if squared dist to use-point > 25
        const use = getUseRange(this.owner, oGiveTo, false);
        const dx = this.owner.position.x - use.point.x;
        const dy = this.owner.position.y - use.point.y;
        const dz = (this.owner.position.z ?? 0) - (use.point.z ?? 0);
        const run = (dx * dx + dy * dy + dz * dz) > 25.0;
        const face = new GameState.ActionFactory.ActionChangeFacingPoint(undefined, this.groupId);
        face.setParameter(0, ActionParameterType.FLOAT, oGiveTo.position.x);
        face.setParameter(1, ActionParameterType.FLOAT, oGiveTo.position.y);
        this.owner.actionQueue.addFront(face);
        queueMoveIntoUseRange(this.owner, oGiveTo, this.groupId, { run });
        return ActionStatus.IN_PROGRESS;
      }
    }

    const transfer = nCount > 0 ? releaseItemFromOwner(this.owner, oItem, nCount) : releaseItemFromOwner(this.owner, oItem, -1);
    if (!transfer) {
      return ActionStatus.ERROR;
    }

    const addAsItem = !isCreditsItem(oItem);
    const ok = acquireItem(oGiveTo, transfer, {
      addAsItem,
      displayStatus: bDisplayStatus && isPartyCreature(oGiveTo),
      statusId: UPDATE_STATUS_ITEM_GIVEN,
      from: this.owner,
    });

    return ok ? ActionStatus.COMPLETE : ActionStatus.ERROR;
  }

}
