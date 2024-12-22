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
  /** Invalid action type */
  ActionInvalid = -1,
  
  /** Move creature to a specific point */
  ActionMoveToPoint = 0x01,
  /** Check if creature can move to an object */
  ActionCheckMoveToObject = 0x02,
  /** Check if creature can move away from an object */
  ActionCheckMoveAwayFromObject = 0x03,
  /** Check if pathfinding between areas is possible */
  ActionCheckInterAreaPathfinding = 0x04,
  /** Make creature jump to a point */
  ActionJumpToPoint = 0x05,
  /** Play an animation on creature */
  ActionPlayAnimation = 0x06,
  /** Make creature pick up an item */
  ActionPickUpItem = 0x07,
  /** Make creature equip an item */
  ActionEquipItem = 0x08,
  /** Make creature drop an item */
  ActionDropItem = 0x09,
  /** Check if creature can move to a point */
  ActionCheckMoveToPoint = 0x0A,
  /** Make creature unequip an item */
  ActionUnequipItem = 0x0B,
  /** Perform physical attacks */
  ActionPhysicalAttacks = 0x0C,
  /** Make creature speak */
  ActionSpeak = 0x0E,
  /** Cast a spell */
  ActionCastSpell = 0x0F,
  /** Wait for the end of combat round */
  ActionWaitForEndOfRound = 0x10,
  /** Check if creature can move to object within radius */
  ActionCheckMoveToObjectRadius = 0x11,
  /** Check if creature can move to point within radius */
  ActionCheckMoveToPointRadius = 0x12,
  /** Change creature facing to look at object */
  ActionChangeFacingObject = 0x13,
  /** Open a door */
  ActionOpenDoor = 0x14,
  /** Close a door */
  ActionCloseDoor = 0x15,
  /** Orient the camera */
  ActionOrientCamera = 0x16,
  /** Play a sound effect */
  ActionPlaySound = 0x17,
  /** Start dialog with an object */
  ActionDialogObject = 0x18,
  /** Disarm a mine */
  ActionDisarmMine = 0x19,
  /** Recover a mine */
  ActionRecoverMine = 0x1A,
  /** Flag a mine */
  ActionFlagMine = 0x1B,
  /** Examine a mine */
  ActionExamineMine = 0x1C,
  /** Set a mine */
  ActionSetMine = 0x1D,
  /** Wait for specified duration */
  ActionWait = 0x1E,
  /** Pause dialog */
  ActionPauseDialog = 0x1F,
  /** Resume dialog */
  ActionResumeDialog = 0x20,
  /** Speak using string reference */
  ActionSpeakStrRef = 0x21,
  /** Give an item to target */
  ActionGiveItem = 0x22,
  /** Take an item from target */
  ActionTakeItem = 0x23,
  /** Destroy self in encounter */
  ActionEncounterCreatureDestroySelf = 0x24,
  /** Execute a command */
  ActionDoCommand = 0x25,
  /** Unlock an object */
  ActionUnlockObject = 0x26,
  /** Lock an object */
  ActionLockObject = 0x27,
  /** Use an object */
  ActionUseObject = 0x28,
  /** Use Animal Empathy skill */
  ActionAnimalEmpathy = 0x29,
  /** Rest */
  ActionRest = 0x2A,
  /** Perform taunt action */
  ActionTaunt = 0x2B,
  /** Check if creature can move away from location */
  ActionCheckMoveAwayFromLocation = 0x2C,
  /** Perform random walk */
  ActionRandomWalk = 0x2D,
  /** Cast spell using an item */
  ActionItemCastSpell = 0x2E,
  /** Set whether creature is commandable */
  ActionSetCommandable = 0x2F,
  /** Make creature jump to object */
  ActionJumpToObject = 0x30,
  /** Change creature facing to point */
  ActionChangeFacingPoint = 0x31,
  /** Counter a spell */
  ActionCounterSpell = 0x32,
  /** Drive action */
  ActionDrive = 0x33,
  /** Make creature appear */
  ActionAppear = 0x34,
  /** Make creature disappear */
  ActionDisappear = 0x35,
  /** Attempt pickpocket */
  ActionPickPocket = 0x36,
  /** Force creature to follow object */
  ActionForceFollowObject = 0x37,
  /** Perform healing action */
  ActionHeal = 0x38,
  /** Check if creature can force follow object */
  ActionCheckForceFollowObject = 0x3A,
  /** Make creature follow leader */
  ActionFollowLeader = 0x3D,
  /** Wait in area */
  ActionAreaWait = 0x3C,
  /** Make party follow leader */
  ActionPartyFollowLeader = 0x3D,
  /** Display bark string */
  ActionBarkString = 0x3E,
  /** Enter combat mode */
  ActionCombat = 0x3F,
  /** Check if creature can move to follow within radius */
  ActionCheckMoveToFollowRadius = 0x40,
  /** Surrender to enemies */
  ActionSurrenderToEnemies = 0x41,
}