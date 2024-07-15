/**
 * SignalEventType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * https://github.com/nwn-dotnet/NWN.Native/blob/38098e06b9eeb5ffd5e9280b53f210f02bcbfc6f/src/main/API/ScriptEvent.cs#L40
 * 
 * @file SignalEventType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */

export enum SignalEventType {
  OnHeartbeat = 0,
  OnPerception = 1,
  OnSpellCastAt = 2,
  OnMeleeAttacked = 3,
  OnDamaged = 4,
  OnDisturbed = 5,
  OnEndCombatRound = 6,
  OnDialogue = 7,
  OnSpawnIn = 8,
  OnRested = 9,
  OnDeath = 10,
  OnUserDefinedEvent = 11,
  OnObjectEnter = 12,
  OnObjectExit = 13,
  OnPlayerEnter = 14,
  OnPlayerExit = 15,
  OnModuleStart = 16,
  OnModuleLoad = 17,
  OnActivateItem = 18,
  OnAcquireItem = 19,
  OnLoseItem = 20,
  OnEncounterExhausted = 21,
  OnOpen = 22,
  OnClose = 23,
  OnDisarm = 24,
  OnUsed = 25,
  OnTrapTriggered = 26,
  OnInventoryDisturbed = 27,
  OnLocked = 28,
  OnUnlocked = 29,
  OnClicked = 30,
  OnPathBlocked = 31,
  OnPlayerDying = 32,
  OnRespawnButtonPressed = 33,
  OnFailToOpen = 34,
  OnPlayerRest = 35,
  OnDestroyPlayerCreature = 36,
  OnPlayerLevelUp = 37,
  OnPlayerCancelCutscene = 38,
  OnEquipItem = 39,
  OnUnequipItem = 40,
  OnXxx = 41,
  OnLeftClick = 42
};