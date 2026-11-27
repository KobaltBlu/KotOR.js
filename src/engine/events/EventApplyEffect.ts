import { GameEvent } from "@engine/events/GameEvent";
import { GameEffect } from "@engine/effects/GameEffect";
import { GameEventType } from "@core/enums/events/GameEventType";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFField } from "@core/resource/GFFField";
import { GFFStruct } from "@core/resource/GFFStruct";
import { GameState } from "@engine/runtime/GameState";

/**
 * EventApplyEffect class.
 *
 * Delayed ApplyEffect from EventQueue — type ApplyEffect.
 * Save/Load: effect nested under EventData (type 0x1111).
 *
 * @file EventApplyEffect.ts
 */
export class EventApplyEffect extends GameEvent {
  effect: GameEffect;
  constructor(){
    super();
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
    if(!(struct instanceof GFFStruct)) return;
    // EventData may be the effect struct itself (has Type) or wrap it as a child STRUCT
    if(struct.hasField('Type')){
      this.effect = GameState.GameEffectFactory.EffectFromStruct(struct);
      return;
    }
    const fields = struct.getFields?.() || [];
    for(let i = 0; i < fields.length; i++){
      const nested = fields[i].getChildStructs?.()?.[0];
      if(nested){
        this.effect = GameState.GameEffectFactory.EffectFromStruct(nested);
        return;
      }
    }
  }

  execute(){
    if(!this.effect) return;
    const target = this.getObject();
    if(!target) return;
    target.addEffect(this.effect);
  }

  export(){
    const struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.exportCallerId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    const eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.effect instanceof GameEffect){
      const effectStruct = this.effect.save();
      effectStruct.setType(0x1111);
      eventData.addChildStruct( effectStruct );
    }
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.exportObjectId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}
