/**
 * ActionType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ActionType {
  ActionInvalid = -1,
  
  ActionMoveToPoint = 0x01,
  ActionCheckMoveToObject = 0x02,
  ActionCheckMoveAwayFromObject = 0x03,
  ActionCheckInterAreaPathfinding = 0x04,
  ActionJumpToPoint = 0x05,
  ActionPlayAnimation = 0x06,
  ActionPickUpItem = 0x07,
  ActionEquipItem = 0x08,
  ActionDropItem = 0x09,
  ActionCheckMoveToPoint = 0x0A,
  ActionUnequipItem = 0x0B,
  ActionPhysicalAttacks = 0x0C,
  
  ActionSpeak = 0x0E,
  ActionCastSpell = 0x0F,
  ActionWaitForEndOfRound = 0x10,
  ActionCheckMoveToObjectRadius = 0x11,
  ActionCheckMoveToPointRadius = 0x12,
  ActionChangeFacingObject = 0x13,
  ActionOpenDoor = 0x14,
  ActionCloseDoor = 0x15,
  ActionOrientCamera = 0x16,
  ActionPlaySound = 0x17,
  ActionDialogObject = 0x18,
  ActionDisarmMine = 0x19,
  ActionRecoverMine = 0x1A,
  ActionFlagMine = 0x1B,
  ActionExamineMine = 0x1C,
  ActionSetMine = 0x1D,
  ActionWait = 0x1E,
  ActionPauseDialog = 0x1F,
  ActionResumeDialog = 0x20,
  ActionSpeakStrRef = 0x21,
  ActionGiveItem = 0x22,
  ActionTakeItem = 0x23,
  ActionEncounterCreatureDestroySelf = 0x24,
  ActionDoCommand = 0x25,
  ActionUnlockObject = 0x26,
  ActionLockObject = 0x27,
  ActionUseObject = 0x28,
  ActionAnimalEmpathy = 0x29,
  ActionRest = 0x2A,
  ActionTaunt = 0x2B,
  ActionCheckMoveAwayFromLocation = 0x2C,
  ActionRandomWalk = 0x2D,
  ActionItemCastSpell = 0x2E,
  ActionSetCommandable = 0x2F,
  ActionJumpToObject = 0x30,
  ActionChangeFacingPoint = 0x31,
  ActionCounterSpell = 0x32,
  ActionDrive = 0x33,
  ActionAppear = 0x34,
  ActionDisappear = 0x35,
  ActionPickPocket = 0x36,
  ActionForceFollowObject = 0x37,
  ActionHeal = 0x38,
  
  ActionCheckForceFollowObject = 0x3A,
  ActionFollowLeader = 0x3D,
  ActionAreaWait = 0x3C,
  ActionPartyFollowLeader = 0x3D,
  ActionBarkString = 0x3E,
  ActionCombat = 0x3F,
  ActionCheckMoveToFollowRadius = 0x40,
  ActionSurrenderToEnemies = 0x41,
  
};