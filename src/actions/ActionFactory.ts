import { ActionType } from "@/enums/actions/ActionType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { GFFStruct } from "@/resource/GFFStruct";

import { ActionCombat } from "@/actions/ActionCombat"; 
import { ActionCastSpell } from "@/actions/ActionCastSpell"; 
import { ActionCloseDoor } from "@/actions/ActionCloseDoor"; 
import { ActionDialogObject } from "@/actions/ActionDialogObject"; 
import { ActionDoCommand } from "@/actions/ActionDoCommand";
import { ActionDropItem } from "@/actions/ActionDropItem";
import { ActionEquipItem } from "@/actions/ActionEquipItem";
import { ActionFollowLeader } from "@/actions/ActionFollowLeader";
import { ActionFollowOwner } from "@/actions/ActionFollowOwner";
import { ActionGiveItem } from "@/actions/ActionGiveItem";
import { ActionItemCastSpell } from "@/actions/ActionItemCastSpell";
import { ActionJumpToObject } from "@/actions/ActionJumpToObject";
import { ActionJumpToPoint } from "@/actions/ActionJumpToPoint";
import { ActionLockObject } from "@/actions/ActionLockObject";
import { ActionMoveToPoint } from "@/actions/ActionMoveToPoint";
import { ActionOpenDoor } from "@/actions/ActionOpenDoor";
import { ActionPauseDialog } from "@/actions/ActionPauseDialog";
import { ActionPhysicalAttacks } from "@/actions/ActionPhysicalAttacks";
import { ActionPlayAnimation } from "@/actions/ActionPlayAnimation";
import { ActionResumeDialog } from "@/actions/ActionResumeDialog";
import { ActionSetCommandable } from "@/actions/ActionSetCommandable";
import { ActionTakeItem } from "@/actions/ActionTakeItem";
import { ActionUnlockObject } from "@/actions/ActionUnlockObject";
import { ActionUnequipItem } from "@/actions/ActionUnequipItem";
import { ActionUseObject } from "@/actions/ActionUseObject";
import { ActionWait } from "@/actions/ActionWait";
import { ActionRandomWalk } from "@/actions/ActionRandomWalk";
import { ActionPickUpItem } from "@/actions/ActionPickUpItem";
import { ActionForceFollowObject } from "@/actions/ActionForceFollowObject";
import { ActionSpeakStrRef } from "@/actions/ActionSpeakStrRef";
import { ActionSetMine } from "@/actions/ActionSetMine";
import { ActionFlagMine } from "@/actions/ActionFlagMine";
import { ActionRecoverMine } from "@/actions/ActionRecoverMine";
import { ActionDisarmMine } from "@/actions/ActionDisarmMine";
import { ActionExamineMine } from "@/actions/ActionExamineMine";
import { ActionSpeak } from "@/actions/ActionSpeak";
import { ActionBarkString } from "@/actions/ActionBarkString";
import { ActionChangeFacingObject } from "@/actions/ActionChangeFacingObject";
import { ActionChangeFacingPoint } from "@/actions/ActionChangeFacingPoint";
import { ActionPlaySound } from "@/actions/ActionPlaySound";
import { ActionAppear } from "@/actions/ActionAppear";
import { ActionDisappear } from "@/actions/ActionDisappear";
import { ActionSurrenderToEnemies } from "@/actions/ActionSurrenderToEnemies";
import { ActionWaitForEndOfRound } from "@/actions/ActionWaitForEndOfRound";
import { ActionAreaWait } from "@/actions/ActionAreaWait";
import { ActionRest } from "@/actions/ActionRest";
import { ActionHeal } from "@/actions/ActionHeal";
import { ActionPickPocket } from "@/actions/ActionPickPocket";
import { ActionTaunt } from "@/actions/ActionTaunt";
import { ActionAnimalEmpathy } from "@/actions/ActionAnimalEmpathy";
import { ActionEncounterCreatureDestroySelf } from "@/actions/ActionEncounterCreatureDestroySelf";
import { ActionOrientCamera } from "@/actions/ActionOrientCamera";
import { ActionCounterSpell } from "@/actions/ActionCounterSpell";
import { ActionDrive } from "@/actions/ActionDrive";
import { ActionDoorSaber } from "@/actions/ActionDoorSaber";
import { ActionSwitchWeapons } from "@/actions/ActionSwitchWeapons";
import { ActionStanceTotalDefense } from "@/actions/ActionStanceTotalDefense";
import { ActionStanceMeditative } from "@/actions/ActionStanceMeditative";
import {
  ActionCheckMoveToObject,
  ActionCheckMoveAwayFromObject,
  ActionCheckInterAreaPathfinding,
  ActionCheckMoveToPoint,
  ActionCheckMoveToObjectRadius,
  ActionCheckMoveToPointRadius,
  ActionCheckMoveAwayFromLocation,
  ActionCheckForceFollowObject,
  ActionCheckMoveToFollowRadius,
} from "@/actions/ActionCheckPath";
import type { Action } from "@/actions/Action";

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
  static ActionFollowOwner: typeof ActionFollowOwner = ActionFollowOwner;
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
  static ActionBarkString: typeof ActionBarkString = ActionBarkString;
  static ActionSetMine: typeof ActionSetMine = ActionSetMine;
  static ActionRecoverMine: typeof ActionRecoverMine = ActionRecoverMine;
  static ActionDisarmMine: typeof ActionDisarmMine = ActionDisarmMine;
  static ActionExamineMine: typeof ActionExamineMine = ActionExamineMine;
  static ActionFlagMine: typeof ActionFlagMine = ActionFlagMine;
  static ActionSpeak: typeof ActionSpeak = ActionSpeak;
  static ActionChangeFacingObject: typeof ActionChangeFacingObject = ActionChangeFacingObject;
  static ActionChangeFacingPoint: typeof ActionChangeFacingPoint = ActionChangeFacingPoint;
  static ActionPlaySound: typeof ActionPlaySound = ActionPlaySound;
  static ActionAppear: typeof ActionAppear = ActionAppear;
  static ActionDisappear: typeof ActionDisappear = ActionDisappear;
  static ActionSurrenderToEnemies: typeof ActionSurrenderToEnemies = ActionSurrenderToEnemies;
  static ActionWaitForEndOfRound: typeof ActionWaitForEndOfRound = ActionWaitForEndOfRound;
  static ActionAreaWait: typeof ActionAreaWait = ActionAreaWait;
  static ActionRest: typeof ActionRest = ActionRest;
  static ActionHeal: typeof ActionHeal = ActionHeal;
  static ActionPickPocket: typeof ActionPickPocket = ActionPickPocket;
  static ActionTaunt: typeof ActionTaunt = ActionTaunt;
  static ActionAnimalEmpathy: typeof ActionAnimalEmpathy = ActionAnimalEmpathy;
  static ActionEncounterCreatureDestroySelf: typeof ActionEncounterCreatureDestroySelf = ActionEncounterCreatureDestroySelf;
  static ActionOrientCamera: typeof ActionOrientCamera = ActionOrientCamera;
  static ActionCounterSpell: typeof ActionCounterSpell = ActionCounterSpell;
  static ActionDrive: typeof ActionDrive = ActionDrive;
  static ActionDoorSaber: typeof ActionDoorSaber = ActionDoorSaber;
  static ActionSwitchWeapons: typeof ActionSwitchWeapons = ActionSwitchWeapons;
  static ActionStanceTotalDefense: typeof ActionStanceTotalDefense = ActionStanceTotalDefense;
  static ActionStanceMeditative: typeof ActionStanceMeditative = ActionStanceMeditative;
  static ActionCheckMoveToObject: typeof ActionCheckMoveToObject = ActionCheckMoveToObject;
  static ActionCheckMoveAwayFromObject: typeof ActionCheckMoveAwayFromObject = ActionCheckMoveAwayFromObject;
  static ActionCheckInterAreaPathfinding: typeof ActionCheckInterAreaPathfinding = ActionCheckInterAreaPathfinding;
  static ActionCheckMoveToPoint: typeof ActionCheckMoveToPoint = ActionCheckMoveToPoint;
  static ActionCheckMoveToObjectRadius: typeof ActionCheckMoveToObjectRadius = ActionCheckMoveToObjectRadius;
  static ActionCheckMoveToPointRadius: typeof ActionCheckMoveToPointRadius = ActionCheckMoveToPointRadius;
  static ActionCheckMoveAwayFromLocation: typeof ActionCheckMoveAwayFromLocation = ActionCheckMoveAwayFromLocation;
  static ActionCheckForceFollowObject: typeof ActionCheckForceFollowObject = ActionCheckForceFollowObject;
  static ActionCheckMoveToFollowRadius: typeof ActionCheckMoveToFollowRadius = ActionCheckMoveToFollowRadius;

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
      case ActionType.ActionPartyFollowLeader:
        action = new ActionFollowLeader(actionId, groupId);
      break;
      case ActionType.ActionFollowOwner:
        action = new ActionFollowOwner(actionId, groupId);
      break;
      case ActionType.ActionForceFollowObject:
        action = new ActionForceFollowObject(actionId, groupId);
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
      case ActionType.ActionPickUpItem:
        action = new ActionPickUpItem(actionId, groupId);
      break;
      case ActionType.ActionPlayAnimation:
        action = new ActionPlayAnimation(actionId, groupId);
      break;
      case ActionType.ActionPhysicalAttacks:
        action = new ActionPhysicalAttacks(actionId, groupId);
      break;
      case ActionType.ActionRandomWalk:
        action = new ActionRandomWalk(actionId, groupId);
      break;
      case ActionType.ActionSpeak:
        action = new ActionSpeak(actionId, groupId);
      break;
      case ActionType.ActionSpeakStrRef:
        action = new ActionSpeakStrRef(actionId, groupId);
      break;
      case ActionType.ActionBarkString:
        action = new ActionBarkString(actionId, groupId);
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
      case ActionType.ActionUnequipItem:
        action = new ActionUnequipItem(actionId, groupId);
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
      case ActionType.ActionWaitForEndOfRound:
        action = new ActionWaitForEndOfRound(actionId, groupId);
      break;
      case ActionType.ActionAreaWait:
        action = new ActionAreaWait(actionId, groupId);
      break;
      case ActionType.ActionChangeFacingObject:
        action = new ActionChangeFacingObject(actionId, groupId);
      break;
      case ActionType.ActionChangeFacingPoint:
        action = new ActionChangeFacingPoint(actionId, groupId);
      break;
      case ActionType.ActionPlaySound:
        action = new ActionPlaySound(actionId, groupId);
      break;
      case ActionType.ActionAppear:
        action = new ActionAppear(actionId, groupId);
      break;
      case ActionType.ActionDisappear:
        action = new ActionDisappear(actionId, groupId);
      break;
      case ActionType.ActionSurrenderToEnemies:
        action = new ActionSurrenderToEnemies(actionId, groupId);
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
      case ActionType.ActionRest:
        action = new ActionRest(actionId, groupId);
      break;
      case ActionType.ActionHeal:
        action = new ActionHeal(actionId, groupId);
      break;
      case ActionType.ActionPickPocket:
        action = new ActionPickPocket(actionId, groupId);
      break;
      case ActionType.ActionTaunt:
        action = new ActionTaunt(actionId, groupId);
      break;
      case ActionType.ActionAnimalEmpathy:
        action = new ActionAnimalEmpathy(actionId, groupId);
      break;
      case ActionType.ActionEncounterCreatureDestroySelf:
        action = new ActionEncounterCreatureDestroySelf(actionId, groupId);
      break;
      case ActionType.ActionOrientCamera:
        action = new ActionOrientCamera(actionId, groupId);
      break;
      case ActionType.ActionCounterSpell:
        action = new ActionCounterSpell(actionId, groupId);
      break;
      case ActionType.ActionDrive:
        action = new ActionDrive(actionId, groupId);
      break;
      case ActionType.ActionDoorSaber:
        action = new ActionDoorSaber(actionId, groupId);
      break;
      case ActionType.ActionSwitchWeapons:
        action = new ActionSwitchWeapons(actionId, groupId);
      break;
      case ActionType.ActionStanceTotalDefense:
        action = new ActionStanceTotalDefense(actionId, groupId);
      break;
      case ActionType.ActionStanceMeditative:
        action = new ActionStanceMeditative(actionId, groupId);
      break;
      case ActionType.ActionCheckMoveToObject:
        action = new ActionCheckMoveToObject(actionId, groupId);
      break;
      case ActionType.ActionCheckMoveAwayFromObject:
        action = new ActionCheckMoveAwayFromObject(actionId, groupId);
      break;
      case ActionType.ActionCheckInterAreaPathfinding:
        action = new ActionCheckInterAreaPathfinding(actionId, groupId);
      break;
      case ActionType.ActionCheckMoveToPoint:
        action = new ActionCheckMoveToPoint(actionId, groupId);
      break;
      case ActionType.ActionCheckMoveToObjectRadius:
        action = new ActionCheckMoveToObjectRadius(actionId, groupId);
      break;
      case ActionType.ActionCheckMoveToPointRadius:
        action = new ActionCheckMoveToPointRadius(actionId, groupId);
      break;
      case ActionType.ActionCheckMoveAwayFromLocation:
        action = new ActionCheckMoveAwayFromLocation(actionId, groupId);
      break;
      case ActionType.ActionCheckForceFollowObject:
        action = new ActionCheckForceFollowObject(actionId, groupId);
      break;
      case ActionType.ActionCheckMoveToFollowRadius:
        action = new ActionCheckMoveToFollowRadius(actionId, groupId);
      break;
      default:
        console.log('ActionList Unhandled Action', '0x' + (actionId.toString(16).toUpperCase()), paramCount);
        for(let i = 0; i < paramCount; i++){
          const paramStruct = paramStructs[i];
          if(!paramStruct?.hasField('Type')){ continue; }
          const type = paramStruct.getFieldByLabel('Type').getValue();
          
          if(type == 1){
            console.log('INT', paramStruct.getFieldByLabel('Value').getValue());
          }else if(type == 2){
            console.log('FLOAT', paramStruct.getFieldByLabel('Value').getValue());
          }else if(type == 3){
            console.log('DWORD', paramStruct.getFieldByLabel('Value').getValue());
          }else if(type == 4){
            console.log('STRING', paramStruct.getFieldByLabel('Value').getValue());
          }else if(type == 5){
            console.log('SCRIPT', paramStruct.getFieldByLabel('Value'));
          }
        }
      break;
    }

    if(action){
      action.setParameters(paramStructs, paramCount);
    }

    return action;
  }

  /**
   * Queue counterspell stance toward a casting creature
   * (CSWSCreature::AddCounterSpellActions @ 004fce90).
   */
  static AddCounterSpellActions(
    creature: {
      id: number;
      area?: { id: number };
      actionQueue: { addFront: (a: Action) => void };
      clearAllActions?: (u?: boolean) => void;
    },
    targetCaster: { id: number; position: { x: number; y: number; z: number }; area?: { id: number } },
    options: { clear?: boolean; groupId?: number } = {}
  ): ActionCounterSpell | undefined {
    if(!creature || !targetCaster || creature.id === targetCaster.id){
      return undefined;
    }
    if(options.clear){
      creature.clearAllActions?.(true);
    }

    const range = 15.0;
    const groupId = options.groupId ?? -1;

    const counter = new ActionCounterSpell(-1, groupId);
    counter.setParameter(0, ActionParameterType.DWORD, targetCaster.id);

    const check = new ActionCheckMoveToObjectRadius(-1, groupId);
    check.setParameter(0, ActionParameterType.DWORD, targetCaster.id);
    check.setParameter(1, ActionParameterType.FLOAT, range);

    const move = new ActionMoveToPoint(-1, groupId);
    move.setParameter(0, ActionParameterType.FLOAT, targetCaster.position.x);
    move.setParameter(1, ActionParameterType.FLOAT, targetCaster.position.y);
    move.setParameter(2, ActionParameterType.FLOAT, targetCaster.position.z);
    move.setParameter(3, ActionParameterType.DWORD, targetCaster.area?.id ?? creature.area?.id ?? 0);
    move.setParameter(4, ActionParameterType.DWORD, targetCaster.id);
    move.setParameter(5, ActionParameterType.INT, 1);
    move.setParameter(6, ActionParameterType.FLOAT, range);
    move.setParameter(7, ActionParameterType.INT, 0);
    move.setParameter(8, ActionParameterType.FLOAT, 30.0);

    // Retail front-queue order: CounterSpell, CheckMoveToObjectRadius, MoveToPoint
    creature.actionQueue.addFront(counter);
    creature.actionQueue.addFront(check);
    creature.actionQueue.addFront(move);
    return counter;
  }

  /**
   * Queue a vehicle/stick drive update (CSWSCreature::AddDriveAction).
   */
  static AddDriveAction(
    creature: { position: { x: number; y: number }; actionQueue: { add: (a: Action) => void }; clearAllActions?: (u?: boolean) => void },
    flags: number,
    facingDeg: number,
    options: {
      x?: number;
      y?: number;
      pathId?: number;
      retry?: number;
      clear?: boolean;
    } = {}
  ): ActionDrive {
    if(options.clear){
      creature.clearAllActions?.(true);
    }
    const action = ActionDrive.create(
      options.x ?? creature.position.x,
      options.y ?? creature.position.y,
      facingDeg,
      flags,
      {
        pathId: options.pathId,
        retry: options.retry ?? 2,
        refresh: 1,
      }
    );
    creature.actionQueue.add(action);
    return action;
  }

  /**
   * Queue TSL weapon config swap (AddSwitchWeaponsAction / AIActionSwitchWeapons @ 006bbb10).
   * Engine ID 0x47.
   */
  static AddSwitchWeaponsAction(
    creature: { actionQueue: { add: (a: Action) => void }; clearAllActions?: (u?: boolean) => void },
    options: { clear?: boolean; groupId?: number } = {}
  ): ActionSwitchWeapons {
    if(options.clear){
      creature.clearAllActions?.(true);
    }
    const action = new ActionSwitchWeapons(-1, options.groupId ?? -1);
    creature.actionQueue.add(action);
    return action;
  }

  /**
   * Queue TSL door-saber (AddDoorSaberAction @ 006ae890). Engine ID 0x43.
   */
  static AddDoorSaberAction(
    creature: { actionQueue: { add: (a: Action) => void }; clearAllActions?: (u?: boolean) => void },
    door: { id: number },
    options: { clear?: boolean; groupId?: number } = {}
  ): ActionDoorSaber | undefined {
    if(!creature || !door){
      return undefined;
    }
    if(options.clear){
      creature.clearAllActions?.(true);
    }
    const action = new ActionDoorSaber(-1, options.groupId ?? -1);
    action.setParameter(0, ActionParameterType.DWORD, door.id);
    creature.actionQueue.add(action);
    return action;
  }

  /**
   * Queue Total Defense stance. Engine ID 0x44.
   */
  static AddStanceTotalDefenseAction(
    creature: { actionQueue: { add: (a: Action) => void }; clearAllActions?: (u?: boolean) => void },
    target: { id: number },
    options: { clear?: boolean; groupId?: number } = {}
  ): ActionStanceTotalDefense | undefined {
    if(!creature || !target){
      return undefined;
    }
    if(options.clear){
      creature.clearAllActions?.(true);
    }
    const action = new ActionStanceTotalDefense(-1, options.groupId ?? -1);
    action.setParameter(0, ActionParameterType.DWORD, target.id);
    creature.actionQueue.add(action);
    return action;
  }

  /**
   * Queue Meditative stance. Engine ID 0x45.
   */
  static AddStanceMeditativeAction(
    creature: { actionQueue: { add: (a: Action) => void }; clearAllActions?: (u?: boolean) => void },
    options: { clear?: boolean; groupId?: number } = {}
  ): ActionStanceMeditative {
    if(options.clear){
      creature.clearAllActions?.(true);
    }
    const action = new ActionStanceMeditative(-1, options.groupId ?? -1);
    creature.actionQueue.add(action);
    return action;
  }

}
