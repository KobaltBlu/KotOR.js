import { ModuleObjectType } from "../enums";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { GameState } from "../GameState";
import type { ModuleCreature, ModuleObject } from "../module";
import { BitWise } from "../utility/BitWise";
import { NW_FALSE, NW_TRUE } from "./NWScriptConstants";
import { NWScriptDef } from "./NWScriptDef";
import { NWScriptDefK1 } from "./NWScriptDefK1";
import { NWScriptInstance } from "./NWScriptInstance";

/**
 * NWScriptDefK2 class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptDefK2.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptDefK2 extends NWScriptDef { }
NWScriptDefK2.Actions = {
  0: {
    comment: '0: Get an integer between 0 and nMaxInteger-1.\n0: Get an integer between 0 and nMaxInteger-1.\nReturn value on error: 0',
    name: 'Random',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  1: {
    comment: '1: Output sString to the log file.',
    name: 'PrintString',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  2: {
    comment: '2: Output a formatted float to the log file.\n- nWidth should be a value from 0 to 18 inclusive.\n- nDecimals should be a value from 0 to 9 inclusive.',
    name: 'PrintFloat',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  3: {
    comment: '3: Convert fFloat into a string.\n- nWidth should be a value from 0 to 18 inclusive.\n- nDecimals should be a value from 0 to 9 inclusive.',
    name: 'FloatToString',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.FLOAT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  4: {
    comment: '4: Output nInteger to the log file.',
    name: 'PrintInteger',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  5: {
    comment: '5: Output oObject\'s ID to the log file.',
    name: 'PrintObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  6: {
    comment: '6: Assign aActionToAssign to oActionSubject.\n* No return value, but if an error occurs, the log file will contain\n  \'AssignCommand failed.\'\n  (If the object doesn\'t exist, nothing happens.)',
    name: 'AssignCommand',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.ACTION ],
    action: undefined
  },
  7: {
    comment: '7: Delay aActionToDelay by fSeconds.\n* No return value, but if an error occurs, the log file will contain\n  \'DelayCommand failed.\'.',
    name: 'DelayCommand',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT, NWScriptDataType.ACTION ],
    action: undefined
  },
  8: {
    comment: '8: Make oTarget run sScript and then return execution to the calling script.\nIf sScript does not specify a compiled script, nothing happens.\n- nScriptVar: This value will be returned by calls to GetRunScriptVar.',
    name: 'ExecuteScript',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  9: {
    comment: '9: Clear all the actions of the caller. (This will only work on Creatures)\n* No return value, but if an error occurs, the log file will contain\n  \'ClearAllActions failed.\'.',
    name: 'ClearAllActions',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  10: {
    comment: '10: Cause the caller to face fDirection.\n- fDirection is expressed as anticlockwise degrees from Due East.\n  DIRECTION_EAST, DIRECTION_NORTH, DIRECTION_WEST and DIRECTION_SOUTH are\n  predefined. (0.0f=East, 90.0f=North, 180.0f=West, 270.0f=South)',
    name: 'SetFacing',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  11: {
    comment: '11: Switches the main character to a specified NPC\n    -1 specifies to switch back to the original PC',
    name: 'SwitchPlayerCharacter',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  12: {
    comment: '12: Set the time to the time specified.\n- nHour should be from 0 to 23 inclusive\n- nMinute should be from 0 to 59 inclusive\n- nSecond should be from 0 to 59 inclusive\n- nMillisecond should be from 0 to 999 inclusive\n1) Time can only be advanced forwards; attempting to set the time backwards\n   will result in the day advancing and then the time being set to that\n   specified, e.g. if the current hour is 15 and then the hour is set to 3,\n   the day will be advanced by 1 and the hour will be set to 3.\n2) If values larger than the max hour, minute, second or millisecond are\n   specified, they will be wrapped around and the overflow will be used to\n   advance the next field, e.g. specifying 62 hours, 250 minutes, 10 seconds\n   and 10 milliseconds will result in the calendar day being advanced by 2\n   and the time being set to 18 hours, 10 minutes, 10 milliseconds.',
    name: 'SetTime',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  13: {
    comment: '13: Sets (by NPC constant) which party member should be the controlled\n    character',
    name: 'SetPartyLeader',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  14: {
    comment: '14: Sets whether the current area is escapable or not\nTRUE means you can not escape the area\nFALSE means you can escape the area',
    name: 'SetAreaUnescapable',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  15: {
    comment: '15: Returns whether the current area is escapable or not\nTRUE means you can not escape the area\nFALSE means you can escape the area',
    name: 'GetAreaUnescapable',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  16: {
    comment: '16: Get the current hour.',
    name: 'GetTimeHour',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  17: {
    comment: '17: Get the current minute',
    name: 'GetTimeMinute',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  18: {
    comment: '18: Get the current second',
    name: 'GetTimeSecond',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  19: {
    comment: '19: Get the current millisecond',
    name: 'GetTimeMillisecond',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  20: {
    comment: '20: The action subject will generate a random location near its current location\nand pathfind to it.  All commands will remove a RandomWalk() from the action\nqueue if there is one in place.\n* No return value, but if an error occurs the log file will contain\n  \'ActionRandomWalk failed.\'',
    name: 'ActionRandomWalk',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  21: {
    comment: '21: The action subject will move to lDestination.\n- lDestination: The object will move to this location.  If the location is\n  invalid or a path cannot be found to it, the command does nothing.\n- bRun: If this is TRUE, the action subject will run rather than walk\n* No return value, but if an error occurs the log file will contain\n  \'MoveToPoint failed.\'',
    name: 'ActionMoveToLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.LOCATION, NWScriptDataType.INTEGER ],
    action: undefined
  },
  22: {
    comment: '22: Cause the action subject to move to a certain distance from oMoveTo.\nIf there is no path to oMoveTo, this command will do nothing.\n- oMoveTo: This is the object we wish the action subject to move to\n- bRun: If this is TRUE, the action subject will run rather than walk\n- fRange: This is the desired distance between the action subject and oMoveTo\n* No return value, but if an error occurs the log file will contain\n  \'ActionMoveToObject failed.\'',
    name: 'ActionMoveToObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  23: {
    comment: '23: Cause the action subject to move to a certain distance away from oFleeFrom.\n- oFleeFrom: This is the object we wish the action subject to move away from.\n  If oFleeFrom is not in the same area as the action subject, nothing will\n  happen.\n- bRun: If this is TRUE, the action subject will run rather than walk\n- fMoveAwayRange: This is the distance we wish the action subject to put\n  between themselves and oFleeFrom\n* No return value, but if an error occurs the log file will contain\n  \'ActionMoveAwayFromObject failed.\'',
    name: 'ActionMoveAwayFromObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  24: {
    comment: '24: Get the area that oTarget is currently in\n* Return value on error: OBJECT_INVALID',
    name: 'GetArea',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  25: {
    comment: '25: The value returned by this function depends on the object type of the caller:\n1) If the caller is a door or placeable it returns the object that last\n   triggered it.\n2) If the caller is a trigger, area of effect, module, area or encounter it\n   returns the object that last entered it.\n* Return value on error: OBJECT_INVALID',
    name: 'GetEnteringObject',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  26: {
    comment: '26: Get the object that last left the caller.  This function works on triggers,\nareas of effect, modules, areas and encounters.\n* Return value on error: OBJECT_INVALID',
    name: 'GetExitingObject',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  27: {
    comment: '27: Get the position of oTarget\n* Return value on error: vector (0.0f, 0.0f, 0.0f)',
    name: 'GetPosition',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  28: {
    comment: '28: Get the direction in which oTarget is facing, expressed as a float between\n0.0f and 360.0f\n* Return value on error: -1.0f',
    name: 'GetFacing',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  29: {
    comment: '29: Get the possessor of oItem\n* Return value on error: OBJECT_INVALID',
    name: 'GetItemPossessor',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  30: {
    comment: '30: Get the object possessed by oCreature with the tag sItemTag\n* Return value on error: OBJECT_INVALID',
    name: 'GetItemPossessedBy',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.STRING ],
    action: undefined
  },
  31: {
    comment: '31: Create an item with the template sItemTemplate in oTarget\'s inventory.\n- nStackSize: This is the stack size of the item to be created\n* Return value: The object that has been created.  On error, this returns\n  OBJECT_INVALID.\n//RWT-OEI 12/16/03 - Added the bHideMessage parameter',
    name: 'CreateItemOnObject',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.STRING, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  32: {
    comment: '32: Equip oItem into nInventorySlot.\n- nInventorySlot: INVENTORY_SLOT_*\n* No return value, but if an error occurs the log file will contain\n  \'ActionEquipItem failed.\'',
    name: 'ActionEquipItem',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  33: {
    comment: '33: Unequip oItem from whatever slot it is currently in.',
    name: 'ActionUnequipItem',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  34: {
    comment: '34: Pick up oItem from the ground.\n* No return value, but if an error occurs the log file will contain\n  \'ActionPickUpItem failed.\'',
    name: 'ActionPickUpItem',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  35: {
    comment: '35: Put down oItem on the ground.\n* No return value, but if an error occurs the log file will contain\n  \'ActionPutDownItem failed.\'',
    name: 'ActionPutDownItem',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  36: {
    comment: '36: Get the last attacker of oAttackee.  This should only be used ONLY in the\nOnAttacked events for creatures, placeables and doors.\n* Return value on error: OBJECT_INVALID',
    name: 'GetLastAttacker',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  37: {
    comment: '37: Attack oAttackee.\n- bPassive: If this is TRUE, attack is in passive mode.',
    name: 'ActionAttack',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  38: {
    comment: '38: Get the creature nearest to oTarget, subject to all the criteria specified.\n- nFirstCriteriaType: CREATURE_TYPE_*\n- nFirstCriteriaValue:\n  -> CLASS_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_CLASS\n  -> SPELL_* if nFirstCriteriaType was CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT\n     or CREATURE_TYPE_HAS_SPELL_EFFECT\n  -> TRUE or FALSE if nFirstCriteriaType was CREATURE_TYPE_IS_ALIVE\n  -> PERCEPTION_* if nFirstCriteriaType was CREATURE_TYPE_PERCEPTION\n  -> PLAYER_CHAR_IS_PC or PLAYER_CHAR_NOT_PC if nFirstCriteriaType was\n     CREATURE_TYPE_PLAYER_CHAR\n  -> RACIAL_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_RACIAL_TYPE\n  -> REPUTATION_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_REPUTATION\n  For example, to get the nearest PC, use:\n  (CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC)\n- oTarget: We\'re trying to find the creature of the specified type that is\n  nearest to oTarget\n- nNth: We don\'t have to find the first nearest: we can find the Nth nearest...\n- nSecondCriteriaType: This is used in the same way as nFirstCriteriaType to\n  further specify the type of creature that we are looking for.\n- nSecondCriteriaValue: This is used in the same way as nFirstCriteriaValue\n  to further specify the type of creature that we are looking for.\n- nThirdCriteriaType: This is used in the same way as nFirstCriteriaType to\n  further specify the type of creature that we are looking for.\n- nThirdCriteriaValue: This is used in the same way as nFirstCriteriaValue to\n  further specify the type of creature that we are looking for.\n* Return value on error: OBJECT_INVALID',
    name: 'GetNearestCreature',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  39: {
    comment: '39: Add a speak action to the action subject.\n- sStringToSpeak: String to be spoken\n- nTalkVolume: TALKVOLUME_*',
    name: 'ActionSpeakString',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  40: {
    comment: '40: Cause the action subject to play an animation\n- nAnimation: ANIMATION_*\n- fSpeed: Speed of the animation\n- fDurationSeconds: Duration of the animation (this is not used for Fire and\n  Forget animations) If a time of -1.0f is specified for a looping animation\n  it will loop until the next animation is applied.',
    name: 'ActionPlayAnimation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  41: {
    comment: '41: Get the distance from the caller to oObject in metres.\n* Return value on error: -1.0f',
    name: 'GetDistanceToObject',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  42: {
    comment: '42: * Returns TRUE if oObject is a valid object.',
    name: 'GetIsObjectValid',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  43: {
    comment: '43: Cause the action subject to open oDoor',
    name: 'ActionOpenDoor',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  44: {
    comment: '44: Cause the action subject to close oDoor',
    name: 'ActionCloseDoor',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  45: {
    comment: '45: Change the direction in which the camera is facing\n- fDirection is expressed as anticlockwise degrees from Due East.\n  (0.0f=East, 90.0f=North, 180.0f=West, 270.0f=South)\nThis can be used to change the way the camera is facing after the player\nemerges from an area transition.',
    name: 'SetCameraFacing',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  46: {
    comment: '46: Play sSoundName\n- sSoundName: TBD - SS',
    name: 'PlaySound',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  47: {
    comment: '47: Get the object at which the caller last cast a spell\n* Return value on error: OBJECT_INVALID',
    name: 'GetSpellTargetObject',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  48: {
    comment: '48: This action casts a spell at oTarget.\n- nSpell: SPELL_*\n- oTarget: Target for the spell\n- nMetamagic: METAMAGIC_*\n- bCheat: If this is TRUE, then the executor of the action doesn\'t have to be\n  able to cast the spell.\n- nDomainLevel: TBD - SS\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*\n- bInstantSpell: If this is TRUE, the spell is cast immediately. This allows\n  the end-user to simulate a high-level magic-user having lots of advance\n  warning of impending trouble',
    name: 'ActionCastSpellAtObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  49: {
    comment: '49: Get the current hitpoints of oObject\n* Return value on error: 0',
    name: 'GetCurrentHitPoints',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  50: {
    comment: '50: Get the maximum hitpoints of oObject\n* Return value on error: 0',
    name: 'GetMaxHitPoints',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  51: {
    comment: '51: EffectAssuredHit\nCreate an Assured Hit effect, which guarantees that all attacks are successful',
    name: 'EffectAssuredHit',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  52: {
    comment: '52:\nReturns the last item that was equipped by a creature.',
    name: 'GetLastItemEquipped',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  53: {
    comment: '53:\nReturns the ID of the subscreen that is currently onscreen.  This will be one of the\nSUBSCREEN_ID_* constant values.',
    name: 'GetSubScreenID',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  54: {
    comment: '54:\nCancels combat for the specified creature.',
    name: 'CancelCombat',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  55: {
    comment: '55:\nreturns the current force points for the creature',
    name: 'GetCurrentForcePoints',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  56: {
    comment: '56:\nreturns the Max force points for the creature',
    name: 'GetMaxForcePoints',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  57: {
    comment: '57:\nPauses the game if bPause is TRUE.  Unpauses if bPause is FALSE.',
    name: 'PauseGame',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  58: {
    comment: '58: SetPlayerRestrictMode\nSets whether the player is currently in \'restricted\' mode',
    name: 'SetPlayerRestrictMode',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  59: {
    comment: '59: Get the length of sString\n* Return value on error: -1',
    name: 'GetStringLength',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  60: {
    comment: '60: Convert sString into upper case\n* Return value on error: \'\'',
    name: 'GetStringUpperCase',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  61: {
    comment: '61: Convert sString into lower case\n* Return value on error: \'\'',
    name: 'GetStringLowerCase',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  62: {
    comment: '62: Get nCount characters from the right end of sString\n* Return value on error: \'\'',
    name: 'GetStringRight',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  63: {
    comment: '63: Get nCounter characters from the left end of sString\n* Return value on error: \'\'',
    name: 'GetStringLeft',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  64: {
    comment: '64: Insert sString into sDestination at nPosition\n* Return value on error: \'\'',
    name: 'InsertString',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  65: {
    comment: '65: Get nCount characters from sString, starting at nStart\n* Return value on error: \'\'',
    name: 'GetSubString',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  66: {
    comment: '66: Find the position of sSubstring inside sString\n* Return value on error: -1',
    name: 'FindSubString',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING, NWScriptDataType.STRING ],
    action: undefined
  },
  67: {
    comment: '67: Maths operation: absolute value of fValue',
    name: 'fabs',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  68: {
    comment: '68: Maths operation: cosine of fValue',
    name: 'cos',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  69: {
    comment: '69: Maths operation: sine of fValue',
    name: 'sin',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  70: {
    comment: '70: Maths operation: tan of fValue',
    name: 'tan',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  71: {
    comment: '71: Maths operation: arccosine of fValue\n* Returns zero if fValue > 1 or fValue < -1',
    name: 'acos',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  72: {
    comment: '72: Maths operation: arcsine of fValue\n* Returns zero if fValue >1 or fValue < -1',
    name: 'asin',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  73: {
    comment: '73: Maths operation: arctan of fValue',
    name: 'atan',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  74: {
    comment: '74: Maths operation: log of fValue\n* Returns zero if fValue <= zero',
    name: 'log',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  75: {
    comment: '75: Maths operation: fValue is raised to the power of fExponent\n* Returns zero if fValue ==0 and fExponent <0',
    name: 'pow',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  76: {
    comment: '76: Maths operation: square root of fValue\n* Returns zero if fValue <0',
    name: 'sqrt',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  77: {
    comment: '77: Maths operation: integer absolute value of nValue\n* Return value on error: 0',
    name: 'abs',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  78: {
    comment: '78: Create a Heal effect. This should be applied as an instantaneous effect.\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nDamageToHeal < 0.',
    name: 'EffectHeal',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  79: {
    comment: '79: Create a Damage effect\n- nDamageAmount: amount of damage to be dealt. This should be applied as an\n  instantaneous effect.\n- nDamageType: DAMAGE_TYPE_*\n- nDamagePower: DAMAGE_POWER_*',
    name: 'EffectDamage',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  80: {
    comment: '80: Create an Ability Increase effect\n- bAbilityToIncrease: ABILITY_*',
    name: 'EffectAbilityIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  81: {
    comment: '81: Create a Damage Resistance effect that removes the first nAmount points of\ndamage of type nDamageType, up to nLimit (or infinite if nLimit is 0)\n- nDamageType: DAMAGE_TYPE_*\n- nAmount\n- nLimit',
    name: 'EffectDamageResistance',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  82: {
    comment: '82: Create a Resurrection effect. This should be applied as an instantaneous effect.\nDJS-OEI 8/26/2004\nAdded a parameter for the percentage of HP the target\nshould receive when they are revived.',
    name: 'EffectResurrection',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  83: {
    comment: '83: GetPlayerRestrictMode\nreturns the current player \'restricted\' mode',
    name: 'GetPlayerRestrictMode',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  84: {
    comment: '84: Get the Caster Level of oCreature.\n* Return value on error: 0;',
    name: 'GetCasterLevel',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  85: {
    comment: '85: Get the first in-game effect on oCreature.',
    name: 'GetFirstEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  86: {
    comment: '86: Get the next in-game effect on oCreature.',
    name: 'GetNextEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  87: {
    comment: '87: Remove eEffect from oCreature.\n* No return value',
    name: 'RemoveEffect',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.EFFECT ],
    action: undefined
  },
  88: {
    comment: '88: * Returns TRUE if eEffect is a valid effect.',
    name: 'GetIsEffectValid',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  89: {
    comment: '89: Get the duration type (DURATION_TYPE_*) of eEffect.\n* Return value if eEffect is not valid: -1',
    name: 'GetEffectDurationType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  90: {
    comment: '90: Get the subtype (SUBTYPE_*) of eEffect.\n* Return value on error: 0',
    name: 'GetEffectSubType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  91: {
    comment: '91: Get the object that created eEffect.\n* Returns OBJECT_INVALID if eEffect is not a valid effect.',
    name: 'GetEffectCreator',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  92: {
    comment: '92: Convert nInteger into a string.\n* Return value on error: \'\'',
    name: 'IntToString',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  93: {
    comment: '93: Get the first object in oArea.\nIf no valid area is specified, it will use the caller\'s area.\n- oArea\n- nObjectFilter: OBJECT_TYPE_*\n* Return value on error: OBJECT_INVALID',
    name: 'GetFirstObjectInArea',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  94: {
    comment: '94: Get the next object in oArea.\nIf no valid area is specified, it will use the caller\'s area.\n- oArea\n- nObjectFilter: OBJECT_TYPE_*\n* Return value on error: OBJECT_INVALID',
    name: 'GetNextObjectInArea',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  95: {
    comment: '95: Get the total from rolling (nNumDice x d2 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd2',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  96: {
    comment: '96: Get the total from rolling (nNumDice x d3 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd3',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  97: {
    comment: '97: Get the total from rolling (nNumDice x d4 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd4',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  98: {
    comment: '98: Get the total from rolling (nNumDice x d6 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd6',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  99: {
    comment: '99: Get the total from rolling (nNumDice x d8 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd8',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  100: {
    comment: '100: Get the total from rolling (nNumDice x d10 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd10',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  101: {
    comment: '101: Get the total from rolling (nNumDice x d12 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd12',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  102: {
    comment: '102: Get the total from rolling (nNumDice x d20 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd20',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  103: {
    comment: '103: Get the total from rolling (nNumDice x d100 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.',
    name: 'd100',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  104: {
    comment: '104: Get the magnitude of vVector; this can be used to determine the\ndistance between two points.\n* Return value on error: 0.0f',
    name: 'VectorMagnitude',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  105: {
    comment: '105: Get the metamagic type (METAMAGIC_*) of the last spell cast by the caller\n* Return value if the caster is not a valid object: -1',
    name: 'GetMetaMagicFeat',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  106: {
    comment: '106: Get the object type (OBJECT_TYPE_*) of oTarget\n* Return value if oTarget is not a valid object: -1',
    name: 'GetObjectType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  107: {
    comment: '107: Get the racial type (RACIAL_TYPE_*) of oCreature\n* Return value if oCreature is not a valid creature: RACIAL_TYPE_INVALID',
    name: 'GetRacialType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  108: {
    comment: '108: Do a Fortitude Save check for the given DC\n- oCreature\n- nDC: Difficulty check\n- nSaveType: SAVING_THROW_TYPE_*\n- oSaveVersus\nReturns: 0 if the saving throw roll failed\nReturns: 1 if the saving throw roll succeeded\nReturns: 2 if the target was immune to the save type specified',
    name: 'FortitudeSave',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  109: {
    comment: '109: Does a Reflex Save check for the given DC\n- oCreature\n- nDC: Difficulty check\n- nSaveType: SAVING_THROW_TYPE_*\n- oSaveVersus\nReturns: 0 if the saving throw roll failed\nReturns: 1 if the saving throw roll succeeded\nReturns: 2 if the target was immune to the save type specified',
    name: 'ReflexSave',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  110: {
    comment: '110: Does a Will Save check for the given DC\n- oCreature\n- nDC: Difficulty check\n- nSaveType: SAVING_THROW_TYPE_*\n- oSaveVersus\nReturns: 0 if the saving throw roll failed\nReturns: 1 if the saving throw roll succeeded\nReturns: 2 if the target was immune to the save type specified',
    name: 'WillSave',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  111: {
    comment: '111: Get the DC to save against for a spell (5 + spell level + CHA Mod + WIS Mod).\nThis can be called by a creature or by an Area of Effect object.',
    name: 'GetSpellSaveDC',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  112: {
    comment: '112: Set the subtype of eEffect to Magical and return eEffect.\n(Effects default to magical if the subtype is not set)',
    name: 'MagicalEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  113: {
    comment: '113: Set the subtype of eEffect to Supernatural and return eEffect.\n(Effects default to magical if the subtype is not set)',
    name: 'SupernaturalEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  114: {
    comment: '114: Set the subtype of eEffect to Extraordinary and return eEffect.\n(Effects default to magical if the subtype is not set)',
    name: 'ExtraordinaryEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  115: {
    comment: '115: Create an AC Increase effect\n- nValue: size of AC increase\n- nModifyType: AC_*_BONUS\n- nDamageType: DAMAGE_TYPE_*\n  * Default value for nDamageType should only ever be used in this function prototype.',
    name: 'EffectACIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  116: {
    comment: '116: If oObject is a creature, this will return that creature\'s armour class\nIf oObject is an item, door or placeable, this will return zero.\n- nForFutureUse: this parameter is not currently used\n* Return value if oObject is not a creature, item, door or placeable: -1',
    name: 'GetAC',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  117: {
    comment: '117: Create an AC Decrease effect\n- nSave: SAVING_THROW_* (not SAVING_THROW_TYPE_*)\n- nValue: size of AC decrease\n- nSaveType: SAVING_THROW_TYPE_*',
    name: 'EffectSavingThrowIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  118: {
    comment: '118: Create an Attack Increase effect\n- nBonus: size of attack bonus\n- nModifierType: ATTACK_BONUS_*',
    name: 'EffectAttackIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  119: {
    comment: '119: Create a Damage Reduction effect\n- nAmount: amount of damage reduction\n- nDamagePower: DAMAGE_POWER_*\n- nLimit: How much damage the effect can absorb before disappearing.\n  Set to zero for infinite',
    name: 'EffectDamageReduction',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  120: {
    comment: '120: Create a Damage Increase effect\n- nBonus: DAMAGE_BONUS_*\n- nDamageType: DAMAGE_TYPE_*',
    name: 'EffectDamageIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  121: {
    comment: '121: Convert nRounds into a number of seconds\nA round is always 6.0 seconds',
    name: 'RoundsToSeconds',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  122: {
    comment: '122: Convert nHours into a number of seconds\nThe result will depend on how many minutes there are per hour (game-time)',
    name: 'HoursToSeconds',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  123: {
    comment: '123: Convert nTurns into a number of seconds\nA turn is always 60.0 seconds',
    name: 'TurnsToSeconds',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  124: {
    comment: '124. SoundObjectSetFixedVariance\nSets the constant variance at which to play the sound object\nThis variance is a multiplier of the original sound',
    name: 'SoundObjectSetFixedVariance',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  125: {
    comment: '125: Get an integer between 0 and 100 (inclusive) to represent oCreature\'s\nGood/Evil alignment\n(100=good, 0=evil)\n* Return value if oCreature is not a valid creature: -1',
    name: 'GetGoodEvilValue',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  126: {
    comment: '126: GetPartyMemberCount\nReturns a count of how many members are in the party including the player character',
    name: 'GetPartyMemberCount',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  127: {
    comment: '127: Return an ALIGNMENT_* constant to represent oCreature\'s good/evil alignment\n* Return value if oCreature is not a valid creature: -1',
    name: 'GetAlignmentGoodEvil',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  128: {
    comment: '128: Get the first object in nShape\n- nShape: SHAPE_*\n- fSize:\n  -> If nShape == SHAPE_SPHERE, this is the radius of the sphere\n  -> If nShape == SHAPE_SPELLCYLINDER, this is the radius of the cylinder\n  -> If nShape == SHAPE_CONE, this is the widest radius of the cone\n  -> If nShape == SHAPE_CUBE, this is half the length of one of the sides of\n     the cube\n- lTarget: This is the centre of the effect, usually GetSpellTargetPosition(),\n  or the end of a cylinder or cone.\n- bLineOfSight: This controls whether to do a line-of-sight check on the\n  object returned.\n  (This can be used to ensure that spell effects do not go through walls.)\n- nObjectFilter: This allows you to filter out undesired object types, using\n  bitwise \'or\'.\n  For example, to return only creatures and doors, the value for this\n  parameter would be OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR\n- vOrigin: This is only used for cylinders and cones, and specifies the\n  origin of the effect(normally the spell-caster\'s position).\nReturn value on error: OBJECT_INVALID',
    name: 'GetFirstObjectInShape',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.FLOAT, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.VECTOR ],
    action: undefined
  },
  129: {
    comment: '129: Get the next object in nShape\n- nShape: SHAPE_*\n- fSize:\n  -> If nShape == SHAPE_SPHERE, this is the radius of the sphere\n  -> If nShape == SHAPE_SPELLCYLINDER, this is the radius of the cylinder\n  -> If nShape == SHAPE_CONE, this is the widest radius of the cone\n  -> If nShape == SHAPE_CUBE, this is half the length of one of the sides of\n     the cube\n- lTarget: This is the centre of the effect, usually GetSpellTargetPosition(),\n  or the end of a cylinder or cone.\n- bLineOfSight: This controls whether to do a line-of-sight check on the\n  object returned. (This can be used to ensure that spell effects do not go\n  through walls.)\n- nObjectFilter: This allows you to filter out undesired object types, using\n  bitwise \'or\'. For example, to return only creatures and doors, the value for\n  this parameter would be OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR\n- vOrigin: This is only used for cylinders and cones, and specifies the origin\n  of the effect (normally the spell-caster\'s position).\nReturn value on error: OBJECT_INVALID',
    name: 'GetNextObjectInShape',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.FLOAT, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.VECTOR ],
    action: undefined
  },
  130: {
    comment: '130: Create an Entangle effect\nWhen applied, this effect will restrict the creature\'s movement and apply a\n(-2) to all attacks and a -4 to AC.',
    name: 'EffectEntangle',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  131: {
    comment: '131: Cause oObject to run evToRun',
    name: 'SignalEvent',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.EVENT ],
    action: undefined
  },
  132: {
    comment: '132: Create an event of the type nUserDefinedEventNumber',
    name: 'EventUserDefined',
    type: NWScriptDataType.EVENT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  133: {
    comment: '133: Create a Death effect\n- nSpectacularDeath: if this is TRUE, the creature to which this effect is\n  applied will die in an extraordinary fashion\n- nDisplayFeedback\n- nNoFadeAway: Passing TRUE for this parameter will keep the bodies from fading after the creature\n               dies. Note that NO XP will be awarded if the creature is killed with this parameter.',
    name: 'EffectDeath',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  134: {
    comment: '134: Create a Knockdown effect\nThis effect knocks creatures off their feet, they will sit until the effect\nis removed. This should be applied as a temporary effect with a 3 second\nduration minimum (1 second to fall, 1 second sitting, 1 second to get up).',
    name: 'EffectKnockdown',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  135: {
    comment: '135: Give oItem to oGiveTo\nIf oItem is not a valid item, or oGiveTo is not a valid object, nothing will\nhappen.',
    name: 'ActionGiveItem',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  136: {
    comment: '136: Take oItem from oTakeFrom\nIf oItem is not a valid item, or oTakeFrom is not a valid object, nothing\nwill happen.',
    name: 'ActionTakeItem',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  137: {
    comment: '137: Normalize vVector',
    name: 'VectorNormalize',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  138: {
    comment: '138:\nGets the stack size of an item.',
    name: 'GetItemStackSize',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  139: {
    comment: '139: Get the ability score of type nAbility for a creature (otherwise 0)\n- oCreature: the creature whose ability score we wish to find out\n- nAbilityType: ABILITY_*\nReturn value on error: 0',
    name: 'GetAbilityScore',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  140: {
    comment: '140: * Returns TRUE if oCreature is a dead NPC, dead PC or a dying PC.',
    name: 'GetIsDead',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  141: {
    comment: '141: Output vVector to the logfile.\n- vVector\n- bPrepend: if this is TRUE, the message will be prefixed with \'PRINTVECTOR:\'',
    name: 'PrintVector',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR, NWScriptDataType.INTEGER ],
    action: undefined
  },
  142: {
    comment: '142: Create a vector with the specified values for x, y and z',
    name: 'Vector',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  143: {
    comment: '143: Cause the caller to face vTarget',
    name: 'SetFacingPoint',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  144: {
    comment: '144: Convert fAngle to a vector',
    name: 'AngleToVector',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  145: {
    comment: '145: Convert vVector to an angle',
    name: 'VectorToAngle',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  146: {
    comment: '146: The caller will perform a Melee Touch Attack on oTarget\nThis is not an action, and it assumes the caller is already within range of\noTarget\n* Returns 0 on a miss, 1 on a hit and 2 on a critical hit',
    name: 'TouchAttackMelee',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  147: {
    comment: '147: The caller will perform a Ranged Touch Attack on oTarget\n* Returns 0 on a miss, 1 on a hit and 2 on a critical hit',
    name: 'TouchAttackRanged',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  148: {
    comment: '148: Create a Paralyze effect',
    name: 'EffectParalyze',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  149: {
    comment: '149: Create a Spell Immunity effect.\nThere is a known bug with this function. There *must* be a parameter specified\nwhen this is called (even if the desired parameter is SPELL_ALL_SPELLS),\notherwise an effect of type EFFECT_TYPE_INVALIDEFFECT will be returned.\n- nImmunityToSpell: SPELL_*\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nImmunityToSpell is\n  invalid.',
    name: 'EffectSpellImmunity',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  150: {
    comment: '150:\nSet the stack size of an item.\nNOTE: The stack size will be clamped to between 1 and the max stack size (as\n      specified in the base item).',
    name: 'SetItemStackSize',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  151: {
    comment: '151: Get the distance in metres between oObjectA and oObjectB.\n* Return value if either object is invalid: 0.0f',
    name: 'GetDistanceBetween',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  152: {
    comment: '152: SetReturnStrref\nThis function will turn on/off the display of the \'return to ebon hawk\' option\non the map screen and allow the string to be changed to an arbitrary string ref\nsrReturnQueryStrRef is the string ref that will be displayed in the query pop\nup confirming that you wish to return to the specified location.',
    name: 'SetReturnStrref',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  153: {
    comment: '153: EffectForceJump\nThe effect required for force jumping',
    name: 'EffectForceJump',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  154: {
    comment: '154: Create a Sleep effect',
    name: 'EffectSleep',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  155: {
    comment: '155: Get the object which is in oCreature\'s specified inventory slot\n- nInventorySlot: INVENTORY_SLOT_*\n- oCreature\n* Returns OBJECT_INVALID if oCreature is not a valid creature or there is no\n  item in nInventorySlot.',
    name: 'GetItemInSlot',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  156: {
    comment: '156: This was previously EffectCharmed();',
    name: 'EffectTemporaryForcePoints',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  157: {
    comment: '157: Create a Confuse effect',
    name: 'EffectConfused',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  158: {
    comment: '158: Create a Frighten effect',
    name: 'EffectFrightened',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  159: {
    comment: '159: Choke the bugger...',
    name: 'EffectChoke',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  160: {
    comment: '160: Sets a global string with the specified identifier.  This is an EXTREMELY\n     restricted function - do not use without expilicit permission.\n     This means if you are not Preston.  Then go see him if you\'re even thinking\n     about using this.',
    name: 'SetGlobalString',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.STRING ],
    action: undefined
  },
  161: {
    comment: '161: Create a Stun effect',
    name: 'EffectStunned',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  162: {
    comment: '162: Set whether oTarget\'s action stack can be modified',
    name: 'SetCommandable',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  163: {
    comment: '163: Determine whether oTarget\'s action stack can be modified.',
    name: 'GetCommandable',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  164: {
    comment: '164: Create a Regenerate effect.\n- nAmount: amount of damage to be regenerated per time interval\n- fIntervalSeconds: length of interval in seconds',
    name: 'EffectRegenerate',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  165: {
    comment: '165: Create a Movement Speed Increase effect.\n- nNewSpeedPercent: This works in a dodgy way so please read this notes carefully.\n  If you supply an integer under 100, 100 gets added to it to produce the final speed.\n  e.g. if you supply 50, then the resulting speed is 150% of the original speed.\n  If you supply 100 or above, then this is used directly as the resulting speed.\n  e.g. if you specify 100, then the resulting speed is 100% of the original speed that is,\n       it is unchanged.\n       However if you specify 200, then the resulting speed is double the original speed.',
    name: 'EffectMovementSpeedIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  166: {
    comment: '166: Get the number of hitdice for oCreature.\n* Return value if oCreature is not a valid creature: 0',
    name: 'GetHitDice',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  167: {
    comment: '167: The action subject will follow oFollow until a ClearAllActions() is called.\n- oFollow: this is the object to be followed\n- fFollowDistance: follow distance in metres\n* No return value',
    name: 'ActionForceFollowObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  168: {
    comment: '168: Get the Tag of oObject\n* Return value if oObject is not a valid object: \'\'',
    name: 'GetTag',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  169: {
    comment: '169: Do a Force Resistance check between oSource and oTarget, returning TRUE if\nthe force was resisted.\n* Return value if oSource or oTarget is an invalid object: FALSE',
    name: 'ResistForce',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  170: {
    comment: '170: Get the effect type (EFFECT_TYPE_*) of eEffect.\n* Return value if eEffect is invalid: EFFECT_INVALIDEFFECT',
    name: 'GetEffectType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  171: {
    comment: '171: Create an Area Of Effect effect in the area of the creature it is applied to.\nIf the scripts are not specified, default ones will be used.',
    name: 'EffectAreaOfEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING ],
    action: undefined
  },
  172: {
    comment: '172: * Returns TRUE if the Faction Ids of the two objects are the same',
    name: 'GetFactionEqual',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  173: {
    comment: '173: Make oObjectToChangeFaction join the faction of oMemberOfFactionToJoin.\nNB. ** This will only work for two NPCs **',
    name: 'ChangeFaction',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  174: {
    comment: '174: * Returns TRUE if oObject is listening for something',
    name: 'GetIsListening',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  175: {
    comment: '175: Set whether oObject is listening.',
    name: 'SetListening',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  176: {
    comment: '176: Set the string for oObject to listen for.\nNote: this does not set oObject to be listening.',
    name: 'SetListenPattern',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  177: {
    comment: '177: * Returns TRUE if sStringToTest matches sPattern.',
    name: 'TestStringAgainstPattern',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING, NWScriptDataType.STRING ],
    action: undefined
  },
  178: {
    comment: '178: Get the appropriate matched string (this should only be used in\nOnConversation scripts).\n* Returns the appropriate matched string, otherwise returns \'\'',
    name: 'GetMatchedSubstring',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  179: {
    comment: '179: Get the number of string parameters available.\n* Returns -1 if no string matched (this could be because of a dialogue event)',
    name: 'GetMatchedSubstringsCount',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  180: {
    comment: '180: * Create a Visual Effect that can be applied to an object.\n- nVisualEffectId\n- nMissEffect: if this is TRUE, a random vector near or past the target will\n  be generated, on which to play the effect',
    name: 'EffectVisualEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  181: {
    comment: '181: Get the weakest member of oFactionMember\'s faction.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.',
    name: 'GetFactionWeakestMember',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  182: {
    comment: '182: Get the strongest member of oFactionMember\'s faction.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.',
    name: 'GetFactionStrongestMember',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  183: {
    comment: '183: Get the member of oFactionMember\'s faction that has taken the most hit points\nof damage.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.',
    name: 'GetFactionMostDamagedMember',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  184: {
    comment: '184: Get the member of oFactionMember\'s faction that has taken the fewest hit\npoints of damage.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.',
    name: 'GetFactionLeastDamagedMember',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  185: {
    comment: '185: Get the amount of gold held by oFactionMember\'s faction.\n* Returns -1 if oFactionMember\'s faction is invalid.',
    name: 'GetFactionGold',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  186: {
    comment: '186: Get an integer between 0 and 100 (inclusive) that represents how\noSourceFactionMember\'s faction feels about oTarget.\n* Return value on error: -1',
    name: 'GetFactionAverageReputation',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  187: {
    comment: '187: Get an integer between 0 and 100 (inclusive) that represents the average\ngood/evil alignment of oFactionMember\'s faction.\n* Return value on error: -1',
    name: 'GetFactionAverageGoodEvilAlignment',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  188: {
    comment: '188. SoundObjectGetFixedVariance\nGets the constant variance at which to play the sound object',
    name: 'SoundObjectGetFixedVariance',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  189: {
    comment: '189: Get the average level of the members of the faction.\n* Return value on error: -1',
    name: 'GetFactionAverageLevel',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  190: {
    comment: '190: Get the average XP of the members of the faction.\n* Return value on error: -1',
    name: 'GetFactionAverageXP',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  191: {
    comment: '191: Get the most frequent class in the faction - this can be compared with the\nconstants CLASS_TYPE_*.\n* Return value on error: -1',
    name: 'GetFactionMostFrequentClass',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  192: {
    comment: '192: Get the object faction member with the lowest armour class.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.',
    name: 'GetFactionWorstAC',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  193: {
    comment: '193: Get the object faction member with the highest armour class.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.',
    name: 'GetFactionBestAC',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  194: {
    comment: '194: Get a global string with the specified identifier\n     This is an EXTREMELY restricted function.  Use only with explicit permission.\n     This means if you are not Preston.  Then go see him if you\'re even thinking\n     about using this.',
    name: 'GetGlobalString',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  195: {
    comment: '195: In an onConversation script this gets the number of the string pattern\nmatched (the one that triggered the script).\n* Returns -1 if no string matched',
    name: 'GetListenPatternNumber',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  196: {
    comment: '196: Jump to an object ID, or as near to it as possible.',
    name: 'ActionJumpToObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  197: {
    comment: '197: Get the first waypoint with the specified tag.\n* Returns OBJECT_INVALID if the waypoint cannot be found.',
    name: 'GetWaypointByTag',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  198: {
    comment: '198: Get the destination (a waypoint or a door) for a trigger or a door.\n* Returns OBJECT_INVALID if oTransition is not a valid trigger or door.',
    name: 'GetTransitionTarget',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  199: {
    comment: '199: Link the two supplied effects, returning eChildEffect as a child of\neParentEffect.\nNote: When applying linked effects if the target is immune to all valid\neffects all other effects will be removed as well. This means that if you\napply a visual effect and a silence effect (in a link) and the target is\nimmune to the silence effect that the visual effect will get removed as well.\nVisual Effects are not considered \'valid\' effects for the purposes of\ndetermining if an effect will be removed or not and as such should never be\npackaged *only* with other visual effects in a link.',
    name: 'EffectLinkEffects',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.EFFECT, NWScriptDataType.EFFECT ],
    action: undefined
  },
  200: {
    comment: '200: Get the nNth object with the specified tag.\n- sTag\n- nNth: the nth object with this tag may be requested\n* Returns OBJECT_INVALID if the object cannot be found.',
    name: 'GetObjectByTag',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  201: {
    comment: '201: Adjust the alignment of oSubject.\n- oSubject\n- nAlignment:\n  -> ALIGNMENT_LIGHT_SIDE/ALIGNMENT_DARK_SIDE: oSubject\'s\n     alignment will be shifted in the direction specified\n  -> ALIGNMENT_NEUTRAL: nShift is applied to oSubject\'s dark side/light side\n     alignment value in the direction which is towards neutrality.\n    e.g. If oSubject has an alignment value of 80 (i.e. light side)\n         then if nShift is 15, the alignment value will become (80-15)=65\n    Furthermore, the shift will at most take the alignment value to 50 and\n    not beyond.\n    e.g. If oSubject has an alignment value of 40 then if nShift is 15,\n         the aligment value will become 50\n- nShift: this is the desired shift in alignment\n* No return value\n- bDontModifyNPCs - Defaults to \'FALSE\', if you pass in \'TRUE\' then you can adjust\n  the playercharacter\'s alignment without impacting the rest of the NPCs',
    name: 'AdjustAlignment',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  202: {
    comment: '202: Do nothing for fSeconds seconds.',
    name: 'ActionWait',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  203: {
    comment: '203: Set the transition bitmap of a player; this should only be called in area\ntransition scripts. This action should be run by the person \'clicking\' the\narea transition via AssignCommand.\n- nPredefinedAreaTransition:\n  -> To use a predefined area transition bitmap, use one of AREA_TRANSITION_*\n  -> To use a custom, user-defined area transition bitmap, use\n     AREA_TRANSITION_USER_DEFINED and specify the filename in the second\n     parameter\n- sCustomAreaTransitionBMP: this is the filename of a custom, user-defined\n  area transition bitmap',
    name: 'SetAreaTransitionBMP',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  204: {
    comment: 'AMF: APRIL 28, 2003 - I HAVE CHANGED THIS FUNCTION AS PER DAN\'S REQUEST\n204: Starts a conversation with oObjectToConverseWith - this will cause their\nOnDialog event to fire.\n- oObjectToConverseWith\n- sDialogResRef: If this is blank, the creature\'s own dialogue file will be used\n- bPrivateConversation: If this is blank, the default is FALSE.\n- nConversationType - If this is blank the default will be Cinematic, ie. a normal conversation type\n                                 other choices inclue: CONVERSATION_TYPE_COMPUTER\n  UPDATE:  nConversationType actually has no meaning anymore.  This has been replaced by a flag in the dialog editor.  However\n               for backwards compatability it has been left here.  So when using this command place CONVERSATION_TYPE_CINEMATIC in here. - DJF\n- bIgnoreStartRange - If this is blank the default will be FALSE, ie. Start conversation ranges are in effect\n                                                                     Setting this to TRUE will cause creatures to start a conversation without requiring to close\n                                                                     the distance between the two object in dialog.\n- sNameObjectToIgnore1-6 - Normally objects in the animation list of the dialog editor have to be available for animations on that node to work\n                                       these 6 strings are to indicate 6 objects that don�t need to be available for things to proceed.  The string should be EXACTLY\n                                       the same as the string that it represents in the dialog editor.\n- nBarkX and nBarkY - These override the left, top corner position for the bark string if the conversation starting is a bark string.\n                      They only happen on a conversation by conversation basis and don\'t stay in effect in subsequent conversations.',
    name: 'ActionStartConversation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    /**
     * TSL made some modifications to this function.
     * 4 additional arguments were added
     * int bUseLeader = FALSE, 
     * int nBarkX = -1, 
     * int nBarkY = -1, 
     * int bDontClearAllActions = 0
     * nBarkX, and nBarkY override the left, top corner position for the bark string if the conversation starting is a bark string. 
     * They only happen on a conversation by conversation basis and don't stay in effect in subsequent conversations.
     * @param this NWScriptInstance
     * @param args [oObjectToConverse: ModuleObject, sDialogResRef: string = "", bPrivateConversation: boolean = FALSE, nConversationType: number = CONVERSATION_TYPE_CINEMATIC, bIgnoreStartRange: boolean = FALSE, sNameObjectToIgnore1: string = "", sNameObjectToIgnore2: string = "", sNameObjectToIgnore3: string = "", sNameObjectToIgnore4: string = "", sNameObjectToIgnore5: string = "", sNameObjectToIgnore6: string = "", bUseLeader: boolean = FALSE, nBarkX: number = -1, nBarkY: number = -1, bDontClearAllActions: boolean = 0]
     */
    action: function(this: NWScriptInstance, args: [ModuleObject, string, number, number, number, string, string, string, string, string, string, number, number, number, number]){
      if(BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)){
        //I'm hardcoding ignoreStartRange to true because i'm finding instances where it's causing the player to move halfway across the map to start a conversation
        //even in ones that have nothing to do with the PC. Perhaps it was always meant to work this way?
        this.caller.actionDialogObject( args[0], args[1], true, args[2], args[3] );
      }else{
        console.error('ActionStartConversation', 'Caller is not an instance of ModuleObject');
      }
    }
  },
  205: {
    comment: '205: Pause the current conversation.',
    name: 'ActionPauseConversation',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  206: {
    comment: '206: Resume a conversation after it has been paused.',
    name: 'ActionResumeConversation',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  207: {
    comment: '207: Create a Beam effect.\n- nBeamVisualEffect: VFX_BEAM_*\n- oEffector: the beam is emitted from this creature\n- nBodyPart: BODY_NODE_*\n- bMissEffect: If this is TRUE, the beam will fire to a random vector near or\n  past the target\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nBeamVisualEffect is\n  not valid.',
    name: 'EffectBeam',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  208: {
    comment: '208: Get an integer between 0 and 100 (inclusive) that represents how oSource\nfeels about oTarget.\n-> 0-10 means oSource is hostile to oTarget\n-> 11-89 means oSource is neutral to oTarget\n-> 90-100 means oSource is friendly to oTarget\n* Returns -1 if oSource or oTarget does not identify a valid object',
    name: 'GetReputation',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  209: {
    comment: '209: Adjust how oSourceFactionMember\'s faction feels about oTarget by the\nspecified amount.\nNote: This adjusts Faction Reputation, how the entire faction that\noSourceFactionMember is in, feels about oTarget.\n* No return value',
    name: 'AdjustReputation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  210: {
    comment: '210: Gets the actual file name of the current module',
    name: 'GetModuleFileName',
    type: NWScriptDataType.STRING,
    args: [],
    action: undefined
  },
  211: {
    comment: '211: Get the creature that is going to attack oTarget.\nNote: This value is cleared out at the end of every combat round and should\nnot be used in any case except when getting a \'going to be attacked\' shout\nfrom the master creature (and this creature is a henchman)\n* Returns OBJECT_INVALID if oTarget is not a valid creature.',
    name: 'GetGoingToBeAttackedBy',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  212: {
    comment: '212: Create a Force Resistance Increase effect.\n- nValue: size of Force Resistance increase',
    name: 'EffectForceResistanceIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  213: {
    comment: '213: Get the location of oObject.',
    name: 'GetLocation',
    type: NWScriptDataType.LOCATION,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  214: {
    comment: '214: The subject will jump to lLocation instantly (even between areas).\nIf lLocation is invalid, nothing will happen.',
    name: 'ActionJumpToLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.LOCATION ],
    action: undefined
  },
  215: {
    comment: '215: Create a location.',
    name: 'Location',
    type: NWScriptDataType.LOCATION,
    args: [ NWScriptDataType.VECTOR, NWScriptDataType.FLOAT ],
    action: undefined
  },
  216: {
    comment: '216: Apply eEffect at lLocation.',
    name: 'ApplyEffectAtLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.EFFECT, NWScriptDataType.LOCATION, NWScriptDataType.FLOAT ],
    action: undefined
  },
  217: {
    comment: '217: * Returns TRUE if oCreature is a Player Controlled character.',
    name: 'GetIsPC',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  218: {
    comment: '218: Convert fFeet into a number of meters.',
    name: 'FeetToMeters',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  219: {
    comment: '219: Convert fYards into a number of meters.',
    name: 'YardsToMeters',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  220: {
    comment: '220: Apply eEffect to oTarget.',
    name: 'ApplyEffectToObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.EFFECT, NWScriptDataType.OBJECT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  221: {
    comment: '221: The caller will immediately speak sStringToSpeak (this is different from\nActionSpeakString)\n- sStringToSpeak\n- nTalkVolume: TALKVOLUME_*',
    name: 'SpeakString',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  222: {
    comment: '222: Get the location of the caller\'s last spell target.',
    name: 'GetSpellTargetLocation',
    type: NWScriptDataType.LOCATION,
    args: [],
    action: undefined
  },
  223: {
    comment: '223: Get the position vector from lLocation.',
    name: 'GetPositionFromLocation',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.LOCATION ],
    action: undefined
  },
  224: {
    comment: '224: the effect of body fule.. convers HP -> FP i think',
    name: 'EffectBodyFuel',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  225: {
    comment: '225: Get the orientation value from lLocation.',
    name: 'GetFacingFromLocation',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.LOCATION ],
    action: undefined
  },
  226: {
    comment: '226: Get the creature nearest to lLocation, subject to all the criteria specified.\n- nFirstCriteriaType: CREATURE_TYPE_*\n- nFirstCriteriaValue:\n  -> CLASS_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_CLASS\n  -> SPELL_* if nFirstCriteriaType was CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT\n     or CREATURE_TYPE_HAS_SPELL_EFFECT\n  -> TRUE or FALSE if nFirstCriteriaType was CREATURE_TYPE_IS_ALIVE\n  -> PERCEPTION_* if nFirstCriteriaType was CREATURE_TYPE_PERCEPTION\n  -> PLAYER_CHAR_IS_PC or PLAYER_CHAR_NOT_PC if nFirstCriteriaType was\n     CREATURE_TYPE_PLAYER_CHAR\n  -> RACIAL_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_RACIAL_TYPE\n  -> REPUTATION_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_REPUTATION\n  For example, to get the nearest PC, use\n  (CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC)\n- lLocation: We\'re trying to find the creature of the specified type that is\n  nearest to lLocation\n- nNth: We don\'t have to find the first nearest: we can find the Nth nearest....\n- nSecondCriteriaType: This is used in the same way as nFirstCriteriaType to\n  further specify the type of creature that we are looking for.\n- nSecondCriteriaValue: This is used in the same way as nFirstCriteriaValue\n  to further specify the type of creature that we are looking for.\n- nThirdCriteriaType: This is used in the same way as nFirstCriteriaType to\n  further specify the type of creature that we are looking for.\n- nThirdCriteriaValue: This is used in the same way as nFirstCriteriaValue to\n  further specify the type of creature that we are looking for.\n* Return value on error: OBJECT_INVALID',
    name: 'GetNearestCreatureToLocation',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  227: {
    comment: '227: Get the Nth object nearest to oTarget that is of the specified type.\n- nObjectType: OBJECT_TYPE_*\n- oTarget\n- nNth\n* Return value on error: OBJECT_INVALID',
    name: 'GetNearestObject',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  228: {
    comment: '228: Get the nNth object nearest to lLocation that is of the specified type.\n- nObjectType: OBJECT_TYPE_*\n- lLocation\n- nNth\n* Return value on error: OBJECT_INVALID',
    name: 'GetNearestObjectToLocation',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER ],
    action: undefined
  },
  229: {
    comment: '229: Get the nth Object nearest to oTarget that has sTag as its tag.\n* Return value on error: OBJECT_INVALID',
    name: 'GetNearestObjectByTag',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.STRING, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  230: {
    comment: '230: Convert nInteger into a floating point number.',
    name: 'IntToFloat',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  231: {
    comment: '231: Convert fFloat into the nearest integer.',
    name: 'FloatToInt',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  232: {
    comment: '232: Convert sNumber into an integer.',
    name: 'StringToInt',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  233: {
    comment: '233: Convert sNumber into a floating point number.',
    name: 'StringToFloat',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  234: {
    comment: '234: Cast spell nSpell at lTargetLocation.\n- nSpell: SPELL_*\n- lTargetLocation\n- nMetaMagic: METAMAGIC_*\n- bCheat: If this is TRUE, then the executor of the action doesn\'t have to be\n  able to cast the spell.\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*\n- bInstantSpell: If this is TRUE, the spell is cast immediately; this allows\n  the end-user to simulate\n  a high-level magic user having lots of advance warning of impending trouble.',
    name: 'ActionCastSpellAtLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  235: {
    comment: '235: * Returns TRUE if oSource considers oTarget as an enemy.',
    name: 'GetIsEnemy',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  236: {
    comment: '236: * Returns TRUE if oSource considers oTarget as a friend.',
    name: 'GetIsFriend',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  237: {
    comment: '237: * Returns TRUE if oSource considers oTarget as neutral.',
    name: 'GetIsNeutral',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  238: {
    comment: '238: Get the PC that is involved in the conversation.\n* Returns OBJECT_INVALID on error.',
    name: 'GetPCSpeaker',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  239: {
    comment: '239: Get a string from the talk table using nStrRef.',
    name: 'GetStringByStrRef',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  240: {
    comment: '240: Causes the creature to speak a translated string.\n- nStrRef: Reference of the string in the talk table\n- nTalkVolume: TALKVOLUME_*',
    name: 'ActionSpeakStringByStrRef',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  241: {
    comment: '241: Destroy oObject (irrevocably).\nThis will not work on modules and areas.\nThe bNoFade and fDelayUntilFade are for creatures and placeables only',
    name: 'DestroyObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.FLOAT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  242: {
    comment: '242: Get the module.\n* Return value on error: OBJECT_INVALID',
    name: 'GetModule',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  243: {
    comment: '243: Create an object of the specified type at lLocation.\n- nObjectType: OBJECT_TYPE_ITEM, OBJECT_TYPE_CREATURE, OBJECT_TYPE_PLACEABLE,\n  OBJECT_TYPE_STORE\n- sTemplate\n- lLocation\n- bUseAppearAnimation\nWaypoints can now also be created using the CreateObject function.\nnObjectType is: OBJECT_TYPE_WAYPOINT\nsTemplate will be the tag of the waypoint\nlLocation is where the waypoint will be placed\nbUseAppearAnimation is ignored',
    name: 'CreateObject',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER ],
    action: undefined
  },
  244: {
    comment: '244: Create an event which triggers the \'SpellCastAt\' script',
    name: 'EventSpellCastAt',
    type: NWScriptDataType.EVENT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  245: {
    comment: '245: This is for use in a \'Spell Cast\' script, it gets who cast the spell.\nThe spell could have been cast by a creature, placeable or door.\n* Returns OBJECT_INVALID if the caller is not a creature, placeable or door.',
    name: 'GetLastSpellCaster',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  246: {
    comment: '246: This is for use in a \'Spell Cast\' script, it gets the ID of the spell that\nwas cast.',
    name: 'GetLastSpell',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  247: {
    comment: '247: This is for use in a user-defined script, it gets the event number.',
    name: 'GetUserDefinedEventNumber',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  248: {
    comment: '248: This is for use in a Spell script, it gets the ID of the spell that is being\ncast (SPELL_*).',
    name: 'GetSpellId',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  249: {
    comment: '249: Generate a random name.',
    name: 'RandomName',
    type: NWScriptDataType.STRING,
    args: [],
    action: undefined
  },
  250: {
    comment: '250: Create a Poison effect.\n- nPoisonType: POISON_*',
    name: 'EffectPoison',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  251: {
    comment: '251: Returns whether this script is being run\n     while a load game is in progress',
    name: 'GetLoadFromSaveGame',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  252: {
    comment: '252: Assured Deflection\nThis effect ensures that all projectiles shot at a jedi will be deflected\nwithout doing an opposed roll.  It takes an optional parameter to say whether\nthe deflected projectile will return to the attacker and cause damage',
    name: 'EffectAssuredDeflection',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  253: {
    comment: '253: Get the name of oObject.',
    name: 'GetName',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  254: {
    comment: '254: Use this in a conversation script to get the person with whom you are conversing.\n* Returns OBJECT_INVALID if the caller is not a valid creature.',
    name: 'GetLastSpeaker',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  255: {
    comment: '255: Use this in an OnDialog script to start up the dialog tree.\n- sResRef: if this is not specified, the default dialog file will be used\n- oObjectToDialog: if this is not specified the person that triggered the\n  event will be used',
    name: 'BeginConversation',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING, NWScriptDataType.OBJECT ],
    action: undefined
  },
  256: {
    comment: '256: Use this in an OnPerception script to get the object that was perceived.\n* Returns OBJECT_INVALID if the caller is not a valid creature.',
    name: 'GetLastPerceived',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  257: {
    comment: '257: Use this in an OnPerception script to determine whether the object that was\nperceived was heard.',
    name: 'GetLastPerceptionHeard',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  258: {
    comment: '258: Use this in an OnPerception script to determine whether the object that was\nperceived has become inaudible.',
    name: 'GetLastPerceptionInaudible',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  259: {
    comment: '259: Use this in an OnPerception script to determine whether the object that was\nperceived was seen.',
    name: 'GetLastPerceptionSeen',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  260: {
    comment: '260: Use this in an OnClosed script to get the object that closed the door or placeable.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.',
    name: 'GetLastClosedBy',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  261: {
    comment: '261: Use this in an OnPerception script to determine whether the object that was\nperceived has vanished.',
    name: 'GetLastPerceptionVanished',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  262: {
    comment: '262: Get the first object within oPersistentObject.\n- oPersistentObject\n- nResidentObjectType: OBJECT_TYPE_*\n- nPersistentZone: PERSISTENT_ZONE_ACTIVE. [This could also take the value\n  PERSISTENT_ZONE_FOLLOW, but this is no longer used.]\n* Returns OBJECT_INVALID if no object is found.',
    name: 'GetFirstInPersistentObject',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  263: {
    comment: '263: Get the next object within oPersistentObject.\n- oPersistentObject\n- nResidentObjectType: OBJECT_TYPE_*\n- nPersistentZone: PERSISTENT_ZONE_ACTIVE. [This could also take the value\n  PERSISTENT_ZONE_FOLLOW, but this is no longer used.]\n* Returns OBJECT_INVALID if no object is found.',
    name: 'GetNextInPersistentObject',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  264: {
    comment: '264: This returns the creator of oAreaOfEffectObject.\n* Returns OBJECT_INVALID if oAreaOfEffectObject is not a valid Area of Effect object.',
    name: 'GetAreaOfEffectCreator',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  265: {
    comment: '265: Brings up the level up GUI for the player.  The GUI will only show up\n     if the player has gained enough experience points to level up.\n* Returns TRUE if the GUI was successfully brought up; FALSE if not.',
    name: 'ShowLevelUpGUI',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  266: {
    comment: '266: Flag the specified item as being non-equippable or not.  Set bNonEquippable\n     to TRUE to prevent this item from being equipped, and FALSE to allow\n     the normal equipping checks to determine if the item can be equipped.\nNOTE: This will do nothing if the object passed in is not an item.  Items that\n      are already equipped when this is called will not automatically be\n      unequipped.  These items will just be prevented from being re-equipped\n      should they be unequipped.',
    name: 'SetItemNonEquippable',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  267: {
    comment: '267: GetButtonMashCheck\nThis function returns whether the button mash check, used for the combat tutorial, is on',
    name: 'GetButtonMashCheck',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  268: {
    comment: '268: SetButtonMashCheck\nThis function sets the button mash check variable, and is used for turning the check on and off',
    name: 'SetButtonMashCheck',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  269: {
    comment: '269: EffectForcePushTargeted\nThis effect is exactly the same as force push, except it takes a location parameter that specifies\nwhere the location of the force push is to be done from.  All orientations are also based on this location.\nAMF:  The new ignore test direct line variable should be used with extreme caution\nIt overrides geometry checks for force pushes, so that the object that the effect is applied to\nis guaranteed to move that far, ignoring collisions.  It is best used for cutscenes.',
    name: 'EffectForcePushTargeted',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.LOCATION, NWScriptDataType.INTEGER ],
    action: undefined
  },
  270: {
    comment: '270: Create a Haste effect.',
    name: 'EffectHaste',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  271: {
    comment: '271: Give oItem to oGiveTo (instant; for similar Action use ActionGiveItem)\nIf oItem is not a valid item, or oGiveTo is not a valid object, nothing will\nhappen.',
    name: 'GiveItem',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  272: {
    comment: '272: Convert oObject into a hexadecimal string.',
    name: 'ObjectToString',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  273: {
    comment: '273: Create an Immunity effect.\n- nImmunityType: IMMUNITY_TYPE_*',
    name: 'EffectImmunity',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  274: {
    comment: '274: - oCreature\n- nImmunityType: IMMUNITY_TYPE_*\n- oVersus: if this is specified, then we also check for the race and\n  alignment of oVersus\n* Returns TRUE if oCreature has immunity of type nImmunity versus oVersus.',
    name: 'GetIsImmune',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  275: {
    comment: '275: Creates a Damage Immunity Increase effect.\n- nDamageType: DAMAGE_TYPE_*\n- nPercentImmunity',
    name: 'EffectDamageImmunityIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  276: {
    comment: '276: Determine whether oEncounter is active.',
    name: 'GetEncounterActive',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  277: {
    comment: '277: Set oEncounter\'s active state to nNewValue.\n- nNewValue: TRUE/FALSE\n- oEncounter',
    name: 'SetEncounterActive',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  278: {
    comment: '278: Get the maximum number of times that oEncounter will spawn.',
    name: 'GetEncounterSpawnsMax',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  279: {
    comment: '279: Set the maximum number of times that oEncounter can spawn',
    name: 'SetEncounterSpawnsMax',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  280: {
    comment: '280: Get the number of times that oEncounter has spawned so far',
    name: 'GetEncounterSpawnsCurrent',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  281: {
    comment: '281: Set the number of times that oEncounter has spawned so far',
    name: 'SetEncounterSpawnsCurrent',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  282: {
    comment: '282: Use this in an OnItemAcquired script to get the item that was acquired.\n* Returns OBJECT_INVALID if the module is not valid.',
    name: 'GetModuleItemAcquired',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  283: {
    comment: '283: Use this in an OnItemAcquired script to get the creatre that previously\npossessed the item.\n* Returns OBJECT_INVALID if the item was picked up from the ground.',
    name: 'GetModuleItemAcquiredFrom',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  284: {
    comment: '284: Set the value for a custom token.',
    name: 'SetCustomToken',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  285: {
    comment: '285: Determine whether oCreature has nFeat, and nFeat is useable.\nPLEASE NOTE!!! - This function will return FALSE if the target\nis not currently able to use the feat due to daily limits or\nother restrictions. Use GetFeatAcquired() if you just want to\nknow if they\'ve got it or not.\n- nFeat: FEAT_*\n- oCreature',
    name: 'GetHasFeat',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  286: {
    comment: '286: Determine whether oCreature has nSkill, and nSkill is useable.\n- nSkill: SKILL_*\n- oCreature',
    name: 'GetHasSkill',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  287: {
    comment: '287: Use nFeat on oTarget.\n- nFeat: FEAT_*\n- oTarget',
    name: 'ActionUseFeat',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  288: {
    comment: '288: Runs the action \'UseSkill\' on the current creature\nUse nSkill on oTarget.\n- nSkill: SKILL_*\n- oTarget\n- nSubSkill: SUBSKILL_*\n- oItemUsed: Item to use in conjunction with the skill',
    name: 'ActionUseSkill',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  289: {
    comment: '289: Determine whether oSource sees oTarget.',
    name: 'GetObjectSeen',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  290: {
    comment: '290: Determine whether oSource hears oTarget.',
    name: 'GetObjectHeard',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  291: {
    comment: '291: Use this in an OnPlayerDeath module script to get the last player that died.',
    name: 'GetLastPlayerDied',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  292: {
    comment: '292: Use this in an OnItemLost script to get the item that was lost/dropped.\n* Returns OBJECT_INVALID if the module is not valid.',
    name: 'GetModuleItemLost',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  293: {
    comment: '293: Use this in an OnItemLost script to get the creature that lost the item.\n* Returns OBJECT_INVALID if the module is not valid.',
    name: 'GetModuleItemLostBy',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  294: {
    comment: '294: Do aActionToDo.',
    name: 'ActionDoCommand',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.ACTION ],
    action: undefined
  },
  295: {
    comment: '295: Conversation event.',
    name: 'EventConversation',
    type: NWScriptDataType.EVENT,
    args: [],
    action: undefined
  },
  296: {
    comment: '296: Set the difficulty level of oEncounter.\n- nEncounterDifficulty: ENCOUNTER_DIFFICULTY_*\n- oEncounter',
    name: 'SetEncounterDifficulty',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  297: {
    comment: '297: Get the difficulty level of oEncounter.',
    name: 'GetEncounterDifficulty',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  298: {
    comment: '298: Get the distance between lLocationA and lLocationB.',
    name: 'GetDistanceBetweenLocations',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.LOCATION, NWScriptDataType.LOCATION ],
    action: undefined
  },
  299: {
    comment: '299: Use this in spell scripts to get nDamage adjusted by oTarget\'s reflex and\nevasion saves.\n- nDamage\n- oTarget\n- nDC: Difficulty check\n- nSaveType: SAVING_THROW_TYPE_*\n- oSaveVersus',
    name: 'GetReflexAdjustedDamage',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  300: {
    comment: '300: Play nAnimation immediately.\n- nAnimation: ANIMATION_*\n- fSpeed\n- fSeconds: Duration of the animation (this is not used for Fire and\n  Forget animations) If a time of -1.0f is specified for a looping animation\n  it will loop until the next animation is applied.',
    name: 'PlayAnimation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  301: {
    comment: '301: Create a Spell Talent.\n- nSpell: SPELL_*',
    name: 'TalentSpell',
    type: NWScriptDataType.TALENT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  302: {
    comment: '302: Create a Feat Talent.\n- nFeat: FEAT_*',
    name: 'TalentFeat',
    type: NWScriptDataType.TALENT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  303: {
    comment: '303: Create a Skill Talent.\n- nSkill: SKILL_*',
    name: 'TalentSkill',
    type: NWScriptDataType.TALENT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  304: {
    comment: '304: Determine if oObject has effects originating from nSpell.\n- nSpell: SPELL_*\n- oObject',
    name: 'GetHasSpellEffect',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  305: {
    comment: '305: Get the spell (SPELL_*) that applied eSpellEffect.\n* Returns -1 if eSpellEffect was applied outside a spell script.',
    name: 'GetEffectSpellId',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  306: {
    comment: '306: Determine whether oCreature has tTalent.',
    name: 'GetCreatureHasTalent',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.TALENT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  307: {
    comment: '307: Get a random talent of oCreature, within nCategory.\n- nCategory: TALENT_CATEGORY_*\n- oCreature\n- nInclusion: types of talent to include',
    name: 'GetCreatureTalentRandom',
    type: NWScriptDataType.TALENT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  308: {
    comment: '308: Get the best talent (i.e. closest to nCRMax without going over) of oCreature,\nwithin nCategory.\n- nCategory: TALENT_CATEGORY_*\n- nCRMax: Challenge Rating of the talent\n- oCreature\n- nInclusion: types of talent to include\n- nExcludeType: TALENT_TYPE_FEAT or TALENT_TYPE_FORCE, type of talent that we wish to ignore\n- nExcludeId: Talent ID of the talent we wish to ignore.\n  A value of TALENT_EXCLUDE_ALL_OF_TYPE for this parameter will mean that all talents of\n  type nExcludeType are ignored.',
    name: 'GetCreatureTalentBest',
    type: NWScriptDataType.TALENT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  309: {
    comment: '309: Use tChosenTalent on oTarget.',
    name: 'ActionUseTalentOnObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.TALENT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  310: {
    comment: '310: Use tChosenTalent at lTargetLocation.',
    name: 'ActionUseTalentAtLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.TALENT, NWScriptDataType.LOCATION ],
    action: undefined
  },
  311: {
    comment: '311: Get the gold piece value of oItem.\n* Returns 0 if oItem is not a valid item.',
    name: 'GetGoldPieceValue',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  312: {
    comment: '312: * Returns TRUE if oCreature is of a playable racial type.',
    name: 'GetIsPlayableRacialType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  313: {
    comment: '313: Jump to lDestination.  The action is added to the TOP of the action queue.',
    name: 'JumpToLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.LOCATION ],
    action: undefined
  },
  314: {
    comment: '314: Create a Temporary Hitpoints effect.\n- nHitPoints: a positive integer\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nHitPoints < 0.',
    name: 'EffectTemporaryHitpoints',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  315: {
    comment: '315: Get the number of ranks that oTarget has in nSkill.\n- nSkill: SKILL_*\n- oTarget\n* Returns -1 if oTarget doesn\'t have nSkill.\n* Returns 0 if nSkill is untrained.',
    name: 'GetSkillRank',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  316: {
    comment: '316: Get the attack target of oCreature.\nThis only works when oCreature is in combat.',
    name: 'GetAttackTarget',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  317: {
    comment: '317: Get the attack type (SPECIAL_ATTACK_*) of oCreature\'s last attack.\nThis only works when oCreature is in combat.',
    name: 'GetLastAttackType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  318: {
    comment: '318: Get the attack mode (COMBAT_MODE_*) of oCreature\'s last attack.\nThis only works when oCreature is in combat.',
    name: 'GetLastAttackMode',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  319: {
    comment: '319: Get the distance in metres between oObjectA and oObjectB in 2D.\n* Return value if either object is invalid: 0.0f',
    name: 'GetDistanceBetween2D',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  320: {
    comment: '320: * Returns TRUE if oCreature is in combat.\n//RWT-OEI 09/30/04 - If you pass TRUE in as the second parameter then\n//this function will only return true if the character is in REAL combat.\n//If you don\'t know what that means, don\'t pass in TRUE.',
    name: 'GetIsInCombat',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  321: {
    comment: '321: Get the last command (ASSOCIATE_COMMAND_*) issued to oAssociate.',
    name: 'GetLastAssociateCommand',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  322: {
    comment: '322: Give nGP gold to oCreature.',
    name: 'GiveGoldToCreature',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  323: {
    comment: '323: Set the destroyable status of the caller.\n- bDestroyable: If this is FALSE, the caller does not fade out on death, but\n  sticks around as a corpse.\n- bRaiseable: If this is TRUE, the caller can be raised via resurrection.\n- bSelectableWhenDead: If this is TRUE, the caller is selectable after death.',
    name: 'SetIsDestroyable',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  324: {
    comment: '324: Set the locked state of oTarget, which can be a door or a placeable object.',
    name: 'SetLocked',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  325: {
    comment: '325: Get the locked state of oTarget, which can be a door or a placeable object.',
    name: 'GetLocked',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  326: {
    comment: '326: Use this in a trigger\'s OnClick event script to get the object that last\nclicked on it.\nThis is identical to GetEnteringObject.',
    name: 'GetClickingObject',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  327: {
    comment: '327: Initialise oTarget to listen for the standard Associates commands.',
    name: 'SetAssociateListenPatterns',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  328: {
    comment: '328: Get the last weapon that oCreature used in an attack.\n* Returns OBJECT_INVALID if oCreature did not attack, or has no weapon equipped.',
    name: 'GetLastWeaponUsed',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  329: {
    comment: '329: Use oPlaceable.',
    name: 'ActionInteractObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  330: {
    comment: '330: Get the last object that used the placeable object that is calling this function.\n* Returns OBJECT_INVALID if it is called by something other than a placeable or\n  a door.',
    name: 'GetLastUsedBy',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  331: {
    comment: '331: Returns the ability modifier for the specified ability\nGet oCreature\'s ability modifier for nAbility.\n- nAbility: ABILITY_*\n- oCreature',
    name: 'GetAbilityModifier',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  332: {
    comment: '332: Determined whether oItem has been identified.',
    name: 'GetIdentified',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  333: {
    comment: '333: Set whether oItem has been identified.',
    name: 'SetIdentified',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  334: {
    comment: '334: Get the distance between lLocationA and lLocationB. in 2D',
    name: 'GetDistanceBetweenLocations2D',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.LOCATION, NWScriptDataType.LOCATION ],
    action: undefined
  },
  335: {
    comment: '335: Get the distance from the caller to oObject in metres.\n* Return value on error: -1.0f',
    name: 'GetDistanceToObject2D',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  336: {
    comment: '336: Get the last blocking door encountered by the caller of this function.\n* Returns OBJECT_INVALID if the caller is not a valid creature.',
    name: 'GetBlockingDoor',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  337: {
    comment: '337: - oTargetDoor\n- nDoorAction: DOOR_ACTION_*\n* Returns TRUE if nDoorAction can be performed on oTargetDoor.',
    name: 'GetIsDoorActionPossible',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  338: {
    comment: '338: Perform nDoorAction on oTargetDoor.',
    name: 'DoDoorAction',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  339: {
    comment: '339: Get the first item in oTarget\'s inventory (start to cycle through oTarget\'s\ninventory).\n* Returns OBJECT_INVALID if the caller is not a creature, item, placeable or store,\n  or if no item is found.',
    name: 'GetFirstItemInInventory',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  340: {
    comment: '340: Get the next item in oTarget\'s inventory (continue to cycle through oTarget\'s\ninventory).\n* Returns OBJECT_INVALID if the caller is not a creature, item, placeable or store,\n  or if no item is found.',
    name: 'GetNextItemInInventory',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  341: {
    comment: '341: A creature can have up to three classes.  This function determines the\ncreature\'s class (CLASS_TYPE_*) based on nClassPosition.\n- nClassPosition: 1, 2 or 3\n- oCreature\n* Returns CLASS_TYPE_INVALID if the oCreature does not have a class in\n  nClassPosition (i.e. a single-class creature will only have a value in\n  nClassLocation=1) or if oCreature is not a valid creature.',
    name: 'GetClassByPosition',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  342: {
    comment: '342: A creature can have up to three classes.  This function determines the\ncreature\'s class level based on nClass Position.\n- nClassPosition: 1, 2 or 3\n- oCreature\n* Returns 0 if oCreature does not have a class in nClassPosition\n  (i.e. a single-class creature will only have a value in nClassLocation=1)\n  or if oCreature is not a valid creature.',
    name: 'GetLevelByPosition',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  343: {
    comment: '343: Determine the levels that oCreature holds in nClassType.\n- nClassType: CLASS_TYPE_*\n- oCreature',
    name: 'GetLevelByClass',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  344: {
    comment: '344: Get the amount of damage of type nDamageType that has been dealt to the caller.\n- nDamageType: DAMAGE_TYPE_*',
    name: 'GetDamageDealtByType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  345: {
    comment: '345: Get the total amount of damage that has been dealt to the caller.',
    name: 'GetTotalDamageDealt',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  346: {
    comment: '346: Get the last object that damaged the caller.\n* Returns OBJECT_INVALID if the caller is not a valid object.',
    name: 'GetLastDamager',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  347: {
    comment: '347: Get the last object that disarmed the trap on the caller.\n* Returns OBJECT_INVALID if the caller is not a valid placeable, trigger or\n  door.',
    name: 'GetLastDisarmed',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  348: {
    comment: '348: Get the last object that disturbed the inventory of the caller.\n* Returns OBJECT_INVALID if the caller is not a valid creature or placeable.',
    name: 'GetLastDisturbed',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  349: {
    comment: '349: Get the last object that locked the caller.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.',
    name: 'GetLastLocked',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  350: {
    comment: '350: Get the last object that unlocked the caller.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.',
    name: 'GetLastUnlocked',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  351: {
    comment: '351: Create a Skill Increase effect.\n- nSkill: SKILL_*\n- nValue\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid.',
    name: 'EffectSkillIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  352: {
    comment: '352: Get the type of disturbance (INVENTORY_DISTURB_*) that caused the caller\'s\nOnInventoryDisturbed script to fire.  This will only work for creatures and\nplaceables.',
    name: 'GetInventoryDisturbType',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  353: {
    comment: '353: get the item that caused the caller\'s OnInventoryDisturbed script to fire.\n* Returns OBJECT_INVALID if the caller is not a valid object.',
    name: 'GetInventoryDisturbItem',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  354: {
    comment: '354: Displays the upgrade screen where the player can modify weapons and armor\nIf oItem is NOT invalid, then the player will be forced to upgrade oItem and only oItem.\nIf oCharacter is NOT invalid, then that character\'s various skills will be used... *NOT IMPLEMENTED*\nIf nDisableItemCreation = TRUE, then the player will not be able to access the item creation screen\nIf nDisableUpgrade = TRUE, then the player will be forced straight to item creation and not be able\n     to access Item Upgrading.',
    name: 'ShowUpgradeScreen',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  355: {
    comment: '355: Set eEffect to be versus a specific alignment.\n- eEffect\n- nLawChaos: ALIGNMENT_LAWFUL/ALIGNMENT_CHAOTIC/ALIGNMENT_ALL\n- nGoodEvil: ALIGNMENT_GOOD/ALIGNMENT_EVIL/ALIGNMENT_ALL',
    name: 'VersusAlignmentEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.EFFECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  356: {
    comment: '356: Set eEffect to be versus nRacialType.\n- eEffect\n- nRacialType: RACIAL_TYPE_*',
    name: 'VersusRacialTypeEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.EFFECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  357: {
    comment: '357: Set eEffect to be versus traps.',
    name: 'VersusTrapEffect',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.EFFECT ],
    action: undefined
  },
  358: {
    comment: '358: Get the gender of oCreature.',
    name: 'GetGender',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  359: {
    comment: '359: * Returns TRUE if tTalent is valid.',
    name: 'GetIsTalentValid',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.TALENT ],
    action: undefined
  },
  360: {
    comment: '360: Causes the action subject to move away from lMoveAwayFrom.',
    name: 'ActionMoveAwayFromLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  361: {
    comment: '361: Get the target that the caller attempted to attack - this should be used in\nconjunction with GetAttackTarget(). This value is set every time an attack is\nmade, and is reset at the end of combat.\n* Returns OBJECT_INVALID if the caller is not a valid creature.',
    name: 'GetAttemptedAttackTarget',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  362: {
    comment: '362: Get the type (TALENT_TYPE_*) of tTalent.',
    name: 'GetTypeFromTalent',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.TALENT ],
    action: undefined
  },
  363: {
    comment: '363: Get the ID of tTalent.  This could be a SPELL_*, FEAT_* or SKILL_*.',
    name: 'GetIdFromTalent',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.TALENT ],
    action: undefined
  },
  364: {
    comment: '364: Starts a game of pazaak.\n- nOpponentPazaakDeck: Index into PazaakDecks.2da; specifies which deck the opponent will use.\n- sEndScript: Script to be run when game finishes.\n- nMaxWager: Max player wager.  If <= 0, the player\'s credits won\'t be modified by the result of the game and the wager screen will not show up.\n- bShowTutorial: Plays in tutorial mode (nMaxWager should be 0).',
    name: 'PlayPazaak',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  365: {
    comment: '365: Returns result of last Pazaak game.  Should be used only in an EndScript sent to PlayPazaak.\n* Returns 0 if player loses, 1 if player wins.',
    name: 'GetLastPazaakResult',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  366: {
    comment: '366:  displays a feed back string for the object spicified and the constant\nrepersents the string to be displayed see:FeedBackText.2da',
    name: 'DisplayFeedBackText',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  367: {
    comment: '367: Add a journal quest entry to the player.\n- szPlotID: the plot identifier used in the toolset\'s Journal Editor\n- nState: the state of the plot as seen in the toolset\'s Journal Editor\n- bAllowOverrideHigher: If this is TRUE, you can set the state to a lower\n  number than the one it is currently on',
    name: 'AddJournalQuestEntry',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  368: {
    comment: '368: Remove a journal quest entry from the player.\n- szPlotID: the plot identifier used in the toolset\'s Journal Editor',
    name: 'RemoveJournalQuestEntry',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  369: {
    comment: '369: Gets the State value of a journal quest.  Returns 0 if no quest entry has been added for this szPlotID.\n- szPlotID: the plot identifier used in the toolset\'s Journal Editor',
    name: 'GetJournalEntry',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  370: {
    comment: '370: PlayRumblePattern\nStarts a defined rumble pattern playing',
    name: 'PlayRumblePattern',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  371: {
    comment: '371: StopRumblePattern\nStops a defined rumble pattern',
    name: 'StopRumblePattern',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  372: {
    comment: '372: Damages the creatures force points',
    name: 'EffectDamageForcePoints',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  373: {
    comment: '373: Heals the creatures force points',
    name: 'EffectHealForcePoints',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  374: {
    comment: '374: Send a server message (szMessage) to the oPlayer.',
    name: 'SendMessageToPC',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.STRING ],
    action: undefined
  },
  375: {
    comment: '375: Get the target at which the caller attempted to cast a spell.\nThis value is set every time a spell is cast and is reset at the end of\ncombat.\n* Returns OBJECT_INVALID if the caller is not a valid creature.',
    name: 'GetAttemptedSpellTarget',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  376: {
    comment: '376: Get the last creature that opened the caller.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.',
    name: 'GetLastOpenedBy',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  377: {
    comment: '377: Determine whether oCreature has nSpell memorised.\nPLEASE NOTE!!! - This function will return FALSE if the target\nis not currently able to use the spell due to lack of sufficient\nForce Points. Use GetSpellAcquired() if you just want to\nknow if they\'ve got it or not.\n- nSpell: SPELL_*\n- oCreature',
    name: 'GetHasSpell',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  378: {
    comment: '378: Open oStore for oPC.',
    name: 'OpenStore',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  379: {
    comment: '379:',
    name: 'ActionSurrenderToEnemies',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  380: {
    comment: '380: Get the first member of oMemberOfFaction\'s faction (start to cycle through\noMemberOfFaction\'s faction).\n* Returns OBJECT_INVALID if oMemberOfFaction\'s faction is invalid.',
    name: 'GetFirstFactionMember',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  381: {
    comment: '381: Get the next member of oMemberOfFaction\'s faction (continue to cycle through\noMemberOfFaction\'s faction).\n* Returns OBJECT_INVALID if oMemberOfFaction\'s faction is invalid.',
    name: 'GetNextFactionMember',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  382: {
    comment: '382: Force the action subject to move to lDestination.',
    name: 'ActionForceMoveToLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  383: {
    comment: '383: Force the action subject to move to oMoveTo.',
    name: 'ActionForceMoveToObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  384: {
    comment: '384: Get the experience assigned in the journal editor for szPlotID.',
    name: 'GetJournalQuestExperience',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  385: {
    comment: '385: Jump to oToJumpTo (the action is added to the top of the action queue).',
    name: 'JumpToObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  386: {
    comment: '386: Set whether oMapPin is enabled.\n- oMapPin\n- nEnabled: 0=Off, 1=On',
    name: 'SetMapPinEnabled',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  387: {
    comment: '387: Create a Hit Point Change When Dying effect.\n- fHitPointChangePerRound: this can be positive or negative, but not zero.\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if fHitPointChangePerRound is 0.',
    name: 'EffectHitPointChangeWhenDying',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  388: {
    comment: '388: Spawn a GUI panel for the client that controls oPC.\n- oPC\n- nGUIPanel: GUI_PANEL_*\n* Nothing happens if oPC is not a player character or if an invalid value is\n  used for nGUIPanel.',
    name: 'PopUpGUIPanel',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  389: {
    comment: '389: This allows you to add a new class to any creature object',
    name: 'AddMultiClass',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  390: {
    comment: '390: Tests a linked effect to see if the target is immune to it.\nIf the target is imune to any of the linked effect then he is immune to all of it',
    name: 'GetIsLinkImmune',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.EFFECT ],
    action: undefined
  },
  391: {
    comment: '391: Stunn the droid',
    name: 'EffectDroidStun',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  392: {
    comment: '392: Force push the creature...',
    name: 'EffectForcePushed',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  393: {
    comment: '393: Gives nXpAmount to oCreature.',
    name: 'GiveXPToCreature',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  394: {
    comment: '394: Sets oCreature\'s experience to nXpAmount.',
    name: 'SetXP',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  395: {
    comment: '395: Get oCreature\'s experience.',
    name: 'GetXP',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  396: {
    comment: '396: Convert nInteger to hex, returning the hex value as a string.\n* Return value has the format \'0x????????\' where each ? will be a hex digit\n  (8 digits in total).',
    name: 'IntToHexString',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  397: {
    comment: '397: Get the base item type (BASE_ITEM_*) of oItem.\n* Returns BASE_ITEM_INVALID if oItem is an invalid item.',
    name: 'GetBaseItemType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  398: {
    comment: '398: Determines whether oItem has nProperty.\n- oItem\n- nProperty: ITEM_PROPERTY_*\n* Returns FALSE if oItem is not a valid item, or if oItem does not have\n  nProperty.',
    name: 'GetItemHasItemProperty',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  399: {
    comment: '399: The creature will equip the melee weapon in its possession that can do the\nmost damage. If no valid melee weapon is found, it will equip the most\ndamaging range weapon. This function should only ever be called in the\nEndOfCombatRound scripts, because otherwise it would have to stop the combat\nround to run simulation.\n- oVersus: You can try to get the most damaging weapon against oVersus\n- bOffHand',
    name: 'ActionEquipMostDamagingMelee',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  400: {
    comment: '400: The creature will equip the range weapon in its possession that can do the\nmost damage.\nIf no valid range weapon can be found, it will equip the most damaging melee\nweapon.\n- oVersus: You can try to get the most damaging weapon against oVersus',
    name: 'ActionEquipMostDamagingRanged',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  401: {
    comment: '401: Get the Armour Class of oItem.\n* Return 0 if the oItem is not a valid item, or if oItem has no armour value.',
    name: 'GetItemACValue',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  402: {
    comment: '402:\nEffect that will play an animation and display a visual effect to indicate the\ntarget has resisted a force power.',
    name: 'EffectForceResisted',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  403: {
    comment: '403: Expose the entire map of oArea to oPlayer.',
    name: 'ExploreAreaForPlayer',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  404: {
    comment: '404: The creature will equip the armour in its possession that has the highest\narmour class.',
    name: 'ActionEquipMostEffectiveArmor',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  405: {
    comment: '405: * Returns TRUE if it is currently day.',
    name: 'GetIsDay',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  406: {
    comment: '406: * Returns TRUE if it is currently night.',
    name: 'GetIsNight',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  407: {
    comment: '407: * Returns TRUE if it is currently dawn.',
    name: 'GetIsDawn',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  408: {
    comment: '408: * Returns TRUE if it is currently dusk.',
    name: 'GetIsDusk',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  409: {
    comment: '409: * Returns TRUE if oCreature was spawned from an encounter.',
    name: 'GetIsEncounterCreature',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  410: {
    comment: '410: Use this in an OnPlayerDying module script to get the last player who is dying.',
    name: 'GetLastPlayerDying',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  411: {
    comment: '411: Get the starting location of the module.',
    name: 'GetStartingLocation',
    type: NWScriptDataType.LOCATION,
    args: [],
    action: undefined
  },
  412: {
    comment: '412: Make oCreatureToChange join one of the standard factions.\n** This will only work on an NPC **\n- nStandardFaction: STANDARD_FACTION_*',
    name: 'ChangeToStandardFaction',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  413: {
    comment: '413: Play oSound.',
    name: 'SoundObjectPlay',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  414: {
    comment: '414: Stop playing oSound.',
    name: 'SoundObjectStop',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  415: {
    comment: '415: Set the volume of oSound.\n- oSound\n- nVolume: 0-127',
    name: 'SoundObjectSetVolume',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  416: {
    comment: '416: Set the position of oSound.',
    name: 'SoundObjectSetPosition',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.VECTOR ],
    action: undefined
  },
  417: {
    comment: '417: Immediately speak a conversation one-liner.\n- sDialogResRef\n- oTokenTarget: This must be specified if there are creature-specific tokens\n  in the string.',
    name: 'SpeakOneLinerConversation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.OBJECT ],
    action: undefined
  },
  418: {
    comment: '418: Get the amount of gold possessed by oTarget.',
    name: 'GetGold',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  419: {
    comment: '419: Use this in an OnRespawnButtonPressed module script to get the object id of\nthe player who last pressed the respawn button.',
    name: 'GetLastRespawnButtonPresser',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  420: {
    comment: '420:\nEffect that will display a visual effect on the specified object\'s hand to\nindicate a force power has fizzled out.',
    name: 'EffectForceFizzle',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  421: {
    comment: '421: SetLightsaberPowered\nAllows a script to set the state of the lightsaber.  This will override any\ngame determined lightsaber powerstates.',
    name: 'SetLightsaberPowered',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  422: {
    comment: '422: * Returns TRUE if the weapon equipped is capable of damaging oVersus.',
    name: 'GetIsWeaponEffective',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  423: {
    comment: '423: Use this in a SpellCast script to determine whether the spell was considered\nharmful.\n* Returns TRUE if the last spell cast was harmful.',
    name: 'GetLastSpellHarmful',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  424: {
    comment: '424: Activate oItem.',
    name: 'EventActivateItem',
    type: NWScriptDataType.EVENT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.LOCATION, NWScriptDataType.OBJECT ],
    action: undefined
  },
  425: {
    comment: '425: Play the background music for oArea.',
    name: 'MusicBackgroundPlay',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  426: {
    comment: '426: Stop the background music for oArea.',
    name: 'MusicBackgroundStop',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  427: {
    comment: '427: Set the delay for the background music for oArea.\n- oArea\n- nDelay: delay in milliseconds',
    name: 'MusicBackgroundSetDelay',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  428: {
    comment: '428: Change the background day track for oArea to nTrack.\n- oArea\n- nTrack',
    name: 'MusicBackgroundChangeDay',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  429: {
    comment: '429: Change the background night track for oArea to nTrack.\n- oArea\n- nTrack',
    name: 'MusicBackgroundChangeNight',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  430: {
    comment: '430: Play the battle music for oArea.',
    name: 'MusicBattlePlay',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  431: {
    comment: '431: Stop the battle music for oArea.',
    name: 'MusicBattleStop',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  432: {
    comment: '432: Change the battle track for oArea.\n- oArea\n- nTrack',
    name: 'MusicBattleChange',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  433: {
    comment: '433: Play the ambient sound for oArea.',
    name: 'AmbientSoundPlay',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  434: {
    comment: '434: Stop the ambient sound for oArea.',
    name: 'AmbientSoundStop',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  435: {
    comment: '435: Change the ambient day track for oArea to nTrack.\n- oArea\n- nTrack',
    name: 'AmbientSoundChangeDay',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  436: {
    comment: '436: Change the ambient night track for oArea to nTrack.\n- oArea\n- nTrack',
    name: 'AmbientSoundChangeNight',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  437: {
    comment: '437: Get the object that killed the caller.',
    name: 'GetLastKiller',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  438: {
    comment: '438: Use this in a spell script to get the item used to cast the spell.',
    name: 'GetSpellCastItem',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  439: {
    comment: '439: Use this in an OnItemActivated module script to get the item that was activated.',
    name: 'GetItemActivated',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  440: {
    comment: '440: Use this in an OnItemActivated module script to get the creature that\nactivated the item.',
    name: 'GetItemActivator',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  441: {
    comment: '441: Use this in an OnItemActivated module script to get the location of the item\'s\ntarget.',
    name: 'GetItemActivatedTargetLocation',
    type: NWScriptDataType.LOCATION,
    args: [],
    action: undefined
  },
  442: {
    comment: '442: Use this in an OnItemActivated module script to get the item\'s target.',
    name: 'GetItemActivatedTarget',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  443: {
    comment: '443: * Returns TRUE if oObject (which is a placeable or a door) is currently open.',
    name: 'GetIsOpen',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  444: {
    comment: '444: Take nAmount of gold from oCreatureToTakeFrom.\n- nAmount\n- oCreatureToTakeFrom: If this is not a valid creature, nothing will happen.\n- bDestroy: If this is TRUE, the caller will not get the gold.  Instead, the\n  gold will be destroyed and will vanish from the game.',
    name: 'TakeGoldFromCreature',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  445: {
    comment: '445: Determine whether oObject is in conversation.',
    name: 'GetIsInConversation',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  446: {
    comment: '446: Create an Ability Decrease effect.\n- nAbility: ABILITY_*\n- nModifyBy: This is the amount by which to decrement the ability',
    name: 'EffectAbilityDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  447: {
    comment: '447: Create an Attack Decrease effect.\n- nPenalty\n- nModifierType: ATTACK_BONUS_*',
    name: 'EffectAttackDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  448: {
    comment: '448: Create a Damage Decrease effect.\n- nPenalty\n- nDamageType: DAMAGE_TYPE_*',
    name: 'EffectDamageDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  449: {
    comment: '449: Create a Damage Immunity Decrease effect.\n- nDamageType: DAMAGE_TYPE_*\n- nPercentImmunity',
    name: 'EffectDamageImmunityDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  450: {
    comment: '450: Create an AC Decrease effect.\n- nValue\n- nModifyType: AC_*\n- nDamageType: DAMAGE_TYPE_*\n  * Default value for nDamageType should only ever be used in this function prototype.',
    name: 'EffectACDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  451: {
    comment: '451: Create a Movement Speed Decrease effect.\n- nPercentChange: This is expected to be a positive integer between 1 and 99 inclusive.\n  If a negative integer is supplied then a movement speed increase will result,\n  and if a number >= 100 is supplied then the effect is deleted.',
    name: 'EffectMovementSpeedDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  452: {
    comment: '452: Create a Saving Throw Decrease effect.\n- nSave\n- nValue\n- nSaveType: SAVING_THROW_TYPE_*',
    name: 'EffectSavingThrowDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  453: {
    comment: '453: Create a Skill Decrease effect.\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid.',
    name: 'EffectSkillDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  454: {
    comment: '454: Create a Force Resistance Decrease effect.',
    name: 'EffectForceResistanceDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  455: {
    comment: '455: Determine whether oTarget is a plot object.',
    name: 'GetPlotFlag',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  456: {
    comment: '456: Set oTarget\'s plot object status.',
    name: 'SetPlotFlag',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  457: {
    comment: '457: Create an Invisibility effect.\n- nInvisibilityType: INVISIBILITY_TYPE_*\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nInvisibilityType\n  is invalid.',
    name: 'EffectInvisibility',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  458: {
    comment: '458: Create a Concealment effect.\n- nPercentage: 1-100 inclusive\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or\n  nPercentage > 100.',
    name: 'EffectConcealment',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  459: {
    comment: '459: Create a Force Shield that has parameters from the guven index into the forceshields.2da',
    name: 'EffectForceShield',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  460: {
    comment: '460: Create a Dispel Magic All effect.',
    name: 'EffectDispelMagicAll',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  461: {
    comment: '461: Cut immediately to placeable camera \'nCameraId\' during dialog.  nCameraId must be\n     an existing Placeable Camera ID.  Function only works during Dialog.',
    name: 'SetDialogPlaceableCamera',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  462: {
    comment: '462:\nReturns: TRUE if the player is in \'solo mode\' (ie. the party is not supposed to follow the player).\n         FALSE otherwise.',
    name: 'GetSoloMode',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  463: {
    comment: '463: Create a Disguise effect.\n- * nDisguiseAppearance: DISGUISE_TYPE_*s',
    name: 'EffectDisguise',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  464: {
    comment: '464:\nReturns the maximum amount of stealth xp available in the area.',
    name: 'GetMaxStealthXP',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  465: {
    comment: '465: Create a True Seeing effect.',
    name: 'EffectTrueSeeing',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  466: {
    comment: '466: Create a See Invisible effect.',
    name: 'EffectSeeInvisible',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  467: {
    comment: '467: Create a Time Stop effect.',
    name: 'EffectTimeStop',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  468: {
    comment: '468:\nSet the maximum amount of stealth xp available in the area.',
    name: 'SetMaxStealthXP',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  469: {
    comment: '469: Increase the blaster deflection rate, i think...',
    name: 'EffectBlasterDeflectionIncrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  470: {
    comment: '470:decrease the blaster deflection rate',
    name: 'EffectBlasterDeflectionDecrease',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  471: {
    comment: '471: Make the creature horified. BOO!',
    name: 'EffectHorrified',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  472: {
    comment: '472: Create a Spell Level Absorption effect.\n- nMaxSpellLevelAbsorbed: maximum spell level that will be absorbed by the\n  effect\n- nTotalSpellLevelsAbsorbed: maximum number of spell levels that will be\n  absorbed by the effect\n- nSpellSchool: SPELL_SCHOOL_*\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if:\n  nMaxSpellLevelAbsorbed is not between -1 and 9 inclusive, or nSpellSchool\n  is invalid.',
    name: 'EffectSpellLevelAbsorption',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  473: {
    comment: '473: Create a Dispel Magic Best effect.',
    name: 'EffectDispelMagicBest',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  474: {
    comment: '474:\nReturns the current amount of stealth xp available in the area.',
    name: 'GetCurrentStealthXP',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  475: {
    comment: '475: Get the number of stacked items that oItem comprises.',
    name: 'GetNumStackedItems',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  476: {
    comment: '476: Use this on an NPC to cause all creatures within a 10-metre radius to stop\nwhat they are doing and sets the NPC\'s enemies within this range to be\nneutral towards the NPC. If this command is run on a PC or an object that is\nnot a creature, nothing will happen.',
    name: 'SurrenderToEnemies',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  477: {
    comment: '477: Create a Miss Chance effect.\n- nPercentage: 1-100 inclusive\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or\n  nPercentage > 100.',
    name: 'EffectMissChance',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  478: {
    comment: '478:\nSet the current amount of stealth xp available in the area.',
    name: 'SetCurrentStealthXP',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  479: {
    comment: '479: Get the size (CREATURE_SIZE_*) of oCreature.',
    name: 'GetCreatureSize',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  480: {
    comment: '480:\nAward the stealth xp to the given oTarget.  This will only work on creatures.',
    name: 'AwardStealthXP',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  481: {
    comment: '481:\nReturns whether or not the stealth xp bonus is enabled (ie. whether or not\nAwardStealthXP() will actually award any available stealth xp).',
    name: 'GetStealthXPEnabled',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  482: {
    comment: '482:\nSets whether or not the stealth xp bonus is enabled (ie. whether or not\nAwardStealthXP() will actually award any available stealth xp).',
    name: 'SetStealthXPEnabled',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  483: {
    comment: '483: The action subject will unlock oTarget, which can be a door or a placeable\nobject.',
    name: 'ActionUnlockObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  484: {
    comment: '484: The action subject will lock oTarget, which can be a door or a placeable\nobject.',
    name: 'ActionLockObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  485: {
    comment: '485: Create a Modify Attacks effect to add attacks.\n- nAttacks: maximum is 5, even with the effect stacked\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nAttacks > 5.',
    name: 'EffectModifyAttacks',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  486: {
    comment: '486: Get the last trap detected by oTarget.\n* Return value on error: OBJECT_INVALID',
    name: 'GetLastTrapDetected',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  487: {
    comment: '487: Create a Damage Shield effect which does (nDamageAmount + nRandomAmount)\ndamage to any melee attacker on a successful attack of damage type nDamageType.\n- nDamageAmount: an integer value\n- nRandomAmount: DAMAGE_BONUS_*\n- nDamageType: DAMAGE_TYPE_*',
    name: 'EffectDamageShield',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  488: {
    comment: '488: Get the trap nearest to oTarget.\nNote : \'trap objects\' are actually any trigger, placeable or door that is\ntrapped in oTarget\'s area.\n- oTarget\n- nTrapDetected: if this is TRUE, the trap returned has to have been detected\n  by oTarget.',
    name: 'GetNearestTrapToObject',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  489: {
    comment: '489: the will get the last attmpted movment target',
    name: 'GetAttemptedMovementTarget',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  490: {
    comment: '490: this function returns the bloking creature for the k_def_CBTBlk01 script',
    name: 'GetBlockingCreature',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  491: {
    comment: '491: Get oTarget\'s base fortitude saving throw value (this will only work for\ncreatures, doors, and placeables).\n* Returns 0 if oTarget is invalid.',
    name: 'GetFortitudeSavingThrow',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  492: {
    comment: '492: Get oTarget\'s base will saving throw value (this will only work for creatures,\ndoors, and placeables).\n* Returns 0 if oTarget is invalid.',
    name: 'GetWillSavingThrow',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  493: {
    comment: '493: Get oTarget\'s base reflex saving throw value (this will only work for\ncreatures, doors, and placeables).\n* Returns 0 if oTarget is invalid.',
    name: 'GetReflexSavingThrow',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  494: {
    comment: '494: Get oCreature\'s challenge rating.\n* Returns 0.0 if oCreature is invalid.',
    name: 'GetChallengeRating',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  495: {
    comment: '495: Returns the found enemy creature on a pathfind.',
    name: 'GetFoundEnemyCreature',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  496: {
    comment: '496: Get oCreature\'s movement rate.\n* Returns 0 if oCreature is invalid.',
    name: 'GetMovementRate',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  497: {
    comment: '497: GetSubRace of oCreature\nReturns SUBRACE_*',
    name: 'GetSubRace',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  498: {
    comment: '498:\nReturns the amount the stealth xp bonus gets decreased each time the player is detected.',
    name: 'GetStealthXPDecrement',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  499: {
    comment: '499:\nSets the amount the stealth xp bonus gets decreased each time the player is detected.',
    name: 'SetStealthXPDecrement',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  500: {
    comment: '500:',
    name: 'DuplicateHeadAppearance',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  501: {
    comment: '501: The action subject will fake casting a spell at oTarget; the conjure and cast\nanimations and visuals will occur, nothing else.\n- nSpell\n- oTarget\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*',
    name: 'ActionCastFakeSpellAtObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  502: {
    comment: '502: The action subject will fake casting a spell at lLocation; the conjure and\ncast animations and visuals will occur, nothing else.\n- nSpell\n- lTarget\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*',
    name: 'ActionCastFakeSpellAtLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER ],
    action: undefined
  },
  503: {
    comment: '503: CutsceneAttack\nThis function allows the designer to specify exactly what\'s going to happen in a combat round\nThere are no guarentees made that the animation specified here will be correct - only that it will be played,\nso it is up to the designer to ensure that they have selected the right animation\nIt relies upon constants specified above for the attack result',
    name: 'CutsceneAttack',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  504: {
    comment: '504: Set the camera mode for oPlayer.\n- oPlayer\n- nCameraMode: CAMERA_MODE_*\n* If oPlayer is not player-controlled or nCameraMode is invalid, nothing\n  happens.',
    name: 'SetCameraMode',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  505: {
    comment: '505: SetLockOrientationInDialog\nAllows the locking and unlocking of orientation changes for an object in dialog\n- oObject - Object\n- nValue - TRUE or FALSE',
    name: 'SetLockOrientationInDialog',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  506: {
    comment: '506: SetLockHeadFollowInDialog\nAllows the locking and undlocking of head following for an object in dialog\n- oObject - Object\n- nValue - TRUE or FALSE',
    name: 'SetLockHeadFollowInDialog',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  507: {
    comment: '507: CutsceneMoveToPoint\nUsed by the cutscene system to allow designers to script combat',
    name: 'CutsceneMove',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.VECTOR, NWScriptDataType.INTEGER ],
    action: undefined
  },
  508: {
    comment: '508: EnableVideoEffect\nEnables the video frame buffer effect specified by nEffectType, which is\nan index into VideoEffects.2da. This video effect will apply indefinitely,\nand so it should *always* be cleared by a call to DisableVideoEffect().',
    name: 'EnableVideoEffect',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  509: {
    comment: '509: Shut down the currently loaded module and start a new one (moving all\ncurrently-connected players to the starting point.',
    name: 'StartNewModule',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING, NWScriptDataType.STRING ],
    action: undefined
  },
  510: {
    comment: '510: DisableVideoEffect\nDisables any video frame buffer effect that may be running. See\nEnableVideoEffect() to see how to use them.',
    name: 'DisableVideoEffect',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  511: {
    comment: '511: * Returns TRUE if oItem is a ranged weapon.',
    name: 'GetWeaponRanged',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  512: {
    comment: '512: Only if we are in a single player game, AutoSave the game.',
    name: 'DoSinglePlayerAutoSave',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  513: {
    comment: '513: Get the game difficulty (GAME_DIFFICULTY_*).',
    name: 'GetGameDifficulty',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  514: {
    comment: '514:\nThis will test the combat action queu to see if the user has placed any actions on the queue.\nwill only work during combat.',
    name: 'GetUserActionsPending',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  515: {
    comment: '515: RevealMap\nReveals the map at the given WORLD point \'vPoint\' with a MAP Grid Radius \'nRadius\'\nIf this function is called with no parameters it will reveal the entire map.\n(NOTE: if this function is called with a valid point but a default radius, ie. \'nRadius\' of -1\n       then the entire map will be revealed)',
    name: 'RevealMap',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR, NWScriptDataType.INTEGER ],
    action: undefined
  },
  516: {
    comment: '516: SetTutorialWindowsEnabled\nSets whether or not the tutorial windows are enabled (ie. whether or not they will\nappear when certain things happen for the first time).',
    name: 'SetTutorialWindowsEnabled',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  517: {
    comment: '517: ShowTutorialWindow\nnWindow - A row index from Tutorial.2DA specifying the message to display.\nPops up the specified tutorial window.  If the tutorial window has already popped\nup once before, this will do nothing.',
    name: 'ShowTutorialWindow',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: function(this: NWScriptInstance, args: [number]){
      GameState.MenuManager.InGameConfirm.ShowTutorialMessage(args[0]);
    }
  },
  518: {
    comment: '518: StartCreditSequence\nStarts the credits sequence.  If bTransparentBackground is TRUE, the credits will be displayed\nwith a transparent background, allowing whatever is currently onscreen to show through.  If it\nis set to FALSE, the credits will be displayed on a black background.',
    name: 'StartCreditSequence',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  519: {
    comment: '519: IsCreditSequenceInProgress\nReturns TRUE if the credits sequence is currently in progress, FALSE otherwise.',
    name: 'IsCreditSequenceInProgress',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  520: {
    comment: '520: Sets the minigame lateral acceleration/sec value',
    name: 'SWMG_SetLateralAccelerationPerSecond',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  521: {
    comment: '521: Returns the minigame lateral acceleration/sec value',
    name: 'SWMG_GetLateralAccelerationPerSecond',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  522: {
    comment: '522: Get the current action (ACTION_*) that oObject is executing.',
    name: 'GetCurrentAction',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  523: {
    comment: '523:',
    name: 'GetDifficultyModifier',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  524: {
    comment: '524: Returns the appearance type of oCreature (0 if creature doesn\'t exist)\n- oCreature',
    name: 'GetAppearanceType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  525: {
    comment: '525: Display floaty text above the specified creature.\nThe text will also appear in the chat buffer of each player that receives the\nfloaty text.\n- nStrRefToDisplay: String ref (therefore text is translated)\n- oCreatureToFloatAbove\n- bBroadcastToFaction: If this is TRUE then only creatures in the same faction\n  as oCreatureToFloatAbove\n  will see the floaty text, and only if they are within range (30 metres).',
    name: 'FloatingTextStrRefOnCreature',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  526: {
    comment: '526: Display floaty text above the specified creature.\nThe text will also appear in the chat buffer of each player that receives the\nfloaty text.\n- sStringToDisplay: String\n- oCreatureToFloatAbove\n- bBroadcastToFaction: If this is TRUE then only creatures in the same faction\n  as oCreatureToFloatAbove\n  will see the floaty text, and only if they are within range (30 metres).',
    name: 'FloatingTextStringOnCreature',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  527: {
    comment: '527: - oTrapObject: a placeable, door or trigger\n* Returns TRUE if oTrapObject is disarmable.',
    name: 'GetTrapDisarmable',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  528: {
    comment: '528: - oTrapObject: a placeable, door or trigger\n* Returns TRUE if oTrapObject is detectable.',
    name: 'GetTrapDetectable',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  529: {
    comment: '529: - oTrapObject: a placeable, door or trigger\n- oCreature\n* Returns TRUE if oCreature has detected oTrapObject',
    name: 'GetTrapDetectedBy',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  530: {
    comment: '530: - oTrapObject: a placeable, door or trigger\n* Returns TRUE if oTrapObject has been flagged as visible to all creatures.',
    name: 'GetTrapFlagged',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  531: {
    comment: '531: Get the trap base type (TRAP_BASE_TYPE_*) of oTrapObject.\n- oTrapObject: a placeable, door or trigger',
    name: 'GetTrapBaseType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  532: {
    comment: '532: - oTrapObject: a placeable, door or trigger\n* Returns TRUE if oTrapObject is one-shot (i.e. it does not reset itself\n  after firing.',
    name: 'GetTrapOneShot',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  533: {
    comment: '533: Get the creator of oTrapObject, the creature that set the trap.\n- oTrapObject: a placeable, door or trigger\n* Returns OBJECT_INVALID if oTrapObject was created in the toolset.',
    name: 'GetTrapCreator',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  534: {
    comment: '534: Get the tag of the key that will disarm oTrapObject.\n- oTrapObject: a placeable, door or trigger',
    name: 'GetTrapKeyTag',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  535: {
    comment: '535: Get the DC for disarming oTrapObject.\n- oTrapObject: a placeable, door or trigger',
    name: 'GetTrapDisarmDC',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  536: {
    comment: '536: Get the DC for detecting oTrapObject.\n- oTrapObject: a placeable, door or trigger',
    name: 'GetTrapDetectDC',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  537: {
    comment: '537: * Returns TRUE if a specific key is required to open the lock on oObject.',
    name: 'GetLockKeyRequired',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  538: {
    comment: '538: Get the tag of the key that will open the lock on oObject.',
    name: 'GetLockKeyTag',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  539: {
    comment: '539: * Returns TRUE if the lock on oObject is lockable.',
    name: 'GetLockLockable',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  540: {
    comment: '540: Get the DC for unlocking oObject.',
    name: 'GetLockUnlockDC',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  541: {
    comment: '541: Get the DC for locking oObject.',
    name: 'GetLockLockDC',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  542: {
    comment: '542: Get the last PC that levelled up.',
    name: 'GetPCLevellingUp',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  543: {
    comment: '543: - nFeat: FEAT_*\n- oObject\n* Returns TRUE if oObject has effects on it originating from nFeat.',
    name: 'GetHasFeatEffect',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  544: {
    comment: '544: Set the status of the illumination for oPlaceable.\n- oPlaceable\n- bIlluminate: if this is TRUE, oPlaceable\'s illumination will be turned on.\n  If this is FALSE, oPlaceable\'s illumination will be turned off.\nNote: You must call RecomputeStaticLighting() after calling this function in\norder for the changes to occur visually for the players.\nSetPlaceableIllumination() buffers the illumination changes, which are then\nsent out to the players once RecomputeStaticLighting() is called.  As such,\nit is best to call SetPlaceableIllumination() for all the placeables you wish\nto set the illumination on, and then call RecomputeStaticLighting() once after\nall the placeable illumination has been set.\n* If oPlaceable is not a placeable object, or oPlaceable is a placeable that\n  doesn\'t have a light, nothing will happen.',
    name: 'SetPlaceableIllumination',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  545: {
    comment: '545: * Returns TRUE if the illumination for oPlaceable is on',
    name: 'GetPlaceableIllumination',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  546: {
    comment: '546: - oPlaceable\n- nPlaceableAction: PLACEABLE_ACTION_*\n* Returns TRUE if nPlacebleAction is valid for oPlaceable.',
    name: 'GetIsPlaceableObjectActionPossible',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  547: {
    comment: '547: The caller performs nPlaceableAction on oPlaceable.\n- oPlaceable\n- nPlaceableAction: PLACEABLE_ACTION_*',
    name: 'DoPlaceableObjectAction',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  548: {
    comment: '548: Get the first PC in the player list.\nThis resets the position in the player list for GetNextPC().',
    name: 'GetFirstPC',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  549: {
    comment: '549: Get the next PC in the player list.\nThis picks up where the last GetFirstPC() or GetNextPC() left off.',
    name: 'GetNextPC',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  550: {
    comment: '550: Set oDetector to have detected oTrap.',
    name: 'SetTrapDetectedBy',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  551: {
    comment: '551: Note: Only placeables, doors and triggers can be trapped.\n* Returns TRUE if oObject is trapped.',
    name: 'GetIsTrapped',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  552: {
    comment: '552: SetEffectIcon\nThis will link the specified effect icon to the specified effect.  The\neffect returned will contain the link to the effect icon and applying this\neffect will cause an effect icon to appear on the portrait/charsheet gui.\neEffect: The effect which should cause the effect icon to appear.\nnIcon: Index into effecticon.2da of the effect icon to use.',
    name: 'SetEffectIcon',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.EFFECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  553: {
    comment: '553: FaceObjectAwayFromObject\nThis will cause the object oFacer to face away from oObjectToFaceAwayFrom.\nThe objects must be in the same area for this to work.',
    name: 'FaceObjectAwayFromObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  554: {
    comment: '554: Spawn in the Death GUI.\nThe default (as defined by BioWare) can be spawned in by PopUpGUIPanel, but\nif you want to turn off the \'Respawn\' or \'Wait for Help\' buttons, this is the\nfunction to use.\n- oPC\n- bRespawnButtonEnabled: if this is TRUE, the \'Respawn\' button will be enabled\n  on the Death GUI.\n- bWaitForHelpButtonEnabled: if this is TRUE, the \'Wait For Help\' button will\n  be enabled on the Death GUI.\n- nHelpStringReference\n- sHelpString',
    name: 'PopUpDeathGUIPanel',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  555: {
    comment: '555: Disable oTrap.\n- oTrap: a placeable, door or trigger.',
    name: 'SetTrapDisabled',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  556: {
    comment: '556: Get the last object that was sent as a GetLastAttacker(), GetLastDamager(),\nGetLastSpellCaster() (for a hostile spell), or GetLastDisturbed() (when a\ncreature is pickpocketed).\nNote: Return values may only ever be:\n1) A Creature\n2) Plot Characters will never have this value set\n3) Area of Effect Objects will return the AOE creator if they are registered\n   as this value, otherwise they will return INVALID_OBJECT_ID\n4) Traps will not return the creature that set the trap.\n5) This value will never be overwritten by another non-creature object.\n6) This value will never be a dead/destroyed creature',
    name: 'GetLastHostileActor',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  557: {
    comment: '557: Force all the characters of the players who are currently in the game to\nbe exported to their respective directories i.e. LocalVault/ServerVault/ etc.',
    name: 'ExportAllCharacters',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  558: {
    comment: '558: Get the Day Track for oArea.',
    name: 'MusicBackgroundGetDayTrack',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  559: {
    comment: '559: Get the Night Track for oArea.',
    name: 'MusicBackgroundGetNightTrack',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  560: {
    comment: '560: Write sLogEntry as a timestamped entry into the log file',
    name: 'WriteTimestampedLogEntry',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  561: {
    comment: '561: Get the module\'s name in the language of the server that\'s running it.\n* If there is no entry for the language of the server, it will return an\n  empty string',
    name: 'GetModuleName',
    type: NWScriptDataType.STRING,
    args: [],
    action: undefined
  },
  562: {
    comment: '562: Get the leader of the faction of which oMemberOfFaction is a member.\n* Returns OBJECT_INVALID if oMemberOfFaction is not a valid creature.',
    name: 'GetFactionLeader',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  563: {
    comment: '563: Turns on or off the speed blur effect in rendered scenes.\nbEnabled: Set TRUE to turn it on, FALSE to turn it off.\nfRatio: Sets the frame accumulation ratio.',
    name: 'SWMG_SetSpeedBlurEffect',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  564: {
    comment: '564: Immediately ends the currently running game and returns to the start screen.\nnShowEndGameGui: Set TRUE to display the death gui.',
    name: 'EndGame',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  565: {
    comment: '565: Get a variable passed when calling console debug runscript',
    name: 'GetRunScriptVar',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  566: {
    comment: '566: This function returns a value that matches one of the MOVEMENT_SPEED_... constants\n     if the OID passed in is not found or not a creature then it will return\n MOVEMENT_SPEED_IMMOBILE.',
    name: 'GetCreatureMovmentType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  567: {
    comment: '567: Set the ambient day volume for oArea to nVolume.\n- oArea\n- nVolume: 0 - 100',
    name: 'AmbientSoundSetDayVolume',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  568: {
    comment: '568: Set the ambient night volume for oArea to nVolume.\n- oArea\n- nVolume: 0 - 100',
    name: 'AmbientSoundSetNightVolume',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  569: {
    comment: '569: Get the Battle Track for oArea.',
    name: 'MusicBackgroundGetBattleTrack',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  570: {
    comment: '570: Determine whether oObject has an inventory.\n* Returns TRUE for creatures and stores, and checks to see if an item or placeable object is a container.\n* Returns FALSE for all other object types.',
    name: 'GetHasInventory',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  571: {
    comment: '571: Get the duration (in seconds) of the sound attached to nStrRef\n* Returns 0.0f if no duration is stored or if no sound is attached',
    name: 'GetStrRefSoundDuration',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  572: {
    comment: '572: Add oPC to oPartyLeader\'s party.  This will only work on two PCs.\n- oPC: player to add to a party\n- oPartyLeader: player already in the party',
    name: 'AddToParty',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  573: {
    comment: '573: Remove oPC from their current party. This will only work on a PC.\n- oPC: removes this player from whatever party they\'re currently in.',
    name: 'RemoveFromParty',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  574: {
    comment: '574: Adds a creature to the party\nReturns whether the addition was successful\nAddPartyMember',
    name: 'AddPartyMember',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  575: {
    comment: '575: Removes a creature from the party\nReturns whether the removal was syccessful\nRemovePartyMember',
    name: 'RemovePartyMember',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  576: {
    comment: '576: Returns whether a specified creature is a party member\nIsObjectPartyMember',
    name: 'IsObjectPartyMember',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  577: {
    comment: '577: Returns the party member at a given index in the party.\nThe order of members in the party can vary based on\nwho the current leader is (member 0 is always the current\nparty leader).\nGetPartyMemberByIndex',
    name: 'GetPartyMemberByIndex',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  578: {
    comment: '578: GetGlobalBoolean\nThis function returns the value of a global boolean (TRUE or FALSE) scripting variable.',
    name: 'GetGlobalBoolean',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  579: {
    comment: '579: SetGlobalBoolean\nThis function sets the value of a global boolean (TRUE or FALSE) scripting variable.',
    name: 'SetGlobalBoolean',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  580: {
    comment: '580: GetGlobalNumber\nThis function returns the value of a global number (-128 to +127) scripting variable.',
    name: 'GetGlobalNumber',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  581: {
    comment: '581: SetGlobalNumber\nThis function sets the value of a global number (-128 to +127) scripting variable.',
    name: 'SetGlobalNumber',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  582: {
    comment: 'post a string to the screen at column nX and row nY for fLife seconds\n582. AurPostString',
    name: 'AurPostString',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  583: {
    comment: '583: OnAnimKey\nget the event and the name of the model on which the event happened\nSWMG_GetLastEvent',
    name: 'SWMG_GetLastEvent',
    type: NWScriptDataType.STRING,
    args: [],
    action: undefined
  },
  584: {
    comment: '584: SWMG_GetLastEventModelName',
    name: 'SWMG_GetLastEventModelName',
    type: NWScriptDataType.STRING,
    args: [],
    action: undefined
  },
  585: {
    comment: '585: gets an object by its name (duh!)\nSWMG_GetObjectByName',
    name: 'SWMG_GetObjectByName',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  586: {
    comment: '586: plays an animation on an object\nSWMG_PlayAnimation',
    name: 'SWMG_PlayAnimation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  587: {
    comment: '587: OnHitBullet\nget the damage, the target type (see TARGETflags), and the shooter\nSWMG_GetLastBulletHitDamage',
    name: 'SWMG_GetLastBulletHitDamage',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  588: {
    comment: '588: SWMG_GetLastBulletHitTarget',
    name: 'SWMG_GetLastBulletHitTarget',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  589: {
    comment: '589: SWMG_GetLastBulletHitShooter',
    name: 'SWMG_GetLastBulletHitShooter',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  590: {
    comment: '590: adjusts a followers hit points, can specify the absolute value to set to\nSWMG_AdjustFollowerHitPoints',
    name: 'SWMG_AdjustFollowerHitPoints',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  591: {
    comment: '591: the default implementation of OnBulletHit\nSWMG_OnBulletHit',
    name: 'SWMG_OnBulletHit',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  592: {
    comment: '592: the default implementation of OnObstacleHit\nSWMG_OnObstacleHit',
    name: 'SWMG_OnObstacleHit',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  593: {
    comment: '593: returns the last follower and obstacle hit\nSWMG_GetLastFollowerHit',
    name: 'SWMG_GetLastFollowerHit',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  594: {
    comment: '594: SWMG_GetLastObstacleHit',
    name: 'SWMG_GetLastObstacleHit',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  595: {
    comment: '595: gets information about the last bullet fired\nSWMG_GetLastBulletFiredDamage',
    name: 'SWMG_GetLastBulletFiredDamage',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  596: {
    comment: '596: SWMG_GetLastBulletFiredTarget',
    name: 'SWMG_GetLastBulletFiredTarget',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  597: {
    comment: '597: gets an objects name\nSWMG_GetObjectName',
    name: 'SWMG_GetObjectName',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  598: {
    comment: '598: the default implementation of OnDeath\nSWMG_OnDeath',
    name: 'SWMG_OnDeath',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  599: {
    comment: '599: a bunch of Is functions for your pleasure\nSWMG_IsFollower',
    name: 'SWMG_IsFollower',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  600: {
    comment: '600: SWMG_IsPlayer',
    name: 'SWMG_IsPlayer',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  601: {
    comment: '601: SWMG_IsEnemy',
    name: 'SWMG_IsEnemy',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  602: {
    comment: '602: SWMG_IsTrigger',
    name: 'SWMG_IsTrigger',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  603: {
    comment: '603: SWMG_IsObstacle',
    name: 'SWMG_IsObstacle',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  604: {
    comment: '604: SWMG_SetFollowerHitPoints',
    name: 'SWMG_SetFollowerHitPoints',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  605: {
    comment: '605: SWMG_OnDamage',
    name: 'SWMG_OnDamage',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  606: {
    comment: '606: SWMG_GetLastHPChange',
    name: 'SWMG_GetLastHPChange',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  607: {
    comment: '607: SWMG_RemoveAnimation',
    name: 'SWMG_RemoveAnimation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.STRING ],
    action: undefined
  },
  608: {
    comment: '608: SWMG_GetCameraNearClip',
    name: 'SWMG_GetCameraNearClip',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  609: {
    comment: '609: SWMG_GetCameraFarClip',
    name: 'SWMG_GetCameraFarClip',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  610: {
    comment: '610: SWMG_SetCameraClip',
    name: 'SWMG_SetCameraClip',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  611: {
    comment: '611: SWMG_GetPlayer',
    name: 'SWMG_GetPlayer',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: undefined
  },
  612: {
    comment: '612: SWMG_GetEnemyCount',
    name: 'SWMG_GetEnemyCount',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  613: {
    comment: '613: SWMG_GetEnemy',
    name: 'SWMG_GetEnemy',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  614: {
    comment: '614: SWMG_GetObstacleCount',
    name: 'SWMG_GetObstacleCount',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  615: {
    comment: '615: SWMG_GetObstacle',
    name: 'SWMG_GetObstacle',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  616: {
    comment: '616: SWMG_GetHitPoints',
    name: 'SWMG_GetHitPoints',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  617: {
    comment: '617: SWMG_GetMaxHitPoints',
    name: 'SWMG_GetMaxHitPoints',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  618: {
    comment: '618: SWMG_SetMaxHitPoints',
    name: 'SWMG_SetMaxHitPoints',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  619: {
    comment: '619: SWMG_GetSphereRadius',
    name: 'SWMG_GetSphereRadius',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  620: {
    comment: '620: SWMG_SetSphereRadius',
    name: 'SWMG_SetSphereRadius',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  621: {
    comment: '621: SWMG_GetNumLoops',
    name: 'SWMG_GetNumLoops',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  622: {
    comment: '622: SWMG_SetNumLoops',
    name: 'SWMG_SetNumLoops',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  623: {
    comment: '623: SWMG_GetPosition',
    name: 'SWMG_GetPosition',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  624: {
    comment: '624: SWMG_GetGunBankCount',
    name: 'SWMG_GetGunBankCount',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  625: {
    comment: '625: SWMG_GetGunBankBulletModel',
    name: 'SWMG_GetGunBankBulletModel',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  626: {
    comment: '626: SWMG_GetGunBankGunModel',
    name: 'SWMG_GetGunBankGunModel',
    type: NWScriptDataType.STRING,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  627: {
    comment: '627: SWMG_GetGunBankDamage',
    name: 'SWMG_GetGunBankDamage',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  628: {
    comment: '628: SWMG_GetGunBankTimeBetweenShots',
    name: 'SWMG_GetGunBankTimeBetweenShots',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  629: {
    comment: '629: SWMG_GetGunBankLifespan',
    name: 'SWMG_GetGunBankLifespan',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  630: {
    comment: '630: SWMG_GetGunBankSpeed',
    name: 'SWMG_GetGunBankSpeed',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  631: {
    comment: '631: SWMG_GetGunBankTarget',
    name: 'SWMG_GetGunBankTarget',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  632: {
    comment: '632: SWMG_SetGunBankBulletModel',
    name: 'SWMG_SetGunBankBulletModel',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  633: {
    comment: '633: SWMG_SetGunBankGunModel',
    name: 'SWMG_SetGunBankGunModel',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  634: {
    comment: '634: SWMG_SetGunBankDamage',
    name: 'SWMG_SetGunBankDamage',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  635: {
    comment: '635: SWMG_SetGunBankTimeBetweenShots',
    name: 'SWMG_SetGunBankTimeBetweenShots',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  636: {
    comment: '636: SWMG_SetGunBankLifespan',
    name: 'SWMG_SetGunBankLifespan',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  637: {
    comment: '637: SWMG_SetGunBankSpeed',
    name: 'SWMG_SetGunBankSpeed',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  638: {
    comment: '638: SWMG_SetGunBankTarget',
    name: 'SWMG_SetGunBankTarget',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  639: {
    comment: '639: SWMG_GetLastBulletHitPart',
    name: 'SWMG_GetLastBulletHitPart',
    type: NWScriptDataType.STRING,
    args: [],
    action: undefined
  },
  640: {
    comment: '640: SWMG_IsGunBankTargetting',
    name: 'SWMG_IsGunBankTargetting',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  641: {
    comment: '641: SWMG_GetPlayerOffset\nreturns a vector with the player rotation for rotation minigames\nreturns a vector with the player translation for translation minigames',
    name: 'SWMG_GetPlayerOffset',
    type: NWScriptDataType.VECTOR,
    args: [],
    action: undefined
  },
  642: {
    comment: '642: SWMG_GetPlayerInvincibility',
    name: 'SWMG_GetPlayerInvincibility',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  643: {
    comment: '643: SWMG_GetPlayerSpeed',
    name: 'SWMG_GetPlayerSpeed',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  644: {
    comment: '644: SWMG_GetPlayerMinSpeed',
    name: 'SWMG_GetPlayerMinSpeed',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  645: {
    comment: '645: SWMG_GetPlayerAccelerationPerSecond',
    name: 'SWMG_GetPlayerAccelerationPerSecond',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  646: {
    comment: '646: SWMG_GetPlayerTunnelPos',
    name: 'SWMG_GetPlayerTunnelPos',
    type: NWScriptDataType.VECTOR,
    args: [],
    action: undefined
  },
  647: {
    comment: '647: SWMG_SetPlayerOffset',
    name: 'SWMG_SetPlayerOffset',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  648: {
    comment: '648: SWMG_SetPlayerInvincibility',
    name: 'SWMG_SetPlayerInvincibility',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  649: {
    comment: '649: SWMG_SetPlayerSpeed',
    name: 'SWMG_SetPlayerSpeed',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  650: {
    comment: '650: SWMG_SetPlayerMinSpeed',
    name: 'SWMG_SetPlayerMinSpeed',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  651: {
    comment: '651: SWMG_SetPlayerAccelerationPerSecond',
    name: 'SWMG_SetPlayerAccelerationPerSecond',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  652: {
    comment: '652: SWMG_SetPlayerTunnelPos',
    name: 'SWMG_SetPlayerTunnelPos',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  653: {
    comment: '653: SWMG_GetPlayerTunnelNeg',
    name: 'SWMG_GetPlayerTunnelNeg',
    type: NWScriptDataType.VECTOR,
    args: [],
    action: undefined
  },
  654: {
    comment: '654: SWMG_SetPlayerTunnelNeg',
    name: 'SWMG_SetPlayerTunnelNeg',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  655: {
    comment: '655: SWMG_GetPlayerOrigin',
    name: 'SWMG_GetPlayerOrigin',
    type: NWScriptDataType.VECTOR,
    args: [],
    action: undefined
  },
  656: {
    comment: '656: SWMG_SetPlayerOrigin',
    name: 'SWMG_SetPlayerOrigin',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  657: {
    comment: '657: SWMG_GetGunBankHorizontalSpread',
    name: 'SWMG_GetGunBankHorizontalSpread',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  658: {
    comment: '658: SWMG_GetGunBankVerticalSpread',
    name: 'SWMG_GetGunBankVerticalSpread',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  659: {
    comment: '659: SWMG_GetGunBankSensingRadius',
    name: 'SWMG_GetGunBankSensingRadius',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  660: {
    comment: '660: SWMG_GetGunBankInaccuracy',
    name: 'SWMG_GetGunBankInaccuracy',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  661: {
    comment: '661: SWMG_SetGunBankHorizontalSpread',
    name: 'SWMG_SetGunBankHorizontalSpread',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  662: {
    comment: '662: SWMG_SetGunBankVerticalSpread',
    name: 'SWMG_SetGunBankVerticalSpread',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  663: {
    comment: '663: SWMG_SetGunBankSensingRadius',
    name: 'SWMG_SetGunBankSensingRadius',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  664: {
    comment: '664: SWMG_SetGunBankInaccuracy',
    name: 'SWMG_SetGunBankInaccuracy',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT ],
    action: undefined
  },
  665: {
    comment: '665: GetIsInvulnerable\nThis returns whether the follower object is currently invulnerable to damage',
    name: 'SWMG_GetIsInvulnerable',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  666: {
    comment: '666: StartInvulnerability\nThis will begin a period of invulnerability (as defined by Invincibility)',
    name: 'SWMG_StartInvulnerability',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  667: {
    comment: '667: GetPlayerMaxSpeed\nThis returns the player character\'s max speed',
    name: 'SWMG_GetPlayerMaxSpeed',
    type: NWScriptDataType.FLOAT,
    args: [],
    action: undefined
  },
  668: {
    comment: '668: SetPlayerMaxSpeed\nThis sets the player character\'s max speed',
    name: 'SWMG_SetPlayerMaxSpeed',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  669: {
    comment: '669: AddJournalWorldEntry\nAdds a user entered entry to the world notices',
    name: 'AddJournalWorldEntry',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING, NWScriptDataType.STRING ],
    action: undefined
  },
  670: {
    comment: '670: AddJournalWorldEntryStrref\nAdds an entry to the world notices using stringrefs',
    name: 'AddJournalWorldEntryStrref',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  671: {
    comment: '671: BarkString\nthis will cause a creature to bark the strRef from the talk table\nIf creature is specefied as OBJECT_INVALID a general bark is made.',
    name: 'BarkString',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  672: {
    comment: '672: DeleteJournalWorldAllEntries\nNuke\'s \'em all, user entered or otherwise.',
    name: 'DeleteJournalWorldAllEntries',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  673: {
    comment: '673: DeleteJournalWorldEntry\nDeletes a user entered world notice',
    name: 'DeleteJournalWorldEntry',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  674: {
    comment: '674: DeleteJournalWorldEntryStrref\nDeletes the world notice pertaining to the string ref',
    name: 'DeleteJournalWorldEntryStrref',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  675: {
    comment: '675: EffectForceDrain\nThis command will reduce the force points of a creature.',
    name: 'EffectForceDrain',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  676: {
    comment: '676: EffectTemporaryForcePoints\n//',
    name: 'EffectPsychicStatic',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  677: {
    comment: '677: PlayVisualAreaEffect',
    name: 'PlayVisualAreaEffect',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.LOCATION ],
    action: undefined
  },
  678: {
    comment: '678: SetJournalQuestEntryPicture\nSets the picture for the quest entry on this object (creature)',
    name: 'SetJournalQuestEntryPicture',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  679: {
    comment: '679. GetLocalBoolean\nThis gets a boolean flag on an object\ncurrently the index is a range between 20 and 63',
    name: 'GetLocalBoolean',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  680: {
    comment: '680. SetLocalBoolean\nThis sets a boolean flag on an object\ncurrently the index is a range between 20 and 63',
    name: 'SetLocalBoolean',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  681: {
    comment: '681. GetLocalNumber\nThis gets a number on an object\ncurrently the index is a range between 12 and 28',
    name: 'GetLocalNumber',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  682: {
    comment: '682. SetLocalNumber\nThis sets a number on an object\ncurrently the index is a range between 12 and 28\nthe value range is 0 to 255',
    name: 'SetLocalNumber',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  683: {
    comment: '683. SWMG_GetSoundFrequency\nGets the frequency of a trackfollower sound',
    name: 'SWMG_GetSoundFrequency',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  684: {
    comment: '684. SWMG_SetSoundFrequency\nSets the frequency of a trackfollower sound',
    name: 'SWMG_SetSoundFrequency',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  685: {
    comment: '685. SWMG_GetSoundFrequencyIsRandom\nGets whether the frequency of a trackfollower sound is using the random model',
    name: 'SWMG_GetSoundFrequencyIsRandom',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  686: {
    comment: '686. SWMG_SetSoundFrequencyIsRandom\nSets whether the frequency of a trackfollower sound is using the random model',
    name: 'SWMG_SetSoundFrequencyIsRandom',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  687: {
    comment: '687. SWMG_GetSoundVolume\nGets the volume of a trackfollower sound',
    name: 'SWMG_GetSoundVolume',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  688: {
    comment: '688. SWMG_SetSoundVolume\nSets the volume of a trackfollower sound',
    name: 'SWMG_SetSoundVolume',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  689: {
    comment: '689. SoundObjectGetPitchVariance\nGets the pitch variance of a placeable sound object',
    name: 'SoundObjectGetPitchVariance',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  690: {
    comment: '690. SoundObjectSetPitchVariance\nSets the pitch variance of a placeable sound object',
    name: 'SoundObjectSetPitchVariance',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  691: {
    comment: '691. SoundObjectGetVolume\nGets the volume of a placeable sound object',
    name: 'SoundObjectGetVolume',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  692: {
    comment: '692: GetGlobalLocation\nThis function returns the a global location scripting variable.',
    name: 'GetGlobalLocation',
    type: NWScriptDataType.LOCATION,
    args: [ NWScriptDataType.STRING ],
    action: undefined
  },
  693: {
    comment: '693: SetGlobalLocation\nThis function sets the a global location scripting variable.',
    name: 'SetGlobalLocation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.LOCATION ],
    action: undefined
  },
  694: {
    comment: '694. AddAvailableNPCByObject\nThis adds a NPC to the list of available party members using\na game object as the template\nReturns if true if successful, false if the NPC had already\nbeen added or the object specified is invalid',
    name: 'AddAvailableNPCByObject',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  695: {
    comment: '695. RemoveAvailableNPC\nThis removes a NPC from the list of available party members\nReturns whether it was successful or not',
    name: 'RemoveAvailableNPC',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  696: {
    comment: '696. IsAvailableNPC\nThis returns whether a NPC is in the list of available party members',
    name: 'IsAvailableCreature',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  697: {
    comment: '697. AddAvailableNPCByTemplate\nThis adds a NPC to the list of available party members using\na template\nReturns if true if successful, false if the NPC had already\nbeen added or the template specified is invalid',
    name: 'AddAvailableNPCByTemplate',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  698: {
    comment: '698. SpawnAvailableNPC\nThis spawns a NPC from the list of available creatures\nReturns a pointer to the creature object',
    name: 'SpawnAvailableNPC',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.LOCATION ],
    action: undefined
  },
  699: {
    comment: '699. IsNPCPartyMember\nReturns if a given NPC constant is in the party currently',
    name: 'IsNPCPartyMember',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  700: {
    comment: '700. ActionBarkString\nthis will cause a creature to bark the strRef from the talk table.',
    name: 'ActionBarkString',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  701: {
    comment: '701. GetIsConversationActive\nChecks to see if any conversations are currently taking place',
    name: 'GetIsConversationActive',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  702: {
    comment: '702. EffectLightsaberThrow\nThis function throws a lightsaber at a target\nIf multiple targets are specified, then the lightsaber travels to them\nsequentially, returning to the first object specified\nThis effect is applied to an object, so an effector is not needed',
    name: 'EffectLightsaberThrow',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  703: {
    comment: '703.\ncreates the effect of a whirl wind.',
    name: 'EffectWhirlWind',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  704: {
    comment: '704.\nReturns the party ai style',
    name: 'GetPartyAIStyle',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  705: {
    comment: '705.\nReturns the party members ai style',
    name: 'GetNPCAIStyle',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  706: {
    comment: '706.\nSets the party ai style',
    name: 'SetPartyAIStyle',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  707: {
    comment: '707.\nSets the party members ai style',
    name: 'SetNPCAIStyle',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  708: {
    comment: '708: SetNPCSelectability',
    name: 'SetNPCSelectability',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  709: {
    comment: '709: GetNPCSelectability\nnNPC - NPC_\nreturns 1 if in current party, 0 if selectable as a party member\n-1 if not in party at all',
    name: 'GetNPCSelectability',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  710: {
    comment: '710: Clear all the effects of the caller.\n* No return value, but if an error occurs, the log file will contain\n  \'ClearAllEffects failed.\'.',
    name: 'ClearAllEffects',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  711: {
    comment: '711: GetLastConversation\nGets the last conversation string.\n//',
    name: 'GetLastConversation',
    type: NWScriptDataType.STRING,
    args: [],
    action: undefined
  },
  712: {
    comment: '712: ShowPartySelectionGUI\nBrings up the party selection GUI for the player to\nselect the members of the party from\nif exit script is specified, will be executed when\nthe GUI is exited\nRWT-OEI 08/23/04 - New parameter = nAllowCancel. Passing in TRUE\n to this parameter makes it possible for the player to cancel out\n of the party selection GUI, so be careful that you are okay with\n them cancelling out of it before you pass TRUE.\n Also, in the sExitScript that gets called after the Party Select\n GUI exits, you can use GetRunScriptVar to find out if they\n cancelled. If it returns TRUE, they didn\'t cancel. If it returns\n FALSE, they cancelled.  See me if there\'s questions.',
    name: 'ShowPartySelectionGUI',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  713: {
    comment: '713: GetStandardFaction\nFind out which standard faction oObject belongs to.\n* Returns INVALID_STANDARD_FACTION if oObject does not belong to\n  a Standard Faction, or an error has occurred.',
    name: 'GetStandardFaction',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  714: {
    comment: '714: GivePlotXP\nGive nPercentage% of the experience associated with plot sPlotName\nto the party\n- sPlotName\n- nPercentage',
    name: 'GivePlotXP',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  715: {
    comment: '715. GetMinOneHP\nChecks to see if oObject has the MinOneHP Flag set on them.',
    name: 'GetMinOneHP',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  716: {
    comment: '716. SetMinOneHP\nSets/Removes the MinOneHP Flag on oObject.',
    name: 'SetMinOneHP',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  717: {
    comment: '717. SWMG_GetPlayerTunnelInfinite\nGets whether each of the dimensions is infinite',
    name: 'SWMG_GetPlayerTunnelInfinite',
    type: NWScriptDataType.VECTOR,
    args: [],
    action: undefined
  },
  718: {
    comment: '718. SWMG_SetPlayerTunnelInfinite\nSets whether each of the dimensions is infinite',
    name: 'SWMG_SetPlayerTunnelInfinite',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  719: {
    comment: '719. SetGlobalFadeIn\nSets a Fade In that starts after fWait seconds and fades for fLength Seconds.\nThe Fade will be from a color specified by the RGB values fR, fG, and fB.\nNote that fR, fG, and fB are normalized values.\nThe default values are an immediate cut in from black.',
    name: 'SetGlobalFadeIn',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  720: {
    comment: '720. SetGlobalFadeOut\nSets a Fade Out that starts after fWait seconds and fades for fLength Seconds.\nThe Fade will be to a color specified by the RGB values fR, fG, and fB.\nNote that fR, fG, and fB are normalized values.\nThe default values are an immediate cut to from black.',
    name: 'SetGlobalFadeOut',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  721: {
    comment: '721. GetLastAttackTarget\nReturns the last attack target for a given object',
    name: 'GetLastHostileTarget',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  722: {
    comment: '722. GetLastAttackAction\nReturns the last attack action for a given object',
    name: 'GetLastAttackAction',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  723: {
    comment: '723. GetLastForcePowerUsed\nReturns the last force power used (as a spell number that indexes the Spells.2da) by the given object',
    name: 'GetLastForcePowerUsed',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  724: {
    comment: '724. GetLastCombatFeatUsed\nReturns the last feat used (as a feat number that indexes the Feats.2da) by the given object',
    name: 'GetLastCombatFeatUsed',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  725: {
    comment: '725. GetLastAttackResult\nReturns the result of the last attack',
    name: 'GetLastAttackResult',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  726: {
    comment: '726. GetWasForcePowerSuccessful\nReturns whether the last force power used was successful or not',
    name: 'GetWasForcePowerSuccessful',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  727: {
    comment: '727. GetFirstAttacker\nReturns the first object in the area that is attacking oCreature',
    name: 'GetFirstAttacker',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  728: {
    comment: '728. GetNextAttacker\nReturns the next object in the area that is attacking oCreature',
    name: 'GetNextAttacker',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  729: {
    comment: '729. SetFormation\nPut oCreature into the nFormationPattern about oAnchor at position nPosition\n- oAnchor: The formation is set relative to this object\n- oCreature: This is the creature that you wish to join the formation\n- nFormationPattern: FORMATION_*\n- nPosition: Integer from 1 to 10 to specify which position in the formation\n  oCreature is supposed to take.',
    name: 'SetFormation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  730: {
    comment: '730. ActionFollowLeader\nthis action has a party member follow the leader.\nDO NOT USE ON A CREATURE THAT IS NOT IN THE PARTY!!',
    name: 'ActionFollowLeader',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  731: {
    comment: '731. SetForcePowerUnsuccessful\nSets the reason (through a constant) for why a force power failed',
    name: 'SetForcePowerUnsuccessful',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  732: {
    comment: '732. GetIsDebilitated\nReturns whether the given object is debilitated or not',
    name: 'GetIsDebilitated',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  733: {
    comment: '733. PlayMovie\nPlayes a Movie.',
    name: 'PlayMovie',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  734: {
    comment: '734. SaveNPCState\nTells the party table to save the state of a party member NPC',
    name: 'SaveNPCState',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  735: {
    comment: '735: Get the Category of tTalent.',
    name: 'GetCategoryFromTalent',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.TALENT ],
    action: undefined
  },
  736: {
    comment: '736: This affects all creatures in the area that are in faction nFactionFrom...\n- Makes them join nFactionTo\n- Clears all actions\n- Disables combat mode',
    name: 'SurrenderByFaction',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  737: {
    comment: '737: This affects all creatures in the area that are in faction nFactionFrom.\nmaking them change to nFactionTo',
    name: 'ChangeFactionByFaction',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  738: {
    comment: '738: PlayRoomAnimation\nPlays a looping animation on a room',
    name: 'PlayRoomAnimation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  739: {
    comment: '739: ShowGalaxyMap\nBrings up the Galaxy Map Gui, with \'nPlanet\' selected.  \'nPlanet\' can only be a planet\nthat has already been set available and selectable.',
    name: 'ShowGalaxyMap',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  740: {
    comment: '740: SetPlanetSelectable\nSets \'nPlanet\' selectable on the Galaxy Map Gui.',
    name: 'SetPlanetSelectable',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  741: {
    comment: '741: GetPlanetSelectable\nReturns wheter or not \'nPlanet\' is selectable.',
    name: 'GetPlanetSelectable',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  742: {
    comment: '742: SetPlanetAvailable\nSets \'nPlanet\' available on the Galaxy Map Gui.',
    name: 'SetPlanetAvailable',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  743: {
    comment: '743: GetPlanetAvailable\nReturns wheter or not \'nPlanet\' is available.',
    name: 'GetPlanetAvailable',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  744: {
    comment: '744: GetSelectedPlanet\nReturns the ID of the currently selected planet.  Check Planetary.2da\nfor which planet the return value corresponds to. If the return is -1\nno planet is selected.',
    name: 'GetSelectedPlanet',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  745: {
    comment: '745: SoundObjectFadeAndStop\nFades a sound object for \'fSeconds\' and then stops it.',
    name: 'SoundObjectFadeAndStop',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  746: {
    comment: '746: SetAreaFogColor\nSet the fog color for the area oArea.',
    name: 'SetAreaFogColor',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT ],
    action: undefined
  },
  747: {
    comment: '747: ChangeItemCost\nChange the cost of an item',
    name: 'ChangeItemCost',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.FLOAT ],
    action: undefined
  },
  748: {
    comment: '748: GetIsLiveContentAvailable\nDetermines whether a given live content package is available\nnPkg = LIVE_CONTENT_PKG1, LIVE_CONTENT_PKG2, ..., LIVE_CONTENT_PKG6',
    name: 'GetIsLiveContentAvailable',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  749: {
    comment: '749: ResetDialogState\nResets the GlobalDialogState for the engine.\nNOTE: NEVER USE THIS UNLESS YOU KNOW WHAT ITS FOR!\n      only to be used for a failing OnDialog script',
    name: 'ResetDialogState',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  750: {
    comment: '750: SetAlignmentGoodEvil\nSet oCreature\'s alignment value',
    name: 'SetGoodEvilValue',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  751: {
    comment: '751: GetIsPoisoned\nReturns TRUE if the object specified is poisoned.',
    name: 'GetIsPoisoned',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  752: {
    comment: '752: GetSpellTarget\nReturns the object id of the spell target',
    name: 'GetSpellTarget',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  753: {
    comment: '753: SetSoloMode\nActivates/Deactivates solo mode for the player\'s party.',
    name: 'SetSoloMode',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  754: {
    comment: '754: EffectCutSceneHorrified\nGet a horrified effect for cutscene purposes (ie. this effect will ignore immunities).',
    name: 'EffectCutSceneHorrified',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  755: {
    comment: '755: EffectCutSceneParalyze\nGet a paralyze effect for cutscene purposes (ie. this effect will ignore immunities).',
    name: 'EffectCutSceneParalyze',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  756: {
    comment: '756: EffectCutSceneStunned\nGet a stun effect for cutscene purposes (ie. this effect will ignore immunities).',
    name: 'EffectCutSceneStunned',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  757: {
    comment: '757: CancelPostDialogCharacterSwitch()\nIf a dialog has been started by an NPC on a Non PartyMemeberCanInteract object\ncalling this function will cancel the Post Dialog switching back to the NPC\nthat did the initiating.',
    name: 'CancelPostDialogCharacterSwitch',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  758: {
    comment: '758: SetMaxHitPoints\nSet the maximum hitpoints of oObject\nThe objects maximum AND current hitpoints will be nMaxHP after the function is called',
    name: 'SetMaxHitPoints',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  759: {
    comment: '759: NoClicksFor()\nThis command will not allow clicking on anything for \'fDuration\' seconds',
    name: 'NoClicksFor',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  760: {
    comment: '760: HoldWorldFadeInForDialog()\nThis will hold the fade in at the begining of a module until a dialog starts',
    name: 'HoldWorldFadeInForDialog',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  761: {
    comment: '761: ShipBuild()\nThis will return if this is a shipping build. this should be used to disable all debug output.',
    name: 'ShipBuild',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  762: {
    comment: '762: SurrenderRetainBuffs()\nThis will do the same as SurrenderToEnemies, except that affected creatures will not\nlose effects which they have put on themselves',
    name: 'SurrenderRetainBuffs',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  763: {
    comment: '763. SuppressStatusSummaryEntry\nThis will prevent the next n entries that should have shown up in the status summary\nfrom being added\nThis will not add on to any existing summary suppressions, but rather replace it.  So\nto clear the supression system pass 0 as the entry value',
    name: 'SuppressStatusSummaryEntry',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  764: {
    comment: '764. GetCheatCode\nReturns true if cheat code has been enabled',
    name: 'GetCheatCode',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  765: {
    comment: '765. SetMusicVolume\nNEVER USE THIS!',
    name: 'SetMusicVolume',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  766: {
    comment: '766. CreateItemOnFloor\nShould only be used for items that have been created on the ground, and will\nbe destroyed without ever being picked up or equipped.  Returns true if successful',
    name: 'CreateItemOnFloor',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.STRING, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER ],
    action: undefined
  },
  767: {
    comment: '767. SetAvailableNPCId\nThis will set the object id that should be used for a specific available NPC',
    name: 'SetAvailableNPCId',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  768: {
    comment: 'DJS-OEI\n768. GetScriptParameter\nThis function will take the index of a script parameter\nand return the value associated with it. The index\nof the first parameter is 1.',
    name: 'GetScriptParameter',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: function(this: NWScriptInstance, args: [number]){
      return parseInt(this.params[args[0] - 1] as any);
    }
  },
  769: {
    comment: '//RWT-OEI 12/10/03\n769. SetFadeUntilScript\nThis script function will make it so that the fade cannot be lifted under any circumstances\nother than a call to the SetGlobalFadeIn() script.\nThis function should be called AFTER the fade has already been called. For example, you would\ndo a SetGlobalFadeOut() first, THEN do SetFadeUntilScript()\nThe exception to this if it\'s used in an OnModuleLoad() script, where instead of starting a new\nfade you are just extending the LevelLoad fade indefinitely. You can just call SetFadeUntilScript\nin such cases and the game will stay faded until a GlobalSetFadeIn() is called.',
    name: 'SetFadeUntilScript',
    type: NWScriptDataType.VOID,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      GameState.FadeOverlayManager.holdForScript = true;
    }	
  },
  770: {
    comment: 'DJS-OEI 12/15/2003\n770: Create a Force Body effect\n- nLevel: The level of the Force Body effect.\n   0 = Force Body\n   1 = Improved Force Body\n   2 = Master Force Body',
    name: 'EffectForceBody',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  771: {
    comment: 'FAK-OEI 12/15/2003\n771: Get the number of components for an item',
    name: 'GetItemComponent',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  772: {
    comment: 'FAK-OEI 12/15/2003\n771: Get the number of components for an item in pieces',
    name: 'GetItemComponentPieceValue',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  773: {
    comment: 'FAK-OEI 12/15/2003\n773: Start the GUI for Chemical Workshop',
    name: 'ShowChemicalUpgradeScreen',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  774: {
    comment: 'FAK-OEI 12/15/2003\n774: Get the number of chemicals for an item',
    name: 'GetChemicals',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  775: {
    comment: 'FAK-OEI 12/15/2003\n775: Get the number of chemicals for an item in pieces',
    name: 'GetChemicalPieceValue',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  776: {
    comment: 'DJS-OEI 12/30/2003\n776: Get the number of Force Points that were required to\ncast this spell. This includes modifiers such as Room Force\nRatings and the Force Body power.\n* Return value on error: 0',
    name: 'GetSpellForcePointCost',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  777: {
    comment: 'DJS-OEI 1/2/2004\n777: Create a Fury effect.',
    name: 'EffectFury',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  778: {
    comment: 'DJS-OEI 1/3/2004\n778: Create a Blind effect.',
    name: 'EffectBlind',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  779: {
    comment: 'DJS-OEI 1/4/2004\n779: Create an FP regeneration modifier effect.',
    name: 'EffectFPRegenModifier',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  780: {
    comment: 'DJS-OEI 1/4/2004\n780: Create a VP regeneration modifier effect.',
    name: 'EffectVPRegenModifier',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  781: {
    comment: 'DJS-OEI 1/9/2004\n781: Create a Force Crush effect.',
    name: 'EffectCrush',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  782: {
    comment: 'FAK - OEI 1/12/04\n782: Minigame grabs a swoop bike upgrade',
    name: 'SWMG_GetSwoopUpgrade',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: function(this: NWScriptInstance, args: [number]){
      switch(args[0]){
        case 0:
          return GameState.PartyManager.SwoopUpgrade1;
        case 1:
          return GameState.PartyManager.SwoopUpgrade2;
        case 2:
          return GameState.PartyManager.SwoopUpgrade3;
      }
      return -1;
    }	
  },
  783: {
    comment: 'DJS-OEI 1/12/2004\n783: Returns whether or not the target has access to a feat,\neven if they can\'t use it right now due to daily limits or\nother restrictions.',
    name: 'GetFeatAcquired',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  784: {
    comment: 'DJS-OEI 1/12/2004\n784: Returns whether or not the target has access to a spell,\neven if they can\'t use it right now due to lack of Force Points.',
    name: 'GetSpellAcquired',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  785: {
    comment: 'FAK-OEI 1/12/2004\n785: Displays the Swoop Bike upgrade screen.',
    name: 'ShowSwoopUpgradeScreen',
    type: NWScriptDataType.VOID,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      //cut content?
      // GameState.MenuManager.MenuSwoopUp.open();
    }
  },
  786: {
    comment: 'DJS-OEI 1/13/2004\n786: Grants the target a feat without regard for prerequisites.',
    name: 'GrantFeat',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  787: {
    comment: 'DJS-OEI 1/13/2004\n787: Grants the target a spell without regard for prerequisites.',
    name: 'GrantSpell',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  788: {
    comment: 'DJS-OEI 1/13/2004\n788: Places an active mine on the map.\nnMineType - Mine Type from Traps.2DA\nlPoint - The location in the world to place the mine.\nnDetectDCBase - This value, plus the \'DetectDCMod\' column in Traps.2DA\nresults in the final DC for creatures to detect this mine.\nnDisarmDCBase - This value, plus the \'DisarmDCMod\' column in Traps.2DA\nresults in the final DC for creatures to disarm this mine.\noCreator - The object that should be considered the owner of the mine.\nIf oCreator is set to OBJECT_INVALID, the faction of the mine will be\nconsidered Hostile1, meaning the party will be vulnerable to it.',
    name: 'SpawnMine',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  789: {
    comment: 'FAK - OEI 1/15/04\n789: Yet another minigame function. Returns the object\'s track\'s position.',
    name: 'SWMG_GetTrackPosition',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  790: {
    comment: 'FAK - OEI 1/15/04\n790: minigame function that lets you psuedo-set the position of a follower object',
    name: 'SWMG_SetFollowerPosition',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  791: {
    comment: '//RWT-OEI 01/16/04\n791: A function to put the character into a true combat state but the reason set to\n     not real combat. This should help us control animations in cutscenes with a bit\n     more precision. -- Not totally sure this is doing anything just yet. Seems\n     the combat condition gets cleared shortly after anyway.\n     If nEnable is 1, it enables fake combat mode. If 0, it disables it.\n     WARNING: Whenever using this function to enable fake combat mode, you should\n              have a matching call to it to disable it. (pass 0 for nEnable).',
    name: 'SetFakeCombatState',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  792: {
    comment: 'FAK - OEI 1/23/04\n792: minigame function that deletes a minigame object',
    name: 'SWMG_DestroyMiniGameObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  793: {
    comment: 'DJS-OEI 1/26/2004\n793: Returns the Demolitions skill of the creature that\nplaced this mine. This will often be 0. This function accepts\nthe object that the mine is attached to (Door, Placeable, or Trigger)\nand will determine which one it actually is at runtime.',
    name: 'GetOwnerDemolitionsSkill',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      //todo
      return 0;
    }
  },
  794: {
    comment: 'RWT-OEI 01/29/04\n794: Disables or Enables the Orient On Click behavior in creatures. If\n     disabled, they will not orient to face the player when clicked on\n     for dialogue. The default behavior is TRUE.',
    name: 'SetOrientOnClick',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  795: {
    comment: 'DJS-OEI 1/29/2004\n795: Gets the PC\'s influence on the alignment of a CNPC.\nParameters:\nnNPC - NPC_* constant identifying the CNPC we\'re interested in.\nIf this character is not an available party member, the return\nvalue with be 0. If the character is in the party, but has an\nattitude of Ambivalent, this will be -1.',
    name: 'GetInfluence',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  796: {
    comment: 'DJS-OEI 1/29/2004\n796: Sets the PC\'s influence on the alignment of a CNPC.\nParameters:\nnNPC - NPC_* constant identifying the CNPC we\'re interested in.\nIf this character is not an available party member, nothing\nwill happen.\nnInfluence - The new value for the influence on this CNPC.',
    name: 'SetInfluence',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  797: {
    comment: 'DJS-OEI 1/29/2004\n797: Modifies the PC\'s influence on the alignment of a CNPC.\nParameters:\nnNPC - NPC_* constant identifying the CNPC we\'re interested in.\nIf this character is not an available party member, nothing\nwill happen.\nnModifier - The modifier to the current influence on this CNPC.\nThis may be a negative value to reduce the influence.',
    name: 'ModifyInfluence',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  798: {
    comment: 'FAK - OEI 2/3/04\n798: returns the racial sub-type of the oTarget object',
    name: 'GetRacialSubType',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  799: {
    comment: 'DJS-OEI 2/3/2004\n799: Increases the value of the given global number by the given amount.\nThis function only works with Number type globals, not booleans. It\nwill fail with a warning if the final amount is greater than the max\nof 127.',
    name: 'IncrementGlobalNumber',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: function(this: NWScriptInstance, args: [string, number]){
      
      if(typeof GameState.GlobalVariableManager.Globals.Number.has(args[0].toLowerCase()) !== 'undefined')
      GameState.GlobalVariableManager.Globals.Number.get(args[0].toLowerCase()).value += parseInt(args[1] as any);
    }	
  },
  800: {
    comment: 'DJS-OEI 2/3/2004\n800: Decreases the value of the given global number by the given amount.\nThis function only works with Number type globals, not booleans. It\nwill fail with a warning if the final amount is less than the minimum\nof -128.',
    name: 'DecrementGlobalNumber',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: function(this: NWScriptInstance, args: [string, number]){
      if(typeof GameState.GlobalVariableManager.Globals.Number.has(args[0].toLowerCase()) !== 'undefined')
      GameState.GlobalVariableManager.Globals.Number.get(args[0].toLowerCase()).value -= parseInt(args[1] as any);
    }	
  },
  801: {
    comment: 'RWT-OEI 02/06/04\n801: SetBonusForcePoints - This sets the number of bonus force points\n     that will always be added to that character\'s total calculated\n     force points.',
    name: 'SetBonusForcePoints',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  802: {
    comment: 'RWT-OEI 02/06/04\n802: AddBonusForcePoints - This adds nBonusFP to the current total\n     bonus that the player has. The Bonus Force Points are a pool\n     of force points that will always be added after the player\'s\n     total force points are calculated (based on level, force dice,\n     etc.)',
    name: 'AddBonusForcePoints',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  803: {
    comment: 'RWT-OEI 02/06/04\n803: GetBonusForcePoints - This returns the total number of bonus\n     force points a player has. Bonus Force Points are a pool of\n     points that are always added to a player\'s Max Force Points.\nST: Please explain how a function returning VOID could return a\n    numerical value? Hope it works changing the return type...\nvoid GetBonusForcePoints( object oCreature );',
    name: 'GetBonusForcePoints',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  804: {
    comment: 'FAK - OEI 2/11/04\n804: SWMG_SetJumpSpeed -- the sets the \'jump speed\' for the swoop\n     bike races. Gravity will act upon this velocity.',
    name: 'SWMG_SetJumpSpeed',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  805: {
    comment: 'PC CODE MERGER\n805. IsMoviePlaying--dummy func so we can compile',
    name: 'IsMoviePlaying',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  806: {
    comment: '806 QueueMovie',
    name: 'QueueMovie',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER ],
    action: undefined
  },
  807: {
    comment: '807',
    name: 'PlayMovieQueue',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  808: {
    comment: '808',
    name: 'YavinHackDoorClose',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  809: {
    comment: '809\nnew function for droid confusion so inherint mind immunity can be\navoided.\nEND PC CODE MERGER',
    name: 'EffectDroidConfused',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  810: {
    comment: '810\nDJS-OEI 3/8/2004\nDetermines if the given creature is in Stealth mode or not.\n0 = Creature is not stealthed.\n1 = Creature is stealthed.\nThis function will return 0 for any non-creature.',
    name: 'IsStealthed',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  811: {
    comment: '811\nDJS-OEI 3/12/2004\nDetermines if the given creature is using any Meditation Tree\nForce Power.\n0 = Creature is not meditating.\n1 = Creature is meditating.\nThis function will return 0 for any non-creature.',
    name: 'IsMeditating',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      return 0;
    }	
  },
  812: {
    comment: '812\nDJS-OEI 3/16/2004\nDetermines if the given creature is using the Total Defense\nStance.\n0 = Creature is not in Total Defense.\n1 = Creature is in Total Defense.\nThis function will return 0 for any non-creature.',
    name: 'IsInTotalDefense',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  813: {
    comment: '813\nRWT-OEI 03/19/04\nStores a Heal Target for the Healer AI script. Should probably\nnot be used outside of the Healer AI script.',
    name: 'SetHealTarget',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject, ModuleObject]){
      if(BitWise.InstanceOfObject(args[0],ModuleObjectType.ModuleObject)){
        this.healTarget = args[1];
      }
    }	
  },
  814: {
    comment: '814\nRWT-OEI 03/19/04\nRetrieves the Heal Target for the Healer AI script. Should probably\nnot be used outside of the Healer AI script.',
    name: 'GetHealTarget',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleCreature]){
      return this.healTarget;
    }	
  },
  815: {
    comment: '815\nRWT-OEI 03/23/04\nReturns a vector containing a random destination that the\ngiven creature can walk to that\'s within the range of the\npassed parameter.',
    name: 'GetRandomDestination',
    type: NWScriptDataType.VECTOR,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  816: {
    comment: '816\nDJS-OEI 3/25/2004\nReturns whether the given creature is currently in the\nrequested Lightsaber/Consular Form and can make use of\nits benefits. This function will perform trumping checks\nand lightsaber-wielding checks for those Forms that require\nthem.',
    name: 'IsFormActive',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  817: {
    comment: '817\nDJS-OEI 3/28/2004\nReturns the Form Mask of the requested spell. This is used\nto determine if a spell is affected by various Forms, usually\nConsular forms that modify duration/range.',
    name: 'GetSpellFormMask',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: function(this: NWScriptInstance, args: [number]){
      const spell = GameState.TwoDAManager.datatables.get('spells').rows[args[0]];
      if(!spell){
        return 0;
      }
      return parseInt(spell.formmask);
    }
  },
  818: {
    comment: '818\nDJS-OEI 3/29/2004\nReturn the base number of Force Points required to cast\nthe given spell. This does not take into account modifiers\nof any kind.',
    name: 'GetSpellBaseForcePointCost',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  819: {
    comment: '819\nRWT-OEI 04/05/04\nSetting this to TRUE makes it so that the Stealth status is\nleft on characters even when entering cutscenes. By default,\nstealth is removed from anyone taking part in a cutscene.\nALWAYS set this back to FALSE on every End Dialog node in\nthe cutscene you wanted to stay stealthed in. This isn\'t a\nflag that should be left on indefinitely. In fact, it isn\'t\nsaved, so needs to be set/unset on a case by case basis.',
    name: 'SetKeepStealthInDialog',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  820: {
    comment: '820\nRWT-OEI 04/06/04\nThis returns TRUE or FALSE if there is a clear line of sight from\nthe source vector to the target vector. This is used in the AI to\nhelp the creatures using ranged weapons find better places to shoot\nwhen the player moves out of sight.',
    name: 'HasLineOfSight',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.VECTOR, NWScriptDataType.VECTOR, NWScriptDataType.OBJECT, NWScriptDataType.OBJECT ],
    action: undefined
  },
  821: {
    comment: '821\nFAK - OEI 5/3/04\nShowDemoScreen, displays a texture, timeout, string and xy for string',
    name: 'ShowDemoScreen',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.STRING, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  822: {
    comment: '822\nDJS-OEI 5/4/2004\nForces a Heartbeat on the given creature. THIS ONLY WORKS FOR CREATURES\nAT THE MOMENT. This heartbeat should force perception updates to occur.',
    name: 'ForceHeartbeat',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  823: {
    comment: '823\nDJS-OEI 5/5/2004\nCreates a Force Sight effect.',
    name: 'EffectForceSight',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  824: {
    comment: '824\nFAK - OEI 5/7/04\ngets the walk state of the creature: 0 walk or standing, 1 is running',
    name: 'IsRunning',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0],ModuleObjectType.ModuleCreature)){
        return args[0].animState == ModuleCreatureAnimState.RUNNING;
      }
      return 0;
    }
  },
  825: {
    comment: '825\nFAK - OEI 5/24/04\napplies a velocity to the player object',
    name: 'SWMG_PlayerApplyForce',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.VECTOR ],
    action: undefined
  },
  826: {
    comment: '826\nDJS-OEI 6/12/2004\nThis function allows a script to set the conditions which constitute\na combat forfeit by a member of the player\'s party. This is typically\nused to handle Battle Circle behavior or other challenge-based combats.\nnForfeitFlags: This is an OR\'ed together series of FORFEIT_* defines.',
    name: 'SetForfeitConditions',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  827: {
    comment: '827\nDJS-OEI 6/12/2004\nThis function returns the last FORFEIT_* condition that the player\nhas violated.',
    name: 'GetLastForfeitViolation',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: undefined
  },
  828: {
    comment: '828\nAWD-OEI 6/21/2004\nThis function does not return a value.\nThis function modifies the BASE value of the REFLEX saving throw for aObject',
    name: 'ModifyReflexSavingThrowBase',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  829: {
    comment: '829\nAWD-OEI 6/21/2004\nThis function does not return a value.\nThis function modifies the BASE value of the FORTITUDE saving throw for aObject',
    name: 'ModifyFortitudeSavingThrowBase',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  830: {
    comment: '830\nAWD-OEI 6/21/2004\nThis function does not return a value.\nThis function modifies the BASE value of the WILL saving throw for aObject',
    name: 'ModifyWillSavingThrowBase',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  831: {
    comment: 'DJS-OEI 6/21/2004\n831\nThis function will return the one CExoString parameter\nallowed for the currently running script.',
    name: 'GetScriptStringParameter',
    type: NWScriptDataType.STRING,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return this.paramString;
    }	
  },
  832: {
    comment: '832\nAWD-OEI 6/29/2004\nThis function returns the personal space value of an object',
    name: 'GetObjectPersonalSpace',
    type: NWScriptDataType.FLOAT,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0],ModuleObjectType.ModuleCreature)){
        return (args[0] as ModuleCreature).getPersonalSpace()
      }else{
        return 0.0;
      }
    }	
  },
  833: {
    comment: '833\nAWD-OEI 7/06/2004\nThis function adjusts a creatures stats.\noObject is the creature that will have it\'s attribute adjusted\nThe following constants are acceptable for the nAttribute parameter:\nABILITY_STRENGTH\nABILITY_DEXTERITY\nABILITY_CONSTITUTION\nABILITY_INTELLIGENCE\nABILITY_WISDOM\nABILITY_CHARISMA\nnAmount is the integer vlaue to adjust the stat by (negative values will work).',
    name: 'AdjustCreatureAttributes',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  834: {
    comment: '834\nAWD-OEI 7/08/2004\nThis function raises a creature\'s priority level.',
    name: 'SetCreatureAILevel',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  835: {
    comment: '835\nAWD-OEI 7/08/2004\nThis function raises a creature\'s priority level.',
    name: 'ResetCreatureAILevel',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  836: {
    comment: '836\nRWT-OEI 07/17/04\nThis function adds a Puppet to the Puppet Table by\ntemplate.\nReturns 1 if successful, 0 if there was an error\nThis does not spawn the puppet or anything. It just\nadds it to the party table and makes it available for\nuse down the line. Exactly like AddAvailableNPCByTemplate',
    name: 'AddAvailablePUPByTemplate',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  837: {
    comment: '837\nRWT-OEI 07/17/04\nThis function adds a Puppet to the Puppet Table by\ncreature ID\nReturns 1 if successful, 0 if there was an error\nThis does not spawn the puppet or anything. It just\nadds it to the party table and makes it available for\nuse down the line. Exactly like AddAvailableNPCByTemplate',
    name: 'AddAvailablePUPByObject',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  838: {
    comment: '838\nRWT-OEI 07/17/04\nThis function assigns a PUPPET constant to a\nParty NPC.  The party NPC -MUST- be in the game\nbefore calling this.\nBoth the PUP and the NPC have\nto be available in their respective tables\nReturns 1 if successful, 0 if there was an error',
    name: 'AssignPUP',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  839: {
    comment: '839\nRWT-OEI 07/17/04\nThis function spawns a Party PUPPET.\nThis must be used whenever you want a copy\nof the puppet around to manipulate in the game\nsince the puppet is stored in the party table\njust like NPCs are.  Once a puppet is assigned\nto a party NPC (see AssignPUP), it will spawn\nor disappear whenever its owner joins or leaves\nthe party.\nThis does not add it to the party automatically,\njust like SpawnNPC doesn\'t. You must call AddPuppet()\nto actually add it to the party',
    name: 'SpawnAvailablePUP',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.LOCATION ],
    action: undefined
  },
  840: {
    comment: '840\nRWT-OEI 07/18/04\nThis adds an existing puppet object to the party. The\npuppet object must already exist via SpawnAvailablePUP\nand must already be available via AddAvailablePUP*\nfunctions.',
    name: 'AddPartyPuppet',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  841: {
    comment: '841\nRWT-OEI 07/19/04\nThis returns the object ID of the puppet\'s owner.\nThe Puppet\'s owner must exist and must be in the party\nin order to be found.\nReturns invalid object Id if the owner cannot be found.',
    name: 'GetPUPOwner',
    type: NWScriptDataType.OBJECT,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  842: {
    comment: '842\nRWT-OEI 07/19/04\nReturns 1 if the creature is a Puppet in the party.\nOtherwise returns 0. It is possible for a \'party puppet\'\nto exist without actually being in the party table.\nsuch as when SpawnAvailablePUP is used without subsequently\nusing AddPartyPuppet to add the newly spawned puppet to\nthe party table. A puppet in that in-between state would\nreturn 0 from this function',
    name: 'GetIsPuppet',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  843: {
    comment: '843\nRWT-OEI 07/20/04\nSimiliar to ActionFollowLeader() except the creature\nfollows its owner\n//nRange is how close it should follow. Note that once this\n//action is queued, it will be the only thing this creature\n//does until a ClearAllActions() is used.',
    name: 'ActionFollowOwner',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.FLOAT ],
    action: undefined
  },
  844: {
    comment: '844\nRWT-OEI 07/21/04\nReturns TRUE if the object ID passed is the character\nthat the player is actively controlling at that point.\nNote that this function is *NOT* able to return correct\ninformation during Area Loading since the player is not\nactively controlling anyone at that point.',
    name: 'GetIsPartyLeader',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0],ModuleObjectType.ModuleObject)){
        if(args[0] == GameState.PartyManager.party[0]){
          return 1;
        }else{
          return 0;
        }
      }else{
        return 0;
      }
    }	
  },
  845: {
    comment: '845\nRWT-OEI 07/21/04\nReturns the object ID of the character that the player\nis actively controlling. This is the \'Party Leader\'.\nReturns object Invalid on error\nNote that this function is *NOT* able to return correct\ninformation during Area Loading since the player is not\nactively controlling anyone at that point.',
    name: 'GetPartyLeader',
    type: NWScriptDataType.OBJECT,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return GameState.PartyManager.party[0];
    }	
  },
  846: {
    comment: '846\nJAB-OEI 07/22/04\nWill remove the CNPC from the 3 person party, and remove\nhim/her from the area, effectively sending the CNPC back\nto the base. The CNPC data is still stored in the\nparty table, and calling this function will not destroy\nthe CNPC in any way.\nReturns TRUE for success.',
    name: 'RemoveNPCFromPartyToBase',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER ],
    action: function(this: NWScriptInstance, args: [number]){
      GameState.PartyManager.RemoveNPCById(args[0], true);
      return 1;
    }	
  },
  847: {
    comment: '847\nAWD-OEI 7/22/2004\nThis causes a creature to flourish with it\'s currently equipped weapon.',
    name: 'CreatureFlourishWeapon',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0],ModuleObjectType.ModuleCreature)){
        (args[0] as ModuleCreature).flourish();
      }
    }	
  },
  848: {
    comment: '848\nCreate a Mind Trick effect',
    name: 'EffectMindTrick',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  849: {
    comment: '849\nCreate a Faction Modifier effect.',
    name: 'EffectFactionModifier',
    type: NWScriptDataType.EFFECT,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  850: {
    comment: '850\nChangeObjectAppearance\noObjectToChange = Object to change appearance of\nnAppearance = appearance to change to (from appearance.2da)',
    name: 'ChangeObjectAppearance',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  851: {
    comment: '851\nGetIsXBox\nReturns TRUE if this script is being executed on the X-Box. Returns FALSE\nif this is the PC build.',
    name: 'GetIsXBox',
    type: NWScriptDataType.INTEGER,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return 0;
    }	
  },
  852: {
    comment: '852\nCreate a Droid Scramble effect',
    name: 'EffectDroidScramble',
    type: NWScriptDataType.EFFECT,
    args: [],
    action: undefined
  },
  853: {
    comment: '853\nActionSwitchWeapons\nForces the creature to switch between Config 1 and Config 2\nof their equipment. Does not work in dialogs. Works with\nAssignCommand()',
    name: 'ActionSwitchWeapons',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  854: {
    comment: '854\nDJS-OEI 8/29/2004\nPlayOverlayAnimation\nThis function will play an overlay animation on a character\neven if the character is moving. This does not cause an action\nto be placed on the queue. The animation passed in must be\ndesignated as an overlay in Animations.2DA.',
    name: 'PlayOverlayAnimation',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      if(BitWise.InstanceOfObject(args[0],ModuleObjectType.ModuleCreature)){
        (args[0] as ModuleCreature).playOverlayAnimation(args[1]);
      }
    }	
  },
  855: {
    comment: '855\nRWT-OEI 08/30/04\nUnlockAllSongs\nCalling this will set all songs as having been unlocked.\nIt is INTENDED to be used in the end-game scripts to unlock\nany end-game songs as well as the KotOR1 sound track.',
    name: 'UnlockAllSongs',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  },
  856: {
    comment: '856\nRWT-OEI 08/31/04\nPassing TRUE into this function turns off the player\'s maps.\nPassing FALSE into this function re-enables them. This change\nis permanent once called, so it is important that there *is*\na matching call to DisableMap(FALSE) somewhere or else the\nplayer is stuck without a map indefinitely.',
    name: 'DisableMap',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  857: {
    comment: '857\nRWT-OEI 08/31/04\nThis function schedules a mine to play its DETONATION\nanimation once it is destroyed. Note that this detonates\nthe mine immediately but has nothing to do with causing\nthe mine to do any damage to anything around it. To\nget the mine to damage things around it when it detonates\ndo:\nAssignCommand(<mine>,ExecuteScript( \'k_trp_generic\',<mine>));\nright before you call DetonateMine(). By my experience so far\nyou don\'t need any kind of delay between the two.',
    name: 'DetonateMine',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  858: {
    comment: '858\nRWT-OEI 09/06/04\nThis function turns off the innate health regeneration that all party\nmembers have. The health regen will *stay* off until it is turned back\non by passing FALSE to this function.',
    name: 'DisableHealthRegen',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  859: {
    comment: '859\nDJS-OEI 9/7/2004\nThis function sets the current Jedi Form on the given creature. This\ncall will do nothing if the target does not know the Form itself.',
    name: 'SetCurrentForm',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  860: {
    comment: '860\nRWT-OEI 09/09/04\nThis will disable or enable area transit',
    name: 'SetDisableTransit',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  861: {
    comment: '861\n//RWT-OEI 09/09/04\nThis will set the specific input class.\nThe valid options are:\n0 - Normal PC control\n1 - Mini game control\n2 - GUI control\n3 - Dialog Control\n4 - Freelook control',
    name: 'SetInputClass',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  862: {
    comment: '862\n//RWT-OEI 09/15/04\nThis script allows an object to recieve updates even if it is outside\n//the normal range limit of 250.0f meters away from the player. This should\n//ONLY be used for cutscenes that involve objects that are more than 250\n//meters away from the player. It needs to be used on a object by object\n//basis.\n//This flag should *always* be set to false once the cutscene it is needed\n//for is over, or else the game will spend CPU time updating the object\n//when it doesn\'t need to.\n//For questions on use of this function, or what its purpose is, check\n//with me.',
    name: 'SetForceAlwaysUpdate',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  863: {
    comment: '//863\n//RWT-OEI 09/15/04\n//This function enables or disables rain',
    name: 'EnableRain',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER ],
    action: undefined
  },
  864: {
    comment: '//864\n//RWT-OEI 09/27/04\n//This function displays the generic Message Box with the strref\n//message in it\n//sIcon is the resref for an icon you would like to display.',
    name: 'DisplayMessageBox',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.STRING ],
    action: undefined
  },
  865: {
    comment: '//865\n//RWT-OEI 09/28/04\n//This function displays a datapad popup. Just pass it the\n//object ID of a datapad.',
    name: 'DisplayDatapad',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  866: {
    comment: '866\nCTJ-OEI 09-29-04\nRemoves the heartbeat script on the placeable.  Useful for\nplaceables whose contents get populated in the heartbeat\nscript and then the heartbeat no longer needs to be called.',
    name: 'RemoveHeartbeat',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModulePlaceable)){
        args[0].scripts.onHeartbeat = undefined;
      }
    }	
  },
  867: {
    comment: '//867\nJF-OEI 10-07-2004\nRemove an effect by ID',
    name: 'RemoveEffectByID',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  868: {
    comment: '//868\nRWT-OEI 10/07/04\nThis script removes an effect by an identical match\nbased on:\nMust have matching EffectID types.\nMust have the same value in Integer(0)\nMust have the same value in Integer(1)\nI\'m specifically using this function for Mandalore\'s implant swapping\nscript and it will probably not be useful for anyone else. If you\'re\nnot sure what this script function does, see me before using it.',
    name: 'RemoveEffectByExactMatch',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.EFFECT ],
    action: undefined
  },
  869: {
    comment: '869\nDJS-OEI 10/9/2004\nThis function adjusts a creature\'s skills.\noObject is the creature that will have its skill adjusted\nThe following constants are acceptable for the nSkill parameter:\nSKILL_COMPUTER_USE\nSKILL_DEMOLITIONS\nSKILL_STEALTH\nSKILL_AWARENESS\nSKILL_PERSUADE\nSKILL_REPAIR\nSKILL_SECURITY\nSKILL_TREAT_INJURY\nnAmount is the integer value to adjust the stat by (negative values will work).',
    name: 'AdjustCreatureSkills',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER ],
    action: undefined
  },
  870: {
    comment: '870\nDJS-OEI 10/10/2004\nThis function returns the base Skill Rank for the requested\nskill. It does not include modifiers from effects/items.\nThe following constants are acceptable for the nSkill parameter:\nSKILL_COMPUTER_USE\nSKILL_DEMOLITIONS\nSKILL_STEALTH\nSKILL_AWARENESS\nSKILL_PERSUADE\nSKILL_REPAIR\nSKILL_SECURITY\nSKILL_TREAT_INJURY\noObject is the creature that will have its skill base returned.',
    name: 'GetSkillRankBase',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  871: {
    comment: '871\nDJS-OEI 10/15/2004\nThis function will allow the caller to modify the rendering behavior\nof the target object.\noObject - The object to change rendering state on.\nbEnable - If 0, the object will stop rendering. Else, the object will render.',
    name: 'EnableRendering',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.OBJECT, NWScriptDataType.INTEGER ],
    action: undefined
  },
  872: {
    comment: '872\nRWT-OEI 10/19/04\nThis function returns TRUE if the creature has actions in its\nCombat Action queue.',
    name: 'GetCombatActionsPending',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: undefined
  },
  873: {
    comment: '873\nRWT-OEI 10/26/04\nThis function saves the party member at that index with the object\nthat is passed in.',
    name: 'SaveNPCByObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  874: {
    comment: '874\nRWT-OEI 10/26/04\nThis function saves the party puppet at that index with the object\nthat is passed in. For the Remote, just use \'0\' for nPUP',
    name: 'SavePUPByObject',
    type: NWScriptDataType.VOID,
    args: [ NWScriptDataType.INTEGER, NWScriptDataType.OBJECT ],
    action: undefined
  },
  875: {
    comment: '875\nRWT-OEI 10/29/04\nReturns TRUE if the object passed in is the character that the player\nmade at the start of the game',
    name: 'GetIsPlayerMadeCharacter',
    type: NWScriptDataType.INTEGER,
    args: [ NWScriptDataType.OBJECT ],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      return BitWise.InstanceOfObject(args[0], ModuleObjectType.ModulePlayer) ? NW_TRUE : NW_FALSE;
    }
  },
  876: {
    comment: '876\nRWT-OEI 11/12/04\nThis repopulates the NPCObject table in CSWPartyTable. Do not use this\nunless you understand exactly what it is doing.',
    name: 'RebuildPartyTable',
    type: NWScriptDataType.VOID,
    args: [],
    action: undefined
  }
};

for (let property in NWScriptDefK1.Actions) {
  if (NWScriptDefK1.Actions.hasOwnProperty(property)) {
    if(NWScriptDefK2.Actions[property]){
      if(NWScriptDefK2.Actions[property].action === undefined){
        NWScriptDefK2.Actions[property].action = NWScriptDefK1.Actions[property].action;
      }
    }
  }
}
