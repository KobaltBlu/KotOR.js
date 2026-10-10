import { GameEvent } from "@engine/events/GameEvent";
import { GameEventType } from "@core/enums/events/GameEventType";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import type { NWScriptEvent } from "@engine/nwscript/events/NWScriptEvent";
import { GFFField } from "@core/resource/GFFField";
import { GFFStruct } from "@core/resource/GFFStruct";
import type { GameObject } from "@engine/module/GameObject";
import { ScriptHook, SignalEventType } from "@core/enums";
import { NWScriptEventType } from "@core/enums/nwscript/NWScriptEventType";
import EngineLocation from "@engine/runtime/EngineLocation";
import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import type { Item } from "@engine/module/Item";

import { isCreature } from "@engine/module/guards/isCreature";
import { isAreaEffect } from "@engine/module/guards/isAreaEffect";
import { isDoor } from "@engine/module/guards/isDoor";
import { isMGEnemy } from "@engine/module/guards/isMGEnemy";
import { isMGObstacle } from "@engine/module/guards/isMGObstacle";
import { isMGPlayer } from "@engine/module/guards/isMGPlayer";
import { isGameObject } from "@engine/module/guards/isGameObject";
import { isPlaceable } from "@engine/module/guards/isPlaceable";
import { isTrigger } from "@engine/module/guards/isTrigger";

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
    const obj = this.getObject() as GameObject;
    // NWScript SignalEvent path — queued EventSignalEvent carries an NWScriptEvent
    if(this.event){
      const mod = GameState.module;
      if((this as any)._signalModule && mod){
        if(this.event.type === NWScriptEventType.EventUserDefined){
          const onUserDefined = mod.scripts[ScriptHook.ModuleOnUserDefined];
          if(onUserDefined){
            onUserDefined.run(mod.area ?? obj, parseInt(this.event.getInt(0)));
          }
          return;
        }
        if(this.event.type === NWScriptEventType.EventActivateItem){
          mod.itemActivated = this.event.getObject(0) as Item;
          mod.itemActivator = (this.event.getObject(1) as Creature) ?? (this.getCaller() as Creature);
          mod.itemActivatedTarget = this.event.getObject(3);
          mod.itemActivatedTargetLocation = new EngineLocation(
            this.event.getFloat(0) || 0,
            this.event.getFloat(1) || 0,
            this.event.getFloat(2) || 0,
            0, 0, 0,
            mod.area ?? mod.itemActivator?.area
          );
          const onActivate = mod.scripts[ScriptHook.ModuleOnPlayerActivateItem];
          if(onActivate){
            onActivate.run(mod.area ?? obj, 0);
          }
          return;
        }
      }
      if(isGameObject(obj)){
        obj.scriptEventHandler(this.event);
      }
      return;
    }

    if(!isGameObject(obj)){
      return;
    }

    switch(this.eventType){
      case SignalEventType.OnClose:
        if(isPlaceable(obj)){
          const instance = obj.getScriptInstance(ScriptHook.PlaceableOnClosed);
          if(instance){
            instance.run(obj);
          }
        }else if(isDoor(obj)){
          const instance = obj.getScriptInstance(ScriptHook.DoorOnClosed);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnOpen:
        if(isPlaceable(obj)){
          const instance = obj.getScriptInstance(ScriptHook.PlaceableOnOpen);
          if(instance){
            instance.run(obj);
          }
        }else if(isDoor(obj)){
          const instance = obj.getScriptInstance(ScriptHook.DoorOnOpen);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnDamaged:
        if(isPlaceable(obj)){
          const instance = obj.getScriptInstance(ScriptHook.PlaceableOnDamaged);
          if(instance){
            instance.run(obj);
          }
        }else if(isDoor(obj)){
          const instance = obj.getScriptInstance(ScriptHook.DoorOnDamaged);
          if(instance){
            instance.run(obj);
          }
        }else if(isMGObstacle(obj)){
          const instance = obj.getScriptInstance(ScriptHook.MGEnemyOnDamage);
          if(instance){
            instance.run(obj);
          }
        }else if(isMGEnemy(obj)){
          const instance = obj.getScriptInstance(ScriptHook.MGEnemyOnDamage);
          if(instance){
            instance.run(obj);
          }
        }else if(isMGPlayer(obj)){
          const instance = obj.getScriptInstance(ScriptHook.MGPlayerOnDamage);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnDeath:
        if(isCreature(obj)){
          const instance = obj.getScriptInstance(ScriptHook.CreatureOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(isPlaceable(obj)){
          const instance = obj.getScriptInstance(ScriptHook.PlaceableOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(isDoor(obj)){
          const instance = obj.getScriptInstance(ScriptHook.DoorOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(isMGObstacle(obj)){
          const instance = obj.getScriptInstance(ScriptHook.MGEnemyOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(isMGEnemy(obj)){
          const instance = obj.getScriptInstance(ScriptHook.MGEnemyOnDeath);
          if(instance){
            instance.run(obj);
          }
        }else if(isMGPlayer(obj)){
          const instance = obj.getScriptInstance(ScriptHook.MGPlayerOnDeath);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnDisarm:
        if(isPlaceable(obj)){
          const instance = obj.getScriptInstance(ScriptHook.PlaceableOnDisarm);
          if(instance){
            instance.run(obj);
          }
        }else if(isDoor(obj)){
          const instance = obj.getScriptInstance(ScriptHook.DoorOnDisarm);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnFailToOpen:
        if(isDoor(obj)){
          const instance = obj.getScriptInstance(ScriptHook.DoorOnFailToOpen);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnClicked:
        if(isDoor(obj)){
          const instance = obj.getScriptInstance(ScriptHook.DoorOnClick);
          if(instance){
            instance.run(obj);
          }
        }else if(isTrigger(obj)){
          const instance = obj.getScriptInstance(ScriptHook.TriggerOnClick);
          if(instance){
            instance.run(obj);
          }
        }
      break;
      case SignalEventType.OnObjectEnter:
        if(isTrigger(obj)){
          const onEnter = obj.getScriptInstance(ScriptHook.TriggerOnEnter);
          if(onEnter){
            onEnter.enteringObject = this.getCaller();
            onEnter.run(obj);
          }
        }else if(isAreaEffect(obj)){
          const onEnter = obj.getScriptInstance(ScriptHook.AoEOnEnter);
          if(onEnter){
            onEnter.enteringObject = this.getCaller();
            onEnter.run(obj);
          }
        }
      break;
      case SignalEventType.OnObjectExit:
        if(isTrigger(obj)){
          const onExit = obj.getScriptInstance(ScriptHook.TriggerOnExit);
          if(onExit){
            onExit.exitingObject = this.getCaller();
            onExit.run(obj);
          }
        }else if(isAreaEffect(obj)){
          const onExit = obj.getScriptInstance(ScriptHook.AoEOnExit);
          if(onExit){
            onExit.exitingObject = this.getCaller();
            onExit.run(obj);
          }
        }
      break;
      case SignalEventType.OnTrapTriggered:
        if(isPlaceable(obj)){
          const instance = obj.getScriptInstance(ScriptHook.PlaceableOnTrapTriggered);
          if(instance){
            instance.run(obj);
          }
        }else if(isDoor(obj)){
          const instance = obj.getScriptInstance(ScriptHook.DoorOnTrapTriggered);
          if(instance){
            instance.run(obj);
          }
        }else if(isTrigger(obj)){
          const instance = obj.getScriptInstance(ScriptHook.TriggerOnTrapTriggered);
          if(instance){
            instance.run(obj);
          }
        }
        if(isDoor(obj) || isPlaceable(obj)){
          obj.setHP(-11);
          obj.onDamaged();
          if(obj.linkedToObject){
            if(obj.linkedToObject.audioEmitter){
              obj.linkedToObject.audioEmitter.playSound((obj.linkedToObject as any).trapExplosionSound);
            }
            obj.linkedToObject.destroy();
          }
        }else if (isTrigger(obj)){
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

    struct.addField( new GFFField(GFFDataType.DWORD, 'CallerId') ).setValue( this.exportCallerId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Day') ).setValue(this.day);
    let eventData = struct.addField( new GFFField(GFFDataType.STRUCT, 'EventData') );
    if(this.event){
      let eStruct = this.event.save();
      eStruct.setType(0x4444);
      eventData.addChildStruct( eStruct );
    }
    struct.addField( new GFFField(GFFDataType.DWORD, 'EventId') ).setValue(this.id);
    struct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( this.exportObjectId() );
    struct.addField( new GFFField(GFFDataType.DWORD, 'Time') ).setValue(this.time);

    return struct;
  }

}

