import { GameEvent } from ".";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObject } from "../module";
import { NWScriptEvent } from "../nwscript/events";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

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

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.event instanceof NWScriptEvent){
      let eStruct = this.event.save();
      eStruct.setType(0x4444);
      eventData.addChildStruct( eStruct );
    }
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

