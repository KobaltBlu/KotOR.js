import { GameEvent } from ".";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

/**
 * EventRemoveFromArea class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventRemoveFromArea.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventRemoveFromArea extends GameEvent {
  value: number = 0;
  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventRemoveFromArea;

  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      this.value = struct.getFieldByLabel('Value').getValue();
    }
  }

  execute(){
    
  }

  saveEventData(){
    let struct = new GFFStruct(0x9999);
    struct.addField( new GFFField(GFFDataType.BYTE, 'Value' ) ).setValue(this.value);
    return struct;
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
      // eventData.addChildStruct( this.script.saveEventData() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

