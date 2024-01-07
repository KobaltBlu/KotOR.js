import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { GameEvent } from "./GameEvent";
import * as THREE from "three";

/**
 * EventSpawnBodyBag class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventSpawnBodyBag.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventSpawnBodyBag extends GameEvent {

  bodyBagId = 0;
  position = new THREE.Vector3;

  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventSpawnBodyBag;

  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      this.bodyBagId  = struct.getFieldByLabel('BodyBagId').getValue();
      this.position.x = struct.getFieldByLabel('PositionX').getValue();
      this.position.y = struct.getFieldByLabel('PositionY').getValue();
      this.position.z = struct.getFieldByLabel('PositionZ').getValue();
    }
  }

  execute(){

  }

  saveEventData(){
    let struct = new GFFStruct(0x5555);
    struct.addField( new GFFField(GFFDataType.DWORD, 'BodyBagId' ) ).setValue(this.bodyBagId);
    struct.addField( new GFFField(GFFDataType.DWORD, 'PositionX' ) ).setValue(this.position.x);
    struct.addField( new GFFField(GFFDataType.DWORD, 'PositionY' ) ).setValue(this.position.y);
    struct.addField( new GFFField(GFFDataType.DWORD, 'PositionZ' ) ).setValue(this.position.z);
    return struct;
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.callerId );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    eventData.addChildStruct( this.saveEventData() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.objectId );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

