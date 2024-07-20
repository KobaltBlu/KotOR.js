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
import { SignalEventType } from "../enums";

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
        if(obj.scripts.onClose){
          const instance = obj.scripts.onClose.nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnOpen:
        if(obj.scripts.onOpen){
          const instance = obj.scripts.onOpen.nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnDamaged:
        if(obj.scripts.onDamaged){
          const instance = obj.scripts.onDamaged.nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnDeath:
        if(obj.scripts.onDeath){
          const instance = obj.scripts.onDeath.nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnDisarm:
        if(obj.scripts.onDisarm){
          const instance = obj.scripts.onDisarm.nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnFailToOpen:
        if(obj.scripts.onFailToOpen){
          const instance = obj.scripts.onFailToOpen.nwscript.newInstance();
          instance.run(obj);
        }
      break;
      case SignalEventType.OnObjectEnter:
        if(obj.scripts.onEnter && !obj.scripts.onEnter.running){
          obj.scripts.onEnter.running = true;
          const instance = obj.scripts.onEnter.nwscript.newInstance();
          instance.enteringObject = this.getCaller();
          instance.run(obj);
          obj.scripts.onEnter.running = false;
        }
      break;
      case SignalEventType.OnObjectExit:
        if(obj.scripts.onExit && !obj.scripts.onExit.running){
          obj.scripts.onExit.running = true;
          const instance = obj.scripts.onExit.nwscript.newInstance();
          instance.exitingObject = this.getCaller();
          instance.run(obj);
          obj.scripts.onExit.running = false;
        }
      break;
      case SignalEventType.OnTrapTriggered:
        console.log('onTrapTriggered', obj.scripts.onTrapTriggered);
        if(obj.scripts.onTrapTriggered){
          const instance = obj.scripts.onTrapTriggered.nwscript.newInstance();
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

