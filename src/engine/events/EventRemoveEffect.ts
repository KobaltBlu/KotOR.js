import type { GameEffect } from "@engine/effects";
import { GameEventType } from "@core/enums/events/GameEventType";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFField } from "@core/resource/GFFField";
import { GFFStruct } from "@core/resource/GFFStruct";
import { GameEvent } from "@engine/events/GameEvent";

/**
 * EventRemoveEffect class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventRemoveEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventRemoveEffect extends GameEvent {
  effect: GameEffect;
  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventRemoveEffect;

    this.effect = undefined;

  }

  setEffect(effect: GameEffect){
    if(!effect){ return; }
    this.effect = effect;
  }

  getEffect(){
    return this.effect;
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      
    }
  }

  execute(){
    
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.exportCallerId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.effect){
      let effectStruct = this.effect.save();
      effectStruct.setType(0x1111);
      eventData.addChildStruct( effectStruct );
    }
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.exportObjectId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

