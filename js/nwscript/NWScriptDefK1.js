/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The NWScriptDefK1 class. This class holds all of the important NWScript declarations for KotOR I
 */

class NWScriptDefK1 extends NWScriptDef {

}

NWScriptDefK1.Actions = {
  0: {
    'comment': '0: Get an integer between 0 and nMaxInteger-1.\nReturn value on error: 0\n',
    'name': 'Random',
    'type': 'int',
    'args': [ 'int' ]
  },
  1: {
    'comment': '1: Output sString to the log file.\n',
    'name': 'PrintString',
    'type': 'void',
    'args': [ 'string' ]
  },
  2: {
    'comment': '2: Output a formatted float to the log file.\n- nWidth should be a value from 0 to 18 inclusive.\n- nDecimals should be a value from 0 to 9 inclusive.\n',
    'name': 'PrintFloat',
    'type': 'void',
    'args': [ 'float', 'int', 'int' ]
  },
  3: {
    'comment': '3: Convert fFloat into a string.\n- nWidth should be a value from 0 to 18 inclusive.\n- nDecimals should be a value from 0 to 9 inclusive.\n',
    'name': 'FloatToString',
    'type': 'string',
    'args': [ 'float', 'int', 'int' ]
  },
  4: {
    'comment': '4: Output nInteger to the log file.\n',
    'name': 'PrintInteger',
    'type': 'void',
    'args': [ 'int' ]
  },
  5: {
    'comment': '5: Output oObject\'s ID to the log file.\n',
    'name': 'PrintObject',
    'type': 'void',
    'args': [ 'object' ]
  },
  6: {
    'comment': '6: Assign aActionToAssign to oActionSubject.\n* No return value, but if an error occurs, the log file will contain\n\'AssignCommand failed.\'\n(If the object doesn\'t exist, nothing happens.)\n',
    'name': 'AssignCommand',
    'type': 'void',
    'args': [ 'object', 'action' ]
  },
  7: {
    'comment': '7: Delay aActionToDelay by fSeconds.\n* No return value, but if an error occurs, the log file will contain\n\'DelayCommand failed.\'.\n',
    'name': 'DelayCommand',
    'type': 'void',
    'args': [ 'float', 'action' ]
  },
  8: {
    'comment': '8: Make oTarget run sScript and then return execution to the calling script.\nIf sScript does not specify a compiled script, nothing happens.\n- nScriptVar: This value will be returned by calls to GetRunScriptVar.\n',
    'name': 'ExecuteScript',
    'type': 'void',
    'args': [ 'string', 'object', 'int' ]
  },
  9: {
    'comment': '9: Clear all the actions of the caller. (This will only work on Creatures)\n* No return value, but if an error occurs, the log file will contain\n\'ClearAllActions failed.\'.\n',
    'name': 'ClearAllActions',
    'type': 'void',
    'args': []
  },
  10: {
    'comment': '10: Cause the caller to face fDirection.\n- fDirection is expressed as anticlockwise degrees from Due East.\nDIRECTION_EAST, DIRECTION_NORTH, DIRECTION_WEST and DIRECTION_SOUTH are\npredefined. (0.0f=East, 90.0f=North, 180.0f=West, 270.0f=South)\n',
    'name': 'SetFacing',
    'type': 'void',
    'args': [ 'float' ]
  },
  11: {
    'comment': '11: Switches the main character to a specified NPC\n-1 specifies to switch back to the original PC\n',
    'name': 'SwitchPlayerCharacter',
    'type': 'int',
    'args': [ 'int' ]
  },
  12: {
    'comment': '12: Set the time to the time specified.\n- nHour should be from 0 to 23 inclusive\n- nMinute should be from 0 to 59 inclusive\n- nSecond should be from 0 to 59 inclusive\n- nMillisecond should be from 0 to 999 inclusive\n1) Time can only be advanced forwards; attempting to set the time backwards\nwill result in the day advancing and then the time being set to that\nspecified, e.g. if the current hour is 15 and then the hour is set to 3,\nthe day will be advanced by 1 and the hour will be set to 3.\n2) If values larger than the max hour, minute, second or millisecond are\nspecified, they will be wrapped around and the overflow will be used to\nadvance the next field, e.g. specifying 62 hours, 250 minutes, 10 seconds\nand 10 milliseconds will result in the calendar day being advanced by 2\nand the time being set to 18 hours, 10 minutes, 10 milliseconds.\n',
    'name': 'SetTime',
    'type': 'void',
    'args': [ 'int' ]
  },
  13: {
    'comment': '13: Sets (by NPC constant) which party member should be the controlled\ncharacter\n',
    'name': 'SetPartyLeader',
    'type': 'int',
    'args': [ 'int' ]
  },
  14: {
    'comment': '14: Sets whether the current area is escapable or not\nTRUE means you can not escape the area\nFALSE means you can escape the area\n',
    'name': 'SetAreaUnescapable',
    'type': 'void',
    'args': [ 'int' ]
  },
  15: {
    'comment': '15: Returns whether the current area is escapable or not\nTRUE means you can not escape the area\nFALSE means you can escape the area\n',
    'name': 'GetAreaUnescapable',
    'type': 'int',
    'args': []
  },
  16: {
    'comment': '16: Get the current hour.\n',
    'name': 'GetTimeHour',
    'type': 'int',
    'args': []
  },
  17: {
    'comment': '17: Get the current minute\n',
    'name': 'GetTimeMinute',
    'type': 'int',
    'args': []
  },
  18: {
    'comment': '18: Get the current second\n',
    'name': 'GetTimeSecond',
    'type': 'int',
    'args': []
  },
  19: {
    'comment': '19: Get the current millisecond\n',
    'name': 'GetTimeMillisecond',
    'type': 'int',
    'args': []
  },
  20: {
    'comment': '20: The action subject will generate a random location near its current location\nand pathfind to it.  All commands will remove a RandomWalk() from the action\nqueue if there is one in place.\n* No return value, but if an error occurs the log file will contain\n\'ActionRandomWalk failed.\'\n',
    'name': 'ActionRandomWalk',
    'type': 'void',
    'args': []
  },
  21: {
    'comment': '21: The action subject will move to lDestination.\n- lDestination: The object will move to this location.  If the location is\ninvalid or a path cannot be found to it, the command does nothing.\n- bRun: If this is TRUE, the action subject will run rather than walk\n* No return value, but if an error occurs the log file will contain\n\'MoveToPoint failed.\'\n',
    'name': 'ActionMoveToLocation',
    'type': 'void',
    'args': [ 'location', 'int' ]
  },
  22: {
    'comment': '22: Cause the action subject to move to a certain distance from oMoveTo.\nIf there is no path to oMoveTo, this command will do nothing.\n- oMoveTo: This is the object we wish the action subject to move to\n- bRun: If this is TRUE, the action subject will run rather than walk\n- fRange: This is the desired distance between the action subject and oMoveTo\n* No return value, but if an error occurs the log file will contain\n\'ActionMoveToObject failed.\'\n',
    'name': 'ActionMoveToObject',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  23: {
    'comment': '23: Cause the action subject to move to a certain distance away from oFleeFrom.\n- oFleeFrom: This is the object we wish the action subject to move away from.\nIf oFleeFrom is not in the same area as the action subject, nothing will\nhappen.\n- bRun: If this is TRUE, the action subject will run rather than walk\n- fMoveAwayRange: This is the distance we wish the action subject to put\nbetween themselves and oFleeFrom\n* No return value, but if an error occurs the log file will contain\n\'ActionMoveAwayFromObject failed.\'\n',
    'name': 'ActionMoveAwayFromObject',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  24: {
    'comment': '24: Get the area that oTarget is currently in\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetArea',
    'type': 'object',
    'args': [ 'object' ]
  },
  25: {
    'comment': '25: The value returned by this function depends on the object type of the caller:\n1) If the caller is a door or placeable it returns the object that last\ntriggered it.\n2) If the caller is a trigger, area of effect, module, area or encounter it\nreturns the object that last entered it.\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetEnteringObject',
    'type': 'object',
    'args': []
  },
  26: {
    'comment': '26: Get the object that last left the caller.  This function works on triggers,\nareas of effect, modules, areas and encounters.\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetExitingObject',
    'type': 'object',
    'args': []
  },
  27: {
    'comment': '27: Get the position of oTarget\n* Return value on error: vector (0.0f, 0.0f, 0.0f)\n',
    'name': 'GetPosition',
    'type': 'vector',
    'args': [ 'object' ]
  },
  28: {
    'comment': '28: Get the direction in which oTarget is facing, expressed as a float between\n0.0f and 360.0f\n* Return value on error: -1.0f\n',
    'name': 'GetFacing',
    'type': 'float',
    'args': [ 'object' ]
  },
  29: {
    'comment': '29: Get the possessor of oItem\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetItemPossessor',
    'type': 'object',
    'args': [ 'object' ]
  },
  30: {
    'comment': '30: Get the object possessed by oCreature with the tag sItemTag\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetItemPossessedBy',
    'type': 'object',
    'args': [ 'object', 'string' ]
  },
  31: {
    'comment': '31: Create an item with the template sItemTemplate in oTarget\'s inventory.\n- nStackSize: This is the stack size of the item to be created\n* Return value: The object that has been created.  On error, this returns\nOBJECT_INVALID.\n',
    'name': 'CreateItemOnObject',
    'type': 'object',
    'args': [ 'string', 'object', 'int' ]
  },
  32: {
    'comment': '32: Equip oItem into nInventorySlot.\n- nInventorySlot: INVENTORY_SLOT_*\n* No return value, but if an error occurs the log file will contain\n\'ActionEquipItem failed.\'\n',
    'name': 'ActionEquipItem',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  33: {
    'comment': '33: Unequip oItem from whatever slot it is currently in.\n',
    'name': 'ActionUnequipItem',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  34: {
    'comment': '34: Pick up oItem from the ground.\n* No return value, but if an error occurs the log file will contain\n\'ActionPickUpItem failed.\'\n',
    'name': 'ActionPickUpItem',
    'type': 'void',
    'args': [ 'object' ]
  },
  35: {
    'comment': '35: Put down oItem on the ground.\n* No return value, but if an error occurs the log file will contain\n\'ActionPutDownItem failed.\'\n',
    'name': 'ActionPutDownItem',
    'type': 'void',
    'args': [ 'object' ]
  },
  36: {
    'comment': '36: Get the last attacker of oAttackee.  This should only be used ONLY in the\nOnAttacked events for creatures, placeables and doors.\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetLastAttacker',
    'type': 'object',
    'args': [ 'object' ]
  },
  37: {
    'comment': '37: Attack oAttackee.\n- bPassive: If this is TRUE, attack is in passive mode.\n',
    'name': 'ActionAttack',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  38: {
    'comment': '38: Get the creature nearest to oTarget, subject to all the criteria specified.\n- nFirstCriteriaType: CREATURE_TYPE_*\n- nFirstCriteriaValue:\n-> CLASS_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_CLASS\n-> SPELL_* if nFirstCriteriaType was CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT\nor CREATURE_TYPE_HAS_SPELL_EFFECT\n-> TRUE or FALSE if nFirstCriteriaType was CREATURE_TYPE_IS_ALIVE\n-> PERCEPTION_* if nFirstCriteriaType was CREATURE_TYPE_PERCEPTION\n-> PLAYER_CHAR_IS_PC or PLAYER_CHAR_NOT_PC if nFirstCriteriaType was\nCREATURE_TYPE_PLAYER_CHAR\n-> RACIAL_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_RACIAL_TYPE\n-> REPUTATION_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_REPUTATION\nFor example, to get the nearest PC, use:\n(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC)\n- oTarget: We\'re trying to find the creature of the specified type that is\nnearest to oTarget\n- nNth: We don\'t have to find the first nearest: we can find the Nth nearest...\n- nSecondCriteriaType: This is used in the same way as nFirstCriteriaType to\nfurther specify the type of creature that we are looking for.\n- nSecondCriteriaValue: This is used in the same way as nFirstCriteriaValue\nto further specify the type of creature that we are looking for.\n- nThirdCriteriaType: This is used in the same way as nFirstCriteriaType to\nfurther specify the type of creature that we are looking for.\n- nThirdCriteriaValue: This is used in the same way as nFirstCriteriaValue to\nfurther specify the type of creature that we are looking for.\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetNearestCreature',
    'type': 'object',
    'args': [ 'int', 'int', 'object', 'int', 'int', 'int', 'int', 'int' ]
  },
  39: {
    'comment': '39: Add a speak action to the action subject.\n- sStringToSpeak: String to be spoken\n- nTalkVolume: TALKVOLUME_*\n',
    'name': 'ActionSpeakString',
    'type': 'void',
    'args': [ 'string', 'int' ]
  },
  40: {
    'comment': '40: Cause the action subject to play an animation\n- nAnimation: ANIMATION_*\n- fSpeed: Speed of the animation\n- fDurationSeconds: Duration of the animation (this is not used for Fire and\nForget animations) If a time of -1.0f is specified for a looping animation\nit will loop until the next animation is applied.\n',
    'name': 'ActionPlayAnimation',
    'type': 'void',
    'args': [ 'int', 'float', 'float' ]
  },
  41: {
    'comment': '41: Get the distance from the caller to oObject in metres.\n* Return value on error: -1.0f\n',
    'name': 'GetDistanceToObject',
    'type': 'float',
    'args': [ 'object' ]
  },
  42: {
    'comment': '42: * Returns TRUE if oObject is a valid object.\n',
    'name': 'GetIsObjectValid',
    'type': 'int',
    'args': [ 'object' ]
  },
  43: {
    'comment': '43: Cause the action subject to open oDoor\n',
    'name': 'ActionOpenDoor',
    'type': 'void',
    'args': [ 'object' ]
  },
  44: {
    'comment': '44: Cause the action subject to close oDoor\n',
    'name': 'ActionCloseDoor',
    'type': 'void',
    'args': [ 'object' ]
  },
  45: {
    'comment': '45: Change the direction in which the camera is facing\n- fDirection is expressed as anticlockwise degrees from Due East.\n(0.0f=East, 90.0f=North, 180.0f=West, 270.0f=South)\nThis can be used to change the way the camera is facing after the player\nemerges from an area transition.\n',
    'name': 'SetCameraFacing',
    'type': 'void',
    'args': [ 'float' ]
  },
  46: {
    'comment': '46: Play sSoundName\n- sSoundName: TBD - SS\n',
    'name': 'PlaySound',
    'type': 'void',
    'args': [ 'string' ]
  },
  47: {
    'comment': '47: Get the object at which the caller last cast a spell\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetSpellTargetObject',
    'type': 'object',
    'args': []
  },
  48: {
    'comment': '48: This action casts a spell at oTarget.\n- nSpell: SPELL_*\n- oTarget: Target for the spell\n- nMetamagic: METAMAGIC_*\n- bCheat: If this is TRUE, then the executor of the action doesn\'t have to be\nable to cast the spell.\n- nDomainLevel: TBD - SS\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*\n- bInstantSpell: If this is TRUE, the spell is cast immediately. This allows\nthe end-user to simulate a high-level magic-user having lots of advance\nwarning of impending trouble\n',
    'name': 'ActionCastSpellAtObject',
    'type': 'void',
    'args': [ 'int', 'object', 'int', 'int', 'int', 'int', 'int' ]
  },
  49: {
    'comment': '49: Get the current hitpoints of oObject\n* Return value on error: 0\n',
    'name': 'GetCurrentHitPoints',
    'type': 'int',
    'args': [ 'object' ]
  },
  50: {
    'comment': '50: Get the maximum hitpoints of oObject\n* Return value on error: 0\n',
    'name': 'GetMaxHitPoints',
    'type': 'int',
    'args': [ 'object' ]
  },
  51: {
    'comment': '51: EffectAssuredHit\nCreate an Assured Hit effect, which guarantees that all attacks are successful\n',
    'name': 'EffectAssuredHit',
    'type': 'effect',
    'args': []
  },
  52: {
    'comment': '52:\nReturns the last item that was equipped by a creature.\n',
    'name': 'GetLastItemEquipped',
    'type': 'object',
    'args': []
  },
  53: {
    'comment': '53:\nReturns the ID of the subscreen that is currently onscreen.  This will be one of the\nSUBSCREEN_ID_* constant values.\n',
    'name': 'GetSubScreenID',
    'type': 'int',
    'args': []
  },
  54: {
    'comment': '54:\nCancels combat for the specified creature.\n',
    'name': 'CancelCombat',
    'type': 'void',
    'args': [ 'object' ]
  },
  55: {
    'comment': '55:\nreturns the current force points for the creature\n',
    'name': 'GetCurrentForcePoints',
    'type': 'int',
    'args': [ 'object' ]
  },
  56: {
    'comment': '56:\nreturns the Max force points for the creature\n',
    'name': 'GetMaxForcePoints',
    'type': 'int',
    'args': [ 'object' ]
  },
  57: {
    'comment': '57:\nPauses the game if bPause is TRUE.  Unpauses if bPause is FALSE.\n',
    'name': 'PauseGame',
    'type': 'void',
    'args': [ 'int' ]
  },
  58: {
    'comment': '58: SetPlayerRestrictMode\nSets whether the player is currently in \'restricted\' mode\n',
    'name': 'SetPlayerRestrictMode',
    'type': 'void',
    'args': [ 'int' ]
  },
  59: {
    'comment': '59: Get the length of sString\n* Return value on error: -1\n',
    'name': 'GetStringLength',
    'type': 'int',
    'args': [ 'string' ]
  },
  60: {
    'comment': '60: Convert sString into upper case\n* Return value on error: \'\'\n',
    'name': 'GetStringUpperCase',
    'type': 'string',
    'args': [ 'string' ]
  },
  61: {
    'comment': '61: Convert sString into lower case\n* Return value on error: \'\'\n',
    'name': 'GetStringLowerCase',
    'type': 'string',
    'args': [ 'string' ]
  },
  62: {
    'comment': '62: Get nCount characters from the right end of sString\n* Return value on error: \'\'\n',
    'name': 'GetStringRight',
    'type': 'string',
    'args': [ 'string', 'int' ]
  },
  63: {
    'comment': '63: Get nCounter characters from the left end of sString\n* Return value on error: \'\'\n',
    'name': 'GetStringLeft',
    'type': 'string',
    'args': [ 'string', 'int' ]
  },
  64: {
    'comment': '64: Insert sString into sDestination at nPosition\n* Return value on error: \'\'\n',
    'name': 'InsertString',
    'type': 'string',
    'args': [ 'string', 'string', 'int' ]
  },
  65: {
    'comment': '65: Get nCount characters from sString, starting at nStart\n* Return value on error: \'\'\n',
    'name': 'GetSubString',
    'type': 'string',
    'args': [ 'string', 'int', 'int' ]
  },
  66: {
    'comment': '66: Find the position of sSubstring inside sString\n* Return value on error: -1\n',
    'name': 'FindSubString',
    'type': 'int',
    'args': [ 'string', 'string' ]
  },
  67: {
    'comment': '67: Maths operation: absolute value of fValue\n',
    'name': 'fabs',
    'type': 'float',
    'args': [ 'float' ]
  },
  68: {
    'comment': '68: Maths operation: cosine of fValue\n',
    'name': 'cos',
    'type': 'float',
    'args': [ 'float' ]
  },
  69: {
    'comment': '69: Maths operation: sine of fValue\n',
    'name': 'sin',
    'type': 'float',
    'args': [ 'float' ]
  },
  70: {
    'comment': '70: Maths operation: tan of fValue\n',
    'name': 'tan',
    'type': 'float',
    'args': [ 'float' ]
  },
  71: {
    'comment': '71: Maths operation: arccosine of fValue\n* Returns zero if fValue > 1 or fValue < -1\n',
    'name': 'acos',
    'type': 'float',
    'args': [ 'float' ]
  },
  72: {
    'comment': '72: Maths operation: arcsine of fValue\n* Returns zero if fValue >1 or fValue < -1\n',
    'name': 'asin',
    'type': 'float',
    'args': [ 'float' ]
  },
  73: {
    'comment': '73: Maths operation: arctan of fValue\n',
    'name': 'atan',
    'type': 'float',
    'args': [ 'float' ]
  },
  74: {
    'comment': '74: Maths operation: log of fValue\n* Returns zero if fValue <= zero\n',
    'name': 'log',
    'type': 'float',
    'args': [ 'float' ]
  },
  75: {
    'comment': '75: Maths operation: fValue is raised to the power of fExponent\n* Returns zero if fValue ==0 and fExponent <0\n',
    'name': 'pow',
    'type': 'float',
    'args': [ 'float', 'float' ]
  },
  76: {
    'comment': '76: Maths operation: square root of fValue\n* Returns zero if fValue <0\n',
    'name': 'sqrt',
    'type': 'float',
    'args': [ 'float' ]
  },
  77: {
    'comment': '77: Maths operation: integer absolute value of nValue\n* Return value on error: 0\n',
    'name': 'abs',
    'type': 'int',
    'args': [ 'int' ]
  },
  78: {
    'comment': '78: Create a Heal effect. This should be applied as an instantaneous effect.\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nDamageToHeal < 0.\n',
    'name': 'EffectHeal',
    'type': 'effect',
    'args': [ 'int' ]
  },
  79: {
    'comment': '79: Create a Damage effect\n- nDamageAmount: amount of damage to be dealt. This should be applied as an\ninstantaneous effect.\n- nDamageType: DAMAGE_TYPE_*\n- nDamagePower: DAMAGE_POWER_*\n',
    'name': 'EffectDamage',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  80: {
    'comment': '80: Create an Ability Increase effect\n- bAbilityToIncrease: ABILITY_*\n',
    'name': 'EffectAbilityIncrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  81: {
    'comment': '81: Create a Damage Resistance effect that removes the first nAmount points of\ndamage of type nDamageType, up to nLimit (or infinite if nLimit is 0)\n- nDamageType: DAMAGE_TYPE_*\n- nAmount\n- nLimit\n',
    'name': 'EffectDamageResistance',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  82: {
    'comment': '82: Create a Resurrection effect. This should be applied as an instantaneous effect.\n',
    'name': 'EffectResurrection',
    'type': 'effect',
    'args': []
  },
  83: {
    'comment': '83: GetPlayerRestrictMode\nreturns the current player \'restricted\' mode\n',
    'name': 'GetPlayerRestrictMode',
    'type': 'int',
    'args': [ 'object' ]
  },
  84: {
    'comment': '84: Get the Caster Level of oCreature.\n* Return value on error: 0;\n',
    'name': 'GetCasterLevel',
    'type': 'int',
    'args': [ 'object' ]
  },
  85: {
    'comment': '85: Get the first in-game effect on oCreature.\n',
    'name': 'GetFirstEffect',
    'type': 'effect',
    'args': [ 'object' ]
  },
  86: {
    'comment': '86: Get the next in-game effect on oCreature.\n',
    'name': 'GetNextEffect',
    'type': 'effect',
    'args': [ 'object' ]
  },
  87: {
    'comment': '87: Remove eEffect from oCreature.\n* No return value\n',
    'name': 'RemoveEffect',
    'type': 'void',
    'args': [ 'object', 'effect' ]
  },
  88: {
    'comment': '88: * Returns TRUE if eEffect is a valid effect.\n',
    'name': 'GetIsEffectValid',
    'type': 'int',
    'args': [ 'effect' ]
  },
  89: {
    'comment': '89: Get the duration type (DURATION_TYPE_*) of eEffect.\n* Return value if eEffect is not valid: -1\n',
    'name': 'GetEffectDurationType',
    'type': 'int',
    'args': [ 'effect' ]
  },
  90: {
    'comment': '90: Get the subtype (SUBTYPE_*) of eEffect.\n* Return value on error: 0\n',
    'name': 'GetEffectSubType',
    'type': 'int',
    'args': [ 'effect' ]
  },
  91: {
    'comment': '91: Get the object that created eEffect.\n* Returns OBJECT_INVALID if eEffect is not a valid effect.\n',
    'name': 'GetEffectCreator',
    'type': 'object',
    'args': [ 'effect' ]
  },
  92: {
    'comment': '92: Convert nInteger into a string.\n* Return value on error: \'\'\n',
    'name': 'IntToString',
    'type': 'string',
    'args': [ 'int' ]
  },
  93: {
    'comment': '93: Get the first object in oArea.\nIf no valid area is specified, it will use the caller\'s area.\n- oArea\n- nObjectFilter: OBJECT_TYPE_*\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetFirstObjectInArea',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  94: {
    'comment': '94: Get the next object in oArea.\nIf no valid area is specified, it will use the caller\'s area.\n- oArea\n- nObjectFilter: OBJECT_TYPE_*\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetNextObjectInArea',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  95: {
    'comment': '95: Get the total from rolling (nNumDice x d2 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd2',
    'type': 'int',
    'args': [ 'int' ]
  },
  96: {
    'comment': '96: Get the total from rolling (nNumDice x d3 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd3',
    'type': 'int',
    'args': [ 'int' ]
  },
  97: {
    'comment': '97: Get the total from rolling (nNumDice x d4 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd4',
    'type': 'int',
    'args': [ 'int' ]
  },
  98: {
    'comment': '98: Get the total from rolling (nNumDice x d6 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd6',
    'type': 'int',
    'args': [ 'int' ]
  },
  99: {
    'comment': '99: Get the total from rolling (nNumDice x d8 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd8',
    'type': 'int',
    'args': [ 'int' ]
  },
  100: {
    'comment': '100: Get the total from rolling (nNumDice x d10 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd10',
    'type': 'int',
    'args': [ 'int' ]
  },
  101: {
    'comment': '101: Get the total from rolling (nNumDice x d12 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd12',
    'type': 'int',
    'args': [ 'int' ]
  },
  102: {
    'comment': '102: Get the total from rolling (nNumDice x d20 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd20',
    'type': 'int',
    'args': [ 'int' ]
  },
  103: {
    'comment': '103: Get the total from rolling (nNumDice x d100 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.\n',
    'name': 'd100',
    'type': 'int',
    'args': [ 'int' ]
  },
  104: {
    'comment': '104: Get the magnitude of vVector; this can be used to determine the\ndistance between two points.\n* Return value on error: 0.0f\n',
    'name': 'VectorMagnitude',
    'type': 'float',
    'args': [ 'vector' ]
  },
  105: {
    'comment': '105: Get the metamagic type (METAMAGIC_*) of the last spell cast by the caller\n* Return value if the caster is not a valid object: -1\n',
    'name': 'GetMetaMagicFeat',
    'type': 'int',
    'args': []
  },
  106: {
    'comment': '106: Get the object type (OBJECT_TYPE_*) of oTarget\n* Return value if oTarget is not a valid object: -1\n',
    'name': 'GetObjectType',
    'type': 'int',
    'args': [ 'object' ]
  },
  107: {
    'comment': '107: Get the racial type (RACIAL_TYPE_*) of oCreature\n* Return value if oCreature is not a valid creature: RACIAL_TYPE_INVALID\n',
    'name': 'GetRacialType',
    'type': 'int',
    'args': [ 'object' ]
  },
  108: {
    'comment': '108: Do a Fortitude Save check for the given DC\n- oCreature\n- nDC: Difficulty check\n- nSaveType: SAVING_THROW_TYPE_*\n- oSaveVersus\nReturns: 0 if the saving throw roll failed\nReturns: 1 if the saving throw roll succeeded\nReturns: 2 if the target was immune to the save type specified\n',
    'name': 'FortitudeSave',
    'type': 'int',
    'args': [ 'object', 'int', 'int', 'object' ]
  },
  109: {
    'comment': '109: Does a Reflex Save check for the given DC\n- oCreature\n- nDC: Difficulty check\n- nSaveType: SAVING_THROW_TYPE_*\n- oSaveVersus\nReturns: 0 if the saving throw roll failed\nReturns: 1 if the saving throw roll succeeded\nReturns: 2 if the target was immune to the save type specified\n',
    'name': 'ReflexSave',
    'type': 'int',
    'args': [ 'object', 'int', 'int', 'object' ]
  },
  110: {
    'comment': '110: Does a Will Save check for the given DC\n- oCreature\n- nDC: Difficulty check\n- nSaveType: SAVING_THROW_TYPE_*\n- oSaveVersus\nReturns: 0 if the saving throw roll failed\nReturns: 1 if the saving throw roll succeeded\nReturns: 2 if the target was immune to the save type specified\n',
    'name': 'WillSave',
    'type': 'int',
    'args': [ 'object', 'int', 'int', 'object' ]
  },
  111: {
    'comment': '111: Get the DC to save against for a spell (10 + spell level + relevant ability\nbonus).  This can be called by a creature or by an Area of Effect object.\n',
    'name': 'GetSpellSaveDC',
    'type': 'int',
    'args': []
  },
  112: {
    'comment': '112: Set the subtype of eEffect to Magical and return eEffect.\n(Effects default to magical if the subtype is not set)\n',
    'name': 'MagicalEffect',
    'type': 'effect',
    'args': [ 'effect' ]
  },
  113: {
    'comment': '113: Set the subtype of eEffect to Supernatural and return eEffect.\n(Effects default to magical if the subtype is not set)\n',
    'name': 'SupernaturalEffect',
    'type': 'effect',
    'args': [ 'effect' ]
  },
  114: {
    'comment': '114: Set the subtype of eEffect to Extraordinary and return eEffect.\n(Effects default to magical if the subtype is not set)\n',
    'name': 'ExtraordinaryEffect',
    'type': 'effect',
    'args': [ 'effect' ]
  },
  115: {
    'comment': '115: Create an AC Increase effect\n- nValue: size of AC increase\n- nModifyType: AC_*_BONUS\n- nDamageType: DAMAGE_TYPE_*\n* Default value for nDamageType should only ever be used in this function prototype.\n',
    'name': 'EffectACIncrease',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  116: {
    'comment': '116: If oObject is a creature, this will return that creature\'s armour class\nIf oObject is an item, door or placeable, this will return zero.\n- nForFutureUse: this parameter is not currently used\n* Return value if oObject is not a creature, item, door or placeable: -1\n',
    'name': 'GetAC',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  117: {
    'comment': '117: Create an AC Decrease effect\n- nSave: SAVING_THROW_* (not SAVING_THROW_TYPE_*)\n- nValue: size of AC decrease\n- nSaveType: SAVING_THROW_TYPE_*\n',
    'name': 'EffectSavingThrowIncrease',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  118: {
    'comment': '118: Create an Attack Increase effect\n- nBonus: size of attack bonus\n- nModifierType: ATTACK_BONUS_*\n',
    'name': 'EffectAttackIncrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  119: {
    'comment': '119: Create a Damage Reduction effect\n- nAmount: amount of damage reduction\n- nDamagePower: DAMAGE_POWER_*\n- nLimit: How much damage the effect can absorb before disappearing.\nSet to zero for infinite\n',
    'name': 'EffectDamageReduction',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  120: {
    'comment': '120: Create a Damage Increase effect\n- nBonus: DAMAGE_BONUS_*\n- nDamageType: DAMAGE_TYPE_*\n',
    'name': 'EffectDamageIncrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  121: {
    'comment': '121: Convert nRounds into a number of seconds\nA round is always 6.0 seconds\n',
    'name': 'RoundsToSeconds',
    'type': 'float',
    'args': [ 'int' ]
  },
  122: {
    'comment': '122: Convert nHours into a number of seconds\nThe result will depend on how many minutes there are per hour (game-time)\n',
    'name': 'HoursToSeconds',
    'type': 'float',
    'args': [ 'int' ]
  },
  123: {
    'comment': '123: Convert nTurns into a number of seconds\nA turn is always 60.0 seconds\n',
    'name': 'TurnsToSeconds',
    'type': 'float',
    'args': [ 'int' ]
  },
  124: {
    'comment': '124. SoundObjectSetFixedVariance\nSets the constant variance at which to play the sound object\nThis variance is a multiplier of the original sound\n',
    'name': 'SoundObjectSetFixedVariance',
    'type': 'void',
    'args': [ 'object', 'float' ]
  },
  125: {
    'comment': '125: Get an integer between 0 and 100 (inclusive) to represent oCreature\'s\nGood/Evil alignment\n(100=good, 0=evil)\n* Return value if oCreature is not a valid creature: -1\n',
    'name': 'GetGoodEvilValue',
    'type': 'int',
    'args': [ 'object' ]
  },
  126: {
    'comment': '126: GetPartyMemberCount\nReturns a count of how many members are in the party including the player character\n',
    'name': 'GetPartyMemberCount',
    'type': 'int',
    'args': []
  },
  127: {
    'comment': '127: Return an ALIGNMENT_* constant to represent oCreature\'s good/evil alignment\n* Return value if oCreature is not a valid creature: -1\n',
    'name': 'GetAlignmentGoodEvil',
    'type': 'int',
    'args': [ 'object' ]
  },
  128: {
    'comment': '128: Get the first object in nShape\n- nShape: SHAPE_*\n- fSize:\n-> If nShape == SHAPE_SPHERE, this is the radius of the sphere\n-> If nShape == SHAPE_SPELLCYLINDER, this is the radius of the cylinder\n-> If nShape == SHAPE_CONE, this is the widest radius of the cone\n-> If nShape == SHAPE_CUBE, this is half the length of one of the sides of\nthe cube\n- lTarget: This is the centre of the effect, usually GetSpellTargetPosition(),\nor the end of a cylinder or cone.\n- bLineOfSight: This controls whether to do a line-of-sight check on the\nobject returned.\n(This can be used to ensure that spell effects do not go through walls.)\n- nObjectFilter: This allows you to filter out undesired object types, using\nbitwise \'or\'.\nFor example, to return only creatures and doors, the value for this\nparameter would be OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR\n- vOrigin: This is only used for cylinders and cones, and specifies the\norigin of the effect(normally the spell-caster\'s position).\nReturn value on error: OBJECT_INVALID\n',
    'name': 'GetFirstObjectInShape',
    'type': 'object',
    'args': [ 'int', 'float', 'location', 'int', 'int', 'vector' ]
  },
  129: {
    'comment': '129: Get the next object in nShape\n- nShape: SHAPE_*\n- fSize:\n-> If nShape == SHAPE_SPHERE, this is the radius of the sphere\n-> If nShape == SHAPE_SPELLCYLINDER, this is the radius of the cylinder\n-> If nShape == SHAPE_CONE, this is the widest radius of the cone\n-> If nShape == SHAPE_CUBE, this is half the length of one of the sides of\nthe cube\n- lTarget: This is the centre of the effect, usually GetSpellTargetPosition(),\nor the end of a cylinder or cone.\n- bLineOfSight: This controls whether to do a line-of-sight check on the\nobject returned. (This can be used to ensure that spell effects do not go\nthrough walls.)\n- nObjectFilter: This allows you to filter out undesired object types, using\nbitwise \'or\'. For example, to return only creatures and doors, the value for\nthis parameter would be OBJECT_TYPE_CREATURE | OBJECT_TYPE_DOOR\n- vOrigin: This is only used for cylinders and cones, and specifies the origin\nof the effect (normally the spell-caster\'s position).\nReturn value on error: OBJECT_INVALID\n',
    'name': 'GetNextObjectInShape',
    'type': 'object',
    'args': [ 'int', 'float', 'location', 'int', 'int', 'vector' ]
  },
  130: {
    'comment': '130: Create an Entangle effect\nWhen applied, this effect will restrict the creature\'s movement and apply a\n(-2) to all attacks and a -4 to AC.\n',
    'name': 'EffectEntangle',
    'type': 'effect',
    'args': []
  },
  131: {
    'comment': '131: Cause oObject to run evToRun\n',
    'name': 'SignalEvent',
    'type': 'void',
    'args': [ 'object', 'event' ]
  },
  132: {
    'comment': '132: Create an event of the type nUserDefinedEventNumber\n',
    'name': 'EventUserDefined',
    'type': 'event',
    'args': [ 'int' ]
  },
  133: {
    'comment': '133: Create a Death effect\n- nSpectacularDeath: if this is TRUE, the creature to which this effect is\napplied will die in an extraordinary fashion\n- nDisplayFeedback\n',
    'name': 'EffectDeath',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  134: {
    'comment': '134: Create a Knockdown effect\nThis effect knocks creatures off their feet, they will sit until the effect\nis removed. This should be applied as a temporary effect with a 3 second\nduration minimum (1 second to fall, 1 second sitting, 1 second to get up).\n',
    'name': 'EffectKnockdown',
    'type': 'effect',
    'args': []
  },
  135: {
    'comment': '135: Give oItem to oGiveTo\nIf oItem is not a valid item, or oGiveTo is not a valid object, nothing will\nhappen.\n',
    'name': 'ActionGiveItem',
    'type': 'void',
    'args': [ 'object', 'object' ]
  },
  136: {
    'comment': '136: Take oItem from oTakeFrom\nIf oItem is not a valid item, or oTakeFrom is not a valid object, nothing\nwill happen.\n',
    'name': 'ActionTakeItem',
    'type': 'void',
    'args': [ 'object', 'object' ]
  },
  137: {
    'comment': '137: Normalize vVector\n',
    'name': 'VectorNormalize',
    'type': 'vector',
    'args': [ 'vector' ]
  },
  138: {
    'comment': '138:\nGets the stack size of an item.\n',
    'name': 'GetItemStackSize',
    'type': 'int',
    'args': [ 'object' ]
  },
  139: {
    'comment': '139: Get the ability score of type nAbility for a creature (otherwise 0)\n- oCreature: the creature whose ability score we wish to find out\n- nAbilityType: ABILITY_*\nReturn value on error: 0\n',
    'name': 'GetAbilityScore',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  140: {
    'comment': '140: * Returns TRUE if oCreature is a dead NPC, dead PC or a dying PC.\n',
    'name': 'GetIsDead',
    'type': 'int',
    'args': [ 'object' ]
  },
  141: {
    'comment': '141: Output vVector to the logfile.\n- vVector\n- bPrepend: if this is TRUE, the message will be prefixed with \'PRINTVECTOR:\'\n',
    'name': 'PrintVector',
    'type': 'void',
    'args': [ 'vector', 'int' ]
  },
  142: {
    'comment': '142: Create a vector with the specified values for x, y and z\n',
    'name': 'Vector',
    'type': 'vector',
    'args': [ 'float', 'float', 'float' ]
  },
  143: {
    'comment': '143: Cause the caller to face vTarget\n',
    'name': 'SetFacingPoint',
    'type': 'void',
    'args': [ 'vector' ]
  },
  144: {
    'comment': '144: Convert fAngle to a vector\n',
    'name': 'AngleToVector',
    'type': 'vector',
    'args': [ 'float' ]
  },
  145: {
    'comment': '145: Convert vVector to an angle\n',
    'name': 'VectorToAngle',
    'type': 'float',
    'args': [ 'vector' ]
  },
  146: {
    'comment': '146: The caller will perform a Melee Touch Attack on oTarget\nThis is not an action, and it assumes the caller is already within range of\noTarget\n* Returns 0 on a miss, 1 on a hit and 2 on a critical hit\n',
    'name': 'TouchAttackMelee',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  147: {
    'comment': '147: The caller will perform a Ranged Touch Attack on oTarget\n* Returns 0 on a miss, 1 on a hit and 2 on a critical hit\n',
    'name': 'TouchAttackRanged',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  148: {
    'comment': '148: Create a Paralyze effect\n',
    'name': 'EffectParalyze',
    'type': 'effect',
    'args': []
  },
  149: {
    'comment': '149: Create a Spell Immunity effect.\nThere is a known bug with this function. There *must* be a parameter specified\nwhen this is called (even if the desired parameter is SPELL_ALL_SPELLS),\notherwise an effect of type EFFECT_TYPE_INVALIDEFFECT will be returned.\n- nImmunityToSpell: SPELL_*\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nImmunityToSpell is\ninvalid.\n',
    'name': 'EffectSpellImmunity',
    'type': 'effect',
    'args': [ 'int' ]
  },
  150: {
    'comment': '150:\nSet the stack size of an item.\nNOTE: The stack size will be clamped to between 1 and the max stack size (as\nspecified in the base item).\n',
    'name': 'SetItemStackSize',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  151: {
    'comment': '151: Get the distance in metres between oObjectA and oObjectB.\n* Return value if either object is invalid: 0.0f\n',
    'name': 'GetDistanceBetween',
    'type': 'float',
    'args': [ 'object', 'object' ]
  },
  152: {
    'comment': '152: SetReturnStrref\nThis function will turn on/off the display of the \'return to ebon hawk\' option\non the map screen and allow the string to be changed to an arbitrary string ref\nsrReturnQueryStrRef is the string ref that will be displayed in the query pop\nup confirming that you wish to return to the specified location.\n',
    'name': 'SetReturnStrref',
    'type': 'void',
    'args': [ 'int', 'int', 'int' ]
  },
  153: {
    'comment': '153: EffectForceJump\nThe effect required for force jumping\n',
    'name': 'EffectForceJump',
    'type': 'effect',
    'args': [ 'object', 'int' ]
  },
  154: {
    'comment': '154: Create a Sleep effect\n',
    'name': 'EffectSleep',
    'type': 'effect',
    'args': []
  },
  155: {
    'comment': '155: Get the object which is in oCreature\'s specified inventory slot\n- nInventorySlot: INVENTORY_SLOT_*\n- oCreature\n* Returns OBJECT_INVALID if oCreature is not a valid creature or there is no\nitem in nInventorySlot.\n',
    'name': 'GetItemInSlot',
    'type': 'object',
    'args': [ 'int', 'object' ]
  },
  156: {
    'comment': '156: This was previously EffectCharmed();\n',
    'name': 'EffectTemporaryForcePoints',
    'type': 'effect',
    'args': [ 'int' ]
  },
  157: {
    'comment': '157: Create a Confuse effect\n',
    'name': 'EffectConfused',
    'type': 'effect',
    'args': []
  },
  158: {
    'comment': '158: Create a Frighten effect\n',
    'name': 'EffectFrightened',
    'type': 'effect',
    'args': []
  },
  159: {
    'comment': '159: Choke the bugger...\n',
    'name': 'EffectChoke',
    'type': 'effect',
    'args': []
  },
  160: {
    'comment': '160: Sets a global string with the specified identifier.  This is an EXTREMELY\nrestricted function - do not use without expilicit permission.\nThis means if you are not Preston.  Then go see him if you\'re even thinking\nabout using this.\n',
    'name': 'SetGlobalString',
    'type': 'void',
    'args': [ 'string', 'string' ]
  },
  161: {
    'comment': '161: Create a Stun effect\n',
    'name': 'EffectStunned',
    'type': 'effect',
    'args': []
  },
  162: {
    'comment': '162: Set whether oTarget\'s action stack can be modified\n',
    'name': 'SetCommandable',
    'type': 'void',
    'args': [ 'int', 'object' ]
  },
  163: {
    'comment': '163: Determine whether oTarget\'s action stack can be modified.\n',
    'name': 'GetCommandable',
    'type': 'int',
    'args': [ 'object' ]
  },
  164: {
    'comment': '164: Create a Regenerate effect.\n- nAmount: amount of damage to be regenerated per time interval\n- fIntervalSeconds: length of interval in seconds\n',
    'name': 'EffectRegenerate',
    'type': 'effect',
    'args': [ 'int', 'float' ]
  },
  165: {
    'comment': '165: Create a Movement Speed Increase effect.\n- nNewSpeedPercent: This works in a dodgy way so please read this notes carefully.\nIf you supply an integer under 100, 100 gets added to it to produce the final speed.\ne.g. if you supply 50, then the resulting speed is 150% of the original speed.\nIf you supply 100 or above, then this is used directly as the resulting speed.\ne.g. if you specify 100, then the resulting speed is 100% of the original speed that is,\nit is unchanged.\nHowever if you specify 200, then the resulting speed is double the original speed.\n',
    'name': 'EffectMovementSpeedIncrease',
    'type': 'effect',
    'args': [ 'int' ]
  },
  166: {
    'comment': '166: Get the number of hitdice for oCreature.\n* Return value if oCreature is not a valid creature: 0\n',
    'name': 'GetHitDice',
    'type': 'int',
    'args': [ 'object' ]
  },
  167: {
    'comment': '167: The action subject will follow oFollow until a ClearAllActions() is called.\n- oFollow: this is the object to be followed\n- fFollowDistance: follow distance in metres\n* No return value\n',
    'name': 'ActionForceFollowObject',
    'type': 'void',
    'args': [ 'object', 'float' ]
  },
  168: {
    'comment': '168: Get the Tag of oObject\n* Return value if oObject is not a valid object: \'\'\n',
    'name': 'GetTag',
    'type': 'string',
    'args': [ 'object' ]
  },
  169: {
    'comment': '169: Do a Force Resistance check between oSource and oTarget, returning TRUE if\nthe force was resisted.\n* Return value if oSource or oTarget is an invalid object: FALSE\n',
    'name': 'ResistForce',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  170: {
    'comment': '170: Get the effect type (EFFECT_TYPE_*) of eEffect.\n* Return value if eEffect is invalid: EFFECT_INVALIDEFFECT\n',
    'name': 'GetEffectType',
    'type': 'int',
    'args': [ 'effect' ]
  },
  171: {
    'comment': '171: Create an Area Of Effect effect in the area of the creature it is applied to.\nIf the scripts are not specified, default ones will be used.\n',
    'name': 'EffectAreaOfEffect',
    'type': 'effect',
    'args': [ 'int', 'string', 'string', 'string' ]
  },
  172: {
    'comment': '172: * Returns TRUE if the Faction Ids of the two objects are the same\n',
    'name': 'GetFactionEqual',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  173: {
    'comment': '173: Make oObjectToChangeFaction join the faction of oMemberOfFactionToJoin.\nNB. ** This will only work for two NPCs **\n',
    'name': 'ChangeFaction',
    'type': 'void',
    'args': [ 'object', 'object' ]
  },
  174: {
    'comment': '174: * Returns TRUE if oObject is listening for something\n',
    'name': 'GetIsListening',
    'type': 'int',
    'args': [ 'object' ]
  },
  175: {
    'comment': '175: Set whether oObject is listening.\n',
    'name': 'SetListening',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  176: {
    'comment': '176: Set the string for oObject to listen for.\nNote: this does not set oObject to be listening.\n',
    'name': 'SetListenPattern',
    'type': 'void',
    'args': [ 'object', 'string', 'int' ]
  },
  177: {
    'comment': '177: * Returns TRUE if sStringToTest matches sPattern.\n',
    'name': 'TestStringAgainstPattern',
    'type': 'int',
    'args': [ 'string', 'string' ]
  },
  178: {
    'comment': '178: Get the appropriate matched string (this should only be used in\nOnConversation scripts).\n* Returns the appropriate matched string, otherwise returns \'\'\n',
    'name': 'GetMatchedSubstring',
    'type': 'string',
    'args': [ 'int' ]
  },
  179: {
    'comment': '179: Get the number of string parameters available.\n* Returns -1 if no string matched (this could be because of a dialogue event)\n',
    'name': 'GetMatchedSubstringsCount',
    'type': 'int',
    'args': []
  },
  180: {
    'comment': '180: * Create a Visual Effect that can be applied to an object.\n- nVisualEffectId\n- nMissEffect: if this is TRUE, a random vector near or past the target will\nbe generated, on which to play the effect\n',
    'name': 'EffectVisualEffect',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  181: {
    'comment': '181: Get the weakest member of oFactionMember\'s faction.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.\n',
    'name': 'GetFactionWeakestMember',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  182: {
    'comment': '182: Get the strongest member of oFactionMember\'s faction.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.\n',
    'name': 'GetFactionStrongestMember',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  183: {
    'comment': '183: Get the member of oFactionMember\'s faction that has taken the most hit points\nof damage.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.\n',
    'name': 'GetFactionMostDamagedMember',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  184: {
    'comment': '184: Get the member of oFactionMember\'s faction that has taken the fewest hit\npoints of damage.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.\n',
    'name': 'GetFactionLeastDamagedMember',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  185: {
    'comment': '185: Get the amount of gold held by oFactionMember\'s faction.\n* Returns -1 if oFactionMember\'s faction is invalid.\n',
    'name': 'GetFactionGold',
    'type': 'int',
    'args': [ 'object' ]
  },
  186: {
    'comment': '186: Get an integer between 0 and 100 (inclusive) that represents how\noSourceFactionMember\'s faction feels about oTarget.\n* Return value on error: -1\n',
    'name': 'GetFactionAverageReputation',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  187: {
    'comment': '187: Get an integer between 0 and 100 (inclusive) that represents the average\ngood/evil alignment of oFactionMember\'s faction.\n* Return value on error: -1\n',
    'name': 'GetFactionAverageGoodEvilAlignment',
    'type': 'int',
    'args': [ 'object' ]
  },
  188: {
    'comment': '188. SoundObjectGetFixedVariance\nGets the constant variance at which to play the sound object\n',
    'name': 'SoundObjectGetFixedVariance',
    'type': 'float',
    'args': [ 'object' ]
  },
  189: {
    'comment': '189: Get the average level of the members of the faction.\n* Return value on error: -1\n',
    'name': 'GetFactionAverageLevel',
    'type': 'int',
    'args': [ 'object' ]
  },
  190: {
    'comment': '190: Get the average XP of the members of the faction.\n* Return value on error: -1\n',
    'name': 'GetFactionAverageXP',
    'type': 'int',
    'args': [ 'object' ]
  },
  191: {
    'comment': '191: Get the most frequent class in the faction - this can be compared with the\nconstants CLASS_TYPE_*.\n* Return value on error: -1\n',
    'name': 'GetFactionMostFrequentClass',
    'type': 'int',
    'args': [ 'object' ]
  },
  192: {
    'comment': '192: Get the object faction member with the lowest armour class.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.\n',
    'name': 'GetFactionWorstAC',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  193: {
    'comment': '193: Get the object faction member with the highest armour class.\n* Returns OBJECT_INVALID if oFactionMember\'s faction is invalid.\n',
    'name': 'GetFactionBestAC',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  194: {
    'comment': '194: Get a global string with the specified identifier\nThis is an EXTREMELY restricted function.  Use only with explicit permission.\nThis means if you are not Preston.  Then go see him if you\'re even thinking\nabout using this.\n',
    'name': 'GetGlobalString',
    'type': 'string',
    'args': [ 'string' ]
  },
  195: {
    'comment': '195: In an onConversation script this gets the number of the string pattern\nmatched (the one that triggered the script).\n* Returns -1 if no string matched\n',
    'name': 'GetListenPatternNumber',
    'type': 'int',
    'args': []
  },
  196: {
    'comment': '196: Jump to an object ID, or as near to it as possible.\n',
    'name': 'ActionJumpToObject',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  197: {
    'comment': '197: Get the first waypoint with the specified tag.\n* Returns OBJECT_INVALID if the waypoint cannot be found.\n',
    'name': 'GetWaypointByTag',
    'type': 'object',
    'args': [ 'string' ]
  },
  198: {
    'comment': '198: Get the destination (a waypoint or a door) for a trigger or a door.\n* Returns OBJECT_INVALID if oTransition is not a valid trigger or door.\n',
    'name': 'GetTransitionTarget',
    'type': 'object',
    'args': [ 'object' ]
  },
  199: {
    'comment': '199: Link the two supplied effects, returning eChildEffect as a child of\neParentEffect.\nNote: When applying linked effects if the target is immune to all valid\neffects all other effects will be removed as well. This means that if you\napply a visual effect and a silence effect (in a link) and the target is\nimmune to the silence effect that the visual effect will get removed as well.\nVisual Effects are not considered \'valid\' effects for the purposes of\ndetermining if an effect will be removed or not and as such should never be\npackaged *only* with other visual effects in a link.\n',
    'name': 'EffectLinkEffects',
    'type': 'effect',
    'args': [ 'effect', 'effect' ]
  },
  200: {
    'comment': '200: Get the nNth object with the specified tag.\n- sTag\n- nNth: the nth object with this tag may be requested\n* Returns OBJECT_INVALID if the object cannot be found.\n',
    'name': 'GetObjectByTag',
    'type': 'object',
    'args': [ 'string', 'int' ]
  },
  201: {
    'comment': '201: Adjust the alignment of oSubject.\n- oSubject\n- nAlignment:\n-> ALIGNMENT_LIGHT_SIDE/ALIGNMENT_DARK_SIDE: oSubject\'s\nalignment will be shifted in the direction specified\n-> ALIGNMENT_NEUTRAL: nShift is applied to oSubject\'s dark side/light side\nalignment value in the direction which is towards neutrality.\ne.g. If oSubject has an alignment value of 80 (i.e. light side)\nthen if nShift is 15, the alignment value will become (80-15)=65\nFurthermore, the shift will at most take the alignment value to 50 and\nnot beyond.\ne.g. If oSubject has an alignment value of 40 then if nShift is 15,\nthe aligment value will become 50\n- nShift: this is the desired shift in alignment\n* No return value\n',
    'name': 'AdjustAlignment',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  202: {
    'comment': '202: Do nothing for fSeconds seconds.\n',
    'name': 'ActionWait',
    'type': 'void',
    'args': [ 'float' ]
  },
  203: {
    'comment': '203: Set the transition bitmap of a player; this should only be called in area\ntransition scripts. This action should be run by the person \'clicking\' the\narea transition via AssignCommand.\n- nPredefinedAreaTransition:\n-> To use a predefined area transition bitmap, use one of AREA_TRANSITION_*\n-> To use a custom, user-defined area transition bitmap, use\nAREA_TRANSITION_USER_DEFINED and specify the filename in the second\nparameter\n- sCustomAreaTransitionBMP: this is the filename of a custom, user-defined\narea transition bitmap\n',
    'name': 'SetAreaTransitionBMP',
    'type': 'void',
    'args': [ 'int', 'string' ]
  },
  204: {
    'comment': 'AMF: APRIL 28, 2003 - I HAVE CHANGED THIS FUNCTION AS PER DAN\'S REQUEST\n204: Starts a conversation with oObjectToConverseWith - this will cause their\nOnDialog event to fire.\n- oObjectToConverseWith\n- sDialogResRef: If this is blank, the creature\'s own dialogue file will be used\n- bPrivateConversation: If this is blank, the default is FALSE.\n- nConversationType - If this is blank the default will be Cinematic, ie. a normal conversation type\nother choices inclue: CONVERSATION_TYPE_COMPUTER\nUPDATE:  nConversationType actually has no meaning anymore.  This has been replaced by a flag in the dialog editor.  However\nfor backwards compatability it has been left here.  So when using this command place CONVERSATION_TYPE_CINEMATIC in here. - DJF\n- bIgnoreStartRange - If this is blank the default will be FALSE, ie. Start conversation ranges are in effect\nSetting this to TRUE will cause creatures to start a conversation without requiring to close\nthe distance between the two object in dialog.\n- sNameObjectToIgnore1-6 - Normally objects in the animation list of the dialog editor have to be available for animations on that node to work\nthese 6 strings are to indicate 6 objects that don�t need to be available for things to proceed.  The string should be EXACTLY\nthe same as the string that it represents in the dialog editor.\n',
    'name': 'ActionStartConversation',
    'type': 'void',
    'args': [ 'object', 'string', 'int', 'int', 'int', 'string', 'string', 'string', 'string', 'string', 'string' ]
  },
  205: {
    'comment': '205: Pause the current conversation.\n',
    'name': 'ActionPauseConversation',
    'type': 'void',
    'args': []
  },
  206: {
    'comment': '206: Resume a conversation after it has been paused.\n',
    'name': 'ActionResumeConversation',
    'type': 'void',
    'args': []
  },
  207: {
    'comment': '207: Create a Beam effect.\n- nBeamVisualEffect: VFX_BEAM_*\n- oEffector: the beam is emitted from this creature\n- nBodyPart: BODY_NODE_*\n- bMissEffect: If this is TRUE, the beam will fire to a random vector near or\npast the target\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nBeamVisualEffect is\nnot valid.\n',
    'name': 'EffectBeam',
    'type': 'effect',
    'args': [ 'int', 'object', 'int', 'int' ]
  },
  208: {
    'comment': '208: Get an integer between 0 and 100 (inclusive) that represents how oSource\nfeels about oTarget.\n-> 0-10 means oSource is hostile to oTarget\n-> 11-89 means oSource is neutral to oTarget\n-> 90-100 means oSource is friendly to oTarget\n* Returns -1 if oSource or oTarget does not identify a valid object\n',
    'name': 'GetReputation',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  209: {
    'comment': '209: Adjust how oSourceFactionMember\'s faction feels about oTarget by the\nspecified amount.\nNote: This adjusts Faction Reputation, how the entire faction that\noSourceFactionMember is in, feels about oTarget.\n* No return value\n',
    'name': 'AdjustReputation',
    'type': 'void',
    'args': [ 'object', 'object', 'int' ]
  },
  210: {
    'comment': '210: Gets the actual file name of the current module\n',
    'name': 'GetModuleFileName',
    'type': 'string',
    'args': []
  },
  211: {
    'comment': '211: Get the creature that is going to attack oTarget.\nNote: This value is cleared out at the end of every combat round and should\nnot be used in any case except when getting a \'going to be attacked\' shout\nfrom the master creature (and this creature is a henchman)\n* Returns OBJECT_INVALID if oTarget is not a valid creature.\n',
    'name': 'GetGoingToBeAttackedBy',
    'type': 'object',
    'args': [ 'object' ]
  },
  212: {
    'comment': '212: Create a Force Resistance Increase effect.\n- nValue: size of Force Resistance increase\n',
    'name': 'EffectForceResistanceIncrease',
    'type': 'effect',
    'args': [ 'int' ]
  },
  213: {
    'comment': '213: Get the location of oObject.\n',
    'name': 'GetLocation',
    'type': 'location',
    'args': [ 'object' ]
  },
  214: {
    'comment': '214: The subject will jump to lLocation instantly (even between areas).\nIf lLocation is invalid, nothing will happen.\n',
    'name': 'ActionJumpToLocation',
    'type': 'void',
    'args': [ 'location' ]
  },
  215: {
    'comment': '215: Create a location.\n',
    'name': 'Location',
    'type': 'location',
    'args': [ 'vector', 'float' ]
  },
  216: {
    'comment': '216: Apply eEffect at lLocation.\n',
    'name': 'ApplyEffectAtLocation',
    'type': 'void',
    'args': [ 'int', 'effect', 'location', 'float' ]
  },
  217: {
    'comment': '217: * Returns TRUE if oCreature is a Player Controlled character.\n',
    'name': 'GetIsPC',
    'type': 'int',
    'args': [ 'object' ]
  },
  218: {
    'comment': '218: Convert fFeet into a number of meters.\n',
    'name': 'FeetToMeters',
    'type': 'float',
    'args': [ 'float' ]
  },
  219: {
    'comment': '219: Convert fYards into a number of meters.\n',
    'name': 'YardsToMeters',
    'type': 'float',
    'args': [ 'float' ]
  },
  220: {
    'comment': '220: Apply eEffect to oTarget.\n',
    'name': 'ApplyEffectToObject',
    'type': 'void',
    'args': [ 'int', 'effect', 'object', 'float' ]
  },
  221: {
    'comment': '221: The caller will immediately speak sStringToSpeak (this is different from\nActionSpeakString)\n- sStringToSpeak\n- nTalkVolume: TALKVOLUME_*\n',
    'name': 'SpeakString',
    'type': 'void',
    'args': [ 'string', 'int' ]
  },
  222: {
    'comment': '222: Get the location of the caller\'s last spell target.\n',
    'name': 'GetSpellTargetLocation',
    'type': 'location',
    'args': []
  },
  223: {
    'comment': '223: Get the position vector from lLocation.\n',
    'name': 'GetPositionFromLocation',
    'type': 'vector',
    'args': [ 'location' ]
  },
  224: {
    'comment': '224: the effect of body fule.. convers HP -> FP i think\n',
    'name': 'EffectBodyFuel',
    'type': 'effect',
    'args': []
  },
  225: {
    'comment': '225: Get the orientation value from lLocation.\n',
    'name': 'GetFacingFromLocation',
    'type': 'float',
    'args': [ 'location' ]
  },
  226: {
    'comment': '226: Get the creature nearest to lLocation, subject to all the criteria specified.\n- nFirstCriteriaType: CREATURE_TYPE_*\n- nFirstCriteriaValue:\n-> CLASS_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_CLASS\n-> SPELL_* if nFirstCriteriaType was CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT\nor CREATURE_TYPE_HAS_SPELL_EFFECT\n-> TRUE or FALSE if nFirstCriteriaType was CREATURE_TYPE_IS_ALIVE\n-> PERCEPTION_* if nFirstCriteriaType was CREATURE_TYPE_PERCEPTION\n-> PLAYER_CHAR_IS_PC or PLAYER_CHAR_NOT_PC if nFirstCriteriaType was\nCREATURE_TYPE_PLAYER_CHAR\n-> RACIAL_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_RACIAL_TYPE\n-> REPUTATION_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_REPUTATION\nFor example, to get the nearest PC, use\n(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC)\n- lLocation: We\'re trying to find the creature of the specified type that is\nnearest to lLocation\n- nNth: We don\'t have to find the first nearest: we can find the Nth nearest....\n- nSecondCriteriaType: This is used in the same way as nFirstCriteriaType to\nfurther specify the type of creature that we are looking for.\n- nSecondCriteriaValue: This is used in the same way as nFirstCriteriaValue\nto further specify the type of creature that we are looking for.\n- nThirdCriteriaType: This is used in the same way as nFirstCriteriaType to\nfurther specify the type of creature that we are looking for.\n- nThirdCriteriaValue: This is used in the same way as nFirstCriteriaValue to\nfurther specify the type of creature that we are looking for.\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetNearestCreatureToLocation',
    'type': 'object',
    'args': [ 'int', 'int', 'location', 'int', 'int', 'int', 'int', 'int' ]
  },
  227: {
    'comment': '227: Get the Nth object nearest to oTarget that is of the specified type.\n- nObjectType: OBJECT_TYPE_*\n- oTarget\n- nNth\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetNearestObject',
    'type': 'object',
    'args': [ 'int', 'object', 'int' ]
  },
  228: {
    'comment': '228: Get the nNth object nearest to lLocation that is of the specified type.\n- nObjectType: OBJECT_TYPE_*\n- lLocation\n- nNth\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetNearestObjectToLocation',
    'type': 'object',
    'args': [ 'int', 'location', 'int' ]
  },
  229: {
    'comment': '229: Get the nth Object nearest to oTarget that has sTag as its tag.\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetNearestObjectByTag',
    'type': 'object',
    'args': [ 'string', 'object', 'int' ]
  },
  230: {
    'comment': '230: Convert nInteger into a floating point number.\n',
    'name': 'IntToFloat',
    'type': 'float',
    'args': [ 'int' ]
  },
  231: {
    'comment': '231: Convert fFloat into the nearest integer.\n',
    'name': 'FloatToInt',
    'type': 'int',
    'args': [ 'float' ]
  },
  232: {
    'comment': '232: Convert sNumber into an integer.\n',
    'name': 'StringToInt',
    'type': 'int',
    'args': [ 'string' ]
  },
  233: {
    'comment': '233: Convert sNumber into a floating point number.\n',
    'name': 'StringToFloat',
    'type': 'float',
    'args': [ 'string' ]
  },
  234: {
    'comment': '234: Cast spell nSpell at lTargetLocation.\n- nSpell: SPELL_*\n- lTargetLocation\n- nMetaMagic: METAMAGIC_*\n- bCheat: If this is TRUE, then the executor of the action doesn\'t have to be\nable to cast the spell.\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*\n- bInstantSpell: If this is TRUE, the spell is cast immediately; this allows\nthe end-user to simulate\na high-level magic user having lots of advance warning of impending trouble.\n',
    'name': 'ActionCastSpellAtLocation',
    'type': 'void',
    'args': [ 'int', 'location', 'int', 'int', 'int', 'int' ]
  },
  235: {
    'comment': '235: * Returns TRUE if oSource considers oTarget as an enemy.\n',
    'name': 'GetIsEnemy',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  236: {
    'comment': '236: * Returns TRUE if oSource considers oTarget as a friend.\n',
    'name': 'GetIsFriend',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  237: {
    'comment': '237: * Returns TRUE if oSource considers oTarget as neutral.\n',
    'name': 'GetIsNeutral',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  238: {
    'comment': '238: Get the PC that is involved in the conversation.\n* Returns OBJECT_INVALID on error.\n',
    'name': 'GetPCSpeaker',
    'type': 'object',
    'args': []
  },
  239: {
    'comment': '239: Get a string from the talk table using nStrRef.\n',
    'name': 'GetStringByStrRef',
    'type': 'string',
    'args': [ 'int' ]
  },
  240: {
    'comment': '240: Causes the creature to speak a translated string.\n- nStrRef: Reference of the string in the talk table\n- nTalkVolume: TALKVOLUME_*\n',
    'name': 'ActionSpeakStringByStrRef',
    'type': 'void',
    'args': [ 'int', 'int' ]
  },
  241: {
    'comment': '241: Destroy oObject (irrevocably).\nThis will not work on modules and areas.\nThe bNoFade and fDelayUntilFade are for creatures and placeables only\n',
    'name': 'DestroyObject',
    'type': 'void',
    'args': [ 'object', 'float', 'int', 'float' ]
  },
  242: {
    'comment': '242: Get the module.\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetModule',
    'type': 'object',
    'args': []
  },
  243: {
    'comment': '243: Create an object of the specified type at lLocation.\n- nObjectType: OBJECT_TYPE_ITEM, OBJECT_TYPE_CREATURE, OBJECT_TYPE_PLACEABLE,\nOBJECT_TYPE_STORE\n- sTemplate\n- lLocation\n- bUseAppearAnimation\nWaypoints can now also be created using the CreateObject function.\nnObjectType is: OBJECT_TYPE_WAYPOINT\nsTemplate will be the tag of the waypoint\nlLocation is where the waypoint will be placed\nbUseAppearAnimation is ignored\n',
    'name': 'CreateObject',
    'type': 'object',
    'args': [ 'int', 'string', 'location', 'int' ]
  },
  244: {
    'comment': '244: Create an event which triggers the \'SpellCastAt\' script\n',
    'name': 'EventSpellCastAt',
    'type': 'event',
    'args': [ 'object', 'int', 'int' ]
  },
  245: {
    'comment': '245: This is for use in a \'Spell Cast\' script, it gets who cast the spell.\nThe spell could have been cast by a creature, placeable or door.\n* Returns OBJECT_INVALID if the caller is not a creature, placeable or door.\n',
    'name': 'GetLastSpellCaster',
    'type': 'object',
    'args': []
  },
  246: {
    'comment': '246: This is for use in a \'Spell Cast\' script, it gets the ID of the spell that\nwas cast.\n',
    'name': 'GetLastSpell',
    'type': 'int',
    'args': []
  },
  247: {
    'comment': '247: This is for use in a user-defined script, it gets the event number.\n',
    'name': 'GetUserDefinedEventNumber',
    'type': 'int',
    'args': []
  },
  248: {
    'comment': '248: This is for use in a Spell script, it gets the ID of the spell that is being\ncast (SPELL_*).\n',
    'name': 'GetSpellId',
    'type': 'int',
    'args': []
  },
  249: {
    'comment': '249: Generate a random name.\n',
    'name': 'RandomName',
    'type': 'string',
    'args': []
  },
  250: {
    'comment': '250: Create a Poison effect.\n- nPoisonType: POISON_*\n',
    'name': 'EffectPoison',
    'type': 'effect',
    'args': [ 'int' ]
  },
  251: {
    'comment': '251: Returns whether this script is being run\nwhile a load game is in progress\n',
    'name': 'GetLoadFromSaveGame',
    'type': 'int',
    'args': []
  },
  252: {
    'comment': '252: Assured Deflection\nThis effect ensures that all projectiles shot at a jedi will be deflected\nwithout doing an opposed roll.  It takes an optional parameter to say whether\nthe deflected projectile will return to the attacker and cause damage\n',
    'name': 'EffectAssuredDeflection',
    'type': 'effect',
    'args': [ 'int' ]
  },
  253: {
    'comment': '253: Get the name of oObject.\n',
    'name': 'GetName',
    'type': 'string',
    'args': [ 'object' ]
  },
  254: {
    'comment': '254: Use this in a conversation script to get the person with whom you are conversing.\n* Returns OBJECT_INVALID if the caller is not a valid creature.\n',
    'name': 'GetLastSpeaker',
    'type': 'object',
    'args': []
  },
  255: {
    'comment': '255: Use this in an OnDialog script to start up the dialog tree.\n- sResRef: if this is not specified, the default dialog file will be used\n- oObjectToDialog: if this is not specified the person that triggered the\nevent will be used\n',
    'name': 'BeginConversation',
    'type': 'int',
    'args': [ 'string', 'object' ]
  },
  256: {
    'comment': '256: Use this in an OnPerception script to get the object that was perceived.\n* Returns OBJECT_INVALID if the caller is not a valid creature.\n',
    'name': 'GetLastPerceived',
    'type': 'object',
    'args': []
  },
  257: {
    'comment': '257: Use this in an OnPerception script to determine whether the object that was\nperceived was heard.\n',
    'name': 'GetLastPerceptionHeard',
    'type': 'int',
    'args': []
  },
  258: {
    'comment': '258: Use this in an OnPerception script to determine whether the object that was\nperceived has become inaudible.\n',
    'name': 'GetLastPerceptionInaudible',
    'type': 'int',
    'args': []
  },
  259: {
    'comment': '259: Use this in an OnPerception script to determine whether the object that was\nperceived was seen.\n',
    'name': 'GetLastPerceptionSeen',
    'type': 'int',
    'args': []
  },
  260: {
    'comment': '260: Use this in an OnClosed script to get the object that closed the door or placeable.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.\n',
    'name': 'GetLastClosedBy',
    'type': 'object',
    'args': []
  },
  261: {
    'comment': '261: Use this in an OnPerception script to determine whether the object that was\nperceived has vanished.\n',
    'name': 'GetLastPerceptionVanished',
    'type': 'int',
    'args': []
  },
  262: {
    'comment': '262: Get the first object within oPersistentObject.\n- oPersistentObject\n- nResidentObjectType: OBJECT_TYPE_*\n- nPersistentZone: PERSISTENT_ZONE_ACTIVE. [This could also take the value\nPERSISTENT_ZONE_FOLLOW, but this is no longer used.]\n* Returns OBJECT_INVALID if no object is found.\n',
    'name': 'GetFirstInPersistentObject',
    'type': 'object',
    'args': [ 'object', 'int', 'int' ]
  },
  263: {
    'comment': '263: Get the next object within oPersistentObject.\n- oPersistentObject\n- nResidentObjectType: OBJECT_TYPE_*\n- nPersistentZone: PERSISTENT_ZONE_ACTIVE. [This could also take the value\nPERSISTENT_ZONE_FOLLOW, but this is no longer used.]\n* Returns OBJECT_INVALID if no object is found.\n',
    'name': 'GetNextInPersistentObject',
    'type': 'object',
    'args': [ 'object', 'int', 'int' ]
  },
  264: {
    'comment': '264: This returns the creator of oAreaOfEffectObject.\n* Returns OBJECT_INVALID if oAreaOfEffectObject is not a valid Area of Effect object.\n',
    'name': 'GetAreaOfEffectCreator',
    'type': 'object',
    'args': [ 'object' ]
  },
  265: {
    'comment': '265: Brings up the level up GUI for the player.  The GUI will only show up\nif the player has gained enough experience points to level up.\n* Returns TRUE if the GUI was successfully brought up; FALSE if not.\n',
    'name': 'ShowLevelUpGUI',
    'type': 'int',
    'args': []
  },
  266: {
    'comment': '266: Flag the specified item as being non-equippable or not.  Set bNonEquippable\nto TRUE to prevent this item from being equipped, and FALSE to allow\nthe normal equipping checks to determine if the item can be equipped.\nNOTE: This will do nothing if the object passed in is not an item.  Items that\nare already equipped when this is called will not automatically be\nunequipped.  These items will just be prevented from being re-equipped\nshould they be unequipped.\n',
    'name': 'SetItemNonEquippable',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  267: {
    'comment': '267: GetButtonMashCheck\nThis function returns whether the button mash check, used for the combat tutorial, is on\n',
    'name': 'GetButtonMashCheck',
    'type': 'int',
    'args': []
  },
  268: {
    'comment': '268: SetButtonMashCheck\nThis function sets the button mash check variable, and is used for turning the check on and off\n',
    'name': 'SetButtonMashCheck',
    'type': 'void',
    'args': [ 'int' ]
  },
  269: {
    'comment': '269: EffectForcePushTargeted\nThis effect is exactly the same as force push, except it takes a location parameter that specifies\nwhere the location of the force push is to be done from.  All orientations are also based on this location.\nAMF:  The new ignore test direct line variable should be used with extreme caution\nIt overrides geometry checks for force pushes, so that the object that the effect is applied to\nis guaranteed to move that far, ignoring collisions.  It is best used for cutscenes.\n',
    'name': 'EffectForcePushTargeted',
    'type': 'effect',
    'args': [ 'location', 'int' ]
  },
  270: {
    'comment': '270: Create a Haste effect.\n',
    'name': 'EffectHaste',
    'type': 'effect',
    'args': []
  },
  271: {
    'comment': '271: Give oItem to oGiveTo (instant; for similar Action use ActionGiveItem)\nIf oItem is not a valid item, or oGiveTo is not a valid object, nothing will\nhappen.\n',
    'name': 'GiveItem',
    'type': 'void',
    'args': [ 'object', 'object' ]
  },
  272: {
    'comment': '272: Convert oObject into a hexadecimal string.\n',
    'name': 'ObjectToString',
    'type': 'string',
    'args': [ 'object' ]
  },
  273: {
    'comment': '273: Create an Immunity effect.\n- nImmunityType: IMMUNITY_TYPE_*\n',
    'name': 'EffectImmunity',
    'type': 'effect',
    'args': [ 'int' ]
  },
  274: {
    'comment': '274: - oCreature\n- nImmunityType: IMMUNITY_TYPE_*\n- oVersus: if this is specified, then we also check for the race and\nalignment of oVersus\n* Returns TRUE if oCreature has immunity of type nImmunity versus oVersus.\n',
    'name': 'GetIsImmune',
    'type': 'int',
    'args': [ 'object', 'int', 'object' ]
  },
  275: {
    'comment': '275: Creates a Damage Immunity Increase effect.\n- nDamageType: DAMAGE_TYPE_*\n- nPercentImmunity\n',
    'name': 'EffectDamageImmunityIncrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  276: {
    'comment': '276: Determine whether oEncounter is active.\n',
    'name': 'GetEncounterActive',
    'type': 'int',
    'args': [ 'object' ]
  },
  277: {
    'comment': '277: Set oEncounter\'s active state to nNewValue.\n- nNewValue: TRUE/FALSE\n- oEncounter\n',
    'name': 'SetEncounterActive',
    'type': 'void',
    'args': [ 'int', 'object' ]
  },
  278: {
    'comment': '278: Get the maximum number of times that oEncounter will spawn.\n',
    'name': 'GetEncounterSpawnsMax',
    'type': 'int',
    'args': [ 'object' ]
  },
  279: {
    'comment': '279: Set the maximum number of times that oEncounter can spawn\n',
    'name': 'SetEncounterSpawnsMax',
    'type': 'void',
    'args': [ 'int', 'object' ]
  },
  280: {
    'comment': '280: Get the number of times that oEncounter has spawned so far\n',
    'name': 'GetEncounterSpawnsCurrent',
    'type': 'int',
    'args': [ 'object' ]
  },
  281: {
    'comment': '281: Set the number of times that oEncounter has spawned so far\n',
    'name': 'SetEncounterSpawnsCurrent',
    'type': 'void',
    'args': [ 'int', 'object' ]
  },
  282: {
    'comment': '282: Use this in an OnItemAcquired script to get the item that was acquired.\n* Returns OBJECT_INVALID if the module is not valid.\n',
    'name': 'GetModuleItemAcquired',
    'type': 'object',
    'args': []
  },
  283: {
    'comment': '283: Use this in an OnItemAcquired script to get the creatre that previously\npossessed the item.\n* Returns OBJECT_INVALID if the item was picked up from the ground.\n',
    'name': 'GetModuleItemAcquiredFrom',
    'type': 'object',
    'args': []
  },
  284: {
    'comment': '284: Set the value for a custom token.\n',
    'name': 'SetCustomToken',
    'type': 'void',
    'args': [ 'int', 'string' ]
  },
  285: {
    'comment': '285: Determine whether oCreature has nFeat, and nFeat is useable.\n- nFeat: FEAT_*\n- oCreature\n',
    'name': 'GetHasFeat',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  286: {
    'comment': '286: Determine whether oCreature has nSkill, and nSkill is useable.\n- nSkill: SKILL_*\n- oCreature\n',
    'name': 'GetHasSkill',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  287: {
    'comment': '287: Use nFeat on oTarget.\n- nFeat: FEAT_*\n- oTarget\n',
    'name': 'ActionUseFeat',
    'type': 'void',
    'args': [ 'int', 'object' ]
  },
  288: {
    'comment': '288: Runs the action \'UseSkill\' on the current creature\nUse nSkill on oTarget.\n- nSkill: SKILL_*\n- oTarget\n- nSubSkill: SUBSKILL_*\n- oItemUsed: Item to use in conjunction with the skill\n',
    'name': 'ActionUseSkill',
    'type': 'void',
    'args': [ 'int', 'object', 'int', 'object' ]
  },
  289: {
    'comment': '289: Determine whether oSource sees oTarget.\n',
    'name': 'GetObjectSeen',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  290: {
    'comment': '290: Determine whether oSource hears oTarget.\n',
    'name': 'GetObjectHeard',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  291: {
    'comment': '291: Use this in an OnPlayerDeath module script to get the last player that died.\n',
    'name': 'GetLastPlayerDied',
    'type': 'object',
    'args': []
  },
  292: {
    'comment': '292: Use this in an OnItemLost script to get the item that was lost/dropped.\n* Returns OBJECT_INVALID if the module is not valid.\n',
    'name': 'GetModuleItemLost',
    'type': 'object',
    'args': []
  },
  293: {
    'comment': '293: Use this in an OnItemLost script to get the creature that lost the item.\n* Returns OBJECT_INVALID if the module is not valid.\n',
    'name': 'GetModuleItemLostBy',
    'type': 'object',
    'args': []
  },
  294: {
    'comment': '294: Do aActionToDo.\n',
    'name': 'ActionDoCommand',
    'type': 'void',
    'args': [ 'action' ]
  },
  295: {
    'comment': '295: Conversation event.\n',
    'name': 'EventConversation',
    'type': 'event',
    'args': []
  },
  296: {
    'comment': '296: Set the difficulty level of oEncounter.\n- nEncounterDifficulty: ENCOUNTER_DIFFICULTY_*\n- oEncounter\n',
    'name': 'SetEncounterDifficulty',
    'type': 'void',
    'args': [ 'int', 'object' ]
  },
  297: {
    'comment': '297: Get the difficulty level of oEncounter.\n',
    'name': 'GetEncounterDifficulty',
    'type': 'int',
    'args': [ 'object' ]
  },
  298: {
    'comment': '298: Get the distance between lLocationA and lLocationB.\n',
    'name': 'GetDistanceBetweenLocations',
    'type': 'float',
    'args': [ 'location', 'location' ]
  },
  299: {
    'comment': '299: Use this in spell scripts to get nDamage adjusted by oTarget\'s reflex and\nevasion saves.\n- nDamage\n- oTarget\n- nDC: Difficulty check\n- nSaveType: SAVING_THROW_TYPE_*\n- oSaveVersus\n',
    'name': 'GetReflexAdjustedDamage',
    'type': 'int',
    'args': [ 'int', 'object', 'int', 'int', 'object' ]
  },
  300: {
    'comment': '300: Play nAnimation immediately.\n- nAnimation: ANIMATION_*\n- fSpeed\n- fSeconds: Duration of the animation (this is not used for Fire and\nForget animations) If a time of -1.0f is specified for a looping animation\nit will loop until the next animation is applied.\n',
    'name': 'PlayAnimation',
    'type': 'void',
    'args': [ 'int', 'float', 'float' ]
  },
  301: {
    'comment': '301: Create a Spell Talent.\n- nSpell: SPELL_*\n',
    'name': 'TalentSpell',
    'type': 'talent',
    'args': [ 'int' ]
  },
  302: {
    'comment': '302: Create a Feat Talent.\n- nFeat: FEAT_*\n',
    'name': 'TalentFeat',
    'type': 'talent',
    'args': [ 'int' ]
  },
  303: {
    'comment': '303: Create a Skill Talent.\n- nSkill: SKILL_*\n',
    'name': 'TalentSkill',
    'type': 'talent',
    'args': [ 'int' ]
  },
  304: {
    'comment': '304: Determine if oObject has effects originating from nSpell.\n- nSpell: SPELL_*\n- oObject\n',
    'name': 'GetHasSpellEffect',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  305: {
    'comment': '305: Get the spell (SPELL_*) that applied eSpellEffect.\n* Returns -1 if eSpellEffect was applied outside a spell script.\n',
    'name': 'GetEffectSpellId',
    'type': 'int',
    'args': [ 'effect' ]
  },
  306: {
    'comment': '306: Determine whether oCreature has tTalent.\n',
    'name': 'GetCreatureHasTalent',
    'type': 'int',
    'args': [ 'talent', 'object' ]
  },
  307: {
    'comment': '307: Get a random talent of oCreature, within nCategory.\n- nCategory: TALENT_CATEGORY_*\n- oCreature\n- nInclusion: types of talent to include\n',
    'name': 'GetCreatureTalentRandom',
    'type': 'talent',
    'args': [ 'int', 'object', 'int' ]
  },
  308: {
    'comment': '308: Get the best talent (i.e. closest to nCRMax without going over) of oCreature,\nwithin nCategory.\n- nCategory: TALENT_CATEGORY_*\n- nCRMax: Challenge Rating of the talent\n- oCreature\n- nInclusion: types of talent to include\n- nExcludeType: TALENT_TYPE_FEAT or TALENT_TYPE_FORCE, type of talent that we wish to ignore\n- nExcludeId: Talent ID of the talent we wish to ignore.\nA value of TALENT_EXCLUDE_ALL_OF_TYPE for this parameter will mean that all talents of\ntype nExcludeType are ignored.\n',
    'name': 'GetCreatureTalentBest',
    'type': 'talent',
    'args': [ 'int', 'int', 'object', 'int', 'int', 'int' ]
  },
  309: {
    'comment': '309: Use tChosenTalent on oTarget.\n',
    'name': 'ActionUseTalentOnObject',
    'type': 'void',
    'args': [ 'talent', 'object' ]
  },
  310: {
    'comment': '310: Use tChosenTalent at lTargetLocation.\n',
    'name': 'ActionUseTalentAtLocation',
    'type': 'void',
    'args': [ 'talent', 'location' ]
  },
  311: {
    'comment': '311: Get the gold piece value of oItem.\n* Returns 0 if oItem is not a valid item.\n',
    'name': 'GetGoldPieceValue',
    'type': 'int',
    'args': [ 'object' ]
  },
  312: {
    'comment': '312: * Returns TRUE if oCreature is of a playable racial type.\n',
    'name': 'GetIsPlayableRacialType',
    'type': 'int',
    'args': [ 'object' ]
  },
  313: {
    'comment': '313: Jump to lDestination.  The action is added to the TOP of the action queue.\n',
    'name': 'JumpToLocation',
    'type': 'void',
    'args': [ 'location' ]
  },
  314: {
    'comment': '314: Create a Temporary Hitpoints effect.\n- nHitPoints: a positive integer\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nHitPoints < 0.\n',
    'name': 'EffectTemporaryHitpoints',
    'type': 'effect',
    'args': [ 'int' ]
  },
  315: {
    'comment': '315: Get the number of ranks that oTarget has in nSkill.\n- nSkill: SKILL_*\n- oTarget\n* Returns -1 if oTarget doesn\'t have nSkill.\n* Returns 0 if nSkill is untrained.\n',
    'name': 'GetSkillRank',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  316: {
    'comment': '316: Get the attack target of oCreature.\nThis only works when oCreature is in combat.\n',
    'name': 'GetAttackTarget',
    'type': 'object',
    'args': [ 'object' ]
  },
  317: {
    'comment': '317: Get the attack type (SPECIAL_ATTACK_*) of oCreature\'s last attack.\nThis only works when oCreature is in combat.\n',
    'name': 'GetLastAttackType',
    'type': 'int',
    'args': [ 'object' ]
  },
  318: {
    'comment': '318: Get the attack mode (COMBAT_MODE_*) of oCreature\'s last attack.\nThis only works when oCreature is in combat.\n',
    'name': 'GetLastAttackMode',
    'type': 'int',
    'args': [ 'object' ]
  },
  319: {
    'comment': '319: Get the distance in metres between oObjectA and oObjectB in 2D.\n* Return value if either object is invalid: 0.0f\n',
    'name': 'GetDistanceBetween2D',
    'type': 'float',
    'args': [ 'object', 'object' ]
  },
  320: {
    'comment': '320: * Returns TRUE if oCreature is in combat.\n',
    'name': 'GetIsInCombat',
    'type': 'int',
    'args': [ 'object' ]
  },
  321: {
    'comment': '321: Get the last command (ASSOCIATE_COMMAND_*) issued to oAssociate.\n',
    'name': 'GetLastAssociateCommand',
    'type': 'int',
    'args': [ 'object' ]
  },
  322: {
    'comment': '322: Give nGP gold to oCreature.\n',
    'name': 'GiveGoldToCreature',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  323: {
    'comment': '323: Set the destroyable status of the caller.\n- bDestroyable: If this is FALSE, the caller does not fade out on death, but\nsticks around as a corpse.\n- bRaiseable: If this is TRUE, the caller can be raised via resurrection.\n- bSelectableWhenDead: If this is TRUE, the caller is selectable after death.\n',
    'name': 'SetIsDestroyable',
    'type': 'void',
    'args': [ 'int', 'int', 'int' ]
  },
  324: {
    'comment': '324: Set the locked state of oTarget, which can be a door or a placeable object.\n',
    'name': 'SetLocked',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  325: {
    'comment': '325: Get the locked state of oTarget, which can be a door or a placeable object.\n',
    'name': 'GetLocked',
    'type': 'int',
    'args': [ 'object' ]
  },
  326: {
    'comment': '326: Use this in a trigger\'s OnClick event script to get the object that last\nclicked on it.\nThis is identical to GetEnteringObject.\n',
    'name': 'GetClickingObject',
    'type': 'object',
    'args': []
  },
  327: {
    'comment': '327: Initialise oTarget to listen for the standard Associates commands.\n',
    'name': 'SetAssociateListenPatterns',
    'type': 'void',
    'args': [ 'object' ]
  },
  328: {
    'comment': '328: Get the last weapon that oCreature used in an attack.\n* Returns OBJECT_INVALID if oCreature did not attack, or has no weapon equipped.\n',
    'name': 'GetLastWeaponUsed',
    'type': 'object',
    'args': [ 'object' ]
  },
  329: {
    'comment': '329: Use oPlaceable.\n',
    'name': 'ActionInteractObject',
    'type': 'void',
    'args': [ 'object' ]
  },
  330: {
    'comment': '330: Get the last object that used the placeable object that is calling this function.\n* Returns OBJECT_INVALID if it is called by something other than a placeable or\na door.\n',
    'name': 'GetLastUsedBy',
    'type': 'object',
    'args': []
  },
  331: {
    'comment': '331: Returns the ability modifier for the specified ability\nGet oCreature\'s ability modifier for nAbility.\n- nAbility: ABILITY_*\n- oCreature\n',
    'name': 'GetAbilityModifier',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  332: {
    'comment': '332: Determined whether oItem has been identified.\n',
    'name': 'GetIdentified',
    'type': 'int',
    'args': [ 'object' ]
  },
  333: {
    'comment': '333: Set whether oItem has been identified.\n',
    'name': 'SetIdentified',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  334: {
    'comment': '334: Get the distance between lLocationA and lLocationB. in 2D\n',
    'name': 'GetDistanceBetweenLocations2D',
    'type': 'float',
    'args': [ 'location', 'location' ]
  },
  335: {
    'comment': '335: Get the distance from the caller to oObject in metres.\n* Return value on error: -1.0f\n',
    'name': 'GetDistanceToObject2D',
    'type': 'float',
    'args': [ 'object' ]
  },
  336: {
    'comment': '336: Get the last blocking door encountered by the caller of this function.\n* Returns OBJECT_INVALID if the caller is not a valid creature.\n',
    'name': 'GetBlockingDoor',
    'type': 'object',
    'args': []
  },
  337: {
    'comment': '337: - oTargetDoor\n- nDoorAction: DOOR_ACTION_*\n* Returns TRUE if nDoorAction can be performed on oTargetDoor.\n',
    'name': 'GetIsDoorActionPossible',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  338: {
    'comment': '338: Perform nDoorAction on oTargetDoor.\n',
    'name': 'DoDoorAction',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  339: {
    'comment': '339: Get the first item in oTarget\'s inventory (start to cycle through oTarget\'s\ninventory).\n* Returns OBJECT_INVALID if the caller is not a creature, item, placeable or store,\nor if no item is found.\n',
    'name': 'GetFirstItemInInventory',
    'type': 'object',
    'args': [ 'object' ]
  },
  340: {
    'comment': '340: Get the next item in oTarget\'s inventory (continue to cycle through oTarget\'s\ninventory).\n* Returns OBJECT_INVALID if the caller is not a creature, item, placeable or store,\nor if no item is found.\n',
    'name': 'GetNextItemInInventory',
    'type': 'object',
    'args': [ 'object' ]
  },
  341: {
    'comment': '341: A creature can have up to three classes.  This function determines the\ncreature\'s class (CLASS_TYPE_*) based on nClassPosition.\n- nClassPosition: 1, 2 or 3\n- oCreature\n* Returns CLASS_TYPE_INVALID if the oCreature does not have a class in\nnClassPosition (i.e. a single-class creature will only have a value in\nnClassLocation=1) or if oCreature is not a valid creature.\n',
    'name': 'GetClassByPosition',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  342: {
    'comment': '342: A creature can have up to three classes.  This function determines the\ncreature\'s class level based on nClass Position.\n- nClassPosition: 1, 2 or 3\n- oCreature\n* Returns 0 if oCreature does not have a class in nClassPosition\n(i.e. a single-class creature will only have a value in nClassLocation=1)\nor if oCreature is not a valid creature.\n',
    'name': 'GetLevelByPosition',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  343: {
    'comment': '343: Determine the levels that oCreature holds in nClassType.\n- nClassType: CLASS_TYPE_*\n- oCreature\n',
    'name': 'GetLevelByClass',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  344: {
    'comment': '344: Get the amount of damage of type nDamageType that has been dealt to the caller.\n- nDamageType: DAMAGE_TYPE_*\n',
    'name': 'GetDamageDealtByType',
    'type': 'int',
    'args': [ 'int' ]
  },
  345: {
    'comment': '345: Get the total amount of damage that has been dealt to the caller.\n',
    'name': 'GetTotalDamageDealt',
    'type': 'int',
    'args': []
  },
  346: {
    'comment': '346: Get the last object that damaged the caller.\n* Returns OBJECT_INVALID if the caller is not a valid object.\n',
    'name': 'GetLastDamager',
    'type': 'object',
    'args': []
  },
  347: {
    'comment': '347: Get the last object that disarmed the trap on the caller.\n* Returns OBJECT_INVALID if the caller is not a valid placeable, trigger or\ndoor.\n',
    'name': 'GetLastDisarmed',
    'type': 'object',
    'args': []
  },
  348: {
    'comment': '348: Get the last object that disturbed the inventory of the caller.\n* Returns OBJECT_INVALID if the caller is not a valid creature or placeable.\n',
    'name': 'GetLastDisturbed',
    'type': 'object',
    'args': []
  },
  349: {
    'comment': '349: Get the last object that locked the caller.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.\n',
    'name': 'GetLastLocked',
    'type': 'object',
    'args': []
  },
  350: {
    'comment': '350: Get the last object that unlocked the caller.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.\n',
    'name': 'GetLastUnlocked',
    'type': 'object',
    'args': []
  },
  351: {
    'comment': '351: Create a Skill Increase effect.\n- nSkill: SKILL_*\n- nValue\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid.\n',
    'name': 'EffectSkillIncrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  352: {
    'comment': '352: Get the type of disturbance (INVENTORY_DISTURB_*) that caused the caller\'s\nOnInventoryDisturbed script to fire.  This will only work for creatures and\nplaceables.\n',
    'name': 'GetInventoryDisturbType',
    'type': 'int',
    'args': []
  },
  353: {
    'comment': '353: get the item that caused the caller\'s OnInventoryDisturbed script to fire.\n* Returns OBJECT_INVALID if the caller is not a valid object.\n',
    'name': 'GetInventoryDisturbItem',
    'type': 'object',
    'args': []
  },
  354: {
    'comment': '354: Displays the upgrade screen where the player can modify weapons and armor\n',
    'name': 'ShowUpgradeScreen',
    'type': 'void',
    'args': [ 'object' ]
  },
  355: {
    'comment': '355: Set eEffect to be versus a specific alignment.\n- eEffect\n- nLawChaos: ALIGNMENT_LAWFUL/ALIGNMENT_CHAOTIC/ALIGNMENT_ALL\n- nGoodEvil: ALIGNMENT_GOOD/ALIGNMENT_EVIL/ALIGNMENT_ALL\n',
    'name': 'VersusAlignmentEffect',
    'type': 'effect',
    'args': [ 'effect', 'int', 'int' ]
  },
  356: {
    'comment': '356: Set eEffect to be versus nRacialType.\n- eEffect\n- nRacialType: RACIAL_TYPE_*\n',
    'name': 'VersusRacialTypeEffect',
    'type': 'effect',
    'args': [ 'effect', 'int' ]
  },
  357: {
    'comment': '357: Set eEffect to be versus traps.\n',
    'name': 'VersusTrapEffect',
    'type': 'effect',
    'args': [ 'effect' ]
  },
  358: {
    'comment': '358: Get the gender of oCreature.\n',
    'name': 'GetGender',
    'type': 'int',
    'args': [ 'object' ]
  },
  359: {
    'comment': '359: * Returns TRUE if tTalent is valid.\n',
    'name': 'GetIsTalentValid',
    'type': 'int',
    'args': [ 'talent' ]
  },
  360: {
    'comment': '360: Causes the action subject to move away from lMoveAwayFrom.\n',
    'name': 'ActionMoveAwayFromLocation',
    'type': 'void',
    'args': [ 'location', 'int', 'float' ]
  },
  361: {
    'comment': '361: Get the target that the caller attempted to attack - this should be used in\nconjunction with GetAttackTarget(). This value is set every time an attack is\nmade, and is reset at the end of combat.\n* Returns OBJECT_INVALID if the caller is not a valid creature.\n',
    'name': 'GetAttemptedAttackTarget',
    'type': 'object',
    'args': []
  },
  362: {
    'comment': '362: Get the type (TALENT_TYPE_*) of tTalent.\n',
    'name': 'GetTypeFromTalent',
    'type': 'int',
    'args': [ 'talent' ]
  },
  363: {
    'comment': '363: Get the ID of tTalent.  This could be a SPELL_*, FEAT_* or SKILL_*.\n',
    'name': 'GetIdFromTalent',
    'type': 'int',
    'args': [ 'talent' ]
  },
  364: {
    'comment': '364: Starts a game of pazaak.\n- nOpponentPazaakDeck: Index into PazaakDecks.2da; specifies which deck the opponent will use.\n- sEndScript: Script to be run when game finishes.\n- nMaxWager: Max player wager.  If <= 0, the player\'s credits won\'t be modified by the result of the game and the wager screen will not show up.\n- bShowTutorial: Plays in tutorial mode (nMaxWager should be 0).\n',
    'name': 'PlayPazaak',
    'type': 'void',
    'args': [ 'int', 'string', 'int', 'int', 'object' ]
  },
  365: {
    'comment': '365: Returns result of last Pazaak game.  Should be used only in an EndScript sent to PlayPazaak.\n* Returns 0 if player loses, 1 if player wins.\n',
    'name': 'GetLastPazaakResult',
    'type': 'int',
    'args': []
  },
  366: {
    'comment': '366:  displays a feed back string for the object spicified and the constant\nrepersents the string to be displayed see:FeedBackText.2da\n',
    'name': 'DisplayFeedBackText',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  367: {
    'comment': '367: Add a journal quest entry to the player.\n- szPlotID: the plot identifier used in the toolset\'s Journal Editor\n- nState: the state of the plot as seen in the toolset\'s Journal Editor\n- bAllowOverrideHigher: If this is TRUE, you can set the state to a lower\nnumber than the one it is currently on\n',
    'name': 'AddJournalQuestEntry',
    'type': 'void',
    'args': [ 'string', 'int', 'int' ]
  },
  368: {
    'comment': '368: Remove a journal quest entry from the player.\n- szPlotID: the plot identifier used in the toolset\'s Journal Editor\n',
    'name': 'RemoveJournalQuestEntry',
    'type': 'void',
    'args': [ 'string' ]
  },
  369: {
    'comment': '369: Gets the State value of a journal quest.  Returns 0 if no quest entry has been added for this szPlotID.\n- szPlotID: the plot identifier used in the toolset\'s Journal Editor\n',
    'name': 'GetJournalEntry',
    'type': 'int',
    'args': [ 'string' ]
  },
  370: {
    'comment': '370: PlayRumblePattern\nStarts a defined rumble pattern playing\n',
    'name': 'PlayRumblePattern',
    'type': 'int',
    'args': [ 'int' ]
  },
  371: {
    'comment': '371: StopRumblePattern\nStops a defined rumble pattern\n',
    'name': 'StopRumblePattern',
    'type': 'int',
    'args': [ 'int' ]
  },
  372: {
    'comment': '372: Damages the creatures force points\n',
    'name': 'EffectDamageForcePoints',
    'type': 'effect',
    'args': [ 'int' ]
  },
  373: {
    'comment': '373: Heals the creatures force points\n',
    'name': 'EffectHealForcePoints',
    'type': 'effect',
    'args': [ 'int' ]
  },
  374: {
    'comment': '374: Send a server message (szMessage) to the oPlayer.\n',
    'name': 'SendMessageToPC',
    'type': 'void',
    'args': [ 'object', 'string' ]
  },
  375: {
    'comment': '375: Get the target at which the caller attempted to cast a spell.\nThis value is set every time a spell is cast and is reset at the end of\ncombat.\n* Returns OBJECT_INVALID if the caller is not a valid creature.\n',
    'name': 'GetAttemptedSpellTarget',
    'type': 'object',
    'args': []
  },
  376: {
    'comment': '376: Get the last creature that opened the caller.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.\n',
    'name': 'GetLastOpenedBy',
    'type': 'object',
    'args': []
  },
  377: {
    'comment': '377: Determine whether oCreature has nSpell memorised.\n- nSpell: SPELL_*\n- oCreature\n',
    'name': 'GetHasSpell',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  378: {
    'comment': '378: Open oStore for oPC.\n',
    'name': 'OpenStore',
    'type': 'void',
    'args': [ 'object', 'object', 'int', 'int' ]
  },
  379: {
    'comment': '379:\n',
    'name': 'ActionSurrenderToEnemies',
    'type': 'void',
    'args': []
  },
  380: {
    'comment': '380: Get the first member of oMemberOfFaction\'s faction (start to cycle through\noMemberOfFaction\'s faction).\n* Returns OBJECT_INVALID if oMemberOfFaction\'s faction is invalid.\n',
    'name': 'GetFirstFactionMember',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  381: {
    'comment': '381: Get the next member of oMemberOfFaction\'s faction (continue to cycle through\noMemberOfFaction\'s faction).\n* Returns OBJECT_INVALID if oMemberOfFaction\'s faction is invalid.\n',
    'name': 'GetNextFactionMember',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  382: {
    'comment': '382: Force the action subject to move to lDestination.\n',
    'name': 'ActionForceMoveToLocation',
    'type': 'void',
    'args': [ 'location', 'int', 'float' ]
  },
  383: {
    'comment': '383: Force the action subject to move to oMoveTo.\n',
    'name': 'ActionForceMoveToObject',
    'type': 'void',
    'args': [ 'object', 'int', 'float', 'float' ]
  },
  384: {
    'comment': '384: Get the experience assigned in the journal editor for szPlotID.\n',
    'name': 'GetJournalQuestExperience',
    'type': 'int',
    'args': [ 'string' ]
  },
  385: {
    'comment': '385: Jump to oToJumpTo (the action is added to the top of the action queue).\n',
    'name': 'JumpToObject',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  386: {
    'comment': '386: Set whether oMapPin is enabled.\n- oMapPin\n- nEnabled: 0=Off, 1=On\n',
    'name': 'SetMapPinEnabled',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  387: {
    'comment': '387: Create a Hit Point Change When Dying effect.\n- fHitPointChangePerRound: this can be positive or negative, but not zero.\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if fHitPointChangePerRound is 0.\n',
    'name': 'EffectHitPointChangeWhenDying',
    'type': 'effect',
    'args': [ 'float' ]
  },
  388: {
    'comment': '388: Spawn a GUI panel for the client that controls oPC.\n- oPC\n- nGUIPanel: GUI_PANEL_*\n* Nothing happens if oPC is not a player character or if an invalid value is\nused for nGUIPanel.\n',
    'name': 'PopUpGUIPanel',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  389: {
    'comment': '389: This allows you to add a new class to any creature object\n',
    'name': 'AddMultiClass',
    'type': 'void',
    'args': [ 'int', 'object' ]
  },
  390: {
    'comment': '390: Tests a linked effect to see if the target is immune to it.\nIf the target is imune to any of the linked effect then he is immune to all of it\n',
    'name': 'GetIsLinkImmune',
    'type': 'int',
    'args': [ 'object', 'effect' ]
  },
  391: {
    'comment': '391: Stunn the droid\n',
    'name': 'EffectDroidStun',
    'type': 'effect',
    'args': []
  },
  392: {
    'comment': '392: Force push the creature...\n',
    'name': 'EffectForcePushed',
    'type': 'effect',
    'args': []
  },
  393: {
    'comment': '393: Gives nXpAmount to oCreature.\n',
    'name': 'GiveXPToCreature',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  394: {
    'comment': '394: Sets oCreature\'s experience to nXpAmount.\n',
    'name': 'SetXP',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  395: {
    'comment': '395: Get oCreature\'s experience.\n',
    'name': 'GetXP',
    'type': 'int',
    'args': [ 'object' ]
  },
  396: {
    'comment': '396: Convert nInteger to hex, returning the hex value as a string.\n* Return value has the format \'0x????????\' where each ? will be a hex digit\n(8 digits in total).\n',
    'name': 'IntToHexString',
    'type': 'string',
    'args': [ 'int' ]
  },
  397: {
    'comment': '397: Get the base item type (BASE_ITEM_*) of oItem.\n* Returns BASE_ITEM_INVALID if oItem is an invalid item.\n',
    'name': 'GetBaseItemType',
    'type': 'int',
    'args': [ 'object' ]
  },
  398: {
    'comment': '398: Determines whether oItem has nProperty.\n- oItem\n- nProperty: ITEM_PROPERTY_*\n* Returns FALSE if oItem is not a valid item, or if oItem does not have\nnProperty.\n',
    'name': 'GetItemHasItemProperty',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  399: {
    'comment': '399: The creature will equip the melee weapon in its possession that can do the\nmost damage. If no valid melee weapon is found, it will equip the most\ndamaging range weapon. This function should only ever be called in the\nEndOfCombatRound scripts, because otherwise it would have to stop the combat\nround to run simulation.\n- oVersus: You can try to get the most damaging weapon against oVersus\n- bOffHand\n',
    'name': 'ActionEquipMostDamagingMelee',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  400: {
    'comment': '400: The creature will equip the range weapon in its possession that can do the\nmost damage.\nIf no valid range weapon can be found, it will equip the most damaging melee\nweapon.\n- oVersus: You can try to get the most damaging weapon against oVersus\n',
    'name': 'ActionEquipMostDamagingRanged',
    'type': 'void',
    'args': [ 'object' ]
  },
  401: {
    'comment': '401: Get the Armour Class of oItem.\n* Return 0 if the oItem is not a valid item, or if oItem has no armour value.\n',
    'name': 'GetItemACValue',
    'type': 'int',
    'args': [ 'object' ]
  },
  402: {
    'comment': '402:\nEffect that will play an animation and display a visual effect to indicate the\ntarget has resisted a force power.\n',
    'name': 'EffectForceResisted',
    'type': 'effect',
    'args': [ 'object' ]
  },
  403: {
    'comment': '403: Expose the entire map of oArea to oPlayer.\n',
    'name': 'ExploreAreaForPlayer',
    'type': 'void',
    'args': [ 'object', 'object' ]
  },
  404: {
    'comment': '404: The creature will equip the armour in its possession that has the highest\narmour class.\n',
    'name': 'ActionEquipMostEffectiveArmor',
    'type': 'void',
    'args': []
  },
  405: {
    'comment': '405: * Returns TRUE if it is currently day.\n',
    'name': 'GetIsDay',
    'type': 'int',
    'args': []
  },
  406: {
    'comment': '406: * Returns TRUE if it is currently night.\n',
    'name': 'GetIsNight',
    'type': 'int',
    'args': []
  },
  407: {
    'comment': '407: * Returns TRUE if it is currently dawn.\n',
    'name': 'GetIsDawn',
    'type': 'int',
    'args': []
  },
  408: {
    'comment': '408: * Returns TRUE if it is currently dusk.\n',
    'name': 'GetIsDusk',
    'type': 'int',
    'args': []
  },
  409: {
    'comment': '409: * Returns TRUE if oCreature was spawned from an encounter.\n',
    'name': 'GetIsEncounterCreature',
    'type': 'int',
    'args': [ 'object' ]
  },
  410: {
    'comment': '410: Use this in an OnPlayerDying module script to get the last player who is dying.\n',
    'name': 'GetLastPlayerDying',
    'type': 'object',
    'args': []
  },
  411: {
    'comment': '411: Get the starting location of the module.\n',
    'name': 'GetStartingLocation',
    'type': 'location',
    'args': []
  },
  412: {
    'comment': '412: Make oCreatureToChange join one of the standard factions.\n** This will only work on an NPC **\n- nStandardFaction: STANDARD_FACTION_*\n',
    'name': 'ChangeToStandardFaction',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  413: {
    'comment': '413: Play oSound.\n',
    'name': 'SoundObjectPlay',
    'type': 'void',
    'args': [ 'object' ]
  },
  414: {
    'comment': '414: Stop playing oSound.\n',
    'name': 'SoundObjectStop',
    'type': 'void',
    'args': [ 'object' ]
  },
  415: {
    'comment': '415: Set the volume of oSound.\n- oSound\n- nVolume: 0-127\n',
    'name': 'SoundObjectSetVolume',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  416: {
    'comment': '416: Set the position of oSound.\n',
    'name': 'SoundObjectSetPosition',
    'type': 'void',
    'args': [ 'object', 'vector' ]
  },
  417: {
    'comment': '417: Immediately speak a conversation one-liner.\n- sDialogResRef\n- oTokenTarget: This must be specified if there are creature-specific tokens\nin the string.\n',
    'name': 'SpeakOneLinerConversation',
    'type': 'void',
    'args': [ 'string', 'object' ]
  },
  418: {
    'comment': '418: Get the amount of gold possessed by oTarget.\n',
    'name': 'GetGold',
    'type': 'int',
    'args': [ 'object' ]
  },
  419: {
    'comment': '419: Use this in an OnRespawnButtonPressed module script to get the object id of\nthe player who last pressed the respawn button.\n',
    'name': 'GetLastRespawnButtonPresser',
    'type': 'object',
    'args': []
  },
  420: {
    'comment': '420:\nEffect that will display a visual effect on the specified object\'s hand to\nindicate a force power has fizzled out.\n',
    'name': 'EffectForceFizzle',
    'type': 'effect',
    'args': []
  },
  421: {
    'comment': '421: SetLightsaberPowered\nAllows a script to set the state of the lightsaber.  This will override any\ngame determined lightsaber powerstates.\n',
    'name': 'SetLightsaberPowered',
    'type': 'void',
    'args': [ 'object', 'int', 'int', 'int' ]
  },
  422: {
    'comment': '422: * Returns TRUE if the weapon equipped is capable of damaging oVersus.\n',
    'name': 'GetIsWeaponEffective',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  423: {
    'comment': '423: Use this in a SpellCast script to determine whether the spell was considered\nharmful.\n* Returns TRUE if the last spell cast was harmful.\n',
    'name': 'GetLastSpellHarmful',
    'type': 'int',
    'args': []
  },
  424: {
    'comment': '424: Activate oItem.\n',
    'name': 'EventActivateItem',
    'type': 'event',
    'args': [ 'object', 'location', 'object' ]
  },
  425: {
    'comment': '425: Play the background music for oArea.\n',
    'name': 'MusicBackgroundPlay',
    'type': 'void',
    'args': [ 'object' ]
  },
  426: {
    'comment': '426: Stop the background music for oArea.\n',
    'name': 'MusicBackgroundStop',
    'type': 'void',
    'args': [ 'object' ]
  },
  427: {
    'comment': '427: Set the delay for the background music for oArea.\n- oArea\n- nDelay: delay in milliseconds\n',
    'name': 'MusicBackgroundSetDelay',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  428: {
    'comment': '428: Change the background day track for oArea to nTrack.\n- oArea\n- nTrack\n',
    'name': 'MusicBackgroundChangeDay',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  429: {
    'comment': '429: Change the background night track for oArea to nTrack.\n- oArea\n- nTrack\n',
    'name': 'MusicBackgroundChangeNight',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  430: {
    'comment': '430: Play the battle music for oArea.\n',
    'name': 'MusicBattlePlay',
    'type': 'void',
    'args': [ 'object' ]
  },
  431: {
    'comment': '431: Stop the battle music for oArea.\n',
    'name': 'MusicBattleStop',
    'type': 'void',
    'args': [ 'object' ]
  },
  432: {
    'comment': '432: Change the battle track for oArea.\n- oArea\n- nTrack\n',
    'name': 'MusicBattleChange',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  433: {
    'comment': '433: Play the ambient sound for oArea.\n',
    'name': 'AmbientSoundPlay',
    'type': 'void',
    'args': [ 'object' ]
  },
  434: {
    'comment': '434: Stop the ambient sound for oArea.\n',
    'name': 'AmbientSoundStop',
    'type': 'void',
    'args': [ 'object' ]
  },
  435: {
    'comment': '435: Change the ambient day track for oArea to nTrack.\n- oArea\n- nTrack\n',
    'name': 'AmbientSoundChangeDay',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  436: {
    'comment': '436: Change the ambient night track for oArea to nTrack.\n- oArea\n- nTrack\n',
    'name': 'AmbientSoundChangeNight',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  437: {
    'comment': '437: Get the object that killed the caller.\n',
    'name': 'GetLastKiller',
    'type': 'object',
    'args': []
  },
  438: {
    'comment': '438: Use this in a spell script to get the item used to cast the spell.\n',
    'name': 'GetSpellCastItem',
    'type': 'object',
    'args': []
  },
  439: {
    'comment': '439: Use this in an OnItemActivated module script to get the item that was activated.\n',
    'name': 'GetItemActivated',
    'type': 'object',
    'args': []
  },
  440: {
    'comment': '440: Use this in an OnItemActivated module script to get the creature that\nactivated the item.\n',
    'name': 'GetItemActivator',
    'type': 'object',
    'args': []
  },
  441: {
    'comment': '441: Use this in an OnItemActivated module script to get the location of the item\'s\ntarget.\n',
    'name': 'GetItemActivatedTargetLocation',
    'type': 'location',
    'args': []
  },
  442: {
    'comment': '442: Use this in an OnItemActivated module script to get the item\'s target.\n',
    'name': 'GetItemActivatedTarget',
    'type': 'object',
    'args': []
  },
  443: {
    'comment': '443: * Returns TRUE if oObject (which is a placeable or a door) is currently open.\n',
    'name': 'GetIsOpen',
    'type': 'int',
    'args': [ 'object' ]
  },
  444: {
    'comment': '444: Take nAmount of gold from oCreatureToTakeFrom.\n- nAmount\n- oCreatureToTakeFrom: If this is not a valid creature, nothing will happen.\n- bDestroy: If this is TRUE, the caller will not get the gold.  Instead, the\ngold will be destroyed and will vanish from the game.\n',
    'name': 'TakeGoldFromCreature',
    'type': 'void',
    'args': [ 'int', 'object', 'int' ]
  },
  445: {
    'comment': '445: Determine whether oObject is in conversation.\n',
    'name': 'GetIsInConversation',
    'type': 'int',
    'args': [ 'object' ]
  },
  446: {
    'comment': '446: Create an Ability Decrease effect.\n- nAbility: ABILITY_*\n- nModifyBy: This is the amount by which to decrement the ability\n',
    'name': 'EffectAbilityDecrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  447: {
    'comment': '447: Create an Attack Decrease effect.\n- nPenalty\n- nModifierType: ATTACK_BONUS_*\n',
    'name': 'EffectAttackDecrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  448: {
    'comment': '448: Create a Damage Decrease effect.\n- nPenalty\n- nDamageType: DAMAGE_TYPE_*\n',
    'name': 'EffectDamageDecrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  449: {
    'comment': '449: Create a Damage Immunity Decrease effect.\n- nDamageType: DAMAGE_TYPE_*\n- nPercentImmunity\n',
    'name': 'EffectDamageImmunityDecrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  450: {
    'comment': '450: Create an AC Decrease effect.\n- nValue\n- nModifyType: AC_*\n- nDamageType: DAMAGE_TYPE_*\n* Default value for nDamageType should only ever be used in this function prototype.\n',
    'name': 'EffectACDecrease',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  451: {
    'comment': '451: Create a Movement Speed Decrease effect.\n- nPercentChange: This is expected to be a positive integer between 1 and 99 inclusive.\nIf a negative integer is supplied then a movement speed increase will result,\nand if a number >= 100 is supplied then the effect is deleted.\n',
    'name': 'EffectMovementSpeedDecrease',
    'type': 'effect',
    'args': [ 'int' ]
  },
  452: {
    'comment': '452: Create a Saving Throw Decrease effect.\n- nSave\n- nValue\n- nSaveType: SAVING_THROW_TYPE_*\n',
    'name': 'EffectSavingThrowDecrease',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  453: {
    'comment': '453: Create a Skill Decrease effect.\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nSkill is invalid.\n',
    'name': 'EffectSkillDecrease',
    'type': 'effect',
    'args': [ 'int', 'int' ]
  },
  454: {
    'comment': '454: Create a Force Resistance Decrease effect.\n',
    'name': 'EffectForceResistanceDecrease',
    'type': 'effect',
    'args': [ 'int' ]
  },
  455: {
    'comment': '455: Determine whether oTarget is a plot object.\n',
    'name': 'GetPlotFlag',
    'type': 'int',
    'args': [ 'object' ]
  },
  456: {
    'comment': '456: Set oTarget\'s plot object status.\n',
    'name': 'SetPlotFlag',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  457: {
    'comment': '457: Create an Invisibility effect.\n- nInvisibilityType: INVISIBILITY_TYPE_*\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nInvisibilityType\nis invalid.\n',
    'name': 'EffectInvisibility',
    'type': 'effect',
    'args': [ 'int' ]
  },
  458: {
    'comment': '458: Create a Concealment effect.\n- nPercentage: 1-100 inclusive\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or\nnPercentage > 100.\n',
    'name': 'EffectConcealment',
    'type': 'effect',
    'args': [ 'int' ]
  },
  459: {
    'comment': '459: Create a Force Shield that has parameters from the guven index into the forceshields.2da\n',
    'name': 'EffectForceShield',
    'type': 'effect',
    'args': [ 'int' ]
  },
  460: {
    'comment': '460: Create a Dispel Magic All effect.\n',
    'name': 'EffectDispelMagicAll',
    'type': 'effect',
    'args': [ 'int' ]
  },
  461: {
    'comment': '461: Cut immediately to placeable camera \'nCameraId\' during dialog.  nCameraId must be\nan existing Placeable Camera ID.  Function only works during Dialog.\n',
    'name': 'SetDialogPlaceableCamera',
    'type': 'void',
    'args': [ 'int' ]
  },
  462: {
    'comment': '462:\nReturns: TRUE if the player is in \'solo mode\' (ie. the party is not supposed to follow the player).\nFALSE otherwise.\n',
    'name': 'GetSoloMode',
    'type': 'int',
    'args': []
  },
  463: {
    'comment': '463: Create a Disguise effect.\n- * nDisguiseAppearance: DISGUISE_TYPE_*s\n',
    'name': 'EffectDisguise',
    'type': 'effect',
    'args': [ 'int' ]
  },
  464: {
    'comment': '464:\nReturns the maximum amount of stealth xp available in the area.\n',
    'name': 'GetMaxStealthXP',
    'type': 'int',
    'args': []
  },
  465: {
    'comment': '465: Create a True Seeing effect.\n',
    'name': 'EffectTrueSeeing',
    'type': 'effect',
    'args': []
  },
  466: {
    'comment': '466: Create a See Invisible effect.\n',
    'name': 'EffectSeeInvisible',
    'type': 'effect',
    'args': []
  },
  467: {
    'comment': '467: Create a Time Stop effect.\n',
    'name': 'EffectTimeStop',
    'type': 'effect',
    'args': []
  },
  468: {
    'comment': '468:\nSet the maximum amount of stealth xp available in the area.\n',
    'name': 'SetMaxStealthXP',
    'type': 'void',
    'args': [ 'int' ]
  },
  469: {
    'comment': '469: Increase the blaster deflection rate, i think...\n',
    'name': 'EffectBlasterDeflectionIncrease',
    'type': 'effect',
    'args': [ 'int' ]
  },
  470: {
    'comment': '470:decrease the blaster deflection rate\n',
    'name': 'EffectBlasterDeflectionDecrease',
    'type': 'effect',
    'args': [ 'int' ]
  },
  471: {
    'comment': '471: Make the creature horified. BOO!\n',
    'name': 'EffectHorrified',
    'type': 'effect',
    'args': []
  },
  472: {
    'comment': '472: Create a Spell Level Absorption effect.\n- nMaxSpellLevelAbsorbed: maximum spell level that will be absorbed by the\neffect\n- nTotalSpellLevelsAbsorbed: maximum number of spell levels that will be\nabsorbed by the effect\n- nSpellSchool: SPELL_SCHOOL_*\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if:\nnMaxSpellLevelAbsorbed is not between -1 and 9 inclusive, or nSpellSchool\nis invalid.\n',
    'name': 'EffectSpellLevelAbsorption',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  473: {
    'comment': '473: Create a Dispel Magic Best effect.\n',
    'name': 'EffectDispelMagicBest',
    'type': 'effect',
    'args': [ 'int' ]
  },
  474: {
    'comment': '474:\nReturns the current amount of stealth xp available in the area.\n',
    'name': 'GetCurrentStealthXP',
    'type': 'int',
    'args': []
  },
  475: {
    'comment': '475: Get the number of stacked items that oItem comprises.\n',
    'name': 'GetNumStackedItems',
    'type': 'int',
    'args': [ 'object' ]
  },
  476: {
    'comment': '476: Use this on an NPC to cause all creatures within a 10-metre radius to stop\nwhat they are doing and sets the NPC\'s enemies within this range to be\nneutral towards the NPC. If this command is run on a PC or an object that is\nnot a creature, nothing will happen.\n',
    'name': 'SurrenderToEnemies',
    'type': 'void',
    'args': []
  },
  477: {
    'comment': '477: Create a Miss Chance effect.\n- nPercentage: 1-100 inclusive\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nPercentage < 1 or\nnPercentage > 100.\n',
    'name': 'EffectMissChance',
    'type': 'effect',
    'args': [ 'int' ]
  },
  478: {
    'comment': '478:\nSet the current amount of stealth xp available in the area.\n',
    'name': 'SetCurrentStealthXP',
    'type': 'void',
    'args': [ 'int' ]
  },
  479: {
    'comment': '479: Get the size (CREATURE_SIZE_*) of oCreature.\n',
    'name': 'GetCreatureSize',
    'type': 'int',
    'args': [ 'object' ]
  },
  480: {
    'comment': '480:\nAward the stealth xp to the given oTarget.  This will only work on creatures.\n',
    'name': 'AwardStealthXP',
    'type': 'void',
    'args': [ 'object' ]
  },
  481: {
    'comment': '481:\nReturns whether or not the stealth xp bonus is enabled (ie. whether or not\nAwardStealthXP() will actually award any available stealth xp).\n',
    'name': 'GetStealthXPEnabled',
    'type': 'int',
    'args': []
  },
  482: {
    'comment': '482:\nSets whether or not the stealth xp bonus is enabled (ie. whether or not\nAwardStealthXP() will actually award any available stealth xp).\n',
    'name': 'SetStealthXPEnabled',
    'type': 'void',
    'args': [ 'int' ]
  },
  483: {
    'comment': '483: The action subject will unlock oTarget, which can be a door or a placeable\nobject.\n',
    'name': 'ActionUnlockObject',
    'type': 'void',
    'args': [ 'object' ]
  },
  484: {
    'comment': '484: The action subject will lock oTarget, which can be a door or a placeable\nobject.\n',
    'name': 'ActionLockObject',
    'type': 'void',
    'args': [ 'object' ]
  },
  485: {
    'comment': '485: Create a Modify Attacks effect to add attacks.\n- nAttacks: maximum is 5, even with the effect stacked\n* Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nAttacks > 5.\n',
    'name': 'EffectModifyAttacks',
    'type': 'effect',
    'args': [ 'int' ]
  },
  486: {
    'comment': '486: Get the last trap detected by oTarget.\n* Return value on error: OBJECT_INVALID\n',
    'name': 'GetLastTrapDetected',
    'type': 'object',
    'args': [ 'object' ]
  },
  487: {
    'comment': '487: Create a Damage Shield effect which does (nDamageAmount + nRandomAmount)\ndamage to any melee attacker on a successful attack of damage type nDamageType.\n- nDamageAmount: an integer value\n- nRandomAmount: DAMAGE_BONUS_*\n- nDamageType: DAMAGE_TYPE_*\n',
    'name': 'EffectDamageShield',
    'type': 'effect',
    'args': [ 'int', 'int', 'int' ]
  },
  488: {
    'comment': '488: Get the trap nearest to oTarget.\nNote : \'trap objects\' are actually any trigger, placeable or door that is\ntrapped in oTarget\'s area.\n- oTarget\n- nTrapDetected: if this is TRUE, the trap returned has to have been detected\nby oTarget.\n',
    'name': 'GetNearestTrapToObject',
    'type': 'object',
    'args': [ 'object', 'int' ]
  },
  489: {
    'comment': '489: the will get the last attmpted movment target\n',
    'name': 'GetAttemptedMovementTarget',
    'type': 'object',
    'args': []
  },
  490: {
    'comment': '490: this function returns the bloking creature for the k_def_CBTBlk01 script\n',
    'name': 'GetBlockingCreature',
    'type': 'object',
    'args': [ 'object' ]
  },
  491: {
    'comment': '491: Get oTarget\'s base fortitude saving throw value (this will only work for\ncreatures, doors, and placeables).\n* Returns 0 if oTarget is invalid.\n',
    'name': 'GetFortitudeSavingThrow',
    'type': 'int',
    'args': [ 'object' ]
  },
  492: {
    'comment': '492: Get oTarget\'s base will saving throw value (this will only work for creatures,\ndoors, and placeables).\n* Returns 0 if oTarget is invalid.\n',
    'name': 'GetWillSavingThrow',
    'type': 'int',
    'args': [ 'object' ]
  },
  493: {
    'comment': '493: Get oTarget\'s base reflex saving throw value (this will only work for\ncreatures, doors, and placeables).\n* Returns 0 if oTarget is invalid.\n',
    'name': 'GetReflexSavingThrow',
    'type': 'int',
    'args': [ 'object' ]
  },
  494: {
    'comment': '494: Get oCreature\'s challenge rating.\n* Returns 0.0 if oCreature is invalid.\n',
    'name': 'GetChallengeRating',
    'type': 'float',
    'args': [ 'object' ]
  },
  495: {
    'comment': '495: Returns the found enemy creature on a pathfind.\n',
    'name': 'GetFoundEnemyCreature',
    'type': 'object',
    'args': [ 'object' ]
  },
  496: {
    'comment': '496: Get oCreature\'s movement rate.\n* Returns 0 if oCreature is invalid.\n',
    'name': 'GetMovementRate',
    'type': 'int',
    'args': [ 'object' ]
  },
  497: {
    'comment': '497: GetSubRace of oCreature\nReturns SUBRACE_*\n',
    'name': 'GetSubRace',
    'type': 'int',
    'args': [ 'object' ]
  },
  498: {
    'comment': '498:\nReturns the amount the stealth xp bonus gets decreased each time the player is detected.\n',
    'name': 'GetStealthXPDecrement',
    'type': 'int',
    'args': []
  },
  499: {
    'comment': '499:\nSets the amount the stealth xp bonus gets decreased each time the player is detected.\n',
    'name': 'SetStealthXPDecrement',
    'type': 'void',
    'args': [ 'int' ]
  },
  500: {
    'comment': '500:\n',
    'name': 'DuplicateHeadAppearance',
    'type': 'void',
    'args': [ 'object', 'object' ]
  },
  501: {
    'comment': '501: The action subject will fake casting a spell at oTarget; the conjure and cast\nanimations and visuals will occur, nothing else.\n- nSpell\n- oTarget\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*\n',
    'name': 'ActionCastFakeSpellAtObject',
    'type': 'void',
    'args': [ 'int', 'object', 'int' ]
  },
  502: {
    'comment': '502: The action subject will fake casting a spell at lLocation; the conjure and\ncast animations and visuals will occur, nothing else.\n- nSpell\n- lTarget\n- nProjectilePathType: PROJECTILE_PATH_TYPE_*\n',
    'name': 'ActionCastFakeSpellAtLocation',
    'type': 'void',
    'args': [ 'int', 'location', 'int' ]
  },
  503: {
    'comment': '503: CutsceneAttack\nThis function allows the designer to specify exactly what\'s going to happen in a combat round\nThere are no guarentees made that the animation specified here will be correct - only that it will be played,\nso it is up to the designer to ensure that they have selected the right animation\nIt relies upon constants specified above for the attack result\n',
    'name': 'CutsceneAttack',
    'type': 'void',
    'args': [ 'object', 'int', 'int', 'int' ]
  },
  504: {
    'comment': '504: Set the camera mode for oPlayer.\n- oPlayer\n- nCameraMode: CAMERA_MODE_*\n* If oPlayer is not player-controlled or nCameraMode is invalid, nothing\nhappens.\n',
    'name': 'SetCameraMode',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  505: {
    'comment': '505: SetLockOrientationInDialog\nAllows the locking and unlocking of orientation changes for an object in dialog\n- oObject - Object\n- nValue - TRUE or FALSE\n',
    'name': 'SetLockOrientationInDialog',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  506: {
    'comment': '506: SetLockHeadFollowInDialog\nAllows the locking and undlocking of head following for an object in dialog\n- oObject - Object\n- nValue - TRUE or FALSE\n',
    'name': 'SetLockHeadFollowInDialog',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  507: {
    'comment': '507: CutsceneMoveToPoint\nUsed by the cutscene system to allow designers to script combat\n',
    'name': 'CutsceneMove',
    'type': 'void',
    'args': [ 'object', 'vector', 'int' ]
  },
  508: {
    'comment': '508: EnableVideoEffect\nEnables the video frame buffer effect specified by nEffectType, which is\nan index into VideoEffects.2da. This video effect will apply indefinitely,\nand so it should *always* be cleared by a call to DisableVideoEffect().\n',
    'name': 'EnableVideoEffect',
    'type': 'void',
    'args': [ 'int' ]
  },
  509: {
    'comment': '509: Shut down the currently loaded module and start a new one (moving all\ncurrently-connected players to the starting point.\n',
    'name': 'StartNewModule',
    'type': 'void',
    'args': [ 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string' ]
  },
  510: {
    'comment': '510: DisableVideoEffect\nDisables any video frame buffer effect that may be running. See\nEnableVideoEffect() to see how to use them.\n',
    'name': 'DisableVideoEffect',
    'type': 'void',
    'args': []
  },
  511: {
    'comment': '511: * Returns TRUE if oItem is a ranged weapon.\n',
    'name': 'GetWeaponRanged',
    'type': 'int',
    'args': [ 'object' ]
  },
  512: {
    'comment': '512: Only if we are in a single player game, AutoSave the game.\n',
    'name': 'DoSinglePlayerAutoSave',
    'type': 'void',
    'args': []
  },
  513: {
    'comment': '513: Get the game difficulty (GAME_DIFFICULTY_*).\n',
    'name': 'GetGameDifficulty',
    'type': 'int',
    'args': []
  },
  514: {
    'comment': '514:\nThis will test the combat action queu to see if the user has placed any actions on the queue.\nwill only work during combat.\n',
    'name': 'GetUserActionsPending',
    'type': 'int',
    'args': []
  },
  515: {
    'comment': '515: RevealMap\nReveals the map at the given WORLD point \'vPoint\' with a MAP Grid Radius \'nRadius\'\nIf this function is called with no parameters it will reveal the entire map.\n(NOTE: if this function is called with a valid point but a default radius, ie. \'nRadius\' of -1\nthen the entire map will be revealed)\n',
    'name': 'RevealMap',
    'type': 'void',
    'args': [ 'vector', 'int' ]
  },
  516: {
    'comment': '516: SetTutorialWindowsEnabled\nSets whether or not the tutorial windows are enabled (ie. whether or not they will\nappear when certain things happen for the first time).\n',
    'name': 'SetTutorialWindowsEnabled',
    'type': 'void',
    'args': [ 'int' ]
  },
  517: {
    'comment': '517: ShowTutorialWindow\nPops up the specified tutorial window.  If the tutorial window has already popped\nup once before, this will do nothing.\n',
    'name': 'ShowTutorialWindow',
    'type': 'void',
    'args': [ 'int' ]
  },
  518: {
    'comment': '518: StartCreditSequence\nStarts the credits sequence.  If bTransparentBackground is TRUE, the credits will be displayed\nwith a transparent background, allowing whatever is currently onscreen to show through.  If it\nis set to FALSE, the credits will be displayed on a black background.\n',
    'name': 'StartCreditSequence',
    'type': 'void',
    'args': [ 'int' ]
  },
  519: {
    'comment': '519: IsCreditSequenceInProgress\nReturns TRUE if the credits sequence is currently in progress, FALSE otherwise.\n',
    'name': 'IsCreditSequenceInProgress',
    'type': 'int',
    'args': []
  },
  520: {
    'comment': '520: Sets the minigame lateral acceleration/sec value\n',
    'name': 'SWMG_SetLateralAccelerationPerSecond',
    'type': 'void',
    'args': [ 'float' ]
  },
  521: {
    'comment': '521: Returns the minigame lateral acceleration/sec value\n',
    'name': 'SWMG_GetLateralAccelerationPerSecond',
    'type': 'float',
    'args': []
  },
  522: {
    'comment': '522: Get the current action (ACTION_*) that oObject is executing.\n',
    'name': 'GetCurrentAction',
    'type': 'int',
    'args': [ 'object' ]
  },
  523: {
    'comment': '523:\n',
    'name': 'GetDifficultyModifier',
    'type': 'float',
    'args': []
  },
  524: {
    'comment': '524: Returns the appearance type of oCreature (0 if creature doesn\'t exist)\n- oCreature\n',
    'name': 'GetAppearanceType',
    'type': 'int',
    'args': [ 'object' ]
  },
  525: {
    'comment': '525: Display floaty text above the specified creature.\nThe text will also appear in the chat buffer of each player that receives the\nfloaty text.\n- nStrRefToDisplay: String ref (therefore text is translated)\n- oCreatureToFloatAbove\n- bBroadcastToFaction: If this is TRUE then only creatures in the same faction\nas oCreatureToFloatAbove\nwill see the floaty text, and only if they are within range (30 metres).\n',
    'name': 'FloatingTextStrRefOnCreature',
    'type': 'void',
    'args': [ 'int', 'object', 'int' ]
  },
  526: {
    'comment': '526: Display floaty text above the specified creature.\nThe text will also appear in the chat buffer of each player that receives the\nfloaty text.\n- sStringToDisplay: String\n- oCreatureToFloatAbove\n- bBroadcastToFaction: If this is TRUE then only creatures in the same faction\nas oCreatureToFloatAbove\nwill see the floaty text, and only if they are within range (30 metres).\n',
    'name': 'FloatingTextStringOnCreature',
    'type': 'void',
    'args': [ 'string', 'object', 'int' ]
  },
  527: {
    'comment': '527: - oTrapObject: a placeable, door or trigger\n* Returns TRUE if oTrapObject is disarmable.\n',
    'name': 'GetTrapDisarmable',
    'type': 'int',
    'args': [ 'object' ]
  },
  528: {
    'comment': '528: - oTrapObject: a placeable, door or trigger\n* Returns TRUE if oTrapObject is detectable.\n',
    'name': 'GetTrapDetectable',
    'type': 'int',
    'args': [ 'object' ]
  },
  529: {
    'comment': '529: - oTrapObject: a placeable, door or trigger\n- oCreature\n* Returns TRUE if oCreature has detected oTrapObject\n',
    'name': 'GetTrapDetectedBy',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  530: {
    'comment': '530: - oTrapObject: a placeable, door or trigger\n* Returns TRUE if oTrapObject has been flagged as visible to all creatures.\n',
    'name': 'GetTrapFlagged',
    'type': 'int',
    'args': [ 'object' ]
  },
  531: {
    'comment': '531: Get the trap base type (TRAP_BASE_TYPE_*) of oTrapObject.\n- oTrapObject: a placeable, door or trigger\n',
    'name': 'GetTrapBaseType',
    'type': 'int',
    'args': [ 'object' ]
  },
  532: {
    'comment': '532: - oTrapObject: a placeable, door or trigger\n* Returns TRUE if oTrapObject is one-shot (i.e. it does not reset itself\nafter firing.\n',
    'name': 'GetTrapOneShot',
    'type': 'int',
    'args': [ 'object' ]
  },
  533: {
    'comment': '533: Get the creator of oTrapObject, the creature that set the trap.\n- oTrapObject: a placeable, door or trigger\n* Returns OBJECT_INVALID if oTrapObject was created in the toolset.\n',
    'name': 'GetTrapCreator',
    'type': 'object',
    'args': [ 'object' ]
  },
  534: {
    'comment': '534: Get the tag of the key that will disarm oTrapObject.\n- oTrapObject: a placeable, door or trigger\n',
    'name': 'GetTrapKeyTag',
    'type': 'string',
    'args': [ 'object' ]
  },
  535: {
    'comment': '535: Get the DC for disarming oTrapObject.\n- oTrapObject: a placeable, door or trigger\n',
    'name': 'GetTrapDisarmDC',
    'type': 'int',
    'args': [ 'object' ]
  },
  536: {
    'comment': '536: Get the DC for detecting oTrapObject.\n- oTrapObject: a placeable, door or trigger\n',
    'name': 'GetTrapDetectDC',
    'type': 'int',
    'args': [ 'object' ]
  },
  537: {
    'comment': '537: * Returns TRUE if a specific key is required to open the lock on oObject.\n',
    'name': 'GetLockKeyRequired',
    'type': 'int',
    'args': [ 'object' ]
  },
  538: {
    'comment': '538: Get the tag of the key that will open the lock on oObject.\n',
    'name': 'GetLockKeyTag',
    'type': 'int',
    'args': [ 'object' ]
  },
  539: {
    'comment': '539: * Returns TRUE if the lock on oObject is lockable.\n',
    'name': 'GetLockLockable',
    'type': 'int',
    'args': [ 'object' ]
  },
  540: {
    'comment': '540: Get the DC for unlocking oObject.\n',
    'name': 'GetLockUnlockDC',
    'type': 'int',
    'args': [ 'object' ]
  },
  541: {
    'comment': '541: Get the DC for locking oObject.\n',
    'name': 'GetLockLockDC',
    'type': 'int',
    'args': [ 'object' ]
  },
  542: {
    'comment': '542: Get the last PC that levelled up.\n',
    'name': 'GetPCLevellingUp',
    'type': 'object',
    'args': []
  },
  543: {
    'comment': '543: - nFeat: FEAT_*\n- oObject\n* Returns TRUE if oObject has effects on it originating from nFeat.\n',
    'name': 'GetHasFeatEffect',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  544: {
    'comment': '544: Set the status of the illumination for oPlaceable.\n- oPlaceable\n- bIlluminate: if this is TRUE, oPlaceable\'s illumination will be turned on.\nIf this is FALSE, oPlaceable\'s illumination will be turned off.\nNote: You must call RecomputeStaticLighting() after calling this function in\norder for the changes to occur visually for the players.\nSetPlaceableIllumination() buffers the illumination changes, which are then\nsent out to the players once RecomputeStaticLighting() is called.  As such,\nit is best to call SetPlaceableIllumination() for all the placeables you wish\nto set the illumination on, and then call RecomputeStaticLighting() once after\nall the placeable illumination has been set.\n* If oPlaceable is not a placeable object, or oPlaceable is a placeable that\ndoesn\'t have a light, nothing will happen.\n',
    'name': 'SetPlaceableIllumination',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  545: {
    'comment': '545: * Returns TRUE if the illumination for oPlaceable is on\n',
    'name': 'GetPlaceableIllumination',
    'type': 'int',
    'args': [ 'object' ]
  },
  546: {
    'comment': '546: - oPlaceable\n- nPlaceableAction: PLACEABLE_ACTION_*\n* Returns TRUE if nPlacebleAction is valid for oPlaceable.\n',
    'name': 'GetIsPlaceableObjectActionPossible',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  547: {
    'comment': '547: The caller performs nPlaceableAction on oPlaceable.\n- oPlaceable\n- nPlaceableAction: PLACEABLE_ACTION_*\n',
    'name': 'DoPlaceableObjectAction',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  548: {
    'comment': '548: Get the first PC in the player list.\nThis resets the position in the player list for GetNextPC().\n',
    'name': 'GetFirstPC',
    'type': 'object',
    'args': []
  },
  549: {
    'comment': '549: Get the next PC in the player list.\nThis picks up where the last GetFirstPC() or GetNextPC() left off.\n',
    'name': 'GetNextPC',
    'type': 'object',
    'args': []
  },
  550: {
    'comment': '550: Set oDetector to have detected oTrap.\n',
    'name': 'SetTrapDetectedBy',
    'type': 'int',
    'args': [ 'object', 'object' ]
  },
  551: {
    'comment': '551: Note: Only placeables, doors and triggers can be trapped.\n* Returns TRUE if oObject is trapped.\n',
    'name': 'GetIsTrapped',
    'type': 'int',
    'args': [ 'object' ]
  },
  552: {
    'comment': '552: SetEffectIcon\nThis will link the specified effect icon to the specified effect.  The\neffect returned will contain the link to the effect icon and applying this\neffect will cause an effect icon to appear on the portrait/charsheet gui.\neEffect: The effect which should cause the effect icon to appear.\nnIcon: Index into effecticon.2da of the effect icon to use.\n',
    'name': 'SetEffectIcon',
    'type': 'effect',
    'args': [ 'effect', 'int' ]
  },
  553: {
    'comment': '553: FaceObjectAwayFromObject\nThis will cause the object oFacer to face away from oObjectToFaceAwayFrom.\nThe objects must be in the same area for this to work.\n',
    'name': 'FaceObjectAwayFromObject',
    'type': 'void',
    'args': [ 'object', 'object' ]
  },
  554: {
    'comment': '554: Spawn in the Death GUI.\nThe default (as defined by BioWare) can be spawned in by PopUpGUIPanel, but\nif you want to turn off the \'Respawn\' or \'Wait for Help\' buttons, this is the\nfunction to use.\n- oPC\n- bRespawnButtonEnabled: if this is TRUE, the \'Respawn\' button will be enabled\non the Death GUI.\n- bWaitForHelpButtonEnabled: if this is TRUE, the \'Wait For Help\' button will\nbe enabled on the Death GUI.\n- nHelpStringReference\n- sHelpString\n',
    'name': 'PopUpDeathGUIPanel',
    'type': 'void',
    'args': [ 'object', 'int', 'int', 'int', 'string' ]
  },
  555: {
    'comment': '555: Disable oTrap.\n- oTrap: a placeable, door or trigger.\n',
    'name': 'SetTrapDisabled',
    'type': 'void',
    'args': [ 'object' ]
  },
  556: {
    'comment': '556: Get the last object that was sent as a GetLastAttacker(), GetLastDamager(),\nGetLastSpellCaster() (for a hostile spell), or GetLastDisturbed() (when a\ncreature is pickpocketed).\nNote: Return values may only ever be:\n1) A Creature\n2) Plot Characters will never have this value set\n3) Area of Effect Objects will return the AOE creator if they are registered\nas this value, otherwise they will return INVALID_OBJECT_ID\n4) Traps will not return the creature that set the trap.\n5) This value will never be overwritten by another non-creature object.\n6) This value will never be a dead/destroyed creature\n',
    'name': 'GetLastHostileActor',
    'type': 'object',
    'args': [ 'object' ]
  },
  557: {
    'comment': '557: Force all the characters of the players who are currently in the game to\nbe exported to their respective directories i.e. LocalVault/ServerVault/ etc.\n',
    'name': 'ExportAllCharacters',
    'type': 'void',
    'args': []
  },
  558: {
    'comment': '558: Get the Day Track for oArea.\n',
    'name': 'MusicBackgroundGetDayTrack',
    'type': 'int',
    'args': [ 'object' ]
  },
  559: {
    'comment': '559: Get the Night Track for oArea.\n',
    'name': 'MusicBackgroundGetNightTrack',
    'type': 'int',
    'args': [ 'object' ]
  },
  560: {
    'comment': '560: Write sLogEntry as a timestamped entry into the log file\n',
    'name': 'WriteTimestampedLogEntry',
    'type': 'void',
    'args': [ 'string' ]
  },
  561: {
    'comment': '561: Get the module\'s name in the language of the server that\'s running it.\n* If there is no entry for the language of the server, it will return an\nempty string\n',
    'name': 'GetModuleName',
    'type': 'string',
    'args': []
  },
  562: {
    'comment': '562: Get the leader of the faction of which oMemberOfFaction is a member.\n* Returns OBJECT_INVALID if oMemberOfFaction is not a valid creature.\n',
    'name': 'GetFactionLeader',
    'type': 'object',
    'args': [ 'object' ]
  },
  563: {
    'comment': '563: Turns on or off the speed blur effect in rendered scenes.\nbEnabled: Set TRUE to turn it on, FALSE to turn it off.\nfRatio: Sets the frame accumulation ratio.\n',
    'name': 'SWMG_SetSpeedBlurEffect',
    'type': 'void',
    'args': [ 'int', 'float' ]
  },
  564: {
    'comment': '564: Immediately ends the currently running game and returns to the start screen.\nnShowEndGameGui: Set TRUE to display the death gui.\n',
    'name': 'EndGame',
    'type': 'void',
    'args': [ 'int' ]
  },
  565: {
    'comment': '565: Get a variable passed when calling console debug runscript\n',
    'name': 'GetRunScriptVar',
    'type': 'int',
    'args': []
  },
  566: {
    'comment': '566: This function returns a value that matches one of the MOVEMENT_SPEED_... constants\nif the OID passed in is not found or not a creature then it will return\nMOVEMENT_SPEED_IMMOBILE.\n',
    'name': 'GetCreatureMovmentType',
    'type': 'int',
    'args': [ 'object' ]
  },
  567: {
    'comment': '567: Set the ambient day volume for oArea to nVolume.\n- oArea\n- nVolume: 0 - 100\n',
    'name': 'AmbientSoundSetDayVolume',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  568: {
    'comment': '568: Set the ambient night volume for oArea to nVolume.\n- oArea\n- nVolume: 0 - 100\n',
    'name': 'AmbientSoundSetNightVolume',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  569: {
    'comment': '569: Get the Battle Track for oArea.\n',
    'name': 'MusicBackgroundGetBattleTrack',
    'type': 'int',
    'args': [ 'object' ]
  },
  570: {
    'comment': '570: Determine whether oObject has an inventory.\n* Returns TRUE for creatures and stores, and checks to see if an item or placeable object is a container.\n* Returns FALSE for all other object types.\n',
    'name': 'GetHasInventory',
    'type': 'int',
    'args': [ 'object' ]
  },
  571: {
    'comment': '571: Get the duration (in seconds) of the sound attached to nStrRef\n* Returns 0.0f if no duration is stored or if no sound is attached\n',
    'name': 'GetStrRefSoundDuration',
    'type': 'float',
    'args': [ 'int' ]
  },
  572: {
    'comment': '572: Add oPC to oPartyLeader\'s party.  This will only work on two PCs.\n- oPC: player to add to a party\n- oPartyLeader: player already in the party\n',
    'name': 'AddToParty',
    'type': 'void',
    'args': [ 'object', 'object' ]
  },
  573: {
    'comment': '573: Remove oPC from their current party. This will only work on a PC.\n- oPC: removes this player from whatever party they\'re currently in.\n',
    'name': 'RemoveFromParty',
    'type': 'void',
    'args': [ 'object' ]
  },
  574: {
    'comment': '574: Adds a creature to the party\nReturns whether the addition was successful\nAddPartyMember\n',
    'name': 'AddPartyMember',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  575: {
    'comment': '575: Removes a creature from the party\nReturns whether the removal was syccessful\nRemovePartyMember\n',
    'name': 'RemovePartyMember',
    'type': 'int',
    'args': [ 'int' ]
  },
  576: {
    'comment': '576: Returns whether a specified creature is a party member\nIsObjectPartyMember\n',
    'name': 'IsObjectPartyMember',
    'type': 'int',
    'args': [ 'object' ]
  },
  577: {
    'comment': '577: Returns the party member at a given index in the party.\nThe order of members in the party can vary based on\nwho the current leader is (member 0 is always the current\nparty leader).\nGetPartyMemberByIndex\n',
    'name': 'GetPartyMemberByIndex',
    'type': 'object',
    'args': [ 'int' ]
  },
  578: {
    'comment': '578: GetGlobalBoolean\nThis function returns the value of a global boolean (TRUE or FALSE) scripting variable.\n',
    'name': 'GetGlobalBoolean',
    'type': 'int',
    'args': [ 'string' ]
  },
  579: {
    'comment': '579: SetGlobalBoolean\nThis function sets the value of a global boolean (TRUE or FALSE) scripting variable.\n',
    'name': 'SetGlobalBoolean',
    'type': 'void',
    'args': [ 'string', 'int' ]
  },
  580: {
    'comment': '580: GetGlobalNumber\nThis function returns the value of a global number (-128 to +127) scripting variable.\n',
    'name': 'GetGlobalNumber',
    'type': 'int',
    'args': [ 'string' ]
  },
  581: {
    'comment': '581: SetGlobalNumber\nThis function sets the value of a global number (-128 to +127) scripting variable.\n',
    'name': 'SetGlobalNumber',
    'type': 'void',
    'args': [ 'string', 'int' ]
  },
  582: {
    'comment': 'post a string to the screen at column nX and row nY for fLife seconds\n582. AurPostString\n',
    'name': 'AurPostString',
    'type': 'void',
    'args': [ 'string', 'int', 'int', 'float' ]
  },
  583: {
    'comment': '583: OnAnimKey\nget the event and the name of the model on which the event happened\nSWMG_GetLastEvent\n',
    'name': 'SWMG_GetLastEvent',
    'type': 'string',
    'args': []
  },
  584: {
    'comment': '584: SWMG_GetLastEventModelName\n',
    'name': 'SWMG_GetLastEventModelName',
    'type': 'string',
    'args': []
  },
  585: {
    'comment': '585: gets an object by its name (duh!)\nSWMG_GetObjectByName\n',
    'name': 'SWMG_GetObjectByName',
    'type': 'object',
    'args': [ 'string' ]
  },
  586: {
    'comment': '586: plays an animation on an object\nSWMG_PlayAnimation\n',
    'name': 'SWMG_PlayAnimation',
    'type': 'void',
    'args': [ 'object', 'string', 'int', 'int', 'int' ]
  },
  587: {
    'comment': '587: OnHitBullet\nget the damage, the target type (see TARGETflags), and the shooter\nSWMG_GetLastBulletHitDamage\n',
    'name': 'SWMG_GetLastBulletHitDamage',
    'type': 'int',
    'args': []
  },
  588: {
    'comment': '588: SWMG_GetLastBulletHitTarget\n',
    'name': 'SWMG_GetLastBulletHitTarget',
    'type': 'int',
    'args': []
  },
  589: {
    'comment': '589: SWMG_GetLastBulletHitShooter\n',
    'name': 'SWMG_GetLastBulletHitShooter',
    'type': 'object',
    'args': []
  },
  590: {
    'comment': '590: adjusts a followers hit points, can specify the absolute value to set to\nSWMG_AdjustFollowerHitPoints\n',
    'name': 'SWMG_AdjustFollowerHitPoints',
    'type': 'int',
    'args': [ 'object', 'int', 'int' ]
  },
  591: {
    'comment': '591: the default implementation of OnBulletHit\nSWMG_OnBulletHit\n',
    'name': 'SWMG_OnBulletHit',
    'type': 'void',
    'args': []
  },
  592: {
    'comment': '592: the default implementation of OnObstacleHit\nSWMG_OnObstacleHit\n',
    'name': 'SWMG_OnObstacleHit',
    'type': 'void',
    'args': []
  },
  593: {
    'comment': '593: returns the last follower and obstacle hit\nSWMG_GetLastFollowerHit\n',
    'name': 'SWMG_GetLastFollowerHit',
    'type': 'object',
    'args': []
  },
  594: {
    'comment': '594: SWMG_GetLastObstacleHit\n',
    'name': 'SWMG_GetLastObstacleHit',
    'type': 'object',
    'args': []
  },
  595: {
    'comment': '595: gets information about the last bullet fired\nSWMG_GetLastBulletFiredDamage\n',
    'name': 'SWMG_GetLastBulletFiredDamage',
    'type': 'int',
    'args': []
  },
  596: {
    'comment': '596: SWMG_GetLastBulletFiredTarget\n',
    'name': 'SWMG_GetLastBulletFiredTarget',
    'type': 'int',
    'args': []
  },
  597: {
    'comment': '597: gets an objects name\nSWMG_GetObjectName\n',
    'name': 'SWMG_GetObjectName',
    'type': 'string',
    'args': [ 'object' ]
  },
  598: {
    'comment': '598: the default implementation of OnDeath\nSWMG_OnDeath\n',
    'name': 'SWMG_OnDeath',
    'type': 'void',
    'args': []
  },
  599: {
    'comment': '599: a bunch of Is functions for your pleasure\nSWMG_IsFollower\n',
    'name': 'SWMG_IsFollower',
    'type': 'int',
    'args': [ 'object' ]
  },
  600: {
    'comment': '600: SWMG_IsPlayer\n',
    'name': 'SWMG_IsPlayer',
    'type': 'int',
    'args': [ 'object' ]
  },
  601: {
    'comment': '601: SWMG_IsEnemy\n',
    'name': 'SWMG_IsEnemy',
    'type': 'int',
    'args': [ 'object' ]
  },
  602: {
    'comment': '602: SWMG_IsTrigger\n',
    'name': 'SWMG_IsTrigger',
    'type': 'int',
    'args': [ 'object' ]
  },
  603: {
    'comment': '603: SWMG_IsObstacle\n',
    'name': 'SWMG_IsObstacle',
    'type': 'int',
    'args': [ 'object' ]
  },
  604: {
    'comment': '604: SWMG_SetFollowerHitPoints\n',
    'name': 'SWMG_SetFollowerHitPoints',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  605: {
    'comment': '605: SWMG_OnDamage\n',
    'name': 'SWMG_OnDamage',
    'type': 'void',
    'args': []
  },
  606: {
    'comment': '606: SWMG_GetLastHPChange\n',
    'name': 'SWMG_GetLastHPChange',
    'type': 'int',
    'args': []
  },
  607: {
    'comment': '607: SWMG_RemoveAnimation\n',
    'name': 'SWMG_RemoveAnimation',
    'type': 'void',
    'args': [ 'object', 'string' ]
  },
  608: {
    'comment': '608: SWMG_GetCameraNearClip\n',
    'name': 'SWMG_GetCameraNearClip',
    'type': 'float',
    'args': []
  },
  609: {
    'comment': '609: SWMG_GetCameraFarClip\n',
    'name': 'SWMG_GetCameraFarClip',
    'type': 'float',
    'args': []
  },
  610: {
    'comment': '610: SWMG_SetCameraClip\n',
    'name': 'SWMG_SetCameraClip',
    'type': 'void',
    'args': [ 'float', 'float' ]
  },
  611: {
    'comment': '611: SWMG_GetPlayer\n',
    'name': 'SWMG_GetPlayer',
    'type': 'object',
    'args': []
  },
  612: {
    'comment': '612: SWMG_GetEnemyCount\n',
    'name': 'SWMG_GetEnemyCount',
    'type': 'int',
    'args': []
  },
  613: {
    'comment': '613: SWMG_GetEnemy\n',
    'name': 'SWMG_GetEnemy',
    'type': 'object',
    'args': [ 'int' ]
  },
  614: {
    'comment': '614: SWMG_GetObstacleCount\n',
    'name': 'SWMG_GetObstacleCount',
    'type': 'int',
    'args': []
  },
  615: {
    'comment': '615: SWMG_GetObstacle\n',
    'name': 'SWMG_GetObstacle',
    'type': 'object',
    'args': [ 'int' ]
  },
  616: {
    'comment': '616: SWMG_GetHitPoints\n',
    'name': 'SWMG_GetHitPoints',
    'type': 'int',
    'args': [ 'object' ]
  },
  617: {
    'comment': '617: SWMG_GetMaxHitPoints\n',
    'name': 'SWMG_GetMaxHitPoints',
    'type': 'int',
    'args': [ 'object' ]
  },
  618: {
    'comment': '618: SWMG_SetMaxHitPoints\n',
    'name': 'SWMG_SetMaxHitPoints',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  619: {
    'comment': '619: SWMG_GetSphereRadius\n',
    'name': 'SWMG_GetSphereRadius',
    'type': 'float',
    'args': [ 'object' ]
  },
  620: {
    'comment': '620: SWMG_SetSphereRadius\n',
    'name': 'SWMG_SetSphereRadius',
    'type': 'void',
    'args': [ 'object', 'float' ]
  },
  621: {
    'comment': '621: SWMG_GetNumLoops\n',
    'name': 'SWMG_GetNumLoops',
    'type': 'int',
    'args': [ 'object' ]
  },
  622: {
    'comment': '622: SWMG_SetNumLoops\n',
    'name': 'SWMG_SetNumLoops',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  623: {
    'comment': '623: SWMG_GetPosition\n',
    'name': 'SWMG_GetPosition',
    'type': 'vector',
    'args': [ 'object' ]
  },
  624: {
    'comment': '624: SWMG_GetGunBankCount\n',
    'name': 'SWMG_GetGunBankCount',
    'type': 'int',
    'args': [ 'object' ]
  },
  625: {
    'comment': '625: SWMG_GetGunBankBulletModel\n',
    'name': 'SWMG_GetGunBankBulletModel',
    'type': 'string',
    'args': [ 'object', 'int' ]
  },
  626: {
    'comment': '626: SWMG_GetGunBankGunModel\n',
    'name': 'SWMG_GetGunBankGunModel',
    'type': 'string',
    'args': [ 'object', 'int' ]
  },
  627: {
    'comment': '627: SWMG_GetGunBankDamage\n',
    'name': 'SWMG_GetGunBankDamage',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  628: {
    'comment': '628: SWMG_GetGunBankTimeBetweenShots\n',
    'name': 'SWMG_GetGunBankTimeBetweenShots',
    'type': 'float',
    'args': [ 'object', 'int' ]
  },
  629: {
    'comment': '629: SWMG_GetGunBankLifespan\n',
    'name': 'SWMG_GetGunBankLifespan',
    'type': 'float',
    'args': [ 'object', 'int' ]
  },
  630: {
    'comment': '630: SWMG_GetGunBankSpeed\n',
    'name': 'SWMG_GetGunBankSpeed',
    'type': 'float',
    'args': [ 'object', 'int' ]
  },
  631: {
    'comment': '631: SWMG_GetGunBankTarget\n',
    'name': 'SWMG_GetGunBankTarget',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  632: {
    'comment': '632: SWMG_SetGunBankBulletModel\n',
    'name': 'SWMG_SetGunBankBulletModel',
    'type': 'void',
    'args': [ 'object', 'int', 'string' ]
  },
  633: {
    'comment': '633: SWMG_SetGunBankGunModel\n',
    'name': 'SWMG_SetGunBankGunModel',
    'type': 'void',
    'args': [ 'object', 'int', 'string' ]
  },
  634: {
    'comment': '634: SWMG_SetGunBankDamage\n',
    'name': 'SWMG_SetGunBankDamage',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  635: {
    'comment': '635: SWMG_SetGunBankTimeBetweenShots\n',
    'name': 'SWMG_SetGunBankTimeBetweenShots',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  636: {
    'comment': '636: SWMG_SetGunBankLifespan\n',
    'name': 'SWMG_SetGunBankLifespan',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  637: {
    'comment': '637: SWMG_SetGunBankSpeed\n',
    'name': 'SWMG_SetGunBankSpeed',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  638: {
    'comment': '638: SWMG_SetGunBankTarget\n',
    'name': 'SWMG_SetGunBankTarget',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  639: {
    'comment': '639: SWMG_GetLastBulletHitPart\n',
    'name': 'SWMG_GetLastBulletHitPart',
    'type': 'string',
    'args': []
  },
  640: {
    'comment': '640: SWMG_IsGunBankTargetting\n',
    'name': 'SWMG_IsGunBankTargetting',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  641: {
    'comment': '641: SWMG_GetPlayerOffset\nreturns a vector with the player rotation for rotation minigames\nreturns a vector with the player translation for translation minigames\n',
    'name': 'SWMG_GetPlayerOffset',
    'type': 'vector',
    'args': []
  },
  642: {
    'comment': '642: SWMG_GetPlayerInvincibility\n',
    'name': 'SWMG_GetPlayerInvincibility',
    'type': 'float',
    'args': []
  },
  643: {
    'comment': '643: SWMG_GetPlayerSpeed\n',
    'name': 'SWMG_GetPlayerSpeed',
    'type': 'float',
    'args': []
  },
  644: {
    'comment': '644: SWMG_GetPlayerMinSpeed\n',
    'name': 'SWMG_GetPlayerMinSpeed',
    'type': 'float',
    'args': []
  },
  645: {
    'comment': '645: SWMG_GetPlayerAccelerationPerSecond\n',
    'name': 'SWMG_GetPlayerAccelerationPerSecond',
    'type': 'float',
    'args': []
  },
  646: {
    'comment': '646: SWMG_GetPlayerTunnelPos\n',
    'name': 'SWMG_GetPlayerTunnelPos',
    'type': 'vector',
    'args': []
  },
  647: {
    'comment': '647: SWMG_SetPlayerOffset\n',
    'name': 'SWMG_SetPlayerOffset',
    'type': 'void',
    'args': [ 'vector' ]
  },
  648: {
    'comment': '648: SWMG_SetPlayerInvincibility\n',
    'name': 'SWMG_SetPlayerInvincibility',
    'type': 'void',
    'args': [ 'float' ]
  },
  649: {
    'comment': '649: SWMG_SetPlayerSpeed\n',
    'name': 'SWMG_SetPlayerSpeed',
    'type': 'void',
    'args': [ 'float' ]
  },
  650: {
    'comment': '650: SWMG_SetPlayerMinSpeed\n',
    'name': 'SWMG_SetPlayerMinSpeed',
    'type': 'void',
    'args': [ 'float' ]
  },
  651: {
    'comment': '651: SWMG_SetPlayerAccelerationPerSecond\n',
    'name': 'SWMG_SetPlayerAccelerationPerSecond',
    'type': 'void',
    'args': [ 'float' ]
  },
  652: {
    'comment': '652: SWMG_SetPlayerTunnelPos\n',
    'name': 'SWMG_SetPlayerTunnelPos',
    'type': 'void',
    'args': [ 'vector' ]
  },
  653: {
    'comment': '653: SWMG_GetPlayerTunnelNeg\n',
    'name': 'SWMG_GetPlayerTunnelNeg',
    'type': 'vector',
    'args': []
  },
  654: {
    'comment': '654: SWMG_SetPlayerTunnelNeg\n',
    'name': 'SWMG_SetPlayerTunnelNeg',
    'type': 'void',
    'args': [ 'vector' ]
  },
  655: {
    'comment': '655: SWMG_GetPlayerOrigin\n',
    'name': 'SWMG_GetPlayerOrigin',
    'type': 'vector',
    'args': []
  },
  656: {
    'comment': '656: SWMG_SetPlayerOrigin\n',
    'name': 'SWMG_SetPlayerOrigin',
    'type': 'void',
    'args': [ 'vector' ]
  },
  657: {
    'comment': '657: SWMG_GetGunBankHorizontalSpread\n',
    'name': 'SWMG_GetGunBankHorizontalSpread',
    'type': 'float',
    'args': [ 'object', 'int' ]
  },
  658: {
    'comment': '658: SWMG_GetGunBankVerticalSpread\n',
    'name': 'SWMG_GetGunBankVerticalSpread',
    'type': 'float',
    'args': [ 'object', 'int' ]
  },
  659: {
    'comment': '659: SWMG_GetGunBankSensingRadius\n',
    'name': 'SWMG_GetGunBankSensingRadius',
    'type': 'float',
    'args': [ 'object', 'int' ]
  },
  660: {
    'comment': '660: SWMG_GetGunBankInaccuracy\n',
    'name': 'SWMG_GetGunBankInaccuracy',
    'type': 'float',
    'args': [ 'object', 'int' ]
  },
  661: {
    'comment': '661: SWMG_SetGunBankHorizontalSpread\n',
    'name': 'SWMG_SetGunBankHorizontalSpread',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  662: {
    'comment': '662: SWMG_SetGunBankVerticalSpread\n',
    'name': 'SWMG_SetGunBankVerticalSpread',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  663: {
    'comment': '663: SWMG_SetGunBankSensingRadius\n',
    'name': 'SWMG_SetGunBankSensingRadius',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  664: {
    'comment': '664: SWMG_SetGunBankInaccuracy\n',
    'name': 'SWMG_SetGunBankInaccuracy',
    'type': 'void',
    'args': [ 'object', 'int', 'float' ]
  },
  665: {
    'comment': '665: GetIsInvulnerable\nThis returns whether the follower object is currently invulnerable to damage\n',
    'name': 'SWMG_GetIsInvulnerable',
    'type': 'int',
    'args': [ 'object' ]
  },
  666: {
    'comment': '666: StartInvulnerability\nThis will begin a period of invulnerability (as defined by Invincibility)\n',
    'name': 'SWMG_StartInvulnerability',
    'type': 'void',
    'args': [ 'object' ]
  },
  667: {
    'comment': '667: GetPlayerMaxSpeed\nThis returns the player character\'s max speed\n',
    'name': 'SWMG_GetPlayerMaxSpeed',
    'type': 'float',
    'args': []
  },
  668: {
    'comment': '668: SetPlayerMaxSpeed\nThis sets the player character\'s max speed\n',
    'name': 'SWMG_SetPlayerMaxSpeed',
    'type': 'void',
    'args': [ 'float' ]
  },
  669: {
    'comment': '669: AddJournalWorldEntry\nAdds a user entered entry to the world notices\n',
    'name': 'AddJournalWorldEntry',
    'type': 'void',
    'args': [ 'int', 'string', 'string' ]
  },
  670: {
    'comment': '670: AddJournalWorldEntryStrref\nAdds an entry to the world notices using stringrefs\n',
    'name': 'AddJournalWorldEntryStrref',
    'type': 'void',
    'args': [ 'int', 'int' ]
  },
  671: {
    'comment': '671: BarkString\nthis will cause a creature to bark the strRef from the talk table\nIf creature is specefied as OBJECT_INVALID a general bark is made.\n',
    'name': 'BarkString',
    'type': 'void',
    'args': [ 'object' ]
  },
  672: {
    'comment': '672: DeleteJournalWorldAllEntries\nNuke\'s \'em all, user entered or otherwise.\n',
    'name': 'DeleteJournalWorldAllEntries',
    'type': 'void',
    'args': []
  },
  673: {
    'comment': '673: DeleteJournalWorldEntry\nDeletes a user entered world notice\n',
    'name': 'DeleteJournalWorldEntry',
    'type': 'void',
    'args': [ 'int' ]
  },
  674: {
    'comment': '674: DeleteJournalWorldEntryStrref\nDeletes the world notice pertaining to the string ref\n',
    'name': 'DeleteJournalWorldEntryStrref',
    'type': 'void',
    'args': [ 'int' ]
  },
  675: {
    'comment': '675: EffectForceDrain\nThis command will reduce the force points of a creature.\n',
    'name': 'EffectForceDrain',
    'type': 'effect',
    'args': [ 'int' ]
  },
  676: {
    'comment': '676: EffectTemporaryForcePoints\n\n',
    'name': 'EffectPsychicStatic',
    'type': 'effect',
    'args': []
  },
  677: {
    'comment': '677: PlayVisualAreaEffect\n',
    'name': 'PlayVisualAreaEffect',
    'type': 'void',
    'args': [ 'int', 'location' ]
  },
  678: {
    'comment': '678: SetJournalQuestEntryPicture\nSets the picture for the quest entry on this object (creature)\n',
    'name': 'SetJournalQuestEntryPicture',
    'type': 'void',
    'args': [ 'string', 'object', 'int', 'int', 'int' ]
  },
  679: {
    'comment': '679. GetLocalBoolean\nThis gets a boolean flag on an object\ncurrently the index is a range between 0 and 63\n',
    'name': 'GetLocalBoolean',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  680: {
    'comment': '680. SetLocalBoolean\nThis sets a boolean flag on an object\ncurrently the index is a range between 0 and 63\n',
    'name': 'SetLocalBoolean',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  681: {
    'comment': '681. GetLocalNumber\nThis gets a number on an object\ncurrently the index is a range between 0 and 0\n',
    'name': 'GetLocalNumber',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  682: {
    'comment': '682. SetLocalNumber\nThis sets a number on an object\ncurrently the index is a range between 0 and 0\n',
    'name': 'SetLocalNumber',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  683: {
    'comment': '683. SWMG_GetSoundFrequency\nGets the frequency of a trackfollower sound\n',
    'name': 'SWMG_GetSoundFrequency',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  684: {
    'comment': '684. SWMG_SetSoundFrequency\nSets the frequency of a trackfollower sound\n',
    'name': 'SWMG_SetSoundFrequency',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  685: {
    'comment': '685. SWMG_GetSoundFrequencyIsRandom\nGets whether the frequency of a trackfollower sound is using the random model\n',
    'name': 'SWMG_GetSoundFrequencyIsRandom',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  686: {
    'comment': '686. SWMG_SetSoundFrequencyIsRandom\nSets whether the frequency of a trackfollower sound is using the random model\n',
    'name': 'SWMG_SetSoundFrequencyIsRandom',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  687: {
    'comment': '687. SWMG_GetSoundVolume\nGets the volume of a trackfollower sound\n',
    'name': 'SWMG_GetSoundVolume',
    'type': 'int',
    'args': [ 'object', 'int' ]
  },
  688: {
    'comment': '688. SWMG_SetSoundVolume\nSets the volume of a trackfollower sound\n',
    'name': 'SWMG_SetSoundVolume',
    'type': 'void',
    'args': [ 'object', 'int', 'int' ]
  },
  689: {
    'comment': '689. SoundObjectGetPitchVariance\nGets the pitch variance of a placeable sound object\n',
    'name': 'SoundObjectGetPitchVariance',
    'type': 'float',
    'args': [ 'object' ]
  },
  690: {
    'comment': '690. SoundObjectSetPitchVariance\nSets the pitch variance of a placeable sound object\n',
    'name': 'SoundObjectSetPitchVariance',
    'type': 'void',
    'args': [ 'object', 'float' ]
  },
  691: {
    'comment': '691. SoundObjectGetVolume\nGets the volume of a placeable sound object\n',
    'name': 'SoundObjectGetVolume',
    'type': 'int',
    'args': [ 'object' ]
  },
  692: {
    'comment': '692: GetGlobalLocation\nThis function returns the a global location scripting variable.\n',
    'name': 'GetGlobalLocation',
    'type': 'location',
    'args': [ 'string' ]
  },
  693: {
    'comment': '693: SetGlobalLocation\nThis function sets the a global location scripting variable.\n',
    'name': 'SetGlobalLocation',
    'type': 'void',
    'args': [ 'string', 'location' ]
  },
  694: {
    'comment': '694. AddAvailableNPCByObject\nThis adds a NPC to the list of available party members using\na game object as the template\nReturns if true if successful, false if the NPC had already\nbeen added or the object specified is invalid\n',
    'name': 'AddAvailableNPCByObject',
    'type': 'int',
    'args': [ 'int', 'object' ]
  },
  695: {
    'comment': '695. RemoveAvailableNPC\nThis removes a NPC from the list of available party members\nReturns whether it was successful or not\n',
    'name': 'RemoveAvailableNPC',
    'type': 'int',
    'args': [ 'int' ]
  },
  696: {
    'comment': '696. IsAvailableNPC\nThis returns whether a NPC is in the list of available party members\n',
    'name': 'IsAvailableCreature',
    'type': 'int',
    'args': [ 'int' ]
  },
  697: {
    'comment': '697. AddAvailableNPCByTemplate\nThis adds a NPC to the list of available party members using\na template\nReturns if true if successful, false if the NPC had already\nbeen added or the template specified is invalid\n',
    'name': 'AddAvailableNPCByTemplate',
    'type': 'int',
    'args': [ 'int', 'string' ]
  },
  698: {
    'comment': '698. SpawnAvailableNPC\nThis spawns a NPC from the list of available creatures\nReturns a pointer to the creature object\n',
    'name': 'SpawnAvailableNPC',
    'type': 'object',
    'args': [ 'int', 'location' ]
  },
  699: {
    'comment': '699. IsNPCPartyMember\nReturns if a given NPC constant is in the party currently\n',
    'name': 'IsNPCPartyMember',
    'type': 'int',
    'args': [ 'int' ]
  },
  700: {
    'comment': '700. ActionBarkString\nthis will cause a creature to bark the strRef from the talk table.\n',
    'name': 'ActionBarkString',
    'type': 'void',
    'args': [ 'int' ]
  },
  701: {
    'comment': '701. GetIsConversationActive\nChecks to see if any conversations are currently taking place\n',
    'name': 'GetIsConversationActive',
    'type': 'int',
    'args': []
  },
  702: {
    'comment': '702. EffectLightsaberThrow\nThis function throws a lightsaber at a target\nIf multiple targets are specified, then the lightsaber travels to them\nsequentially, returning to the first object specified\nThis effect is applied to an object, so an effector is not needed\n',
    'name': 'EffectLightsaberThrow',
    'type': 'effect',
    'args': [ 'object', 'object', 'object', 'int' ]
  },
  703: {
    'comment': '703.\ncreates the effect of a whirl wind.\n',
    'name': 'EffectWhirlWind',
    'type': 'effect',
    'args': []
  },
  704: {
    'comment': '704.\nReturns the party ai style\n',
    'name': 'GetPartyAIStyle',
    'type': 'int',
    'args': []
  },
  705: {
    'comment': '705.\nReturns the party members ai style\n',
    'name': 'GetNPCAIStyle',
    'type': 'int',
    'args': [ 'object' ]
  },
  706: {
    'comment': '706.\nSets the party ai style\n',
    'name': 'SetPartyAIStyle',
    'type': 'void',
    'args': [ 'int' ]
  },
  707: {
    'comment': '707.\nSets the party members ai style\n',
    'name': 'SetNPCAIStyle',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  708: {
    'comment': '708: SetNPCSelectability\n',
    'name': 'SetNPCSelectability',
    'type': 'void',
    'args': [ 'int', 'int' ]
  },
  709: {
    'comment': '709: GetNPCSelectability\n',
    'name': 'GetNPCSelectability',
    'type': 'int',
    'args': [ 'int' ]
  },
  710: {
    'comment': '710: Clear all the effects of the caller.\n* No return value, but if an error occurs, the log file will contain\n\'ClearAllEffects failed.\'.\n',
    'name': 'ClearAllEffects',
    'type': 'void',
    'args': []
  },
  711: {
    'comment': '711: GetLastConversation\nGets the last conversation string.\n\n',
    'name': 'GetLastConversation',
    'type': 'string',
    'args': []
  },
  712: {
    'comment': '712: ShowPartySelectionGUI\nBrings up the party selection GUI for the player to\nselect the members of the party from\nif exit script is specified, will be executed when\nthe GUI is exited\n',
    'name': 'ShowPartySelectionGUI',
    'type': 'void',
    'args': [ 'string', 'int', 'int' ]
  },
  713: {
    'comment': '713: GetStandardFaction\nFind out which standard faction oObject belongs to.\n* Returns INVALID_STANDARD_FACTION if oObject does not belong to\na Standard Faction, or an error has occurred.\n',
    'name': 'GetStandardFaction',
    'type': 'int',
    'args': [ 'object' ]
  },
  714: {
    'comment': '714: GivePlotXP\nGive nPercentage% of the experience associated with plot sPlotName\nto the party\n- sPlotName\n- nPercentage\n',
    'name': 'GivePlotXP',
    'type': 'void',
    'args': [ 'string', 'int' ]
  },
  715: {
    'comment': '715. GetMinOneHP\nChecks to see if oObject has the MinOneHP Flag set on them.\n',
    'name': 'GetMinOneHP',
    'type': 'int',
    'args': [ 'object' ]
  },
  716: {
    'comment': '716. SetMinOneHP\nSets/Removes the MinOneHP Flag on oObject.\n',
    'name': 'SetMinOneHP',
    'type': 'void',
    'args': [ 'object' ]
  },
  717: {
    'comment': '717. SWMG_GetPlayerTunnelInfinite\nGets whether each of the dimensions is infinite\n',
    'name': 'SWMG_GetPlayerTunnelInfinite',
    'type': 'vector',
    'args': []
  },
  718: {
    'comment': '718. SWMG_SetPlayerTunnelInfinite\nSets whether each of the dimensions is infinite\n',
    'name': 'SWMG_SetPlayerTunnelInfinite',
    'type': 'void',
    'args': [ 'vector' ]
  },
  719: {
    'comment': '719. SetGlobalFadeIn\nSets a Fade In that starts after fWait seconds and fades for fLength Seconds.\nThe Fade will be from a color specified by the RGB values fR, fG, and fB.\nNote that fR, fG, and fB are normalized values.\nThe default values are an immediate cut in from black.\n',
    'name': 'SetGlobalFadeIn',
    'type': 'void',
    'args': [ 'float', 'float', 'float', 'float', 'float' ]
  },
  720: {
    'comment': '720. SetGlobalFadeOut\nSets a Fade Out that starts after fWait seconds and fades for fLength Seconds.\nThe Fade will be to a color specified by the RGB values fR, fG, and fB.\nNote that fR, fG, and fB are normalized values.\nThe default values are an immediate cut to from black.\n',
    'name': 'SetGlobalFadeOut',
    'type': 'void',
    'args': [ 'float', 'float', 'float', 'float', 'float' ]
  },
  721: {
    'comment': '721. GetLastAttackTarget\nReturns the last attack target for a given object\n',
    'name': 'GetLastHostileTarget',
    'type': 'object',
    'args': [ 'object' ]
  },
  722: {
    'comment': '722. GetLastAttackAction\nReturns the last attack action for a given object\n',
    'name': 'GetLastAttackAction',
    'type': 'int',
    'args': [ 'object' ]
  },
  723: {
    'comment': '723. GetLastForcePowerUsed\nReturns the last force power used (as a spell number that indexes the Spells.2da) by the given object\n',
    'name': 'GetLastForcePowerUsed',
    'type': 'int',
    'args': [ 'object' ]
  },
  724: {
    'comment': '724. GetLastCombatFeatUsed\nReturns the last feat used (as a feat number that indexes the Feats.2da) by the given object\n',
    'name': 'GetLastCombatFeatUsed',
    'type': 'int',
    'args': [ 'object' ]
  },
  725: {
    'comment': '725. GetLastAttackResult\nReturns the result of the last attack\n',
    'name': 'GetLastAttackResult',
    'type': 'int',
    'args': [ 'object' ]
  },
  726: {
    'comment': '726. GetWasForcePowerSuccessful\nReturns whether the last force power used was successful or not\n',
    'name': 'GetWasForcePowerSuccessful',
    'type': 'int',
    'args': [ 'object' ]
  },
  727: {
    'comment': '727. GetFirstAttacker\nReturns the first object in the area that is attacking oCreature\n',
    'name': 'GetFirstAttacker',
    'type': 'object',
    'args': [ 'object' ]
  },
  728: {
    'comment': '728. GetNextAttacker\nReturns the next object in the area that is attacking oCreature\n',
    'name': 'GetNextAttacker',
    'type': 'object',
    'args': [ 'object' ]
  },
  729: {
    'comment': '729. SetFormation\nPut oCreature into the nFormationPattern about oAnchor at position nPosition\n- oAnchor: The formation is set relative to this object\n- oCreature: This is the creature that you wish to join the formation\n- nFormationPattern: FORMATION_*\n- nPosition: Integer from 1 to 10 to specify which position in the formation\noCreature is supposed to take.\n',
    'name': 'SetFormation',
    'type': 'void',
    'args': [ 'object', 'object', 'int', 'int' ]
  },
  730: {
    'comment': '730. ActionFollowLeader\nthis action has a party member follow the leader.\nDO NOT USE ON A CREATURE THAT IS NOT IN THE PARTY!!\n',
    'name': 'ActionFollowLeader',
    'type': 'void',
    'args': []
  },
  731: {
    'comment': '731. SetForcePowerUnsuccessful\nSets the reason (through a constant) for why a force power failed\n',
    'name': 'SetForcePowerUnsuccessful',
    'type': 'void',
    'args': [ 'int', 'object' ]
  },
  732: {
    'comment': '732. GetIsDebilitated\nReturns whether the given object is debilitated or not\n',
    'name': 'GetIsDebilitated',
    'type': 'int',
    'args': [ 'object' ]
  },
  733: {
    'comment': '733. PlayMovie\nPlayes a Movie.\n',
    'name': 'PlayMovie',
    'type': 'void',
    'args': [ 'string' ]
  },
  734: {
    'comment': '734. SaveNPCState\nTells the party table to save the state of a party member NPC\n',
    'name': 'SaveNPCState',
    'type': 'void',
    'args': [ 'int' ]
  },
  735: {
    'comment': '735: Get the Category of tTalent.\n',
    'name': 'GetCategoryFromTalent',
    'type': 'int',
    'args': [ 'talent' ]
  },
  736: {
    'comment': '736: This affects all creatures in the area that are in faction nFactionFrom...\n- Makes them join nFactionTo\n- Clears all actions\n- Disables combat mode\n',
    'name': 'SurrenderByFaction',
    'type': 'void',
    'args': [ 'int', 'int' ]
  },
  737: {
    'comment': '737: This affects all creatures in the area that are in faction nFactionFrom.\nmaking them change to nFactionTo\n',
    'name': 'ChangeFactionByFaction',
    'type': 'void',
    'args': [ 'int', 'int' ]
  },
  738: {
    'comment': '738: PlayRoomAnimation\nPlays a looping animation on a room\n',
    'name': 'PlayRoomAnimation',
    'type': 'void',
    'args': [ 'string', 'int' ]
  },
  739: {
    'comment': '739: ShowGalaxyMap\nBrings up the Galaxy Map Gui, with \'nPlanet\' selected.  \'nPlanet\' can only be a planet\nthat has already been set available and selectable.\n',
    'name': 'ShowGalaxyMap',
    'type': 'void',
    'args': [ 'int' ]
  },
  740: {
    'comment': '740: SetPlanetSelectable\nSets \'nPlanet\' selectable on the Galaxy Map Gui.\n',
    'name': 'SetPlanetSelectable',
    'type': 'void',
    'args': [ 'int', 'int' ]
  },
  741: {
    'comment': '741: GetPlanetSelectable\nReturns wheter or not \'nPlanet\' is selectable.\n',
    'name': 'GetPlanetSelectable',
    'type': 'int',
    'args': [ 'int' ]
  },
  742: {
    'comment': '742: SetPlanetAvailable\nSets \'nPlanet\' available on the Galaxy Map Gui.\n',
    'name': 'SetPlanetAvailable',
    'type': 'void',
    'args': [ 'int', 'int' ]
  },
  743: {
    'comment': '743: GetPlanetAvailable\nReturns wheter or not \'nPlanet\' is available.\n',
    'name': 'GetPlanetAvailable',
    'type': 'int',
    'args': [ 'int' ]
  },
  744: {
    'comment': '744: GetSelectedPlanet\nReturns the ID of the currently selected planet.  Check Planetary.2da\nfor which planet the return value corresponds to. If the return is -1\nno planet is selected.\n',
    'name': 'GetSelectedPlanet',
    'type': 'int',
    'args': []
  },
  745: {
    'comment': '745: SoundObjectFadeAndStop\nFades a sound object for \'fSeconds\' and then stops it.\n',
    'name': 'SoundObjectFadeAndStop',
    'type': 'void',
    'args': [ 'object' ]
  },
  746: {
    'comment': '746: SetAreaFogColor\nSet the fog color for the area oArea.\n',
    'name': 'SetAreaFogColor',
    'type': 'void',
    'args': [ 'object', 'float', 'float', 'float' ]
  },
  747: {
    'comment': '747: ChangeItemCost\nChange the cost of an item\n',
    'name': 'ChangeItemCost',
    'type': 'void',
    'args': [ 'string', 'float' ]
  },
  748: {
    'comment': '748: GetIsLiveContentAvailable\nDetermines whether a given live content package is available\nnPkg = LIVE_CONTENT_PKG1, LIVE_CONTENT_PKG2, ..., LIVE_CONTENT_PKG6\n',
    'name': 'GetIsLiveContentAvailable',
    'type': 'int',
    'args': [ 'int' ]
  },
  749: {
    'comment': '749: ResetDialogState\nResets the GlobalDialogState for the engine.\nNOTE: NEVER USE THIS UNLESS YOU KNOW WHAT ITS FOR!\nonly to be used for a failing OnDialog script\n',
    'name': 'ResetDialogState',
    'type': 'void',
    'args': []
  },
  750: {
    'comment': '750: SetAlignmentGoodEvil\nSet oCreature\'s alignment value\n',
    'name': 'SetGoodEvilValue',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  751: {
    'comment': '751: GetIsPoisoned\nReturns TRUE if the object specified is poisoned.\n',
    'name': 'GetIsPoisoned',
    'type': 'int',
    'args': [ 'object' ]
  },
  752: {
    'comment': '752: GetSpellTarget\nReturns the object id of the spell target\n',
    'name': 'GetSpellTarget',
    'type': 'object',
    'args': [ 'object' ]
  },
  753: {
    'comment': '753: SetSoloMode\nActivates/Deactivates solo mode for the player\'s party.\n',
    'name': 'SetSoloMode',
    'type': 'void',
    'args': [ 'int' ]
  },
  754: {
    'comment': '754: EffectCutSceneHorrified\nGet a horrified effect for cutscene purposes (ie. this effect will ignore immunities).\n',
    'name': 'EffectCutSceneHorrified',
    'type': 'effect',
    'args': []
  },
  755: {
    'comment': '755: EffectCutSceneParalyze\nGet a paralyze effect for cutscene purposes (ie. this effect will ignore immunities).\n',
    'name': 'EffectCutSceneParalyze',
    'type': 'effect',
    'args': []
  },
  756: {
    'comment': '756: EffectCutSceneStunned\nGet a stun effect for cutscene purposes (ie. this effect will ignore immunities).\n',
    'name': 'EffectCutSceneStunned',
    'type': 'effect',
    'args': []
  },
  757: {
    'comment': '757: CancelPostDialogCharacterSwitch()\nIf a dialog has been started by an NPC on a Non PartyMemeberCanInteract object\ncalling this function will cancel the Post Dialog switching back to the NPC\nthat did the initiating.\n',
    'name': 'CancelPostDialogCharacterSwitch',
    'type': 'void',
    'args': []
  },
  758: {
    'comment': '758: SetMaxHitPoints\nSet the maximum hitpoints of oObject\nThe objects maximum AND current hitpoints will be nMaxHP after the function is called\n',
    'name': 'SetMaxHitPoints',
    'type': 'void',
    'args': [ 'object', 'int' ]
  },
  759: {
    'comment': '759: NoClicksFor()\nThis command will not allow clicking on anything for \'fDuration\' seconds\n',
    'name': 'NoClicksFor',
    'type': 'void',
    'args': [ 'float' ]
  },
  760: {
    'comment': '760: HoldWorldFadeInForDialog()\nThis will hold the fade in at the begining of a module until a dialog starts\n',
    'name': 'HoldWorldFadeInForDialog',
    'type': 'void',
    'args': []
  },
  761: {
    'comment': '761: ShipBuild()\nThis will return if this is a shipping build. this should be used to disable all debug output.\n',
    'name': 'ShipBuild',
    'type': 'int',
    'args': []
  },
  762: {
    'comment': '762: SurrenderRetainBuffs()\nThis will do the same as SurrenderToEnemies, except that affected creatures will not\nlose effects which they have put on themselves\n',
    'name': 'SurrenderRetainBuffs',
    'type': 'void',
    'args': []
  },
  763: {
    'comment': '763. SuppressStatusSummaryEntry\nThis will prevent the next n entries that should have shown up in the status summary\nfrom being added\nThis will not add on to any existing summary suppressions, but rather replace it.  So\nto clear the supression system pass 0 as the entry value\n',
    'name': 'SuppressStatusSummaryEntry',
    'type': 'void',
    'args': [ 'int' ]
  },
  764: {
    'comment': '764. GetCheatCode\nReturns true if cheat code has been enabled\n',
    'name': 'GetCheatCode',
    'type': 'int',
    'args': [ 'int' ]
  },
  765: {
    'comment': '765. SetMusicVolume\nNEVER USE THIS!\n',
    'name': 'SetMusicVolume',
    'type': 'void',
    'args': [ 'float' ]
  },
  766: {
    'comment': '766. CreateItemOnFloor\nShould only be used for items that have been created on the ground, and will\nbe destroyed without ever being picked up or equipped.  Returns true if successful\n',
    'name': 'CreateItemOnFloor',
    'type': 'object',
    'args': [ 'string', 'location', 'int' ]
  },
  767: {
    'comment': '767. SetAvailableNPCId\nThis will set the object id that should be used for a specific available NPC\n',
    'name': 'SetAvailableNPCId',
    'type': 'void',
    'args': []
  },
  768: {
    'comment': '768. IsMoviePlaying\nChecks if a movie is currently playing.\n',
    'name': 'IsMoviePlaying',
    'type': 'int',
    'args': []
  },
  769: {
    'comment': '769. QueueMovie\nQueues up a movie to be played using PlayMovieQueue.\nIf bSkippable is TRUE, the player can cancel the movie by hitting escape.\nIf bSkippable is FALSE, the player cannot cancel the movie and must wait\nfor it to finish playing.\n',
    'name': 'QueueMovie',
    'type': 'void',
    'args': [ 'string', 'int' ]
  },
  770: {
    'comment': '770. PlayMovieQueue\nPlays the movies that have been added to the queue by QueueMovie\nIf bAllowSeparateSkips is TRUE, hitting escape to cancel a movie only\ncancels out of the currently playing movie rather than the entire queue\nof movies (assuming the currently playing movie is flagged as skippable).\nIf bAllowSeparateSkips is FALSE, the entire movie queue will be cancelled\nif the player hits escape (assuming the currently playing movie is flagged\nas skippable).\n',
    'name': 'PlayMovieQueue',
    'type': 'void',
    'args': [ 'int' ]
  },
  771: {
    'comment': '771. YavinHackCloseDoor\nThis is an incredibly hacky function to allow the doors to be properly\nclosed on Yavin without running into the problems we\'ve had.  It is too\nlate in development to fix it correctly, so thus we do this.  Life is\nhard.  You\'ll get over it\n',
    'name': 'YavinHackCloseDoor',
    'type': 'void',
    'args': [ 'object' ]
  }
};

module.exports = NWScriptDefK1;
