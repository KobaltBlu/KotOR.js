import { GameEventType } from "@/enums/events/GameEventType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GameState } from "@/GameState";
import { GameEvent } from "@/events/GameEvent";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleArea } from "@/module/ModuleArea";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { BitWise } from "@/utility/BitWise";
import type { OdysseyModel3D } from "@/three/odyssey";
import * as THREE from "three";

/**
 * EventSummonCreature — retail event type 0x18 from OnApplySummonCreature @ 004d8680.
 * Places a pre-created summon into the area at the stored position.
 *
 * @file EventSummonCreature.ts
 */
export class EventSummonCreature extends GameEvent {

  summonId = 0;
  position = new THREE.Vector3();

  constructor(){
    super();
    this.type = GameEventType.EventSummonCreature;
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      this.summonId = struct.getFieldByLabel('SummonId')?.getValue() ?? 0;
      this.position.x = struct.getFieldByLabel('PositionX')?.getValue() ?? 0;
      this.position.y = struct.getFieldByLabel('PositionY')?.getValue() ?? 0;
      this.position.z = struct.getFieldByLabel('PositionZ')?.getValue() ?? 0;
    }
  }

  execute(){
    const creature = GameState.ModuleObjectManager.GetObjectById(this.summonId) as ModuleCreature;
    if(!BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature)){
      return;
    }

    creature.position.copy(this.position);
    const area = (this.getObject() as ModuleArea)
      || creature.area
      || GameState.module?.area;
    if(!area) return;

    area.attachObject(creature);
    void creature.loadModel?.().then((model: OdysseyModel3D) => {
      if(!model) return;
      model.userData.moduleObject = creature;
      model.hasCollision = true;
      model.name = creature.getTag?.() || model.name;
      GameState.group?.creatures?.add(creature.container);
      creature.getCurrentRoom?.();
      creature.onSpawn?.();
    });
  }

  saveEventData(){
    const struct = new GFFStruct(0x5555);
    struct.addField( new GFFField(GFFDataType.DWORD, 'SummonId') ).setValue(this.summonId);
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
