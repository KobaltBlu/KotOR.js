import { GameEvent } from ".";
import { GameEffect } from "../effects";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

/**
 * EventApplyEffect class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EventApplyEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventApplyEffect extends GameEvent {
  effect: GameEffect;
  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventApplyEffect;

    this.effect = undefined;

  }

  setEffect(effect: GameEffect){
    if(effect instanceof GameEffect){
      this.effect = effect;
    }
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

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.script.caller instanceof ModuleObject ? this.script.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.effect instanceof GameEffect){
      let effectStruct = this.effect.save();
      effectStruct.setType(0x1111);
      eventData.addChildStruct( effectStruct );
    }
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.script.object instanceof ModuleObject ? this.script.object.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

