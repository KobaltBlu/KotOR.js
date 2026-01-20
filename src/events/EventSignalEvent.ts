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
          const instance = obj.scripts[ModuleObjectScript.PlaceableOnClosed].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.scripts[ModuleObjectScript.DoorOnClosed].nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnOpen:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.scripts[ModuleObjectScript.PlaceableOnOpen].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.scripts[ModuleObjectScript.DoorOnOpen].nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnDamaged:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.scripts[ModuleObjectScript.PlaceableOnDamaged].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.scripts[ModuleObjectScript.DoorOnDamaged].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGObstacle)){
          const instance = obj.scripts[ModuleObjectScript.MGEnemyOnDamage].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGEnemy)){
          const instance = obj.scripts[ModuleObjectScript.MGEnemyOnDamage].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGPlayer)){
          const instance = obj.scripts[ModuleObjectScript.MGPlayerOnDamage].nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnDeath:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)){
          const instance = obj.scripts[ModuleObjectScript.CreatureOnDeath].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.scripts[ModuleObjectScript.PlaceableOnDeath].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.scripts[ModuleObjectScript.DoorOnDeath].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGObstacle)){
          const instance = obj.scripts[ModuleObjectScript.MGEnemyOnDeath].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGEnemy)){
          const instance = obj.scripts[ModuleObjectScript.MGEnemyOnDeath].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleMGPlayer)){
          const instance = obj.scripts[ModuleObjectScript.MGPlayerOnDeath].nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnDisarm:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.scripts[ModuleObjectScript.PlaceableOnDisarm].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.scripts[ModuleObjectScript.DoorOnDisarm].nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnFailToOpen:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.scripts[ModuleObjectScript.DoorOnFailToOpen].nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnObjectEnter:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
          const onEnter = obj.scripts[ModuleObjectScript.TriggerOnEnter];
          if(!onEnter){ return; }
          onEnter.enteringObject = this.getCaller();
          onEnter.run(obj);
        }
      break;
      case SignalEventType.OnObjectExit:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
          const onExit = obj.scripts[ModuleObjectScript.TriggerOnExit];
          if(!onExit){ return; }
          onExit.exitingObject = this.getCaller();
          onExit.run(obj);
        }
      break;
      case SignalEventType.OnTrapTriggered:
        if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
          const instance = obj.scripts[ModuleObjectScript.PlaceableOnTrapTriggered].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
          const instance = obj.scripts[ModuleObjectScript.DoorOnTrapTriggered].nwscript.newInstance();
          instance.run(obj);
        }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
          const instance = obj.scripts[ModuleObjectScript.TriggerOnTrapTriggered].nwscript.newInstance();
          instance.run(obj);
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
    const struct = new GFFStruct( 0xABCD );

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject) ? this.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    const eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.event){
      const eStruct = this.event.save();
      eStruct.setType(0x4444);
      eventData.addChildStruct( eStruct );
    }
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleObject) ? this.caller.id : 2130706432 );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

