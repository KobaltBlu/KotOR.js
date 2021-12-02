

class GameEvent {

  initialized = false;
  type = 0;
  caller = undefined;
  object = undefined;

  setDay(nDay){
    this.day = nDay;
  }

  setTime(nTime){
    this.time = nTime;
  }

  setCallerId(nCallerId){
    this.callerId = nCallerId;
  }

  setCaller(caller){
    this.caller = caller;
    this.callerId = (this.caller instanceof ModuleObject) ? this.caller.id : 0;
    return this.caller;
  }

  getCaller(){
    return (this.caller instanceof ModuleObject) ? this.caller.id : this.setCaller(ModuleObject.GetObjectById(this.callerId));
  }

  setObjectId(nObjectId){
    this.objectId = nObjectId;
  }

  setObject(obj){
    this.object = obj;
    this.objectId = (this.object instanceof ModuleObject) ? this.object.id : 0;
    return this.object;
  }

  getObject(){
    return (this.object instanceof ModuleObject) ? this.object.id : this.setCaller(ModuleObject.GetObjectById(this.objectId));
  }

  eventDataFromStruct(struct){
    if(struct instanceof Struct){
      return;
    }
  }

  execute(){

  }

  export(){
    return undefined;
  }

  static EventFromStruct( struct = undefined ){
    if(struct instanceof Struct){
      let event = undefined;

      let eType = struct.GetFieldByLabel('EventId').GetValue();
      let eObjectId = struct.GetFieldByLabel('ObjectId').GetValue();
      let eCallerId = struct.GetFieldByLabel('CallerId').GetValue();
      let eDay = struct.GetFieldByLabel('Day').GetValue();
      let eTime = struct.GetFieldByLabel('Time').GetValue();

      let eventData = struct.GetFieldByLabel('EventData');
      if(eventData){
        eventData = eventData.GetChildStructs()[0];
      }

      //Initialize the event object based on the type
      switch(eType){
        case GameEvent.Type.EventTimedEvent: //TimedEvent
          event = new EventTimedEvent();
        break;
        case GameEvent.Type.EventEnteredTrigger: //EventEnteredTrigger
          event = new EventEnteredTrigger();
        break;
        case GameEvent.Type.EventLeftTrigger: //EventLeftTrigger
          event = new EventLeftTrigger();
        break;
        case GameEvent.Type.EventRemoveFromArea: //EventRemoveFromArea
          event = new EventRemoveFromArea();
        break;
        case GameEvent.Type.EventApplyEffect: //EventApplyEffect
          event = new EventApplyEffect();
        break;
        case GameEvent.Type.EventCloseObject: //EventCloseObject
          event = new EventCloseObject();
        break;
        case GameEvent.Type.EventOpenObject: //EventOpenObject
          event = new EventOpenObject();
        break;
        case GameEvent.Type.EventSpellImpact: //EventSpellImpact
          event = new EventSpellImpact();
        break;
        case GameEvent.Type.EventPlayAnimation: //EventPlayAnimation
          event = new EventPlayAnimation();
        break;
        case GameEvent.Type.EventSignalEvent: //EventSignalEvent
          event = new EventSignalEvent();
        break;
        case GameEvent.Type.EventDestroyObject: //EventDestroyObject
          event = new EventDestroyObject();
        break;
        case GameEvent.Type.EventUnlockObject: //EventUnlockObject
          event = new EventUnlockObject();
        break;
        case GameEvent.Type.EventLockObject: //EventLockObject
          event = new EventLockObject();
        break;
        case GameEvent.Type.EventRemoveEffect: //EventRemoveEffect
          event = new EventRemoveEffect();
        break;
        case GameEvent.Type.EventOnMeleeAttacked: //EventOnMeleeAttacked
          event = new EventOnMeleeAttacked();
        break;
        case GameEvent.Type.EventDecrementStackSize: //EventDecrementStackSize
          event = new EventDecrementStackSize();
        break;
        case GameEvent.Type.EventSpawnBodyBag: //EventSpawnBodyBag
          event = new EventSpawnBodyBag();
        break;
        case GameEvent.Type.EventForcedAction: //EventForcedAction
          event = new EventForcedAction();
        break;
        case GameEvent.Type.EventItemOnHitSpellImpact: //EventItemOnHitSpellImpact
          event = new EventItemOnHitSpellImpact();
        break;
        case GameEvent.Type.EventBroadcastAOO: //EventBroadcastAOO
          event = new EventBroadcastAOO();
        break;
        case GameEvent.Type.EventBroadcastSafeProjectile: //EventBroadcastSafeProjectile
          event = new EventBroadcastSafeProjectile();
        break;
        case GameEvent.Type.EventFeedbackMessage: //EventFeedbackMessage
          event = new EventFeedbackMessage();
        break;
        case GameEvent.Type.EventAbilityEffectApplied: //EventAbilityEffectApplied
          event = new EventAbilityEffectApplied();
        break;
        case GameEvent.Type.EventSummonCreature: //EventSummonCreature
          event = new EventSummonCreature();
        break;
        case GameEvent.Type.EventAquireItem: //EventAquireItem
          event = new EventAquireItem();
        break;
        case GameEvent.Type.EventAreaTransition: //EventAreaTransition
          event = new EventAreaTransition();
        break;
        case GameEvent.Type.EventControllerRumble: //EventControllerRumble
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

//------------------//
// GameEvent Types
//------------------//

GameEvent.Type = {
  EventTimedEvent:                 0x01,
  EventEnteredTrigger:             0x02,
  EventLeftTrigger:                0x03,
  EventRemoveFromArea:             0x04,
  EventApplyEffect:                0x05,
  EventCloseObject:                0x06,
  EventOpenObject:                 0x07,
  EventSpellImpact:                0x08,
  EventPlayAnimation:              0x09,
  EventSignalEvent:                0x0A,
  EventDestroyObject:              0x0B,
  EventUnlockObject:               0x0C,
  EventLockObject:                 0x0D,
  EventRemoveEffect:               0x0E,
  EventOnMeleeAttacked:            0x0F,
  EventDecrementStackSize:         0x10,
  EventSpawnBodyBag:               0x11,
  EventForcedAction:               0x12,
  EventItemOnHitSpellImpact:       0x13,
  EventBroadcastAOO:               0x14,
  EventBroadcastSafeProjectile:    0x15,
  EventFeedbackMessage:            0x16,
  EventAbilityEffectApplied:       0x17,
  EventSummonCreature:             0x18,
  EventAquireItem:                 0x19,
  EventAreaTransition:             0x1A,
  EventControllerRumble:           0x1B,
};

module.exports = GameEvent;