import { GameEventType } from "../enums/events/GameEventType";
import { GFFStruct } from "../resource/GFFStruct";
import { EventApplyEffect } from "./EventApplyEffect";
import { EventAquireItem } from "./EventAquireItem";
import { EventAreaTransition } from "./EventAreaTransition";
import { EventBroadcastAOO } from "./EventBroadcastAOO";
import { EventBroadcastSafeProjectile } from "./EventBroadcastSafeProjectile";
import { EventCloseObject } from "./EventCloseObject";
import { EventControllerRumble } from "./EventControllerRumble";
import { EventDecrementStackSize } from "./EventDecrementStackSize";
import { EventDestroyObject } from "./EventDestroyObject";
import { EventEnteredTrigger } from "./EventEnteredTrigger";
import { EventFeedbackMessage } from "./EventFeedbackMessage";
import { EventForcedAction } from "./EventForcedAction";
import { EventItemOnHitSpellImpact } from "./EventItemOnHitSpellImpact";
import { EventLeftTrigger } from "./EventLeftTrigger";
import { EventLockObject } from "./EventLockObject";
import { EventOnMeleeAttacked } from "./EventOnMeleeAttacked";
import { EventOpenObject } from "./EventOpenObject";
import { EventPlayAnimation } from "./EventPlayAnimation";
import { EventRemoveEffect } from "./EventRemoveEffect";
import { EventRemoveFromArea } from "./EventRemoveFromArea";
import { EventSignalEvent } from "./EventSignalEvent";
import { EventSpawnBodyBag } from "./EventSpawnBodyBag";
import { EventSpellImpact } from "./EventSpellImpact";
import { EventSummonCreature } from "./EventSummonCreature";
import { EventTimedEvent } from "./EventTimedEvent";
import { EventUnlockObject } from "./EventUnlockObject";
import type { GameEvent } from "./GameEvent";

/**
 * GameEventFactory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameEventFactory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GameEventFactory {

  static EventTimedEvent: typeof EventTimedEvent = EventTimedEvent;
  static EventEnteredTrigger: typeof EventEnteredTrigger = EventEnteredTrigger;
  static EventLeftTrigger: typeof EventLeftTrigger = EventLeftTrigger;
  static EventRemoveFromArea: typeof EventRemoveFromArea = EventRemoveFromArea;
  static EventApplyEffect: typeof EventApplyEffect = EventApplyEffect;
  static EventCloseObject: typeof EventCloseObject = EventCloseObject;
  static EventOpenObject: typeof EventOpenObject = EventOpenObject;
  static EventSpellImpact: typeof EventSpellImpact = EventSpellImpact;
  static EventPlayAnimation: typeof EventPlayAnimation = EventPlayAnimation;
  static EventSignalEvent: typeof EventSignalEvent = EventSignalEvent;
  static EventDestroyObject: typeof EventDestroyObject = EventDestroyObject;
  static EventUnlockObject: typeof EventUnlockObject = EventUnlockObject;
  static EventLockObject: typeof EventLockObject = EventLockObject;
  static EventRemoveEffect: typeof EventRemoveEffect = EventRemoveEffect;
  static EventOnMeleeAttacked: typeof EventOnMeleeAttacked = EventOnMeleeAttacked;
  static EventDecrementStackSize: typeof EventDecrementStackSize = EventDecrementStackSize;
  static EventSpawnBodyBag: typeof EventSpawnBodyBag = EventSpawnBodyBag;
  static EventForcedAction: typeof EventForcedAction = EventForcedAction;
  static EventItemOnHitSpellImpact: typeof EventItemOnHitSpellImpact = EventItemOnHitSpellImpact;
  static EventBroadcastAOO: typeof EventBroadcastAOO = EventBroadcastAOO;
  static EventBroadcastSafeProjectile: typeof EventBroadcastSafeProjectile = EventBroadcastSafeProjectile;
  static EventFeedbackMessage: typeof EventFeedbackMessage = EventFeedbackMessage;
  // static EventAbilityEffectApplied: typeof EventAbilityEffectApplied = EventAbilityEffectApplied;
  static EventSummonCreature: typeof EventSummonCreature = EventSummonCreature;
  static EventAquireItem: typeof EventAquireItem = EventAquireItem;
  static EventAreaTransition: typeof EventAreaTransition = EventAreaTransition;
  static EventControllerRumble: typeof EventControllerRumble = EventControllerRumble;

  static EventFromStruct( struct: GFFStruct ): GameEvent {
    if(!struct){ return undefined as any; }
    let event: GameEvent = undefined as any;

    let eType: GameEventType = struct.getFieldByLabel('EventId').getValue();
    let eObjectId = struct.getFieldByLabel('ObjectId').getValue();
    let eCallerId = struct.getFieldByLabel('CallerId').getValue();
    let eDay = struct.getFieldByLabel('Day').getValue();
    let eTime = struct.getFieldByLabel('Time').getValue();

    let eventDataField = struct.getFieldByLabel('EventData');
    let eventData: GFFStruct = undefined as any;
    if(eventDataField){
      eventData = eventDataField.getChildStructs()[0];
    }

    //Initialize the event object based on the type
    switch(eType){
      case GameEventType.EventTimedEvent: //TimedEvent
        event = new EventTimedEvent();
      break;
      case GameEventType.EventEnteredTrigger: //EventEnteredTrigger
        event = new EventEnteredTrigger();
      break;
      case GameEventType.EventLeftTrigger: //EventLeftTrigger
        event = new EventLeftTrigger();
      break;
      case GameEventType.EventRemoveFromArea: //EventRemoveFromArea
        event = new EventRemoveFromArea();
      break;
      case GameEventType.EventApplyEffect: //EventApplyEffect
        event = new EventApplyEffect();
      break;
      case GameEventType.EventCloseObject: //EventCloseObject
        event = new EventCloseObject();
      break;
      case GameEventType.EventOpenObject: //EventOpenObject
        event = new EventOpenObject();
      break;
      case GameEventType.EventSpellImpact: //EventSpellImpact
        event = new EventSpellImpact();
      break;
      case GameEventType.EventPlayAnimation: //EventPlayAnimation
        event = new EventPlayAnimation();
      break;
      case GameEventType.EventSignalEvent: //EventSignalEvent
        event = new EventSignalEvent();
      break;
      case GameEventType.EventDestroyObject: //EventDestroyObject
        event = new EventDestroyObject();
      break;
      case GameEventType.EventUnlockObject: //EventUnlockObject
        event = new EventUnlockObject();
      break;
      case GameEventType.EventLockObject: //EventLockObject
        event = new EventLockObject();
      break;
      case GameEventType.EventRemoveEffect: //EventRemoveEffect
        event = new EventRemoveEffect();
      break;
      case GameEventType.EventOnMeleeAttacked: //EventOnMeleeAttacked
        event = new EventOnMeleeAttacked();
      break;
      case GameEventType.EventDecrementStackSize: //EventDecrementStackSize
        event = new EventDecrementStackSize();
      break;
      case GameEventType.EventSpawnBodyBag: //EventSpawnBodyBag
        event = new EventSpawnBodyBag();
      break;
      case GameEventType.EventForcedAction: //EventForcedAction
        event = new EventForcedAction();
      break;
      case GameEventType.EventItemOnHitSpellImpact: //EventItemOnHitSpellImpact
        event = new EventItemOnHitSpellImpact();
      break;
      case GameEventType.EventBroadcastAOO: //EventBroadcastAOO
        event = new EventBroadcastAOO();
      break;
      case GameEventType.EventBroadcastSafeProjectile: //EventBroadcastSafeProjectile
        event = new EventBroadcastSafeProjectile();
      break;
      case GameEventType.EventFeedbackMessage: //EventFeedbackMessage
        event = new EventFeedbackMessage();
      break;
      case GameEventType.EventAbilityEffectApplied: //EventAbilityEffectApplied
        // event = new EventAbilityEffectApplied();
      break;
      case GameEventType.EventSummonCreature: //EventSummonCreature
        event = new EventSummonCreature();
      break;
      case GameEventType.EventAquireItem: //EventAquireItem
        event = new EventAquireItem();
      break;
      case GameEventType.EventAreaTransition: //EventAreaTransition
        event = new EventAreaTransition();
      break;
      case GameEventType.EventControllerRumble: //EventControllerRumble
        event = new EventControllerRumble();
      break;
      default:
        event = undefined as any;
      break;
    }

    if(event){
      event.setDay(eDay);
      event.setTime(eTime);
      event.setCallerId(eCallerId);
      event.setObjectId(eObjectId);

      if(eventData){
        event.eventDataFromStruct(eventData);
      }
    }

    return event;
  }

}