import { GameEvent } from ".";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

export class EventUnlockObject extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventUnlockObject;

  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      
    }
  }

  execute(){
    
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.AddField( new GFFField(GFFDataType.DWORD, 'CallerId') ).SetValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Day') ).SetValue(this.day);
    let eventData = struct.AddField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'EventId') ).SetValue(this.id);
    struct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.AddField( new GFFField(GFFDataType.DWORD, 'Time') ).SetValue(this.time);

    return struct;
  }

}

