import { GameEvent } from ".";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

export class EventForcedAction extends GameEvent {

  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventForcedAction;

  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      
    }
  }

  execute(){
    
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    //eventData.addChildStruct( this.script.saveEventSituation() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

