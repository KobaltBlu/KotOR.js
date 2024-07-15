import { GameEvent } from "./GameEvent";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import type { NWScriptEvent } from "../nwscript/events/NWScriptEvent";
import { NWScriptEventFactory } from "../nwscript/events/NWScriptEventFactory";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleObject } from "../module/ModuleObject";

/**
 * EventSignalEvent class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventSignalEvent.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventSignalEvent extends GameEvent {
  event: NWScriptEvent;
  eventType: number;
  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventSignalEvent;

    this.event = undefined;

  }

  setEvent(event: NWScriptEvent){
    if(event){
      this.event = event;
    }
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      this.eventType = struct.getFieldByLabel('EventType').getValue();
    }
  }

  execute(){
    const obj = this.getObject() as ModuleObject;
    console.log('EventSignalEvent', this.eventType, obj, this.getCaller());
    if(!BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleObject)){
      return;
    }

    switch(this.eventType){
      case 26:
        console.log('onTrapTriggered', obj.scripts.onTrapTriggered);
        if(obj.scripts.onTrapTriggered){
          const instance = obj.scripts.onTrapTriggered.nwscript.newInstance();
          instance.run(obj);
          console.log('onTrapTriggered', 'complete');
        }
      break;
    }
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject) ? this.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.event){
      let eStruct = this.event.save();
      eStruct.setType(0x4444);
      eventData.addChildStruct( eStruct );
    }
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleObject) ? this.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

