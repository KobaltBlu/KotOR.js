/**
 * ModuleObjectScript enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ModuleObjectScript.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ModuleObjectScript {
  //Module
  ModuleOnPlayerAcquireItem = 'Mod_OnAcquirItem',
  ModuleOnPlayerActivateItem = 'Mod_OnActvtItem',
  ModuleOnPlayerClientEnter = 'Mod_OnClientEntr',
  ModuleOnPlayerClientLeave = 'Mod_OnClientLeav',
  ModuleOnHeartbeat = 'Mod_OnHeartbeat',
  ModuleOnLoad = 'Mod_OnModLoad',
  ModuleOnStart = 'Mod_OnModStart',
  ModuleOnPlayerDeath = 'Mod_OnPlrDeath',
  ModuleOnPlayerDying = 'Mod_OnPlrDying',
  ModuleOnPlayerLevelUp = 'Mod_OnPlrLvlUp',
  ModuleOnPlayerRest = 'Mod_OnPlrRest',
  ModuleOnSpawnButtonDown = 'Mod_OnSpawnBtnDn',
  ModuleOnUnAcquireItem = 'Mod_OnUnAqreItem',
  ModuleOnUserDefined = 'Mod_OnUsrDefined',


  //Area
  AreaOnEnter = 'OnEnter',
  AreaOnExit = 'OnExit',
  AreaOnHeartbeat = 'OnHeartbeat',
  AreaOnUserDefined = 'OnUserDefined',

  //Creature
  CreatureOnAttacked = 'ScriptAttacked',
  CreatureOnDamaged = 'ScriptDamaged',
  CreatureOnDeath = 'ScriptDeath',
  CreatureOnDialog = 'ScriptDialogue',
  CreatureOnDisturbed = 'ScriptDisturbed',
  CreatureOnEndDialog = 'ScriptEndDialogu',
  CreatureOnEndRound = 'ScriptEndRound',
  CreatureOnHeartbeat = 'ScriptHeartbeat',
  CreatureOnBlocked = 'ScriptOnBlocked',
  CreatureOnNotice = 'ScriptOnNotice',
  CreatureOnRested = 'ScriptRested',
  CreatureOnSpawn = 'ScriptSpawn',
  CreatureOnSpellAt = 'ScriptSpellAt',
  CreatureOnUserDefined = 'ScriptUserDefine',

  //Placeable
  PlaceableOnClosed = 'OnClosed',
  PlaceableOnDamaged = 'OnDamaged',
  PlaceableOnDeath = 'OnDeath',
  PlaceableOnDisarm = 'OnDisarm',
  PlaceableOnEndDialogue = 'OnEndDialogue',
  PlaceableOnHeartbeat = 'OnHeartbeat',
  PlaceableOnInvDisturbed = 'OnInvDisturbed',
  PlaceableOnLock = 'OnLock',
  PlaceableOnMeleeAttacked = 'OnMeleeAttacked',
  PlaceableOnOpen = 'OnOpen',
  PlaceableOnSpellCastAt = 'OnSpellCastAt',
  PlaceableOnTrapTriggered = 'OnTrapTriggered',
  PlaceableOnUnlock = 'OnUnlock',
  PlaceableOnUsed = 'OnUsed',
  PlaceableOnUserDefined = 'OnUserDefined',

  //Door
  DoorOnClick = 'OnClick',
  DoorOnClosed = 'OnClosed',
  DoorOnDamaged = 'OnDamaged',
  DoorOnDeath = 'OnDeath',
  DoorOnDisarm = 'OnDisarm',
  DoorOnFailToOpen = 'OnFailToOpen',
  DoorOnHeartbeat = 'OnHeartbeat',
  DoorOnInvDisturbed = 'OnInvDisturbed',
  DoorOnLock = 'OnLock',
  DoorOnMeleeAttacked = 'OnMeleeAttacked',
  DoorOnOpen = 'OnOpen',
  DoorOnSpellCastAt = 'OnSpellCastAt',
  DoorOnTrapTriggered = 'OnTrapTriggered',
  DoorOnUnlock = 'OnUnlock',
  DoorOnUserDefined = 'OnUserDefined',

  //Trigger
  TriggerOnClick = 'OnClick',
  TriggerOnDisarm = 'OnDisarm',
  TriggerOnTrapTriggered = 'OnTrapTriggered',
  TriggerOnHeartbeat = 'ScriptHeartbeat',
  TriggerOnEnter = 'ScriptOnEnter',
  TriggerOnExit = 'ScriptOnExit',
  TriggerOnUserDefined = 'ScriptUserDefine',
  
  //Encounter
  EncounterOnEntered = 'OnEntered',
  EncounterOnExhausted = 'OnExhausted',
  EncounterOnExit = 'OnExit',
  EncounterOnHeartbeat = 'OnHeartbeat',
  EncounterOnUserDefined = 'OnUserDefined',
  
  //MGPlayer
  MGPlayerOnAccelerate = 'OnAccelerate',
  MGPlayerOnAnimEvent = 'OnAnimEvent',
  MGPlayerOnBrake = 'OnBrake',
  MGPlayerOnCreate = 'OnCreate',
  MGPlayerOnDamage = 'OnDamage',
  MGPlayerOnDeath = 'OnDeath',
  MGPlayerOnFire = 'OnFire',
  MGPlayerOnHeartbeat = 'OnHeartbeat',
  MGPlayerOnHitBullet = 'OnHitBullet',
  MGPlayerOnHitFollower = 'OnHitFollower',
  MGPlayerOnHitObstacle = 'OnHitObstacle',
  MGPlayerOnHitWorld = 'OnHitWorld',
  MGPlayerOnTrackLoop = 'OnTrackLoop',
  
  //MGEnemy
  MGEnemyOnAccelerate = 'OnAccelerate',
  MGEnemyOnAnimEvent = 'OnAnimEvent',
  MGEnemyOnBrake = 'OnBrake',
  MGEnemyOnCreate = 'OnCreate',
  MGEnemyOnDamage = 'OnDamage',
  MGEnemyOnDeath = 'OnDeath',
  MGEnemyOnFire = 'OnFire',
  MGEnemyOnHeartbeat = 'OnHeartbeat',
  MGEnemyOnHitBullet = 'OnHitBullet',
  MGEnemyOnHitFollower = 'OnHitFollower',
  MGEnemyOnHitObstacle = 'OnHitObstacle',
  MGEnemyOnHitWorld = 'OnHitWorld',
  MGEnemyOnTrackLoop = 'OnTrackLoop',

  //MGObstacle
  MGObstacleOnAnimEvent = 'OnAnimEvent',
  MGObstacleOnCreate = 'OnCreate',
  MGObstacleOnHeartbeat = 'OnHeartbeat',
  MGObstacleOnHitBullet = 'OnHitBullet',
  MGObstacleOnHitFollower = 'OnHitFollower',
}