import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { Action } from "@/actions/Action";
import {
  acquireItem,
  isCreditsItem,
  isPartyCreature,
  releaseItemFromOwner,
  UPDATE_STATUS_ITEM_GIVEN,
} from "@/actions/item-transfer";
import { getUseRange, isInUseRange, queueMoveIntoUseRange } from "@/actions/use-range";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";

/**
 * ActionGiveItem — retail CSWSObject::AIActionGiveItem @ 0057b6a0.
 *
 * Params:
 *  0 - dword: oItem
 *  1 - dword: oGiveTo
 *  2 - int: nCount (-1 = whole stack)
 *  3 - int: bDisplayStatus (party GUI UpdateStatus 7)
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
  }

  update(_delta: number = 0): ActionStatus {
    const oItem = this.getParameter<ModuleItem>(0);
    const oGiveTo = this.getParameter<ModuleObject>(1);
    const nCountRaw = this.getParameter<number>(2);
    const nCount = typeof nCountRaw === "number" ? nCountRaw | 0 : -1;
    const bDisplayStatus = (this.getParameter<number>(3) | 0) !== 0;

    if (!BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      return ActionStatus.ERROR;
    }
    if (!BitWise.InstanceOfObject(oGiveTo, ModuleObjectType.ModuleObject)) {
      return ActionStatus.ERROR;
    }

    // Creature giver out of use-range → front-queue Move (run if dist² > 25).
    if (BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) {
      const owner = this.owner as ModuleCreature;
      if (!isInUseRange(owner, oGiveTo)) {
        // Retail: run if squared dist to use-point > 25
        const use = getUseRange(owner, oGiveTo, false);
        const dx = owner.position.x - use.point.x;
        const dy = owner.position.y - use.point.y;
        const dz = (owner.position.z ?? 0) - (use.point.z ?? 0);
        const run = (dx * dx + dy * dy + dz * dz) > 25.0;
        const face = new GameState.ActionFactory.ActionChangeFacingPoint(undefined, this.groupId);
        face.setParameter(0, ActionParameterType.FLOAT, oGiveTo.position.x);
        face.setParameter(1, ActionParameterType.FLOAT, oGiveTo.position.y);
        owner.actionQueue.addFront(face);
        queueMoveIntoUseRange(owner, oGiveTo, this.groupId, { run });
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
    });

    return ok ? ActionStatus.COMPLETE : ActionStatus.ERROR;
  }

}
