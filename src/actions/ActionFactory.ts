import type { Action } from "@/actions/Action";
import { ActionCastSpell } from "@/actions/ActionCastSpell";
import { ActionCloseDoor } from "@/actions/ActionCloseDoor";
import { ActionCombat } from "@/actions/ActionCombat";
import { ActionDialogObject } from "@/actions/ActionDialogObject";
import { ActionDisarmMine } from "@/actions/ActionDisarmMine";
import { ActionDoCommand } from "@/actions/ActionDoCommand";
import { ActionDropItem } from "@/actions/ActionDropItem";
import { ActionEquipItem } from "@/actions/ActionEquipItem";
import { ActionExamineMine } from "@/actions/ActionExamineMine";
import { ActionFlagMine } from "@/actions/ActionFlagMine";
import { ActionFollowLeader } from "@/actions/ActionFollowLeader";
import { ActionForceFollowObject } from "@/actions/ActionForceFollowObject";
import { ActionGiveItem } from "@/actions/ActionGiveItem";
import { ActionItemCastSpell } from "@/actions/ActionItemCastSpell";
import { ActionJumpToObject } from "@/actions/ActionJumpToObject";
import { ActionJumpToPoint } from "@/actions/ActionJumpToPoint";
import { ActionLockObject } from "@/actions/ActionLockObject";
import { ActionMoveToPoint } from "@/actions/ActionMoveToPoint";
import { ActionOpenDoor } from "@/actions/ActionOpenDoor";
import { ActionPauseDialog } from "@/actions/ActionPauseDialog";
import { ActionPhysicalAttacks } from "@/actions/ActionPhysicalAttacks";
import { ActionPickUpItem } from "@/actions/ActionPickUpItem";
import { ActionPlayAnimation } from "@/actions/ActionPlayAnimation";
import { ActionRandomWalk } from "@/actions/ActionRandomWalk";
import { ActionRecoverMine } from "@/actions/ActionRecoverMine";
import { ActionResumeDialog } from "@/actions/ActionResumeDialog";
import { ActionSetCommandable } from "@/actions/ActionSetCommandable";
import { ActionSetMine } from "@/actions/ActionSetMine";
import { ActionSpeak } from "@/actions/ActionSpeak";
import { ActionSpeakStrRef } from "@/actions/ActionSpeakStrRef";
import { ActionTakeItem } from "@/actions/ActionTakeItem";
import { ActionUnequipItem } from "@/actions/ActionUnequipItem";
import { ActionUnlockObject } from "@/actions/ActionUnlockObject";
import { ActionUseObject } from "@/actions/ActionUseObject";
import { ActionWait } from "@/actions/ActionWait";
import { ActionType } from "@/enums/actions/ActionType";
import { GFFStruct } from "@/resource/GFFStruct";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

/**
 * ActionFactory – static-only registry of action constructors.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionFactory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const ActionFactory = {
  ActionCombat,
  ActionCastSpell,
  ActionCloseDoor,
  ActionDialogObject,
  ActionDoCommand,
  ActionDropItem,
  ActionEquipItem,
  ActionFollowLeader,
  ActionGiveItem,
  ActionItemCastSpell,
  ActionJumpToObject,
  ActionJumpToPoint,
  ActionLockObject,
  ActionMoveToPoint,
  ActionOpenDoor,
  ActionPauseDialog,
  ActionPhysicalAttacks,
  ActionPickUpItem,
  ActionPlayAnimation,
  ActionResumeDialog,
  ActionSetCommandable,
  ActionTakeItem,
  ActionUnlockObject,
  ActionUnequipItem,
  ActionUseObject,
  ActionWait,
  ActionRandomWalk,
  ActionForceFollowObject,
  ActionSpeakStrRef,
  ActionSetMine,
  ActionRecoverMine,
  ActionDisarmMine,
  ActionExamineMine,
  ActionFlagMine,
  ActionSpeak,

  FromStruct(struct: GFFStruct): Action {
    let action: Action | undefined;
    const actionId: number = struct.getNumberByLabel('ActionId');
    const groupId: number = struct.getNumberByLabel('GroupActionId');
    const paramCount: number = struct.getNumberByLabel('NumParams');

    const paramStructs: GFFStruct[] = (struct.hasField('Paramaters')) ?
      (struct.getFieldByLabel('Paramaters')?.getChildStructs() ?? []) : [];

    switch(actionId){
      case ActionType.ActionCombat:
        action = new ActionCombat(actionId, groupId);
      break;
      case ActionType.ActionCastSpell:
        action = new ActionCastSpell(actionId, groupId);
      break;
      case ActionType.ActionCloseDoor:
        action = new ActionCloseDoor(actionId, groupId);
      break;
      case ActionType.ActionDialogObject:
        action = new ActionDialogObject(actionId, groupId);
      break;
      case ActionType.ActionDoCommand:
        action = new ActionDoCommand(actionId, groupId);
      break;
      case ActionType.ActionDropItem:
        action = new ActionDropItem(actionId, groupId);
      break;
      case ActionType.ActionEquipItem:
        action = new ActionEquipItem(actionId, groupId);
      break;
      case ActionType.ActionFollowLeader:
        action = new ActionFollowLeader(actionId, groupId);
      break;
      case ActionType.ActionGiveItem:
        action = new ActionGiveItem(actionId, groupId);
      break;
      case ActionType.ActionItemCastSpell:
        action = new ActionItemCastSpell(actionId, groupId);
      break;
      case ActionType.ActionJumpToObject:
        action = new ActionJumpToObject(actionId, groupId);
      break;
      case ActionType.ActionJumpToPoint:
        action = new ActionJumpToPoint(actionId, groupId);
      break;
      case ActionType.ActionLockObject:
        action = new ActionLockObject(actionId, groupId);
      break;
      case ActionType.ActionMoveToPoint:
        action = new ActionMoveToPoint(actionId, groupId);
      break;
      case ActionType.ActionOpenDoor:
        action = new ActionOpenDoor(actionId, groupId);
      break;
      case ActionType.ActionPauseDialog:
        action = new ActionPauseDialog(actionId, groupId);
      break;
      case ActionType.ActionPlayAnimation:
        action = new ActionPlayAnimation(actionId, groupId);
      break;
      case ActionType.ActionPhysicalAttacks:
        action = new ActionPhysicalAttacks(actionId, groupId);
      break;
      case ActionType.ActionSpeak:
        action = new ActionSpeak(actionId, groupId);
      break;
      case ActionType.ActionResumeDialog:
        action = new ActionResumeDialog(actionId, groupId);
      break;
      case ActionType.ActionSetCommandable:
        action = new ActionSetCommandable(actionId, groupId);
      break;
      case ActionType.ActionTakeItem:
        action = new ActionTakeItem(actionId, groupId);
      break;
      case ActionType.ActionUnlockObject:
        action = new ActionUnlockObject(actionId, groupId);
      break;
      case ActionType.ActionUseObject:
        action = new ActionUseObject(actionId, groupId);
      break;
      case ActionType.ActionWait:
        action = new ActionWait(actionId, groupId);
      break;
      case ActionType.ActionSetMine:
        action = new ActionSetMine(actionId, groupId);
      break;
      case ActionType.ActionFlagMine:
        action = new ActionFlagMine(actionId, groupId);
      break;
      case ActionType.ActionRecoverMine:
        action = new ActionRecoverMine(actionId, groupId);
      break;
      case ActionType.ActionDisarmMine:
        action = new ActionDisarmMine(actionId, groupId);
      break;
      case ActionType.ActionExamineMine:
        action = new ActionExamineMine(actionId, groupId);
      break;
      default:
        log.debug('ActionList Unhandled Action', '0x' + (actionId.toString(16).toUpperCase()), paramCount);
        for (let i = 0; i < paramCount; i++) {
          const paramStruct = paramStructs[i];
          if (!paramStruct) continue;
          const type = paramStruct.getFieldByLabel('Type')?.getNumber() ?? 0;
          const valueField = paramStruct.getFieldByLabel('Value');
          if (type === 1) {
            log.debug('INT', valueField?.getNumber());
          } else if (type === 2) {
            log.debug('FLOAT', valueField?.getNumber());
          } else if (type === 3) {
            log.debug('DWORD', valueField?.getNumber());
          } else if (type === 4) {
            log.debug('STRING', valueField?.getString());
          } else if (type === 5) {
            log.debug('SCRIPT', valueField);
          }
        }
        break;
    }

    if (action) {
      action.setParameters(paramStructs, paramCount);
    }

    return action as Action;
  },
};
