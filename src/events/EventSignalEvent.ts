import { GameEvent } from "./GameEvent";
import { GameEventType } from "../enums/events/GameEventType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import type { NWScriptEvent } from "../nwscript/events/NWScriptEvent";
import { NWScriptEventFactory } from "../nwscript/events/NWScriptEventFactory";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleObject } from "../module/ModuleObject";
import { ModuleObjectScript, SignalEventType } from "../enums";

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
  eventType: number;
  constructor(){
    super();

    //Event Type
    this.type = GameEventType.EventSignalEvent;

    this.event = undefined;

  }

  setEvent(event: NWScriptEvent){
    if(event){
      this.event = event;
    }
  }

  eventDataFromStruct(struct: GFFStruct){
    if(struct instanceof GFFStruct){
      this.eventType = struct.getFieldByLabel('EventType').getValue();
    }
  }

  execute(){
    const obj = this.getObject() as ModuleObject;
    console.log('EventSignalEvent', this.eventType, obj, this.getCaller());
    if(!BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleObject)){
      return;
    }

    switch(this.eventType){
      case SignalEventType.OnClose:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.getScriptInstance(ModuleObjectScript.PlaceableOnClosed);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.getScriptInstance(ModuleObjectScript.DoorOnClosed);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnOpen:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.getScriptInstance(ModuleObjectScript.PlaceableOnOpen);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.getScriptInstance(ModuleObjectScript.DoorOnOpen);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnDamaged:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.getScriptInstance(ModuleObjectScript.PlaceableOnDamaged);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.getScriptInstance(ModuleObjectScript.DoorOnDamaged);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGObstacle)){
          const instance = obj.getScriptInstance(ModuleObjectScript.MGEnemyOnDamage);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGEnemy)){
          const instance = obj.getScriptInstance(ModuleObjectScript.MGEnemyOnDamage);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGPlayer)){
          const instance = obj.getScriptInstance(ModuleObjectScript.MGPlayerOnDamage);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnDeath:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)){
          const instance = obj.getScriptInstance(ModuleObjectScript.CreatureOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.getScriptInstance(ModuleObjectScript.PlaceableOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.getScriptInstance(ModuleObjectScript.DoorOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGObstacle)){
          const instance = obj.getScriptInstance(ModuleObjectScript.MGEnemyOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGEnemy)){
          const instance = obj.getScriptInstance(ModuleObjectScript.MGEnemyOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGPlayer)){
          const instance = obj.getScriptInstance(ModuleObjectScript.MGPlayerOnDeath);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnDisarm:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.getScriptInstance(ModuleObjectScript.PlaceableOnDisarm);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.getScriptInstance(ModuleObjectScript.DoorOnDisarm);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnFailToOpen:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.getScriptInstance(ModuleObjectScript.DoorOnFailToOpen);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnObjectEnter:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
          const onEnter = obj.getScriptInstance(ModuleObjectScript.TriggerOnEnter);
          if(onEnter){
            onEnter.enteringObject = this.getCaller();
            onEnter.run(obj);
          }
        }
      break;
      case SignalEventType.OnObjectExit:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
          const onExit = obj.getScriptInstance(ModuleObjectScript.TriggerOnExit);
          if(onExit){
            onExit.exitingObject = this.getCaller();
            onExit.run(obj);
          }
        }
      break;
      case SignalEventType.OnTrapTriggered:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.getScriptInstance(ModuleObjectScript.PlaceableOnTrapTriggered);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.getScriptInstance(ModuleObjectScript.DoorOnTrapTriggered);
          if(instance){
            instance.run(obj);
          }
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
          const instance = obj.getScriptInstance(ModuleObjectScript.TriggerOnTrapTriggered);
          if(instance){
            instance.run(obj);
          }
        }
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor) || BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          obj.setHP(-11);
          obj.onDamaged();
          if(obj.linkedToObject){
            if(obj.linkedToObject.audioEmitter){
              obj.linkedToObject.audioEmitter.playSound((obj.linkedToObject as any).trapExplosionSound);
            }
            obj.linkedToObject.destroy();
          }
        }else if (BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
          if(obj.audioEmitter){
            obj.audioEmitter.playSound((obj as any).trapExplosionSound);
          }
          obj.destroy();
        }
      break;
    }
  }

  export(){
    let struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject) ? this.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.event){
      let eStruct = this.event.save();
      eStruct.setType(0x4444);
      eventData.addChildStruct( eStruct );
    }
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleObject) ? this.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

