

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
      let nObjectId = struct.GetFieldByLabel('ObjectId').GetValue();
      let nCallerId = struct.GetFieldByLabel('CallerId').GetValue();
      let nDay = struct.GetFieldByLabel('Day').GetValue();
      let nTime = struct.GetFieldByLabel('Time').GetValue();

      let eventData = struct.GetFieldByLabel('EventData').GetChildStructs()[0];

      //Initialize the event object based on the type
      switch(eType){
        case GameEvent.Type.EventTimedEvent: //TimedEvent
          event = new EventTimedEvent();
        break;
      }

      if(event instanceof GameEvent){
        event.setDay(nDay);
        event.setTime(nTime);
        event.setCallerId(nCallerId);
        event.setObjectId(nObjectId);

        event.eventDataFromStruct(eventData);
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