/**
 * GameEventType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameEventType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum GameEventType {
  EventTimedEvent                  = 0x01,
  EventEnteredTrigger              = 0x02,
  EventLeftTrigger                 = 0x03,
  EventRemoveFromArea              = 0x04,
  EventApplyEffect                 = 0x05,
  EventCloseObject                 = 0x06,
  EventOpenObject                  = 0x07,
  EventSpellImpact                 = 0x08,
  EventPlayAnimation               = 0x09,
  EventSignalEvent                 = 0x0A,
  EventDestroyObject               = 0x0B,
  EventUnlockObject                = 0x0C,
  EventLockObject                  = 0x0D,
  EventRemoveEffect                = 0x0E,
  EventOnMeleeAttacked             = 0x0F,
  EventDecrementStackSize          = 0x10,
  EventSpawnBodyBag                = 0x11,
  EventForcedAction                = 0x12,
  EventItemOnHitSpellImpact        = 0x13,
  EventBroadcastAOO                = 0x14,
  EventBroadcastSafeProjectile     = 0x15,
  EventFeedbackMessage             = 0x16,
  EventAbilityEffectApplied        = 0x17,
  EventSummonCreature              = 0x18,
  EventAquireItem                  = 0x19,
  EventAreaTransition              = 0x1A,
  EventControllerRumble            = 0x1B,
};
