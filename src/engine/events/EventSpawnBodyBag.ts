import { GameEventType } from "@core/enums/events/GameEventType";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GameState } from "@engine/runtime/GameState";
import { GameEvent } from "@engine/events/GameEvent";
import type { Placeable } from "@engine/module/Placeable";
import { GFFField } from "@core/resource/GFFField";
import { GFFStruct } from "@core/resource/GFFStruct";
import * as THREE from "three";

import { isArea } from "@engine/module/guards/isArea";
import { isPlaceable } from "@engine/module/guards/isPlaceable";

/**
 * EventSpawnBodyBag class.
 * 
 * Delayed attach of a prepared body-bag placeable into the area.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventSpawnBodyBag.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventSpawnBodyBag extends GameEvent {

  bodyBagId = 0;
  position = new THREE.Vector3();

  constructor(){
    super();
    this.type = GameEventType.EventSpawnBodyBag;
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      this.bodyBagId = struct.getFieldByLabel('BodyBagId')?.getValue() ?? 0;
      this.position.x = struct.getFieldByLabel('PositionX')?.getValue() ?? 0;
      this.position.y = struct.getFieldByLabel('PositionY')?.getValue() ?? 0;
      this.position.z = struct.getFieldByLabel('PositionZ')?.getValue() ?? 0;
    }
  }

  execute(){
    const placeable = GameState.GameObjectManager.GetObjectById(this.bodyBagId) as Placeable;
    if(!isPlaceable(placeable)){
      return;
    }

    placeable.position.copy(this.position);
    // Event object is the area (SpawnBodyBag AddEventDeltaTime target)
    const obj = this.getObject();
    let area = GameState.module?.area;
    if(isArea(obj)){
      area = obj as any;
    }else if(obj?.area){
      area = obj.area;
    }
    if(!area){
      return;
    }

    void placeable.placeInArea(area).catch((e) => {
      console.error('EventSpawnBodyBag placeInArea failed', e);
    });
  }

  saveEventData(){
    const struct = new GFFStruct(0x5555);
    struct.addField( new GFFField(GFFDataType.DWORD, 'BodyBagId') ).setValue(this.bodyBagId);
    struct.addField( new GFFField(GFFDataType.FLOAT, 'PositionX') ).setValue(this.position.x);
    struct.addField( new GFFField(GFFDataType.FLOAT, 'PositionY') ).setValue(this.position.y);
    struct.addField( new GFFField(GFFDataType.FLOAT, 'PositionZ') ).setValue(this.position.z);
    return struct;
  }

  export(){
    const struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.exportCallerId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    const eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    eventData.addChildStruct( this.saveEventData() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.exportObjectId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}
