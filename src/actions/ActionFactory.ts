import { ActionType } from "../enums/actions/ActionType";
import { GFFStruct } from "../resource/GFFStruct";

import { ActionCombat } from "./ActionCombat"; 
import { ActionCastSpell } from "./ActionCastSpell"; 
import { ActionCloseDoor } from "./ActionCloseDoor"; 
import { ActionDialogObject } from "./ActionDialogObject"; 
import { ActionDoCommand } from "./ActionDoCommand";
import { ActionDropItem } from "./ActionDropItem";
import { ActionEquipItem } from "./ActionEquipItem";
import { ActionFollowLeader } from "./ActionFollowLeader";
import { ActionGiveItem } from "./ActionGiveItem";
import { ActionItemCastSpell } from "./ActionItemCastSpell";
import { ActionJumpToObject } from "./ActionJumpToObject";
import { ActionJumpToPoint } from "./ActionJumpToPoint";
import { ActionLockObject } from "./ActionLockObject";
import { ActionMoveToPoint } from "./ActionMoveToPoint";
import { ActionOpenDoor } from "./ActionOpenDoor";
import { ActionPauseDialog } from "./ActionPauseDialog";
import { ActionPhysicalAttacks } from "./ActionPhysicalAttacks";
import { ActionPlayAnimation } from "./ActionPlayAnimation";
import { ActionResumeDialog } from "./ActionResumeDialog";
import { ActionSetCommandable } from "./ActionSetCommandable";
import { ActionTakeItem } from "./ActionTakeItem";
import { ActionUnlockObject } from "./ActionUnlockObject";
import { ActionUnequipItem } from "./ActionUnequipItem";
import { ActionUseObject } from "./ActionUseObject";
import { ActionWait } from "./ActionWait";
import { ActionRandomWalk } from "./ActionRandomWalk";
import { ActionPickUpItem } from "./ActionPickUpItem";
import { ActionForceFollowObject } from "./ActionForceFollowObject";
import { ActionSpeakStrRef } from "./ActionSpeakStrRef";
import { ActionSetMine } from "./ActionSetMine";
import { ActionFlagMine } from "./ActionFlagMine";
import { ActionRecoverMine } from "./ActionRecoverMine";
import { ActionDisarmMine } from "./ActionDisarmMine";
import { ActionExamineMine } from "./ActionExamineMine";
import { ActionSpeak } from "./ActionSpeak";
import type { Action } from "./Action";

/**
 * ActionFactory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionFactory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionFactory {

  static ActionCombat: typeof ActionCombat = ActionCombat;
  static ActionCastSpell: typeof ActionCastSpell = ActionCastSpell;
  static ActionCloseDoor: typeof ActionCloseDoor = ActionCloseDoor;
  static ActionDialogObject: typeof ActionDialogObject = ActionDialogObject;
  static ActionDoCommand: typeof ActionDoCommand = ActionDoCommand;
  static ActionDropItem: typeof ActionDropItem = ActionDropItem;
  static ActionEquipItem: typeof ActionEquipItem = ActionEquipItem;
  static ActionFollowLeader: typeof ActionFollowLeader = ActionFollowLeader;
  static ActionGiveItem: typeof ActionGiveItem = ActionGiveItem;
  static ActionItemCastSpell: typeof ActionItemCastSpell = ActionItemCastSpell;
  static ActionJumpToObject: typeof ActionJumpToObject = ActionJumpToObject;
  static ActionJumpToPoint: typeof ActionJumpToPoint = ActionJumpToPoint;
  static ActionLockObject: typeof ActionLockObject = ActionLockObject;
  static ActionMoveToPoint: typeof ActionMoveToPoint = ActionMoveToPoint;
  static ActionOpenDoor: typeof ActionOpenDoor = ActionOpenDoor;
  static ActionPauseDialog: typeof ActionPauseDialog = ActionPauseDialog;
  static ActionPhysicalAttacks: typeof ActionPhysicalAttacks = ActionPhysicalAttacks;
  static ActionPickUpItem: typeof ActionPickUpItem = ActionPickUpItem;
  static ActionPlayAnimation: typeof ActionPlayAnimation = ActionPlayAnimation;
  static ActionResumeDialog: typeof ActionResumeDialog = ActionResumeDialog;
  static ActionSetCommandable: typeof ActionSetCommandable = ActionSetCommandable;
  static ActionTakeItem: typeof ActionTakeItem = ActionTakeItem;
  static ActionUnlockObject: typeof ActionUnlockObject = ActionUnlockObject;
  static ActionUnequipItem: typeof ActionUnequipItem = ActionUnequipItem;
  static ActionUseObject: typeof ActionUseObject = ActionUseObject;
  static ActionWait: typeof ActionWait = ActionWait;
  static ActionRandomWalk: typeof ActionRandomWalk = ActionRandomWalk;
  static ActionForceFollowObject: typeof ActionForceFollowObject = ActionForceFollowObject;
  static ActionSpeakStrRef: typeof ActionSpeakStrRef = ActionSpeakStrRef;
  static ActionSetMine: typeof ActionSetMine = ActionSetMine;
  static ActionRecoverMine: typeof ActionRecoverMine = ActionRecoverMine;
  static ActionDisarmMine: typeof ActionDisarmMine = ActionDisarmMine;
  static ActionExamineMine: typeof ActionExamineMine = ActionExamineMine;
  static ActionFlagMine: typeof ActionFlagMine = ActionFlagMine;
  static ActionSpeak: typeof ActionSpeak = ActionSpeak;

  static FromStruct( struct: GFFStruct ): Action {
    let action: Action = undefined as any;
    const actionId = struct.getFieldByLabel('ActionId').getValue();
    const groupId = struct.getFieldByLabel('GroupActionId').getValue();
    const paramCount = struct.getFieldByLabel('NumParams').getValue();

    const paramStructs: GFFStruct[] = (struct.hasField('Paramaters')) ? 
      struct.getFieldByLabel('Paramaters').getChildStructs() : [];

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
        console.log('ActionList Unhandled Action', '0x' + (actionId.toString(16).toUpperCase()), paramCount);
        for(let i = 0; i < paramCount; i++){
          const struct = paramStructs[i];
          const type = struct.getFieldByLabel('Type').getValue();
          
          if(type == 1){
            console.log('INT', struct.getFieldByLabel('Value').getValue());
          }else if(type == 2){
            console.log('FLOAT', struct.getFieldByLabel('Value').getValue());
          }else if(type == 3){
            console.log('DWORD', struct.getFieldByLabel('Value').getValue());
          }else if(type == 4){
            console.log('STRING', struct.getFieldByLabel('Value').getValue());
          }else if(type == 5){
            console.log('SCRIPT', struct.getFieldByLabel('Value'));
          }
        }
      break;
    }

    if(action){
      action.setParameters(paramStructs, paramCount);
    }

    return action;
  }

}