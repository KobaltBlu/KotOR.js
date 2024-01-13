import { GameEvent } from "./GameEvent";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";

/**
 * EventFeedbackMessage class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventFeedbackMessage.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventFeedbackMessage extends GameEvent {
  messageType = 0;
  intList: any[] = [];
  floatList: any[] = [];
  objectList: any[] = [];
  stringList: any[] = [];

  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventFeedbackMessage;
    this.messageType = 0;
    this.intList = [];
    this.floatList = [];
    this.objectList = [];
    this.stringList = [];

  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      
    }
  }

  execute(){
    
  }

  saveMessageData(){
    let struct = new GFFStruct(0xCCCC);
    struct.addField( new GFFField(GFFDataType.BYTE, 'Type') ).setValue(this.messageType);

    //Export message ints
    let intList = struct.addField( new GFFField(GFFDataType.LIST, 'IntList') );
    for(let i = 0; i < this.intList.length; i++){
      let intStruct = new GFFStruct(0xBAAD);
      intStruct.addField( new GFFField(GFFDataType.INT, 'IntegerValue') ).setValue(this.intList[i]);
      intList.addChildStruct( intStruct );
    }

    //Export message floats
    let floatList = struct.addField( new GFFField(GFFDataType.LIST, 'FloatList') );
    for(let i = 0; i < this.floatList.length; i++){
      let floatStruct = new GFFStruct(0xBAAD);
      floatStruct.addField( new GFFField(GFFDataType.FLOAT, 'FloatValue') ).setValue(this.floatList[i]);
      floatList.addChildStruct( floatStruct );
    }

    //Export message objects
    let objectList = struct.addField( new GFFField(GFFDataType.LIST, 'ObjectList') );
    for(let i = 0; i < this.objectList.length; i++){
      let objectStruct = new GFFStruct(0xBAAD);
      objectStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectValue') ).setValue(this.objectList[i]);
      objectList.addChildStruct( objectStruct );
    }

    //Export message strings
    let stringList = struct.addField( new GFFField(GFFDataType.LIST, 'StringList') );
    for(let i = 0; i < this.stringList.length; i++){
      let stringStruct = new GFFStruct(0xBAAD);
      stringStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'StringValue') ).setValue(this.stringList[i]);
      stringList.addChildStruct( stringStruct );
    }
    return struct;
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( BitWise.InstanceOfObject(this.script.caller, ModuleObjectType.ModuleObject) ? this.script.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
      // eventData.addChildStruct( this.script.saveMessageData() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( BitWise.InstanceOfObject(this.script.object, ModuleObjectType.ModuleObject) ? this.script.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

