import { EventApplyEffect, EventAquireItem, EventAreaTransition, EventBroadcastAOO, EventBroadcastSafeProjectile, EventCloseObject, EventControllerRumble, EventDecrementStackSize, EventDestroyObject, EventEnteredTrigger, EventFeedbackMessage, EventForcedAction, EventItemOnHitSpellImpact, EventLeftTrigger, EventLockObject, EventOnMeleeAttacked, EventOpenObject, EventPlayAnimation, EventRemoveEffect, EventRemoveFromArea, EventSignalEvent, EventSpawnBodyBag, EventSpellImpact, EventSummonCreature, EventTimedEvent, EventUnlockObject } from ".";
import { GameEventType } from "../enums/events/GameEventType";
import { ModuleObject } from "../module";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFStruct } from "../resource/GFFStruct";


export class GameEvent {

  id: number = 0;
  initialized: boolean = false;
  type = 0;
  caller: ModuleObject;
  object: ModuleObject;
  day: number;
  time: number;
  callerId: number;
  objectId: number;
  script: NWScriptInstance;

  setDay(nDay: number){
    this.day = nDay;
  }

  setTime(nTime: number){
    this.time = nTime;
  }

  setCallerId(nCallerId: number){
    this.callerId = nCallerId;
  }

  setCaller(caller: ModuleObject){
    this.caller = caller;
    this.callerId = (this.caller instanceof ModuleObject) ? this.caller.id : 0;
    return this.caller;
  }

  getCaller(){
    return (this.caller instanceof ModuleObject) ? this.caller.id : this.setCaller(ModuleObject.GetObjectById(this.callerId));
  }

  setObjectId(nObjectId: number){
    this.objectId = nObjectId;
  }

  setObject(obj: ModuleObject){
    this.object = obj;
    this.objectId = (this.object instanceof ModuleObject) ? this.object.id : 0;
    return this.object;
  }

  getObject(){
    return (this.object instanceof ModuleObject) ? this.object.id : this.setCaller(ModuleObject.GetObjectById(this.objectId));
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      return;
    }
  }

  execute(){

  }

  export(): any {
    return undefined;
  }

  static EventFromStruct( struct: GFFStruct ){
    if(struct instanceof GFFStruct){
      let event = undefined;

      let eType = struct.GetFieldByLabel('EventId').GetValue();
      let eObjectId = struct.GetFieldByLabel('ObjectId').GetValue();
      let eCallerId = struct.GetFieldByLabel('CallerId').GetValue();
      let eDay = struct.GetFieldByLabel('Day').GetValue();
      let eTime = struct.GetFieldByLabel('Time').GetValue();

      let eventDataField = struct.GetFieldByLabel('EventData');
      let eventData: GFFStruct;
      if(eventDataField){
        eventData = eventDataField.GetChildStructs()[0];
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
      }

      if(event instanceof GameEvent){
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

}
