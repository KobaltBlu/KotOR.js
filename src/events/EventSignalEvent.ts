import { GameEvent } from ".";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObject } from "../module";
import { NWScriptEvent } from "../nwscript/events";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

export class EventSignalEvent extends GameEvent {
  event: NWScriptEvent;
  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventSignalEvent;

    this.event = undefined;

  }

  setEvent(event: NWScriptEvent){
    if(event instanceof NWScriptEvent){
      this.event = event;
    }
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      this.event = NWScriptEvent.EventFromStruct(struct);
    }
  }

  execute(){
    
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.AddField( new GFFField(GFFDataType.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.event instanceof NWScriptEvent){
      let eStruct = this.event.save();
      eStruct.SetType(0x4444);
      eventData.AddChildStruct( eStruct );
    }
    struct.AddField( new GFFField(GFFDataType.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

